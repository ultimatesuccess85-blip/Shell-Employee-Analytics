import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { TabKey } from '../types/hr';

interface TopBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onSyncSheet: () => void;
  isSyncing: boolean;
}

const NAV_TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'deep-dive', label: 'Deep Dive' },
  { key: 'insights', label: 'Insights' },
];

export function TopBar({
  activeTab,
  onTabChange,
  onSyncSheet,
  isSyncing,
}: TopBarProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="border-b border-[#E5E5E0] bg-white dark:border-[#26262B] dark:bg-[#141417] md:sticky md:top-0 md:z-30">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 h-16">
        {/* Zone 1: Brand Title */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('overview');
          }}
          className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] rounded"
        >
          {!logoFailed ? (
            <img
              src="/assets/aistudio/image_9b0909cf.png"
              alt="Shell Logo"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="h-8 w-8 object-contain shrink-0"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded bg-[#FFC800] font-display text-sm font-extrabold text-[#0D0D0F] shrink-0"
            >
              S
            </span>
          )}
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#0D0D0F] dark:text-[#F5F5F4] whitespace-nowrap shrink-0">
            Shell People Analytics
          </span>
        </a>

        {/* Zone 2: Desktop Navigation Tabs */}
        <nav
          aria-label="Dashboard sections"
          className="hidden md:flex items-center gap-8 h-full"
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex h-full items-center px-1 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] ${
                  isActive
                    ? 'text-[#0D0D0F] dark:text-[#FFC800]'
                    : 'text-[#5A5A62] hover:text-[#0D0D0F] dark:text-[#A1A1AA] dark:hover:text-[#F5F5F4]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[3px] bg-[#FFC800]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onSyncSheet}
            disabled={isSyncing}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[#FFC800] px-4 py-2 text-xs sm:text-sm font-semibold text-[#0D0D0F] transition-colors duration-150 hover:bg-[#eab600] active:bg-[#d9a800] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220]"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Strip (visible below md breakpoint) */}
      <nav
        aria-label="Mobile dashboard sections"
        className="flex md:hidden border-t border-[#E5E5E0] dark:border-[#26262B] px-4"
      >
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 min-h-[44px] py-2.5 text-center text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'text-[#0D0D0F] dark:text-[#FFC800]'
                  : 'text-[#5A5A62] dark:text-[#A1A1AA]'
              }`}
            >
              {tab.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-[3px] bg-[#FFC800]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
