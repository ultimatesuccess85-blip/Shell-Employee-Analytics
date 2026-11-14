import { Fragment, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { EnrichedEmployee } from '../types/hr';
import {
  AGE_BANDS,
  computeBandStats,
  formatGBP,
  formatTravelLabel,
  groupEmployeesBy,
  median,
  TENURE_BANDS,
} from '../utils/analytics';
import { ChartCanvas } from './ChartCanvas';
import { KpiCard } from './KpiCard';

interface DeepDiveTabProps {
  employees: EnrichedEmployee[];
  isDark: boolean;
}

type SortKey =
  | 'EmployeeID'
  | 'fullName'
  | 'Department'
  | 'Location'
  | 'JobLevel'
  | 'EmploymentType'
  | 'YearsAtCompany'
  | 'YearsSinceLastPromotion'
  | 'MonthlyIncome_GBP'
  | 'flightRiskScore'
  | 'Attrition';

export function DeepDiveTab({ employees, isDark }: DeepDiveTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('flightRiskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.Attrition === 'No');

    const tenures = employees.map((e) => e.YearsAtCompany);
    const avgTenure = total > 0 ? tenures.reduce((s, v) => s + v, 0) / total : 0;
    const medTenure = median(tenures);

    const femaleCount = employees.filter((e) => e.Gender === 'Female').length;
    const femaleShare = total > 0 ? (femaleCount / total) * 100 : 0;

    const nonFullTimeCount = employees.filter((e) => e.EmploymentType !== 'Full-Time').length;
    const nonFullTimeShare = total > 0 ? (nonFullTimeCount / total) * 100 : 0;

    const promoYears = employees.map((e) => e.YearsSinceLastPromotion);
    const avgPromoYears = total > 0 ? promoYears.reduce((s, v) => s + v, 0) / total : 0;
    const stagnantCount = employees.filter((e) => e.YearsSinceLastPromotion >= 5).length;

    const highRiskActive = active.filter((e) => e.flightRiskScore >= 50);

    const ageBands = computeBandStats(employees, AGE_BANDS);
    const tenureBands = computeBandStats(employees, TENURE_BANDS);

    const byLevel = groupEmployeesBy(employees, (e) => `Level ${e.JobLevel}`).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    const incomeByDept = groupEmployeesBy(employees, (e) => e.Department).sort(
      (a, b) => b.avgIncome - a.avgIncome
    );

    const eduOrder = ['Below College', 'College', "Bachelor's", "Master's", 'Doctorate'];
    const byEducation = groupEmployeesBy(employees, (e) => e.Education).sort((a, b) => {
      const ia = eduOrder.indexOf(a.label);
      const ib = eduOrder.indexOf(b.label);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const travelOrder = ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'];
    const byTravel = groupEmployeesBy(employees, (e) => e.BusinessTravel).sort((a, b) => {
      const ia = travelOrder.indexOf(a.label);
      const ib = travelOrder.indexOf(b.label);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const scatterActive = employees
      .filter((e) => e.Attrition === 'No')
      .map((e) => ({
        x: e.YearsAtCompany,
        y: e.MonthlyIncome_GBP,
        emp: e,
      }));

    const scatterLeavers = employees
      .filter((e) => e.Attrition === 'Yes')
      .map((e) => ({
        x: e.YearsAtCompany,
        y: e.MonthlyIncome_GBP,
        emp: e,
      }));

    return {
      total,
      activeCount: active.length,
      avgTenure,
      medTenure,
      femaleCount,
      femaleShare,
      nonFullTimeCount,
      nonFullTimeShare,
      avgPromoYears,
      stagnantCount,
      highRiskCount: highRiskActive.length,
      ageBands,
      tenureBands,
      byLevel,
      incomeByDept,
      byEducation,
      byTravel,
      scatterActive,
      scatterLeavers,
    };
  }, [employees]);

  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? employees.filter(
          (e) =>
            e.EmployeeID.toLowerCase().includes(q) ||
            e.fullName.toLowerCase().includes(q) ||
            e.JobTitle.toLowerCase().includes(q) ||
            e.Department.toLowerCase().includes(q) ||
            e.Location.toLowerCase().includes(q)
        )
      : employees;

    const sorted = [...searched].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir;
      }
      return String(valA).localeCompare(String(valB)) * dir;
    });

    return sorted;
  }, [employees, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, safePage, pageSize]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'MonthlyIncome_GBP' ||
          key === 'flightRiskScore' ||
          key === 'YearsAtCompany' ||
          key === 'YearsSinceLastPromotion' ||
          key === 'JobLevel'
          ? 'desc'
          : 'asc'
      );
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#F58220]" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#F58220]" aria-hidden="true" />
    );
  };

  const isEmpty = metrics.total === 0;

  return (
    <div className="space-y-6">
      {/* 5 Deep Dive KPIs */}
      <section aria-label="Deep dive key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Average Tenure"
            value={`${metrics.avgTenure.toFixed(1)} yrs`}
            subtext={`Median ${metrics.medTenure.toFixed(1)} yrs at Shell`}
          />
          <KpiCard
            label="Female Share"
            value={`${metrics.femaleShare.toFixed(1)}%`}
            subtext={`${metrics.femaleCount} of ${metrics.total} employees`}
          />
          <KpiCard
            label="Non-Full-Time Share"
            value={`${metrics.nonFullTimeShare.toFixed(1)}%`}
            subtext={`${metrics.nonFullTimeCount} Part-Time / Contract`}
            accentTone={metrics.nonFullTimeShare >= 25 ? 'warning' : 'default'}
          />
          <KpiCard
            label="Years Since Promotion"
            value={`${metrics.avgPromoYears.toFixed(1)} yrs`}
            subtext={`${metrics.stagnantCount} staff ≥5 yrs without promotion`}
            accentTone={metrics.avgPromoYears >= 4 ? 'warning' : 'default'}
          />
          <KpiCard
            label="High Flight-Risk Count"
            value={metrics.highRiskCount.toLocaleString('en-GB')}
            subtext={
              metrics.activeCount > 0
                ? `${((metrics.highRiskCount / metrics.activeCount) * 100).toFixed(1)}% of ${metrics.activeCount} active staff (score ≥ 50)`
                : 'No active staff in filtered view'
            }
            accentTone={
              metrics.highRiskCount >= 10
                ? 'danger'
                : metrics.highRiskCount > 0
                  ? 'warning'
                  : 'positive'
            }
          />
        </div>
      </section>

      {/* Age & Tenure Bands with Attrition */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCanvas
          title="Age Bands & Attrition Rate"
          subtitle="Headcount bars (left) paired with attrition percentage (right)"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[metrics.ageBands]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: metrics.ageBands.map((b) => b.label),
              datasets: [
                {
                  type: 'bar',
                  label: 'Headcount',
                  data: metrics.ageBands.map((b) => b.total),
                  backgroundColor: t.shellYellow,
                  borderRadius: 3,
                  yAxisID: 'y',
                  order: 2,
                },
                {
                  type: 'line',
                  label: 'Attrition %',
                  data: metrics.ageBands.map((b) => Number(b.attritionRate.toFixed(1))),
                  borderColor: t.crimson,
                  backgroundColor: t.crimson,
                  borderWidth: 2.5,
                  pointRadius: 4,
                  tension: 0.25,
                  yAxisID: 'y1',
                  order: 1,
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
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: t.textPrimary } },
                y: {
                  position: 'left',
                  beginAtZero: true,
                  grid: { color: t.gridColor },
                  ticks: { color: t.textMuted, precision: 0 },
                },
                y1: {
                  position: 'right',
                  beginAtZero: true,
                  suggestedMax: 50,
                  grid: { drawOnChartArea: false },
                  ticks: {
                    color: t.crimson,
                    callback: (v) => `${v}%`,
                  },
                },
              },
            },
          })}
        />

        <ChartCanvas
          title="Tenure Bands & Attrition Rate"
          subtitle="Retention profile across years at Shell (left) vs. attrition % (right)"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[metrics.tenureBands]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: metrics.tenureBands.map((b) => b.label),
              datasets: [
                {
                  type: 'bar',
                  label: 'Headcount',
                  data: metrics.tenureBands.map((b) => b.total),
                  backgroundColor: t.charcoal,
                  borderRadius: 3,
                  yAxisID: 'y',
                  order: 2,
                },
                {
                  type: 'line',
                  label: 'Attrition %',
                  data: metrics.tenureBands.map((b) => Number(b.attritionRate.toFixed(1))),
                  borderColor: t.shellOrange,
                  backgroundColor: t.shellOrange,
                  borderWidth: 2.5,
                  pointRadius: 4,
                  tension: 0.25,
                  yAxisID: 'y1',
                  order: 1,
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
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: t.textPrimary } },
                y: {
                  position: 'left',
                  beginAtZero: true,
                  grid: { color: t.gridColor },
                  ticks: { color: t.textMuted, precision: 0 },
                },
                y1: {
                  position: 'right',
                  beginAtZero: true,
                  suggestedMax: 50,
                  grid: { drawOnChartArea: false },
                  ticks: {
                    color: t.shellOrange,
                    callback: (v) => `${v}%`,
                  },
                },
              },
            },
          })}
        />
      </div>

      {/* Compensation by Level & Department */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCanvas
          title="Average Monthly Income by Job Level"
          subtitle="Mean base monthly pay (GBP) across Shell job grades 1–5"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[metrics.byLevel]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: metrics.byLevel.map((l) => l.label),
              datasets: [
                {
                  label: 'Avg Monthly Income (GBP)',
                  data: metrics.byLevel.map((l) => Math.round(l.avgIncome)),
                  backgroundColor: t.shellYellow,
                  borderRadius: 4,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: t.tooltipBg,
                  titleColor: t.tooltipText,
                  bodyColor: t.tooltipText,
                  callbacks: {
                    label: (ctx) => {
                      const row = metrics.byLevel[ctx.dataIndex];
                      return ` ${formatGBP(row.avgIncome)}/mo · ${row.total} staff`;
                    },
                  },
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: t.textPrimary } },
                y: {
                  beginAtZero: true,
                  grid: { color: t.gridColor },
                  ticks: {
                    color: t.textMuted,
                    callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
                  },
                },
              },
            },
          })}
        />

        <ChartCanvas
          title="Average Monthly Income by Department"
          subtitle="Departments ranked by mean monthly compensation (GBP)"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[metrics.incomeByDept]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: metrics.incomeByDept.map((d) => d.label),
              datasets: [
                {
                  label: 'Avg Monthly Income (GBP)',
                  data: metrics.incomeByDept.map((d) => Math.round(d.avgIncome)),
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
                legend: { display: false },
                tooltip: {
                  backgroundColor: t.tooltipBg,
                  titleColor: t.tooltipText,
                  bodyColor: t.tooltipText,
                  callbacks: {
                    label: (ctx) => {
                      const row = metrics.incomeByDept[ctx.dataIndex];
                      return ` ${formatGBP(row.avgIncome)}/mo · ${row.total} staff`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                  grid: { color: t.gridColor },
                  ticks: {
                    color: t.textMuted,
                    callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
                  },
                },
                y: {
                  grid: { display: false },
                  ticks: { color: t.textPrimary, font: { size: 11 } },
                },
              },
            },
          })}
        />
      </div>

      {/* Education & Business Travel */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCanvas
          title="Education Level & Attrition"
          subtitle="Academic background split by active vs. exited employees"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[metrics.byEducation]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: metrics.byEducation.map((e) => e.label),
              datasets: [
                {
                  label: 'Active',
                  data: metrics.byEducation.map((e) => e.active),
                  backgroundColor: t.shellYellow,
                  borderRadius: 3,
                },
                {
                  label: 'Leavers',
                  data: metrics.byEducation.map((e) => e.leavers),
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
                      const row = metrics.byEducation[items[0]?.dataIndex ?? 0];
                      return row ? `Attrition: ${row.attritionRate.toFixed(1)}%` : '';
                    },
                  },
                },
              },
              scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: t.textPrimary } },
                y: {
                  stacked: true,
                  grid: { color: t.gridColor },
                  ticks: { color: t.textMuted, precision: 0 },
                },
              },
            },
          })}
        />

        <ChartCanvas
          title="Business Travel & Attrition"
          subtitle="Headcount by travel cadence alongside attrition rate (%)"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[metrics.byTravel]}
          buildConfig={(t) => ({
            type: 'bar',
            data: {
              labels: metrics.byTravel.map((tr) => formatTravelLabel(tr.label)),
              datasets: [
                {
                  type: 'bar',
                  label: 'Headcount',
                  data: metrics.byTravel.map((tr) => tr.total),
                  backgroundColor: t.charcoal,
                  borderRadius: 3,
                  yAxisID: 'y',
                  order: 2,
                },
                {
                  type: 'line',
                  label: 'Attrition %',
                  data: metrics.byTravel.map((tr) => Number(tr.attritionRate.toFixed(1))),
                  borderColor: t.shellOrange,
                  backgroundColor: t.shellOrange,
                  borderWidth: 2.5,
                  pointRadius: 5,
                  yAxisID: 'y1',
                  order: 1,
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
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: t.textPrimary } },
                y: {
                  position: 'left',
                  beginAtZero: true,
                  grid: { color: t.gridColor },
                  ticks: { color: t.textMuted, precision: 0 },
                },
                y1: {
                  position: 'right',
                  beginAtZero: true,
                  suggestedMax: 40,
                  grid: { drawOnChartArea: false },
                  ticks: { color: t.shellOrange, callback: (v) => `${v}%` },
                },
              },
            },
          })}
        />
      </div>

      {/* Income vs. Tenure Scatter */}
      <ChartCanvas
        title="Monthly Income vs. Years at Company"
        subtitle="Individual employee distribution comparing retained staff and leavers"
        isDark={isDark}
        isEmpty={isEmpty}
        heightClass="h-80"
        deps={[metrics.scatterActive, metrics.scatterLeavers]}
        buildConfig={(t) => ({
          type: 'scatter',
          data: {
            datasets: [
              {
                label: 'Active Employees',
                data: metrics.scatterActive,
                backgroundColor: isDark ? 'rgba(255, 200, 0, 0.78)' : 'rgba(255, 200, 0, 0.9)',
                borderColor: isDark ? '#F58220' : '#18181B',
                borderWidth: 1,
                pointRadius: 4.5,
                pointHoverRadius: 6.5,
              },
              {
                label: 'Leavers (Attrition = Yes)',
                data: metrics.scatterLeavers,
                backgroundColor: 'rgba(220, 38, 38, 0.85)',
                borderColor: '#FFFFFF',
                borderWidth: 1,
                pointRadius: 5.5,
                pointHoverRadius: 7.5,
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
                labels: { color: t.textMuted, boxWidth: 10, usePointStyle: true },
              },
              tooltip: {
                backgroundColor: t.tooltipBg,
                titleColor: t.tooltipText,
                bodyColor: t.tooltipText,
                borderColor: t.tooltipBorder,
                borderWidth: 1,
                callbacks: {
                  title: (items) => {
                    const raw = items[0]?.raw as { emp?: EnrichedEmployee } | undefined;
                    return raw?.emp
                      ? `${raw.emp.fullName} (${raw.emp.EmployeeID})`
                      : '';
                  },
                  label: (ctx) => {
                    const raw = ctx.raw as { emp?: EnrichedEmployee } | undefined;
                    if (!raw?.emp) return '';
                    const e = raw.emp;
                    return [
                      `${e.JobTitle} · ${e.Department}`,
                      `Income: ${formatGBP(e.MonthlyIncome_GBP)}/mo · Tenure: ${e.YearsAtCompany} yrs`,
                      `Level ${e.JobLevel} · Flight Risk: ${e.flightRiskScore}/100 (${e.flightRiskBand})`,
                    ];
                  },
                },
              },
            },
            scales: {
              x: {
                title: { display: true, text: 'Years at Company', color: t.textMuted },
                beginAtZero: true,
                grid: { color: t.gridColor },
                ticks: { color: t.textMuted },
              },
              y: {
                title: { display: true, text: 'Monthly Income (GBP)', color: t.textMuted },
                grid: { color: t.gridColor },
                ticks: {
                  color: t.textMuted,
                  callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
                },
              },
            },
          },
        })}
      />

      {/* Searchable, Sortable Employee Table */}
      <section className="rounded-lg border border-[#E5E5E0] bg-white dark:border-[#26262B] dark:bg-[#141417]">
        <div className="flex flex-col gap-3 border-b border-[#E5E5E0] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#26262B]">
          <div>
            <h3 className="font-display text-sm sm:text-[15px] font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
              Employee Directory & Risk Ledger
            </h3>
            <p className="mt-0.5 text-xs text-[#5A5A62] dark:text-[#A1A1AA] tabular-nums">
              {filteredAndSortedRows.length} matching records · Click any row to inspect risk score drivers
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search ID, name, role, site..."
                aria-label="Search employees"
                className="min-h-[40px] w-full sm:w-64 rounded-md border border-[#D8D8D2] bg-[#F7F7F5] pl-9 pr-3 text-sm text-[#0D0D0F] placeholder:text-[#71717A] focus:border-[#F58220] focus:bg-white focus:outline-none dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4] dark:focus:bg-[#141417]"
              />
            </div>

            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="min-h-[40px] rounded-md border border-[#D8D8D2] bg-white px-3 text-xs font-medium text-[#0D0D0F] focus:border-[#F58220] focus:outline-none dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4]"
            >
              <option value={15}>15 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={1000}>All rows</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] text-xs font-semibold text-[#5A5A62] dark:border-[#26262B] dark:bg-[#1A1A1F] dark:text-[#A1A1AA]">
                <th className="w-8 px-3 py-2.5" aria-label="Expand details" />
                {(
                  [
                    ['EmployeeID', 'ID', 'left'],
                    ['fullName', 'Employee', 'left'],
                    ['Department', 'Department', 'left'],
                    ['Location', 'Location', 'left'],
                    ['EmploymentType', 'Type', 'left'],
                    ['JobLevel', 'Lvl', 'right'],
                    ['YearsAtCompany', 'Tenure', 'right'],
                    ['YearsSinceLastPromotion', 'Promo Gap', 'right'],
                    ['MonthlyIncome_GBP', 'Monthly Pay', 'right'],
                    ['flightRiskScore', 'Flight Risk', 'right'],
                    ['Attrition', 'Attrition', 'left'],
                  ] as [SortKey, string, 'left' | 'right'][]
                ).map(([key, label, align]) => (
                  <th
                    key={key}
                    className={`px-3 py-2.5 whitespace-nowrap ${
                      align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className={`inline-flex items-center gap-1 font-semibold hover:text-[#0D0D0F] dark:hover:text-[#F5F5F4] ${
                        align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span>{label}</span>
                      {renderSortIcon(key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFED] dark:divide-[#222228]">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-10 text-center text-sm text-[#5A5A62] dark:text-[#A1A1AA]"
                  >
                    No employees match the current filters or search query.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((emp) => {
                  const isExpanded = expandedId === emp.EmployeeID;
                  const riskTextClass =
                    emp.flightRiskBand === 'High'
                      ? 'text-[#DC2626] dark:text-[#F87171]'
                      : emp.flightRiskBand === 'Medium'
                        ? 'text-[#C25E00] dark:text-[#F58220]'
                        : 'text-[#15803D] dark:text-[#4ADE80]';

                  return (
                    <Fragment key={emp.EmployeeID}>
                      <tr
                        onClick={() =>
                          setExpandedId(isExpanded ? null : emp.EmployeeID)
                        }
                        className="cursor-pointer transition-colors hover:bg-[#FAF9F5] dark:hover:bg-[#1B1B20]"
                      >
                        <td className="px-3 py-2.5 text-[#71717A]">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono-num text-xs text-[#5A5A62] dark:text-[#A1A1AA] whitespace-nowrap">
                          {emp.EmployeeID}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap">
                            {emp.fullName}
                          </div>
                          <div className="text-xs text-[#5A5A62] dark:text-[#A1A1AA] truncate max-w-[200px]">
                            {emp.JobTitle}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#0D0D0F] dark:text-[#E4E4E7] whitespace-nowrap">
                          {emp.Department}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#5A5A62] dark:text-[#A1A1AA] whitespace-nowrap">
                          {emp.Location}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#5A5A62] dark:text-[#A1A1AA] whitespace-nowrap">
                          {emp.EmploymentType}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-xs text-[#0D0D0F] dark:text-[#F5F5F4]">
                          L{emp.JobLevel}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-xs text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap">
                          {emp.YearsAtCompany}y
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-xs text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap">
                          {emp.YearsSinceLastPromotion}y
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-xs font-medium text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap">
                          {formatGBP(emp.MonthlyIncome_GBP)}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-mono-num text-xs font-semibold whitespace-nowrap ${riskTextClass}`}>
                          {emp.flightRiskScore} · {emp.flightRiskBand}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium whitespace-nowrap">
                          {emp.Attrition === 'Yes' ? (
                            <span className="text-[#DC2626] dark:text-[#F87171]">
                              Yes (Leaver)
                            </span>
                          ) : (
                            <span className="text-[#15803D] dark:text-[#4ADE80]">
                              No (Active)
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          key={`${emp.EmployeeID}-detail`}
                          className="bg-[#FAF9F5] dark:bg-[#19191E]"
                        >
                          <td colSpan={12} className="px-6 py-3 text-xs">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[#5A5A62] dark:text-[#A1A1AA]">
                              <span>
                                <strong className="text-[#0D0D0F] dark:text-[#F5F5F4]">
                                  Profile:
                                </strong>{' '}
                                Age {emp.Age} · {emp.Gender} · {emp.MaritalStatus} · {emp.Education}
                              </span>
                              <span>
                                <strong className="text-[#0D0D0F] dark:text-[#F5F5F4]">
                                  Mobility:
                                </strong>{' '}
                                {formatTravelLabel(emp.BusinessTravel)} · {emp.DistanceFromHome_km} km commute
                              </span>
                              <span>
                                <strong className="text-[#0D0D0F] dark:text-[#F5F5F4]">
                                  Role Tenure:
                                </strong>{' '}
                                {emp.YearsInCurrentRole}y in role · {emp.YearsWithCurrManager}y with manager · Hired {emp.HireDate}
                              </span>
                            </div>
                            <div className="mt-2 text-[#0D0D0F] dark:text-[#F5F5F4]">
                              <strong className="font-semibold">
                                Flight-Risk Breakdown ({emp.flightRiskScore}/100):
                              </strong>{' '}
                              {emp.riskFactors.length > 0
                                ? emp.riskFactors
                                    .map((f) => `${f.label} (+${f.points})`)
                                    .join(' · ')
                                : 'No risk triggers fired (0 pts)'}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E5E5E0] px-4 py-3 text-xs text-[#5A5A62] dark:border-[#26262B] dark:text-[#A1A1AA]">
          <span className="tabular-nums">
            Showing{' '}
            {filteredAndSortedRows.length === 0
              ? 0
              : (safePage - 1) * pageSize + 1}
            –{Math.min(safePage * pageSize, filteredAndSortedRows.length)} of{' '}
            {filteredAndSortedRows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="min-h-[36px] rounded-md border border-[#D8D8D2] bg-white px-3 py-1.5 font-medium text-[#0D0D0F] hover:bg-[#F2F2EE] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4]"
            >
              Previous
            </button>
            <span className="font-mono-num px-2">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[36px] rounded-md border border-[#D8D8D2] bg-white px-3 py-1.5 font-medium text-[#0D0D0F] hover:bg-[#F2F2EE] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4]"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
