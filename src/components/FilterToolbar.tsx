import { useRef } from 'react';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  LogOut,
  Moon,
  RotateCcw,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { DataSourceMeta, FilterState } from '../types/hr';

interface FilterToolbarProps {
  filters: FilterState;
  onFilterChange: (next: FilterState) => void;
  onResetFilters: () => void;
  departments: string[];
  locations: string[];
  employmentTypes: string[];
  genders: string[];
  filteredCount: number;
  totalCount: number;
  sourceMeta: DataSourceMeta | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onUploadCsvFile: (file: File) => void;
  onExportCsv: () => void;
  errorMessage: string | null;
  onDismissError: () => void;
  onRetrySync: () => void;
  googleUser: User | null;
  hasGoogleToken: boolean;
  isLoggingIn: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onOpenGoogleSheets: () => void;
}

export function FilterToolbar({
  filters,
  onFilterChange,
  onResetFilters,
  departments,
  locations,
  employmentTypes,
  genders,
  filteredCount,
  totalCount,
  sourceMeta,
  isDark,
  onToggleTheme,
  onUploadCsvFile,
  onExportCsv,
  errorMessage,
  onDismissError,
  onRetrySync,
  googleUser,
  hasGoogleToken,
  isLoggingIn,
  onGoogleSignIn,
  onGoogleSignOut,
  onOpenGoogleSheets,
}: FilterToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasActiveFilter =
    filters.department !== 'All' ||
    filters.location !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.gender !== 'All' ||
    filters.attrition !== 'All';

  const selectClass =
    'w-full min-h-[40px] rounded-md border border-[#D8D8D2] bg-white px-3 py-2 text-sm text-[#0D0D0F] transition-colors focus:border-[#F58220] focus:outline-none dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4]';

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 pt-5 pb-3 space-y-4">
      {/* Workspace Utility Strip: Data Source, Google Workspace Auth, CSV Fallback, Light/Dark Toggle */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-[#E5E5E0] pb-4 dark:border-[#26262B]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#5A5A62] dark:text-[#A1A1AA]">
          <span className="font-semibold text-[#0D0D0F] dark:text-[#F5F5F4]">
            Shell UK Workforce
          </span>
          <span aria-hidden="true">·</span>
          {sourceMeta ? (
            <>
              <span>{sourceMeta.label}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {sourceMeta.rowCount} records
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Synced {sourceMeta.syncedAt}</span>
            </>
          ) : (
            <span>Awaiting dataset</span>
          )}
          {googleUser && hasGoogleToken && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#0D0D0F] dark:text-[#F5F5F4]">
                {googleUser.email || googleUser.displayName}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!hasGoogleToken ? (
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={isLoggingIn}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                    aria-hidden="true"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#D8D8D2] bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0D0D0F] transition-colors hover:bg-[#F2F2EE] dark:border-[#2E2E36] dark:bg-[#141417] dark:text-[#F5F5F4] dark:hover:bg-[#1E1E24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220]"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#F58220]" aria-hidden="true" />
                <span>Google Sheets</span>
              </button>
              <button
                type="button"
                onClick={onGoogleSignOut}
                aria-label="Sign out of Google account"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#D8D8D2] bg-white px-3 py-2 text-xs sm:text-sm font-medium text-[#5A5A62] transition-colors hover:bg-[#F2F2EE] hover:text-[#0D0D0F] dark:border-[#2E2E36] dark:bg-[#141417] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24] dark:hover:text-[#F5F5F4] whitespace-nowrap shrink-0"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadCsvFile(file);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#D8D8D2] bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-[#0D0D0F] transition-colors hover:bg-[#F2F2EE] dark:border-[#2E2E36] dark:bg-[#141417] dark:text-[#F5F5F4] dark:hover:bg-[#1E1E24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220]"
          >
            <Upload className="h-4 w-4 text-[#F58220]" aria-hidden="true" />
            <span>Upload CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            disabled={filteredCount === 0}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#D8D8D2] bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-[#0D0D0F] transition-colors hover:bg-[#F2F2EE] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#2E2E36] dark:bg-[#141417] dark:text-[#F5F5F4] dark:hover:bg-[#1E1E24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220]"
          >
            <Download className="h-4 w-4 text-[#F58220]" aria-hidden="true" />
            <span>Export to CSV</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#D8D8D2] bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-[#0D0D0F] transition-colors hover:bg-[#F2F2EE] dark:border-[#2E2E36] dark:bg-[#141417] dark:text-[#F5F5F4] dark:hover:bg-[#1E1E24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220]"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-[#FFC800]" aria-hidden="true" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-[#0D0D0F]" aria-hidden="true" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Clear Error Alert Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-sm text-[#7F1D1D] dark:border-[#7F1D1D] dark:bg-[#2A1215] dark:text-[#FECACA]"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626] dark:text-[#F87171]"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">Unable to load Google Sheet data</p>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRetrySync}
              className="rounded-md border border-[#DC2626]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#991B1B] hover:bg-[#FEE2E2] dark:bg-[#1A1A1F] dark:text-[#FECACA] dark:hover:bg-[#3B181C] whitespace-nowrap"
            >
              Retry Sheet
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md bg-[#FFC800] px-3 py-1.5 text-xs font-semibold text-[#0D0D0F] hover:bg-[#eab600] whitespace-nowrap"
            >
              Upload CSV
            </button>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss error message"
              className="rounded p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Shared Multi-Dimension Filter Bar */}
      <section
        aria-label="Shared workforce filters"
        className="rounded-lg border border-[#E5E5E0] bg-white p-4 dark:border-[#26262B] dark:bg-[#141417]"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
          <div>
            <label
              htmlFor="filter-department"
              className="mb-1.5 block text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]"
            >
              Department
            </label>
            <select
              id="filter-department"
              value={filters.department}
              onChange={(e) =>
                onFilterChange({ ...filters, department: e.target.value })
              }
              className={selectClass}
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-location"
              className="mb-1.5 block text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]"
            >
              Location
            </label>
            <select
              id="filter-location"
              value={filters.location}
              onChange={(e) =>
                onFilterChange({ ...filters, location: e.target.value })
              }
              className={selectClass}
            >
              <option value="All">All UK Locations</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-employment"
              className="mb-1.5 block text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]"
            >
              Employment Type
            </label>
            <select
              id="filter-employment"
              value={filters.employmentType}
              onChange={(e) =>
                onFilterChange({ ...filters, employmentType: e.target.value })
              }
              className={selectClass}
            >
              <option value="All">All Types</option>
              {employmentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-gender"
              className="mb-1.5 block text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]"
            >
              Gender
            </label>
            <select
              id="filter-gender"
              value={filters.gender}
              onChange={(e) =>
                onFilterChange({ ...filters, gender: e.target.value })
              }
              className={selectClass}
            >
              <option value="All">All Genders</option>
              {genders.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-attrition"
              className="mb-1.5 block text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]"
            >
              Attrition
            </label>
            <select
              id="filter-attrition"
              value={filters.attrition}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  attrition: e.target.value as FilterState['attrition'],
                })
              }
              className={selectClass}
            >
              <option value="All">All (Active & Leavers)</option>
              <option value="No">Active Only (No)</option>
              <option value="Yes">Leavers Only (Yes)</option>
            </select>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3 pt-1 lg:pt-0">
            <span className="text-xs font-medium text-[#5A5A62] tabular-nums dark:text-[#A1A1AA] whitespace-nowrap">
              {filteredCount} of {totalCount}
            </span>
            <button
              type="button"
              onClick={onResetFilters}
              disabled={!hasActiveFilter}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#D8D8D2] bg-[#F7F7F5] px-3 py-2 text-xs font-semibold text-[#0D0D0F] transition-colors hover:bg-[#EAEAE5] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#2E2E36] dark:bg-[#1E1E24] dark:text-[#F5F5F4] dark:hover:bg-[#27272F] whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
