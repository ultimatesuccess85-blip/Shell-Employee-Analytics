import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  FileSpreadsheet,
  FolderSearch,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import { EnrichedEmployee } from '../types/hr';
import {
  DriveSpreadsheetItem,
  exportEmployeesToNewGoogleSheet,
  extractSpreadsheetId,
  fetchSpreadsheetMetadata,
  listDriveSpreadsheets,
  SheetTabInfo,
} from '../services/googleSheets';
import { GOOGLE_SHEET_ID } from '../utils/csv';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  filteredEmployees: EnrichedEmployee[];
  activeSpreadsheetId: string | null;
  activeTabTitle: string | null;
  onLoadAuthenticatedSheet: (
    spreadsheetId: string,
    spreadsheetTitle: string,
    tabTitle: string
  ) => Promise<void>;
  onRequireReauth: () => void;
}

export function GoogleSheetsModal({
  isOpen,
  onClose,
  accessToken,
  filteredEmployees,
  activeSpreadsheetId,
  activeTabTitle,
  onLoadAuthenticatedSheet,
  onRequireReauth,
}: GoogleSheetsModalProps) {
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  const [sheetInput, setSheetInput] = useState(activeSpreadsheetId || GOOGLE_SHEET_ID);
  const [resolvedTitle, setResolvedTitle] = useState<string>('');
  const [tabs, setTabs] = useState<SheetTabInfo[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>(activeTabTitle || '');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [exportTitle, setExportTitle] = useState(
    () => `Shell UK People Analytics Snapshot (${new Date().toISOString().slice(0, 10)})`
  );
  const [confirmingExport, setConfirmingExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    title: string;
    url: string;
  } | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);

  const loadDriveList = async () => {
    if (!accessToken) {
      onRequireReauth();
      return;
    }
    setIsLoadingDrive(true);
    setModalError(null);
    try {
      const files = await listDriveSpreadsheets(accessToken);
      setDriveFiles(files);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to list spreadsheets from Google Drive.';
      setModalError(msg);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveList();
      setConfirmingExport(false);
      setExportResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accessToken]);

  const handleInspectTabs = async (idOverride?: string) => {
    if (!accessToken) {
      onRequireReauth();
      return;
    }
    const target = idOverride ?? sheetInput;
    setIsLoadingMeta(true);
    setModalError(null);
    try {
      const meta = await fetchSpreadsheetMetadata(target, accessToken);
      setSheetInput(meta.spreadsheetId);
      setResolvedTitle(meta.title);
      setTabs(meta.sheets);
      setSelectedTab(meta.sheets[0]?.title ?? '');
    } catch (err) {
      setTabs([]);
      setSelectedTab('');
      setResolvedTitle('');
      const msg = err instanceof Error ? err.message : 'Unable to read spreadsheet tabs.';
      setModalError(msg);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleLoadSelectedTab = async () => {
    if (!selectedTab) {
      setModalError('Inspect the spreadsheet first and choose a worksheet tab to load.');
      return;
    }
    setIsLoadingData(true);
    setModalError(null);
    try {
      const cleanId = extractSpreadsheetId(sheetInput);
      await onLoadAuthenticatedSheet(cleanId, resolvedTitle || cleanId, selectedTab);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load worksheet data.';
      setModalError(msg);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleConfirmedExport = async () => {
    if (!accessToken) {
      onRequireReauth();
      return;
    }
    setIsExporting(true);
    setModalError(null);
    try {
      const created = await exportEmployeesToNewGoogleSheet(
        exportTitle.trim() || 'Shell UK People Analytics Snapshot',
        filteredEmployees,
        accessToken
      );
      setExportResult({ title: created.title, url: created.spreadsheetUrl });
      setConfirmingExport(false);
      loadDriveList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to export snapshot to Google Sheets.';
      setModalError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-sheets-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#E5E5E0] bg-white shadow-xl dark:border-[#2E2E36] dark:bg-[#141417]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#E5E5E0] px-5 py-4 dark:border-[#26262B]">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-[#F58220]" aria-hidden="true" />
            <h2
              id="google-sheets-modal-title"
              className="font-display text-base sm:text-lg font-bold text-[#0D0D0F] dark:text-[#F5F5F4]"
            >
              Google Sheets Workspace Integration
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Google Sheets dialog"
            className="rounded-md p-1.5 text-[#5A5A62] hover:bg-[#F2F2EE] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {modalError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs sm:text-sm text-[#7F1D1D] dark:border-[#7F1D1D] dark:bg-[#2A1215] dark:text-[#FECACA]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" aria-hidden="true" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Section 1: Load from Google Drive / Sheets */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
                1. Connect & Load a Google Sheet
              </h3>
              <button
                type="button"
                onClick={loadDriveList}
                disabled={isLoadingDrive}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A5A62] hover:text-[#0D0D0F] dark:text-[#A1A1AA] dark:hover:text-[#F5F5F4]"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>Refresh Drive</span>
              </button>
            </div>

            <div>
              <label
                htmlFor="drive-sheet-picker"
                className="mb-1 block text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]"
              >
                Recent spreadsheets in your Google Drive
              </label>
              <select
                id="drive-sheet-picker"
                value={driveFiles.some((f) => f.id === sheetInput) ? sheetInput : ''}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) {
                    setSheetInput(id);
                    handleInspectTabs(id);
                  }
                }}
                className="w-full min-h-[40px] rounded-md border border-[#D8D8D2] bg-white px-3 py-2 text-sm text-[#0D0D0F] focus:border-[#F58220] focus:outline-none dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4]"
              >
                <option value="">
                  {isLoadingDrive
                    ? 'Loading spreadsheets from Drive...'
                    : driveFiles.length > 0
                      ? 'Select a spreadsheet from Drive...'
                      : 'No spreadsheets listed — paste a Sheet URL or ID below'}
                </option>
                {driveFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sheet-url-input"
                className="mb-1 block text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]"
              >
                Or paste Google Sheet URL / Spreadsheet ID
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="sheet-url-input"
                  type="text"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/... or ID"
                  className="min-h-[40px] flex-1 rounded-md border border-[#D8D8D2] bg-[#F7F7F5] px-3 py-2 text-sm text-[#0D0D0F] focus:border-[#F58220] focus:bg-white focus:outline-none dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4]"
                />
                <button
                  type="button"
                  onClick={() => handleInspectTabs()}
                  disabled={isLoadingMeta}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-[#D8D8D2] bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0D0D0F] hover:bg-[#F2F2EE] disabled:opacity-50 dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4] dark:hover:bg-[#24242B] whitespace-nowrap"
                >
                  <FolderSearch className="h-4 w-4 text-[#F58220]" aria-hidden="true" />
                  <span>{isLoadingMeta ? 'Inspecting...' : 'Inspect Tabs'}</span>
                </button>
              </div>
            </div>

            {tabs.length > 0 && (
              <div className="rounded-md border border-[#E5E5E0] bg-[#FAF9F5] p-3.5 space-y-3 dark:border-[#26262B] dark:bg-[#1A1A1F]">
                <div className="text-xs text-[#5A5A62] dark:text-[#A1A1AA]">
                  Spreadsheet:{' '}
                  <strong className="text-[#0D0D0F] dark:text-[#F5F5F4]">
                    {resolvedTitle}
                  </strong>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="sheet-tab-select"
                      className="mb-1 block text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]"
                    >
                      Worksheet Tab
                    </label>
                    <select
                      id="sheet-tab-select"
                      value={selectedTab}
                      onChange={(e) => setSelectedTab(e.target.value)}
                      className="w-full min-h-[40px] rounded-md border border-[#D8D8D2] bg-white px-3 py-2 text-sm text-[#0D0D0F] focus:border-[#F58220] focus:outline-none dark:border-[#2E2E36] dark:bg-[#141417] dark:text-[#F5F5F4]"
                    >
                      {tabs.map((tab) => (
                        <option key={tab.sheetId} value={tab.title}>
                          {tab.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSelectedTab}
                    disabled={isLoadingData}
                    className="min-h-[40px] rounded-md bg-[#FFC800] px-4 py-2 text-xs sm:text-sm font-semibold text-[#0D0D0F] hover:bg-[#eab600] disabled:opacity-50 whitespace-nowrap"
                  >
                    {isLoadingData ? 'Loading...' : 'Load Worksheet Data'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <hr className="border-[#E5E5E0] dark:border-[#26262B]" />

          {/* Section 2: Export Filtered Workforce Snapshot with Mandatory Confirmation */}
          <section className="space-y-3">
            <div>
              <h3 className="font-display text-sm font-bold text-[#0D0D0F] dark:text-[#F5F5F4]">
                2. Export Filtered Snapshot to Google Sheets
              </h3>
              <p className="mt-0.5 text-xs text-[#5A5A62] dark:text-[#A1A1AA] tabular-nums">
                Create a new spreadsheet in your Google Drive containing the {filteredEmployees.length} currently filtered employees and their flight-risk scores.
              </p>
            </div>

            {!confirmingExport ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  aria-label="New Google Sheet title"
                  value={exportTitle}
                  onChange={(e) => setExportTitle(e.target.value)}
                  className="min-h-[40px] flex-1 rounded-md border border-[#D8D8D2] bg-[#F7F7F5] px-3 py-2 text-sm text-[#0D0D0F] focus:border-[#F58220] focus:bg-white focus:outline-none dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4]"
                />
                <button
                  type="button"
                  disabled={filteredEmployees.length === 0}
                  onClick={() => {
                    setExportResult(null);
                    setConfirmingExport(true);
                  }}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border border-[#D8D8D2] bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#0D0D0F] hover:bg-[#F2F2EE] disabled:opacity-40 dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4] dark:hover:bg-[#24242B] whitespace-nowrap"
                >
                  <UploadCloud className="h-4 w-4 text-[#F58220]" aria-hidden="true" />
                  <span>Export to Google Sheets</span>
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-[#F58220] bg-[#FFF8EB] p-4 space-y-3 dark:border-[#F58220]/70 dark:bg-[#23190C]">
                <p className="text-sm font-semibold text-[#0D0D0F] dark:text-[#F5F5F4]">
                  Confirm Google Sheets Write Operation
                </p>
                <p className="text-xs sm:text-sm text-[#4A4A50] dark:text-[#D4D4D8] tabular-nums">
                  This will create a new Google Spreadsheet titled{' '}
                  <strong>&ldquo;{exportTitle.trim() || 'Shell UK People Analytics Snapshot'}&rdquo;</strong>{' '}
                  in your Google Drive and write{' '}
                  <strong>{filteredEmployees.length} employee rows</strong> (plus header row) to the{' '}
                  <strong>Workforce Snapshot</strong> tab.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleConfirmedExport}
                    disabled={isExporting}
                    className="min-h-[38px] rounded-md bg-[#FFC800] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#0D0D0F] hover:bg-[#eab600] disabled:opacity-50"
                  >
                    {isExporting ? 'Creating Sheet...' : 'Confirm & Write to Google Sheets'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingExport(false)}
                    disabled={isExporting}
                    className="min-h-[38px] rounded-md border border-[#D8D8D2] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[#0D0D0F] hover:bg-[#F2F2EE] dark:border-[#2E2E36] dark:bg-[#1A1A1F] dark:text-[#F5F5F4]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {exportResult && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-[#86EFAC] bg-[#F0FDF4] p-3 text-xs sm:text-sm text-[#14532D] dark:border-[#166534] dark:bg-[#0F2417] dark:text-[#BBF7D0]">
                <span>
                  Created <strong>{exportResult.title}</strong> successfully.
                </span>
                <a
                  href={exportResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 whitespace-nowrap"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
