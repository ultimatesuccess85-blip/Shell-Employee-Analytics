import { useMemo } from 'react';
import { EnrichedEmployee, FilterState } from '../types/hr';
import {
  FLIGHT_RISK_RULES,
  formatGBP,
  formatTravelLabel,
  generateDynamicInsights,
} from '../utils/analytics';

interface InsightsTabProps {
  employees: EnrichedEmployee[];
  fullDataset: EnrichedEmployee[];
  filters: FilterState;
}

export function InsightsTab({
  employees,
  fullDataset,
  filters,
}: InsightsTabProps) {
  const { findings, actions } = useMemo(
    () => generateDynamicInsights(employees, fullDataset),
    [employees, fullDataset]
  );

  const watchlist = useMemo(() => {
    const active = employees.filter((e) => e.Attrition === 'No');
    return [...active]
      .sort((a, b) => {
        if (b.flightRiskScore !== a.flightRiskScore) {
          return b.flightRiskScore - a.flightRiskScore;
        }
        return a.YearsAtCompany - b.YearsAtCompany;
      })
      .slice(0, 10);
  }, [employees]);

  const severityLabel = (severity: 'info' | 'warning' | 'critical' | 'positive') => {
    if (severity === 'critical') {
      return {
        text: 'High Signal',
        cls: 'text-[#DC2626] dark:text-[#F87171]',
      };
    }
    if (severity === 'warning') {
      return {
        text: 'Watchpoint',
        cls: 'text-[#C25E00] dark:text-[#F58220]',
      };
    }
    if (severity === 'positive') {
      return {
        text: 'Nominal',
        cls: 'text-[#15803D] dark:text-[#4ADE80]',
      };
    }
    return {
      text: 'Observation',
      cls: 'text-[#5A5A62] dark:text-[#A1A1AA]',
    };
  };

  const priorityTone = (priority: 'Immediate' | 'Near-Term' | 'Monitor') => {
    if (priority === 'Immediate') return 'text-[#DC2626] dark:text-[#F87171]';
    if (priority === 'Near-Term') return 'text-[#C25E00] dark:text-[#F58220]';
    return 'text-[#15803D] dark:text-[#4ADE80]';
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Auto-Generated Filter-Aware Findings */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
            Auto-Generated Workforce Findings
          </h2>
          <span className="text-xs text-[#5A5A62] dark:text-[#A1A1AA] tabular-nums">
            Computed dynamically across {employees.length} filtered records
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {findings.map((item) => {
            const sev = severityLabel(item.severity);
            return (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-lg border border-[#E5E5E0] bg-white p-4 sm:p-5 dark:border-[#26262B] dark:bg-[#141417]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-[#5A5A62] dark:text-[#A1A1AA]">
                      {item.category}
                    </span>
                    <span className={`font-semibold ${sev.cls}`}>
                      {sev.text}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-sm sm:text-[15px] font-bold leading-snug text-[#0D0D0F] dark:text-[#F5F5F4]">
                    {item.headline}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4A4A50] dark:text-[#B4B4BC]">
                    {item.detail}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Section 2: Transparent Flight-Risk Scoring Model */}
      <section className="rounded-lg border border-[#E5E5E0] bg-white p-4 sm:p-5 dark:border-[#26262B] dark:bg-[#141417]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between border-b border-[#EFEFED] pb-3 dark:border-[#222228]">
          <div>
            <h2 className="font-display text-base font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
              Transparent Flight-Risk Scoring Rule (0–100 Scale)
            </h2>
            <p className="mt-0.5 text-xs text-[#5A5A62] dark:text-[#A1A1AA]">
              Every active employee is scored deterministically across five observable HR indicators.
            </p>
          </div>
          <div className="text-xs font-medium text-[#0D0D0F] dark:text-[#F5F5F4] tabular-nums whitespace-nowrap">
            High Risk ≥ 50 · Medium 30–49 · Low &lt; 30
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {FLIGHT_RISK_RULES.map((rule) => (
            <div
              key={rule.criterion}
              className="flex flex-col justify-between rounded-md border border-[#EFEFED] bg-[#FAF9F5] p-3 dark:border-[#24242B] dark:bg-[#1A1A1F]"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0D0D0F] dark:text-[#F5F5F4]">
                    {rule.criterion}
                  </span>
                  <span className="font-mono-num text-xs font-bold text-[#C25E00] dark:text-[#FFC800] shrink-0">
                    +{rule.maxPoints}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5A5A62] dark:text-[#A1A1AA]">
                  {rule.condition}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Top-10 Flight-Risk Watchlist */}
      <section className="rounded-lg border border-[#E5E5E0] bg-white dark:border-[#26262B] dark:bg-[#141417]">
        <div className="flex flex-col gap-1 border-b border-[#E5E5E0] p-4 sm:flex-row sm:items-baseline sm:justify-between dark:border-[#26262B]">
          <div>
            <h2 className="font-display text-base font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
              Top-10 Active Flight-Risk Watchlist
            </h2>
            <p className="mt-0.5 text-xs text-[#5A5A62] dark:text-[#A1A1AA]">
              Highest-scoring active employees within the current filter selection, ranked for proactive HR outreach.
            </p>
          </div>
          <span className="text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA] tabular-nums">
            Showing {watchlist.length} active employees
          </span>
        </div>

        {filters.attrition === 'Yes' ? (
          <div className="p-6 text-center text-sm text-[#5A5A62] dark:text-[#A1A1AA]">
            Attrition filter is currently set to <strong>Leavers Only (Yes)</strong>. Switch Attrition to <strong>All</strong> or <strong>Active Only (No)</strong> to view active employees at retention risk.
          </div>
        ) : watchlist.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#5A5A62] dark:text-[#A1A1AA]">
            No active employees match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] text-xs font-semibold text-[#5A5A62] dark:border-[#26262B] dark:bg-[#1A1A1F] dark:text-[#A1A1AA]">
                  <th className="px-4 py-2.5 text-left">Rank</th>
                  <th className="px-4 py-2.5 text-left">Employee</th>
                  <th className="px-4 py-2.5 text-left">Department & Site</th>
                  <th className="px-4 py-2.5 text-right">Tenure</th>
                  <th className="px-4 py-2.5 text-right">Promo Gap</th>
                  <th className="px-4 py-2.5 text-right">Monthly Pay</th>
                  <th className="px-4 py-2.5 text-right">Risk Score</th>
                  <th className="px-4 py-2.5 text-left">Triggered Drivers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFED] dark:divide-[#222228]">
                {watchlist.map((emp, idx) => {
                  const scoreColor =
                    emp.flightRiskBand === 'High'
                      ? 'text-[#DC2626] dark:text-[#F87171]'
                      : emp.flightRiskBand === 'Medium'
                        ? 'text-[#C25E00] dark:text-[#F58220]'
                        : 'text-[#15803D] dark:text-[#4ADE80]';

                  return (
                    <tr
                      key={emp.EmployeeID}
                      className="hover:bg-[#FAF9F5] dark:hover:bg-[#1B1B20]"
                    >
                      <td className="px-4 py-3 font-mono-num text-xs font-semibold text-[#5A5A62] dark:text-[#A1A1AA]">
                        #{idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap">
                          {emp.fullName}
                        </div>
                        <div className="text-xs text-[#5A5A62] dark:text-[#A1A1AA]">
                          {emp.EmployeeID} · {emp.JobTitle} (L{emp.JobLevel})
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#0D0D0F] dark:text-[#E4E4E7]">
                        <div>{emp.Department}</div>
                        <div className="text-[#5A5A62] dark:text-[#A1A1AA]">
                          {emp.Location} · {emp.EmploymentType}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-xs text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap">
                        {emp.YearsAtCompany} yrs
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-xs text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap">
                        {emp.YearsSinceLastPromotion} yrs
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-xs font-medium text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap">
                        {formatGBP(emp.MonthlyIncome_GBP)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono-num text-xs font-bold whitespace-nowrap ${scoreColor}`}>
                        {emp.flightRiskScore} / 100 · {emp.flightRiskBand}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#4A4A50] dark:text-[#B4B4BC]">
                        {emp.riskFactors.length > 0
                          ? emp.riskFactors
                              .map((f) => `${f.label} (+${f.points})`)
                              .join(' · ')
                          : `${formatTravelLabel(emp.BusinessTravel)} · Low baseline risk`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 4: Recommended Actions */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
            Recommended HR Actions
          </h2>
          <span className="text-xs text-[#5A5A62] dark:text-[#A1A1AA]">
            Prioritised interventions grounded in current filter metrics
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="rounded-lg border border-[#E5E5E0] bg-white p-5 text-sm text-[#5A5A62] dark:border-[#26262B] dark:bg-[#141417] dark:text-[#A1A1AA]">
            Adjust filters above to generate targeted retention recommendations.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className="flex flex-col justify-between rounded-lg border border-[#E5E5E0] bg-white p-4 sm:p-5 dark:border-[#26262B] dark:bg-[#141417]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className={`font-semibold ${priorityTone(action.priority)}`}>
                      Priority: {action.priority}
                    </span>
                    <span className="font-mono-num text-[#5A5A62] dark:text-[#A1A1AA]">
                      {action.metricContext}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-sm sm:text-[15px] font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
                    0{index + 1}. {action.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4A4A50] dark:text-[#B4B4BC]">
                    {action.rationale}
                  </p>
                </div>

                <div className="mt-3 border-t border-[#EFEFED] pt-2.5 text-xs text-[#5A5A62] dark:border-[#222228] dark:text-[#A1A1AA]">
                  Target cohort: <strong className="text-[#0D0D0F] dark:text-[#F5F5F4]">{action.targetGroup}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
