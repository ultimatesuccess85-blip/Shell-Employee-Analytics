import {
  EnrichedEmployee,
  FilterState,
  FindingItem,
  FlightRiskBand,
  RawEmployeeRow,
  RecommendedAction,
  RiskFactorBreakdown,
} from '../types/hr';

export const FLIGHT_RISK_RULES = [
  {
    criterion: 'Early-Tenure Vulnerability',
    condition: 'Years at company ≤ 2 yrs (+25) or 3–4 yrs (+10)',
    maxPoints: 25,
  },
  {
    criterion: 'Non-Full-Time Engagement',
    condition: 'Part-Time or Contract employment (+20)',
    maxPoints: 20,
  },
  {
    criterion: 'Promotion Stagnation',
    condition: 'Years since last promotion ≥ 5 yrs (+20) or 3–4 yrs (+10)',
    maxPoints: 20,
  },
  {
    criterion: 'Compensation & Grade Exposure',
    condition: 'Monthly income < £3,500 or Job Level 1–2 (+15)',
    maxPoints: 15,
  },
  {
    criterion: 'Travel & Commute Strain',
    condition: 'Frequent travel (+10) and/or commute ≥ 25 km (+10)',
    maxPoints: 20,
  },
] as const;

export function computeFlightRisk(emp: RawEmployeeRow): {
  score: number;
  band: FlightRiskBand;
  factors: RiskFactorBreakdown[];
} {
  const factors: RiskFactorBreakdown[] = [];

  if (emp.YearsAtCompany <= 2) {
    factors.push({ label: `Early tenure (${emp.YearsAtCompany}y)`, points: 25 });
  } else if (emp.YearsAtCompany <= 4) {
    factors.push({ label: `Mid-early tenure (${emp.YearsAtCompany}y)`, points: 10 });
  }

  if (emp.EmploymentType !== 'Full-Time') {
    factors.push({ label: `${emp.EmploymentType} contract`, points: 20 });
  }

  if (emp.YearsSinceLastPromotion >= 5) {
    factors.push({ label: `No promotion ${emp.YearsSinceLastPromotion}y`, points: 20 });
  } else if (emp.YearsSinceLastPromotion >= 3) {
    factors.push({ label: `Promotion gap ${emp.YearsSinceLastPromotion}y`, points: 10 });
  }

  if (emp.MonthlyIncome_GBP < 3500 || emp.JobLevel <= 2) {
    factors.push({
      label: emp.JobLevel <= 2 ? `Junior grade (L${emp.JobLevel})` : 'Income < £3.5k',
      points: 15,
    });
  }

  if (emp.BusinessTravel === 'Travel_Frequently') {
    factors.push({ label: 'Frequent travel', points: 10 });
  }

  if (emp.DistanceFromHome_km >= 25) {
    factors.push({ label: `Long commute (${emp.DistanceFromHome_km} km)`, points: 10 });
  }

  const score = Math.min(
    100,
    factors.reduce((sum, item) => sum + item.points, 0)
  );

  const band: FlightRiskBand = score >= 50 ? 'High' : score >= 30 ? 'Medium' : 'Low';
  return { score, band, factors };
}

export function applyFilters(
  employees: EnrichedEmployee[],
  filters: FilterState
): EnrichedEmployee[] {
  return employees.filter((emp) => {
    if (filters.department !== 'All' && emp.Department !== filters.department) return false;
    if (filters.location !== 'All' && emp.Location !== filters.location) return false;
    if (filters.employmentType !== 'All' && emp.EmploymentType !== filters.employmentType) return false;
    if (filters.gender !== 'All' && emp.Gender !== filters.gender) return false;
    if (filters.attrition !== 'All' && emp.Attrition !== filters.attrition) return false;
    return true;
  });
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactGBP(amount: number): string {
  if (amount >= 1_000_000) {
    return `£${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `£${(amount / 1_000).toFixed(1)}k`;
  }
  return formatGBP(amount);
}

export function formatTravelLabel(raw: string): string {
  if (raw === 'Travel_Frequently') return 'Travel Frequently';
  if (raw === 'Travel_Rarely') return 'Travel Rarely';
  if (raw === 'Non-Travel') return 'Non-Travel';
  return raw.replace(/_/g, ' ');
}

export interface GroupStat {
  label: string;
  total: number;
  active: number;
  leavers: number;
  attritionRate: number;
  avgIncome: number;
}

export function groupEmployeesBy(
  employees: EnrichedEmployee[],
  keyFn: (emp: EnrichedEmployee) => string
): GroupStat[] {
  const map = new Map<string, { total: number; active: number; leavers: number; incomeSum: number }>();

  for (const emp of employees) {
    const key = keyFn(emp);
    const curr = map.get(key) ?? { total: 0, active: 0, leavers: 0, incomeSum: 0 };
    curr.total += 1;
    if (emp.Attrition === 'Yes') curr.leavers += 1;
    else curr.active += 1;
    curr.incomeSum += emp.MonthlyIncome_GBP;
    map.set(key, curr);
  }

  return Array.from(map.entries()).map(([label, s]) => ({
    label,
    total: s.total,
    active: s.active,
    leavers: s.leavers,
    attritionRate: s.total > 0 ? (s.leavers / s.total) * 100 : 0,
    avgIncome: s.total > 0 ? s.incomeSum / s.total : 0,
  }));
}

export function computeBandStats(
  employees: EnrichedEmployee[],
  bands: { label: string; match: (emp: EnrichedEmployee) => boolean }[]
): GroupStat[] {
  return bands.map((b) => {
    const subset = employees.filter(b.match);
    const leavers = subset.filter((e) => e.Attrition === 'Yes').length;
    const active = subset.length - leavers;
    const incomeSum = subset.reduce((s, e) => s + e.MonthlyIncome_GBP, 0);
    return {
      label: b.label,
      total: subset.length,
      active,
      leavers,
      attritionRate: subset.length > 0 ? (leavers / subset.length) * 100 : 0,
      avgIncome: subset.length > 0 ? incomeSum / subset.length : 0,
    };
  });
}

export const AGE_BANDS = [
  { label: 'Under 25', match: (e: EnrichedEmployee) => e.Age < 25 },
  { label: '25–34', match: (e: EnrichedEmployee) => e.Age >= 25 && e.Age <= 34 },
  { label: '35–44', match: (e: EnrichedEmployee) => e.Age >= 35 && e.Age <= 44 },
  { label: '45–54', match: (e: EnrichedEmployee) => e.Age >= 45 && e.Age <= 54 },
  { label: '55+', match: (e: EnrichedEmployee) => e.Age >= 55 },
];

export const TENURE_BANDS = [
  { label: '0–2 yrs', match: (e: EnrichedEmployee) => e.YearsAtCompany <= 2 },
  { label: '3–5 yrs', match: (e: EnrichedEmployee) => e.YearsAtCompany >= 3 && e.YearsAtCompany <= 5 },
  { label: '6–10 yrs', match: (e: EnrichedEmployee) => e.YearsAtCompany >= 6 && e.YearsAtCompany <= 10 },
  { label: '11–15 yrs', match: (e: EnrichedEmployee) => e.YearsAtCompany >= 11 && e.YearsAtCompany <= 15 },
  { label: '16+ yrs', match: (e: EnrichedEmployee) => e.YearsAtCompany >= 16 },
];

export function generateDynamicInsights(
  filtered: EnrichedEmployee[],
  fullDataset: EnrichedEmployee[]
): { findings: FindingItem[]; actions: RecommendedAction[] } {
  if (filtered.length === 0) {
    return {
      findings: [
        {
          id: 'empty',
          category: 'Filter Scope',
          headline: 'No employee records match the current filter combination',
          detail: 'Reset one or more shared filters above to inspect workforce patterns and risk hotspots.',
          severity: 'info',
        },
      ],
      actions: [],
    };
  }

  const total = filtered.length;
  const leavers = filtered.filter((e) => e.Attrition === 'Yes');
  const active = filtered.filter((e) => e.Attrition === 'No');
  const attritionRate = (leavers.length / total) * 100;
  const fullAttritionRate =
    fullDataset.length > 0
      ? (fullDataset.filter((e) => e.Attrition === 'Yes').length / fullDataset.length) * 100
      : attritionRate;

  const findings: FindingItem[] = [];
  const actions: RecommendedAction[] = [];

  // 1. Overall attrition vs company baseline
  const delta = attritionRate - fullAttritionRate;
  const isSubset = total < fullDataset.length;
  findings.push({
    id: 'overall-attrition',
    category: 'Workforce Attrition',
    headline: `${attritionRate.toFixed(1)}% attrition across ${total} ${total === 1 ? 'employee' : 'employees'} (${leavers.length} leavers, ${active.length} active)`,
    detail: isSubset
      ? `This filtered cohort runs ${Math.abs(delta).toFixed(1)} percentage points ${
          delta >= 0 ? 'above' : 'below'
        } the full UK baseline of ${fullAttritionRate.toFixed(1)}%.`
      : `Monthly payroll across the ${active.length} active employees stands at ${formatGBP(
          active.reduce((s, e) => s + e.MonthlyIncome_GBP, 0)
        )} (${formatGBP(filtered.reduce((s, e) => s + e.MonthlyIncome_GBP, 0))} total filtered cohort).`,
    severity: attritionRate >= 25 ? 'critical' : attritionRate >= 18 ? 'warning' : 'positive',
  });

  // 2. Department hotspot
  const deptStats = groupEmployeesBy(filtered, (e) => e.Department).filter((d) => d.total >= 3);
  if (deptStats.length >= 2) {
    const sortedByAtt = [...deptStats].sort((a, b) => b.attritionRate - a.attritionRate);
    const highest = sortedByAtt[0];
    const lowest = sortedByAtt[sortedByAtt.length - 1];
    findings.push({
      id: 'dept-spread',
      category: 'Departmental Dispersion',
      headline: `${highest.label} leads attrition at ${highest.attritionRate.toFixed(1)}% (${highest.leavers}/${highest.total})`,
      detail: `By comparison, ${lowest.label} records ${lowest.attritionRate.toFixed(1)}% attrition (${lowest.leavers}/${lowest.total}) — a ${(
        highest.attritionRate - lowest.attritionRate
      ).toFixed(1)} pp spread across units with ≥3 staff.`,
      severity: highest.attritionRate >= 25 ? 'critical' : 'warning',
    });

    if (highest.attritionRate >= 20) {
      actions.push({
        id: 'action-dept-review',
        priority: highest.attritionRate >= 28 ? 'Immediate' : 'Near-Term',
        title: `Conduct stay-interview pulse in ${highest.label}`,
        rationale: `${highest.label} accounts for ${highest.leavers} leavers (${highest.attritionRate.toFixed(
          1
        )}% rate), significantly above peer business units.`,
        targetGroup: `${highest.label} (${highest.active} active staff)`,
        metricContext: `${highest.attritionRate.toFixed(1)}% attrition`,
      });
    }
  }

  // 3. Early-tenure retention cliff
  const earlyTenure = filtered.filter((e) => e.YearsAtCompany <= 2);
  const tenured = filtered.filter((e) => e.YearsAtCompany > 2);
  if (earlyTenure.length >= 3 && tenured.length >= 3) {
    const earlyRate = (earlyTenure.filter((e) => e.Attrition === 'Yes').length / earlyTenure.length) * 100;
    const tenuredRate = (tenured.filter((e) => e.Attrition === 'Yes').length / tenured.length) * 100;
    findings.push({
      id: 'early-tenure',
      category: 'Onboarding & Early Tenure',
      headline: `0–2 year cohort shows ${earlyRate.toFixed(1)}% attrition vs ${tenuredRate.toFixed(1)}% for >2 year staff`,
      detail: `${earlyTenure.filter((e) => e.Attrition === 'Yes').length} of ${
        earlyTenure.length
      } early-tenure employees exited, indicating onboarding and role-alignment sensitivity in the first 24 months.`,
      severity: earlyRate > tenuredRate + 10 ? 'critical' : 'info',
    });

    if (earlyRate >= 25) {
      actions.push({
        id: 'action-onboarding',
        priority: 'Immediate',
        title: 'Strengthen 90-day and 18-month onboarding checkpoints',
        rationale: `Early-tenure attrition (${earlyRate.toFixed(
          1
        )}%) is ${(earlyRate - tenuredRate).toFixed(1)} pp higher than established employees. Structured manager check-ins and buddy pairing directly curb early exits.`,
        targetGroup: `${earlyTenure.filter((e) => e.Attrition === 'No').length} active employees with ≤2 yrs tenure`,
        metricContext: `${earlyRate.toFixed(1)}% early-tenure attrition`,
      });
    }
  }

  // 4. Employment type comparison
  const fullTime = filtered.filter((e) => e.EmploymentType === 'Full-Time');
  const nonFullTime = filtered.filter((e) => e.EmploymentType !== 'Full-Time');
  if (fullTime.length >= 3 && nonFullTime.length >= 3) {
    const ftRate = (fullTime.filter((e) => e.Attrition === 'Yes').length / fullTime.length) * 100;
    const nftRate = (nonFullTime.filter((e) => e.Attrition === 'Yes').length / nonFullTime.length) * 100;
    findings.push({
      id: 'employment-type',
      category: 'Contract & Flexibility',
      headline: `Non-full-time staff exit at ${nftRate.toFixed(1)}% compared to ${ftRate.toFixed(1)}% for full-time`,
      detail: `${nonFullTime.length} part-time and contract employees (${((nonFullTime.length / total) * 100).toFixed(
        1
      )}% of filtered workforce) show a ${Math.abs(nftRate - ftRate).toFixed(1)} pp attrition gap.`,
      severity: nftRate > ftRate + 10 ? 'warning' : 'info',
    });

    if (nftRate >= 25) {
      actions.push({
        id: 'action-contract-conversion',
        priority: 'Near-Term',
        title: 'Audit Part-Time & Contract career conversion pathways',
        rationale: `Non-full-time attrition sits at ${nftRate.toFixed(
          1
        )}%. Offering clearer renewal notice, benefits parity, or permanent conversion paths protects institutional continuity.`,
        targetGroup: `${nonFullTime.filter((e) => e.Attrition === 'No').length} active non-full-time staff`,
        metricContext: `${nftRate.toFixed(1)}% non-FT attrition`,
      });
    }
  }

  // 5. Pay, promotion stagnation & flight risk
  const highRiskActive = active.filter((e) => e.flightRiskScore >= 50);
  const stagnantActive = active.filter((e) => e.YearsSinceLastPromotion >= 5);
  const avgIncomeActive =
    active.length > 0 ? active.reduce((s, e) => s + e.MonthlyIncome_GBP, 0) / active.length : 0;
  const avgIncomeLeavers =
    leavers.length > 0 ? leavers.reduce((s, e) => s + e.MonthlyIncome_GBP, 0) / leavers.length : 0;

  if (active.length > 0) {
    findings.push({
      id: 'risk-and-pay',
      category: 'Retention Exposure & Pay',
      headline: `${highRiskActive.length} active ${
        highRiskActive.length === 1 ? 'employee meets' : 'employees meet'
      } High Flight-Risk criteria (score ≥ 50)`,
      detail: `${stagnantActive.length} active staff have waited ≥5 years since last promotion${
        leavers.length > 0
          ? `, and leavers averaged ${formatGBP(avgIncomeLeavers)}/mo vs ${formatGBP(avgIncomeActive)}/mo for active staff.`
          : '.'
      }`,
      severity: highRiskActive.length >= 10 ? 'critical' : highRiskActive.length > 0 ? 'warning' : 'positive',
    });
  }

  if (stagnantActive.length > 0) {
    actions.push({
      id: 'action-promotion-audit',
      priority: stagnantActive.length >= 15 ? 'Near-Term' : 'Monitor',
      title: 'Run targeted progression & pay-band calibration review',
      rationale: `${stagnantActive.length} active employees have gone 5+ years without a promotion. Lateral mobility, technical tracks, or merit adjustments reduce silent disengagement.`,
      targetGroup: `${stagnantActive.length} active staff (≥5 yrs since promotion)`,
      metricContext: `${stagnantActive.length} stagnant roles`,
    });
  }

  // 6. Location / Travel hotspot if present
  const locStats = groupEmployeesBy(filtered, (e) => e.Location).filter((l) => l.total >= 5);
  if (locStats.length >= 2) {
    const topLoc = [...locStats].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    if (topLoc.attritionRate >= 22) {
      actions.push({
        id: 'action-site-mobility',
        priority: 'Monitor',
        title: `Evaluate hybrid & travel load at ${topLoc.label}`,
        rationale: `${topLoc.label} records the highest site attrition (${topLoc.attritionRate.toFixed(
          1
        )}%, ${topLoc.leavers}/${topLoc.total}). Reviewing commute support and travel cadence can stabilize local retention.`,
        targetGroup: `${topLoc.label} site (${topLoc.active} active)`,
        metricContext: `${topLoc.attritionRate.toFixed(1)}% site attrition`,
      });
    }
  }

  // Ensure at least one constructive action if cohort is healthy
  if (actions.length === 0 && active.length > 0) {
    actions.push({
      id: 'action-maintain',
      priority: 'Monitor',
      title: 'Maintain quarterly manager stay-conversations across high-score watchlist',
      rationale: `Attrition in this filtered view is contained (${attritionRate.toFixed(
        1
      )}%). Proactive check-ins with the ${highRiskActive.length} high-risk active employees preserve stability.`,
      targetGroup: `Top ${Math.min(10, active.length)} watchlist cohort`,
      metricContext: `${highRiskActive.length} high-risk active`,
    });
  }

  return { findings, actions };
}
