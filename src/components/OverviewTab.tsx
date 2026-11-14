import { useMemo } from 'react';
import { EnrichedEmployee } from '../types/hr';
import {
  formatCompactGBP,
  formatGBP,
  groupEmployeesBy,
  median,
} from '../utils/analytics';
import { ChartCanvas } from './ChartCanvas';
import { KpiCard } from './KpiCard';

interface OverviewTabProps {
  employees: EnrichedEmployee[];
  isDark: boolean;
}

export function OverviewTab({ employees, isDark }: OverviewTabProps) {
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.Attrition === 'No');
    const leavers = employees.filter((e) => e.Attrition === 'Yes');
    const attritionRate = total > 0 ? (leavers.length / total) * 100 : 0;

    const incomes = employees.map((e) => e.MonthlyIncome_GBP);
    const avgIncome = total > 0 ? incomes.reduce((s, v) => s + v, 0) / total : 0;
    const medianIncome = median(incomes);

    const activePayroll = active.reduce((s, e) => s + e.MonthlyIncome_GBP, 0);
    const totalPayroll = employees.reduce((s, e) => s + e.MonthlyIncome_GBP, 0);
    const displayPayroll = active.length > 0 ? activePayroll : totalPayroll;

    const byDept = groupEmployeesBy(employees, (e) => e.Department).sort(
      (a, b) => b.total - a.total
    );
    const byLocation = groupEmployeesBy(employees, (e) => e.Location).sort(
      (a, b) => b.total - a.total
    );
    const byGender = groupEmployeesBy(employees, (e) => e.Gender).sort(
      (a, b) => b.total - a.total
    );
    const byEmployment = groupEmployeesBy(employees, (e) => e.EmploymentType).sort(
      (a, b) => b.total - a.total
    );

    const yearMap = new Map<number, { total: number; active: number; leavers: number }>();
    for (const emp of employees) {
      if (!emp.hireYear) continue;
      const curr = yearMap.get(emp.hireYear) ?? { total: 0, active: 0, leavers: 0 };
      curr.total += 1;
      if (emp.Attrition === 'Yes') curr.leavers += 1;
      else curr.active += 1;
      yearMap.set(emp.hireYear, curr);
    }
    const hiringTrend = Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, counts]) => ({ year: String(year), ...counts }));

    return {
      total,
      activeCount: active.length,
      leaverCount: leavers.length,
      attritionRate,
      avgIncome,
      medianIncome,
      displayPayroll,
      payrollIsActiveOnly: active.length > 0,
      byDept,
      byLocation,
      byGender,
      byEmployment,
      hiringTrend,
    };
  }, [employees]);

  const isEmpty = stats.total === 0;

  return (
    <div className="space-y-6">
      {/* 5 Overview KPIs */}
      <section aria-label="Overview key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Headcount"
            value={stats.total.toLocaleString('en-GB')}
            subtext={`${stats.activeCount} active · ${stats.leaverCount} leavers`}
          />
          <KpiCard
            label="Attrition Rate"
            value={`${stats.attritionRate.toFixed(1)}%`}
            subtext={`${stats.leaverCount} exited in filtered cohort`}
            accentTone={
              stats.attritionRate >= 25
                ? 'danger'
                : stats.attritionRate >= 18
                  ? 'warning'
                  : 'positive'
            }
          />
          <KpiCard
            label="Active Employees"
            value={stats.activeCount.toLocaleString('en-GB')}
            subtext={
              stats.total > 0
                ? `${((stats.activeCount / stats.total) * 100).toFixed(1)}% retention share`
                : '0.0% retention share'
            }
            accentTone="positive"
          />
          <KpiCard
            label="Average Monthly Income"
            value={formatGBP(stats.avgIncome)}
            subtext={`Median ${formatGBP(stats.medianIncome)} / mo`}
          />
          <KpiCard
            label={stats.payrollIsActiveOnly ? 'Active Monthly Payroll' : 'Cohort Monthly Payroll'}
            value={formatCompactGBP(stats.displayPayroll)}
            subtext={`${formatCompactGBP(stats.displayPayroll * 12)} annualised`}
          />
        </div>
      </section>

      {/* Primary Distribution Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCanvas
          title="Workforce by Department"
          subtitle="Active headcount vs. leavers across UK business units"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-80"
          deps={[stats.byDept]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: stats.byDept.map((d) => d.label),
              datasets: [
                {
                  label: 'Active',
                  data: stats.byDept.map((d) => d.active),
                  backgroundColor: t.shellYellow,
                  borderRadius: 3,
                },
                {
                  label: 'Leavers',
                  data: stats.byDept.map((d) => d.leavers),
                  backgroundColor: t.shellOrange,
                  borderRadius: 3,
                },
              ],
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  align: 'end',
                  labels: { color: t.textMuted, boxWidth: 12, usePointStyle: true },
                },
                tooltip: {
                  backgroundColor: t.tooltipBg,
                  titleColor: t.tooltipText,
                  bodyColor: t.tooltipText,
                  borderColor: t.tooltipBorder,
                  borderWidth: 1,
                  callbacks: {
                    afterBody: (items) => {
                      const idx = items[0]?.dataIndex ?? 0;
                      const row = stats.byDept[idx];
                      return row
                        ? `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`
                        : '';
                    },
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  grid: { color: t.gridColor },
                  ticks: { color: t.textMuted, precision: 0 },
                },
                y: {
                  stacked: true,
                  grid: { display: false },
                  ticks: { color: t.textPrimary, font: { size: 11 } },
                },
              },
            },
          })}
        />

        <ChartCanvas
          title="Headcount by UK Location"
          subtitle="Site distribution split by active staff and leavers"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-80"
          deps={[stats.byLocation]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: stats.byLocation.map((l) => l.label),
              datasets: [
                {
                  label: 'Active',
                  data: stats.byLocation.map((l) => l.active),
                  backgroundColor: t.charcoal,
                  borderRadius: 3,
                },
                {
                  label: 'Leavers',
                  data: stats.byLocation.map((l) => l.leavers),
                  backgroundColor: t.shellOrange,
                  borderRadius: 3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  align: 'end',
                  labels: { color: t.textMuted, boxWidth: 12, usePointStyle: true },
                },
                tooltip: {
                  backgroundColor: t.tooltipBg,
                  titleColor: t.tooltipText,
                  bodyColor: t.tooltipText,
                  borderColor: t.tooltipBorder,
                  borderWidth: 1,
                  callbacks: {
                    afterBody: (items) => {
                      const idx = items[0]?.dataIndex ?? 0;
                      const row = stats.byLocation[idx];
                      return row
                        ? `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`
                        : '';
                    },
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  grid: { display: false },
                  ticks: { color: t.textPrimary, font: { size: 11 } },
                },
                y: {
                  stacked: true,
                  grid: { color: t.gridColor },
                  ticks: { color: t.textMuted, precision: 0 },
                },
              },
            },
          })}
        />
      </div>

      {/* Demographic & Contract Mix */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCanvas
          title="Gender Composition"
          subtitle="Headcount share and attrition rate by gender"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
          deps={[stats.byGender]}
          buildConfig={(t) => ({
            type: 'doughnut',
            data: {
              labels: stats.byGender.map((g) => g.label),
              datasets: [
                {
                  data: stats.byGender.map((g) => g.total),
                  backgroundColor: [t.shellYellow, t.charcoal, t.shellOrange],
                  borderColor: t.surfaceBg,
                  borderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '62%',
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    color: t.textPrimary,
                    boxWidth: 12,
                    padding: 16,
                  },
                },
                tooltip: {
                  backgroundColor: t.tooltipBg,
                  titleColor: t.tooltipText,
                  bodyColor: t.tooltipText,
                  callbacks: {
                    label: (ctx) => {
                      const row = stats.byGender[ctx.dataIndex];
                      if (!row) return '';
                      const pct = stats.total > 0 ? ((row.total / stats.total) * 100).toFixed(1) : '0.0';
                      return ` ${row.label}: ${row.total} (${pct}%) · Attrition ${row.attritionRate.toFixed(1)}%`;
                    },
                  },
                },
              },
            },
          })}
        />

        <ChartCanvas
          title="Employment Type Mix"
          subtitle="Full-Time, Part-Time, and Contract headcount with attrition rate"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
          deps={[stats.byEmployment]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: stats.byEmployment.map((e) => e.label),
              datasets: [
                {
                  label: 'Active',
                  data: stats.byEmployment.map((e) => e.active),
                  backgroundColor: t.shellYellow,
                  borderRadius: 3,
                },
                {
                  label: 'Leavers',
                  data: stats.byEmployment.map((e) => e.leavers),
                  backgroundColor: t.crimson,
                  borderRadius: 3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  align: 'end',
                  labels: { color: t.textMuted, boxWidth: 12, usePointStyle: true },
                },
                tooltip: {
                  backgroundColor: t.tooltipBg,
                  titleColor: t.tooltipText,
                  bodyColor: t.tooltipText,
                  callbacks: {
                    afterBody: (items) => {
                      const idx = items[0]?.dataIndex ?? 0;
                      const row = stats.byEmployment[idx];
                      return row
                        ? `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`
                        : '';
                    },
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  grid: { display: false },
                  ticks: { color: t.textPrimary },
                },
                y: {
                  stacked: true,
                  grid: { color: t.gridColor },
                  ticks: { color: t.textMuted, precision: 0 },
                },
              },
            },
          })}
        />
      </div>

      {/* Full-Width Hiring Trend */}
      <ChartCanvas
        title="Annual Hiring Trend"
        subtitle="Employees hired by calendar year (split by total intake and retained cohort)"
        isDark={isDark}
        isEmpty={isEmpty || stats.hiringTrend.length === 0}
        heightClass="h-72"
        deps={[stats.hiringTrend]}
        buildConfig={(t) => ({
          type: 'line',
          data: {
            labels: stats.hiringTrend.map((h) => h.year),
            datasets: [
              {
                label: 'Total Hires',
                data: stats.hiringTrend.map((h) => h.total),
                borderColor: t.shellOrange,
                backgroundColor: isDark
                  ? 'rgba(245, 130, 32, 0.16)'
                  : 'rgba(245, 130, 32, 0.12)',
                fill: true,
                tension: 0.28,
                pointRadius: 3.5,
                pointBackgroundColor: t.shellOrange,
                borderWidth: 2.5,
              },
              {
                label: 'Still Active',
                data: stats.hiringTrend.map((h) => h.active),
                borderColor: t.shellYellow,
                backgroundColor: 'transparent',
                tension: 0.28,
                pointRadius: 3,
                pointBackgroundColor: t.shellYellow,
                borderWidth: 2,
                borderDash: [4, 3],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: {
                position: 'top',
                align: 'end',
                labels: { color: t.textMuted, boxWidth: 12, usePointStyle: true },
              },
              tooltip: {
                backgroundColor: t.tooltipBg,
                titleColor: t.tooltipText,
                bodyColor: t.tooltipText,
                borderColor: t.tooltipBorder,
                borderWidth: 1,
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: t.textMuted, maxRotation: 0, autoSkip: true },
              },
              y: {
                beginAtZero: true,
                grid: { color: t.gridColor },
                ticks: { color: t.textMuted, precision: 0 },
              },
            },
          },
        })}
      />
    </div>
  );
}
