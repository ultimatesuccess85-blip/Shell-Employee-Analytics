export type TabKey = 'overview' | 'deep-dive' | 'insights';

export type AttritionStatus = 'Yes' | 'No';

export type FlightRiskBand = 'High' | 'Medium' | 'Low';

export interface RiskFactorBreakdown {
  label: string;
  points: number;
}

export interface RawEmployeeRow {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  Gender: string;
  Age: number;
  MaritalStatus: string;
  Department: string;
  JobTitle: string;
  JobLevel: number;
  EmploymentType: string;
  Location: string;
  HireDate: string;
  YearsAtCompany: number;
  YearsInCurrentRole: number;
  YearsSinceLastPromotion: number;
  YearsWithCurrManager: number;
  Education: string;
  DistanceFromHome_km: number;
  BusinessTravel: string;
  MonthlyIncome_GBP: number;
  Attrition: AttritionStatus;
}

export interface EnrichedEmployee extends RawEmployeeRow {
  fullName: string;
  hireYear: number | null;
  flightRiskScore: number;
  flightRiskBand: FlightRiskBand;
  riskFactors: RiskFactorBreakdown[];
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: 'All' | 'No' | 'Yes';
}

export interface DataSourceMeta {
  type: 'sheet' | 'csv';
  label: string;
  syncedAt: string;
  rowCount: number;
}

export interface FindingItem {
  id: string;
  category: string;
  headline: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical' | 'positive';
}

export interface RecommendedAction {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Monitor';
  title: string;
  rationale: string;
  targetGroup: string;
  metricContext: string;
}
