import { EnrichedEmployee } from '../types/hr';
import { parseEmployeeMatrix } from '../utils/csv';

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: SheetTabInfo[];
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  return trimmed;
}

async function parseGoogleApiError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json();
    const msg = json?.error?.message;
    if (msg) return `${msg} (HTTP ${res.status})`;
  } catch {}
  return `${fallback} (HTTP ${res.status})`;
}

export async function listDriveSpreadsheets(
  accessToken: string
): Promise<DriveSpreadsheetItem[]> {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'files(id,name,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: '25',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to list Google Sheets from Drive'));
  }

  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const id = extractSpreadsheetId(spreadsheetId);
  if (!id) {
    throw new Error('Please enter a valid Google Spreadsheet ID or URL.');
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?fields=spreadsheetId,properties.title,sheets(properties(sheetId,title))`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to load spreadsheet metadata'));
  }

  const data = await res.json();
  const sheets: SheetTabInfo[] = Array.isArray(data.sheets)
    ? data.sheets.map((s: { properties?: { sheetId?: number; title?: string } }) => ({
        sheetId: s.properties?.sheetId ?? 0,
        title: s.properties?.title ?? 'Sheet1',
      }))
    : [];

  if (sheets.length === 0) {
    throw new Error('No worksheet tabs were found inside this Google Spreadsheet.');
  }

  return {
    spreadsheetId: data.spreadsheetId ?? id,
    title: data.properties?.title ?? 'Untitled Spreadsheet',
    sheets,
  };
}

export async function fetchSpreadsheetEmployees(
  spreadsheetId: string,
  tabTitle: string,
  accessToken: string
): Promise<EnrichedEmployee[]> {
  const id = extractSpreadsheetId(spreadsheetId);
  const range = `${tabTitle}!A:Z`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, `Failed to read values from tab "${tabTitle}"`));
  }

  const data = await res.json();
  const values: string[][] = Array.isArray(data.values) ? data.values : [];
  return parseEmployeeMatrix(values);
}

export async function exportEmployeesToNewGoogleSheet(
  title: string,
  employees: EnrichedEmployee[],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  // 1. Create the new spreadsheet with an Employee Snapshot tab
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Workforce Snapshot' } }],
    }),
  });

  if (!createRes.ok) {
    throw new Error(await parseGoogleApiError(createRes, 'Failed to create Google Sheet'));
  }

  const created = await createRes.json();
  const spreadsheetId: string = created.spreadsheetId;
  const spreadsheetUrl: string =
    created.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const headers = [
    'EmployeeID',
    'FullName',
    'Department',
    'JobTitle',
    'JobLevel',
    'EmploymentType',
    'Location',
    'YearsAtCompany',
    'YearsSinceLastPromotion',
    'BusinessTravel',
    'DistanceFromHome_km',
    'MonthlyIncome_GBP',
    'Attrition',
    'FlightRiskScore',
    'FlightRiskBand',
    'RiskDrivers',
  ];

  const rows = employees.map((e) => [
    e.EmployeeID,
    e.fullName,
    e.Department,
    e.JobTitle,
    String(e.JobLevel),
    e.EmploymentType,
    e.Location,
    String(e.YearsAtCompany),
    String(e.YearsSinceLastPromotion),
    e.BusinessTravel,
    String(e.DistanceFromHome_km),
    String(e.MonthlyIncome_GBP),
    e.Attrition,
    String(e.flightRiskScore),
    e.flightRiskBand,
    e.riskFactors.map((f) => `${f.label} (+${f.points})`).join('; '),
  ]);

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent('Workforce Snapshot!A1')}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Workforce Snapshot!A1',
        majorDimension: 'ROWS',
        values: [headers, ...rows],
      }),
    }
  );

  if (!writeRes.ok) {
    throw new Error(await parseGoogleApiError(writeRes, 'Created sheet but failed to populate rows'));
  }

  return { spreadsheetId, spreadsheetUrl, title };
}
