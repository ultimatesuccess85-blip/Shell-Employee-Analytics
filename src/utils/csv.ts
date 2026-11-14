import { AttritionStatus, EnrichedEmployee, RawEmployeeRow } from '../types/hr';
import { computeFlightRisk } from './analytics';

export const GOOGLE_SHEET_ID = '1CgvbIKwhozonrXMjhQFAx-P9_2O5EEe6TGHKhD0tGlo';
export const GOOGLE_SHEET_GID = '0';
export const GOOGLE_SHEET_GVIZ_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GOOGLE_SHEET_GID}`;

const REQUIRED_COLUMNS = [
  'EmployeeID',
  'FirstName',
  'LastName',
  'Gender',
  'Age',
  'Department',
  'JobTitle',
  'JobLevel',
  'EmploymentType',
  'Location',
  'HireDate',
  'YearsAtCompany',
  'YearsSinceLastPromotion',
  'Education',
  'DistanceFromHome_km',
  'BusinessTravel',
  'MonthlyIncome_GBP',
  'Attrition',
] as const;

/**
 * RFC 4180 compliant CSV parser handling quoted fields, embedded commas,
 * escaped double quotes (""), BOM markers, and CRLF/LF line endings.
 */
export function parseCsvMatrix(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r') {
        if (cleanText[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (ch === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function toSafeNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const cleaned = value.replace(/[£$,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeAttrition(value: string | undefined): AttritionStatus {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'left') {
    return 'Yes';
  }
  return 'No';
}

export function parseEmployeeMatrix(matrix: string[][]): EnrichedEmployee[] {
  if (matrix.length < 2) {
    throw new Error('Spreadsheet contains no employee data rows. Expected a header row followed by employee records.');
  }

  const rawHeaders = matrix[0].map((h) => String(h ?? '').trim());
  const headerIndex = new Map<string, number>();
  rawHeaders.forEach((h, idx) => {
    headerIndex.set(h.toLowerCase(), idx);
  });

  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headerIndex.has(col.toLowerCase()));
  if (missingColumns.length > 0) {
    throw new Error(
      `Schema mismatch. Missing required columns: ${missingColumns.join(', ')}. Please verify the sheet structure or upload a compatible CSV.`
    );
  }

  const getVal = (row: string[], colName: string): string => {
    const idx = headerIndex.get(colName.toLowerCase());
    if (idx === undefined) return '';
    return String(row[idx] ?? '').trim();
  };

  const employees: EnrichedEmployee[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    const employeeId = getVal(row, 'EmployeeID');
    if (!employeeId) continue;

    const firstName = getVal(row, 'FirstName');
    const lastName = getVal(row, 'LastName');
    const hireDate = getVal(row, 'HireDate');
    const yearMatch = hireDate.match(/^(\d{4})/);
    const hireYear = yearMatch ? Number(yearMatch[1]) : null;

    const raw: RawEmployeeRow = {
      EmployeeID: employeeId,
      FirstName: firstName,
      LastName: lastName,
      Gender: getVal(row, 'Gender') || 'Unspecified',
      Age: toSafeNumber(getVal(row, 'Age'), 0),
      MaritalStatus: getVal(row, 'MaritalStatus') || 'Unspecified',
      Department: getVal(row, 'Department') || 'Unassigned',
      JobTitle: getVal(row, 'JobTitle') || 'Role Unspecified',
      JobLevel: toSafeNumber(getVal(row, 'JobLevel'), 1),
      EmploymentType: getVal(row, 'EmploymentType') || 'Full-Time',
      Location: getVal(row, 'Location') || 'Unspecified',
      HireDate: hireDate,
      YearsAtCompany: toSafeNumber(getVal(row, 'YearsAtCompany'), 0),
      YearsInCurrentRole: toSafeNumber(getVal(row, 'YearsInCurrentRole'), 0),
      YearsSinceLastPromotion: toSafeNumber(getVal(row, 'YearsSinceLastPromotion'), 0),
      YearsWithCurrManager: toSafeNumber(getVal(row, 'YearsWithCurrManager'), 0),
      Education: getVal(row, 'Education') || 'Unspecified',
      DistanceFromHome_km: toSafeNumber(getVal(row, 'DistanceFromHome_km'), 0),
      BusinessTravel: getVal(row, 'BusinessTravel') || 'Non-Travel',
      MonthlyIncome_GBP: toSafeNumber(getVal(row, 'MonthlyIncome_GBP'), 0),
      Attrition: normalizeAttrition(getVal(row, 'Attrition')),
    };

    const risk = computeFlightRisk(raw);
    employees.push({
      ...raw,
      fullName: `${firstName} ${lastName}`.trim() || employeeId,
      hireYear,
      flightRiskScore: risk.score,
      flightRiskBand: risk.band,
      riskFactors: risk.factors,
    });
  }

  if (employees.length === 0) {
    throw new Error('No valid employee records were found in the dataset.');
  }

  return employees;
}

export function parseEmployeeCsv(csvText: string): EnrichedEmployee[] {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error('The CSV response is empty. Verify the Google Sheet is published/shared or upload a valid CSV file.');
  }

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.includes('<title>Google')) {
    throw new Error(
      'Google Sheets returned an HTML sign-in page instead of CSV data. Sign in with Google to read private sheets via the Google Sheets API, or use Upload CSV.'
    );
  }

  const matrix = parseCsvMatrix(trimmed);
  return parseEmployeeMatrix(matrix);
}

export async function fetchGoogleSheetCsv(): Promise<EnrichedEmployee[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GOOGLE_SHEET_GVIZ_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Google Sheets endpoint returned HTTP ${response.status} (${response.statusText || 'Request failed'}). Check sheet sharing settings or use Upload CSV.`
      );
    }

    const csvText = await response.text();
    return parseEmployeeCsv(csvText);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Google Sheets request timed out after 15 seconds. Check your connection or use Upload CSV.');
    }
    if (err instanceof TypeError) {
      throw new Error(
        'Unable to reach the Google Sheets gviz endpoint (network error or CORS blocked). Ensure internet connectivity and public sheet access, or use Upload CSV.'
      );
    }
    throw err instanceof Error ? err : new Error('Failed to load Google Sheet CSV.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeEmployeesToCsv(employees: EnrichedEmployee[]): string {
  const headers = [
    'EmployeeID',
    'FirstName',
    'LastName',
    'Gender',
    'Age',
    'MaritalStatus',
    'Department',
    'JobTitle',
    'JobLevel',
    'EmploymentType',
    'Location',
    'HireDate',
    'YearsAtCompany',
    'YearsInCurrentRole',
    'YearsSinceLastPromotion',
    'YearsWithCurrManager',
    'Education',
    'DistanceFromHome_km',
    'BusinessTravel',
    'MonthlyIncome_GBP',
    'Attrition',
    'FlightRiskScore',
    'FlightRiskBand',
  ];

  const lines = [headers.join(',')];

  for (const emp of employees) {
    const row = [
      emp.EmployeeID,
      emp.FirstName,
      emp.LastName,
      emp.Gender,
      emp.Age,
      emp.MaritalStatus,
      emp.Department,
      emp.JobTitle,
      emp.JobLevel,
      emp.EmploymentType,
      emp.Location,
      emp.HireDate,
      emp.YearsAtCompany,
      emp.YearsInCurrentRole,
      emp.YearsSinceLastPromotion,
      emp.YearsWithCurrManager,
      emp.Education,
      emp.DistanceFromHome_km,
      emp.BusinessTravel,
      emp.MonthlyIncome_GBP,
      emp.Attrition,
      emp.flightRiskScore,
      emp.flightRiskBand,
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  }

  return lines.join('\r\n');
}

export function downloadEmployeesCsv(employees: EnrichedEmployee[]): void {
  if (employees.length === 0) return;
  const csvContent = '\uFEFF' + serializeEmployeesToCsv(employees);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `shell-uk-workforce-${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

