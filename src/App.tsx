import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { FilterToolbar } from './components/FilterToolbar';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { TopBar } from './components/TopBar';
import { OverviewTab } from './components/OverviewTab';
import { DeepDiveTab } from './components/DeepDiveTab';
import { InsightsTab } from './components/InsightsTab';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import { fetchSpreadsheetEmployees } from './services/googleSheets';
import { DataSourceMeta, EnrichedEmployee, FilterState, TabKey } from './types/hr';
import { applyFilters } from './utils/analytics';
import { downloadEmployeesCsv, fetchGoogleSheetCsv, parseEmployeeCsv } from './utils/csv';

const DEFAULT_FILTERS: FilterState = {
  department: 'All',
  location: 'All',
  employmentType: 'All',
  gender: 'All',
  attrition: 'All',
};

function formatSyncTime(): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
}

export default function App() {
  const [employees, setEmployees] = useState<EnrichedEmployee[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<DataSourceMeta | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Google Workspace OAuth & Sheets state (token kept strictly in memory)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [activeOAuthSheet, setActiveOAuthSheet] = useState<{
    spreadsheetId: string;
    title: string;
    tabTitle: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      (user) => {
        setGoogleUser(user);
        setAccessToken(null);
      }
    );
    return unsubscribe;
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      setGoogleUser(result.user);
      setAccessToken(result.accessToken);
      setIsSheetsModalOpen(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or failed.';
      setErrorMessage(msg);
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const handleGoogleSignOut = useCallback(async () => {
    await logout();
    setGoogleUser(null);
    setAccessToken(null);
    setActiveOAuthSheet(null);
    setIsSheetsModalOpen(false);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        try {
          localStorage.setItem('shell-pa-theme', 'dark');
        } catch {}
      } else {
        document.documentElement.classList.remove('dark');
        try {
          localStorage.setItem('shell-pa-theme', 'light');
        } catch {}
      }
      return next;
    });
  }, []);

  const loadAuthenticatedSheet = useCallback(
    async (spreadsheetId: string, spreadsheetTitle: string, tabTitle: string) => {
      const token = getAccessToken() ?? accessToken;
      if (!token) {
        throw new Error('Google session expired. Please sign in with Google again.');
      }

      setIsSyncing(true);
      setErrorMessage(null);
      try {
        const parsed = await fetchSpreadsheetEmployees(spreadsheetId, tabTitle, token);
        setEmployees(parsed);
        setFilters(DEFAULT_FILTERS);
        setActiveOAuthSheet({ spreadsheetId, title: spreadsheetTitle, tabTitle });
        setSourceMeta({
          type: 'sheet',
          label: `Google Sheets API (${spreadsheetTitle} · ${tabTitle})`,
          syncedAt: formatSyncTime(),
          rowCount: parsed.length,
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('HTTP 401')) {
          clearAccessToken();
          setAccessToken(null);
        }
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [accessToken]
  );

  const syncSheet = useCallback(
    async (isInitial = false) => {
      if (isInitial) setIsLoadingInitial(true);
      setIsSyncing(true);
      setErrorMessage(null);

      try {
        if (activeOAuthSheet && accessToken) {
          const parsed = await fetchSpreadsheetEmployees(
            activeOAuthSheet.spreadsheetId,
            activeOAuthSheet.tabTitle,
            accessToken
          );
          setEmployees(parsed);
          setSourceMeta({
            type: 'sheet',
            label: `Google Sheets API (${activeOAuthSheet.title} · ${activeOAuthSheet.tabTitle})`,
            syncedAt: formatSyncTime(),
            rowCount: parsed.length,
          });
        } else {
          const parsed = await fetchGoogleSheetCsv();
          setEmployees(parsed);
          setSourceMeta({
            type: 'sheet',
            label: 'Google Sheets (Public gviz)',
            syncedAt: formatSyncTime(),
            rowCount: parsed.length,
          });
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to read the Google Sheet.';
        setErrorMessage(msg);
      } finally {
        setIsSyncing(false);
        setIsLoadingInitial(false);
      }
    },
    [activeOAuthSheet, accessToken]
  );

  useEffect(() => {
    syncSheet(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadCsvFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    try {
      const text = await file.text();
      const parsed = parseEmployeeCsv(text);
      setEmployees(parsed);
      setFilters(DEFAULT_FILTERS);
      setActiveOAuthSheet(null);
      setSourceMeta({
        type: 'csv',
        label: `CSV Upload (${file.name})`,
        syncedAt: formatSyncTime(),
        rowCount: parsed.length,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to parse the uploaded CSV file.';
      setErrorMessage(msg);
    }
  }, []);

  const filterOptions = useMemo(() => {
    const departments = Array.from(new Set(employees.map((e) => e.Department))).sort();
    const locations = Array.from(new Set(employees.map((e) => e.Location))).sort();
    const employmentTypes = Array.from(
      new Set(employees.map((e) => e.EmploymentType))
    ).sort();
    const genders = Array.from(new Set(employees.map((e) => e.Gender))).sort();
    return { departments, locations, employmentTypes, genders };
  }, [employees]);

  const filteredEmployees = useMemo(
    () => applyFilters(employees, filters),
    [employees, filters]
  );

  return (
    <div id="top" className="min-h-screen bg-[#F7F7F5] text-[#0D0D0F] dark:bg-[#0B0B0D] dark:text-[#F5F5F4] transition-colors duration-150">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSyncSheet={() => syncSheet(false)}
        isSyncing={isSyncing}
      />

      <FilterToolbar
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={() => setFilters(DEFAULT_FILTERS)}
        departments={filterOptions.departments}
        locations={filterOptions.locations}
        employmentTypes={filterOptions.employmentTypes}
        genders={filterOptions.genders}
        filteredCount={filteredEmployees.length}
        totalCount={employees.length}
        sourceMeta={sourceMeta}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onUploadCsvFile={handleUploadCsvFile}
        onExportCsv={() => downloadEmployeesCsv(filteredEmployees)}
        errorMessage={errorMessage}
        onDismissError={() => setErrorMessage(null)}
        onRetrySync={() => syncSheet(false)}
        googleUser={googleUser}
        hasGoogleToken={Boolean(accessToken)}
        isLoggingIn={isLoggingIn}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
      />

      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 pb-12 pt-2">
        {isLoadingInitial ? (
          <div className="space-y-6" aria-busy="true" aria-label="Loading workforce data">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-lg border border-[#E5E5E0] bg-white p-4 dark:border-[#26262B] dark:bg-[#141417]"
                >
                  <div className="h-3 w-24 rounded bg-[#EAEAE5] dark:bg-[#24242B]" />
                  <div className="mt-4 h-7 w-20 rounded bg-[#EAEAE5] dark:bg-[#24242B]" />
                  <div className="mt-4 h-3 w-32 rounded bg-[#F2F2EE] dark:bg-[#1E1E24]" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-lg border border-[#E5E5E0] bg-white p-5 dark:border-[#26262B] dark:bg-[#141417]"
                />
              ))}
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-lg border border-[#E5E5E0] bg-white p-8 text-center dark:border-[#26262B] dark:bg-[#141417]">
            <h2 className="font-display text-lg font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
              No workforce dataset loaded
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[#5A5A62] dark:text-[#A1A1AA]">
              Click <strong>Sync Sheet</strong> above to retry reading the Shell UK Google Sheet, <strong>Sign in with Google</strong> to connect private sheets from your Google Drive, or use <strong>Upload CSV</strong>.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab employees={filteredEmployees} isDark={isDark} />
            )}
            {activeTab === 'deep-dive' && (
              <DeepDiveTab employees={filteredEmployees} isDark={isDark} />
            )}
            {activeTab === 'insights' && (
              <InsightsTab
                employees={filteredEmployees}
                fullDataset={employees}
                filters={filters}
              />
            )}
          </>
        )}
      </main>

      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        accessToken={accessToken}
        filteredEmployees={filteredEmployees}
        activeSpreadsheetId={activeOAuthSheet?.spreadsheetId ?? null}
        activeTabTitle={activeOAuthSheet?.tabTitle ?? null}
        onLoadAuthenticatedSheet={loadAuthenticatedSheet}
        onRequireReauth={() => {
          setIsSheetsModalOpen(false);
          handleGoogleSignIn();
        }}
      />

      <footer className="border-t border-[#E5E5E0] bg-white py-4 dark:border-[#26262B] dark:bg-[#141417]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 text-xs text-[#5A5A62] dark:text-[#A1A1AA]">
          <span>Shell People Analytics · UK Workforce & Retention Intelligence</span>
          <span>Google Sheets API &amp; CSV integration</span>
        </div>
      </footer>
    </div>
  );
}
