import { useEffect, useRef } from 'react';
import Chart, { ChartConfiguration } from 'chart.js/auto';

interface ChartCanvasProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  heightClass?: string;
  buildConfig: (theme: ChartThemeTokens) => ChartConfiguration;
  deps: unknown[];
}

export interface ChartThemeTokens {
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  gridColor: string;
  surfaceBg: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  shellYellow: string;
  shellOrange: string;
  charcoal: string;
  slate: string;
  crimson: string;
  emerald: string;
}

export function getChartThemeTokens(isDark: boolean): ChartThemeTokens {
  return {
    isDark,
    textPrimary: isDark ? '#F5F5F4' : '#0D0D0F',
    textMuted: isDark ? '#A1A1AA' : '#52525B',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(13, 13, 15, 0.08)',
    surfaceBg: isDark ? '#141417' : '#FFFFFF',
    tooltipBg: isDark ? '#1E1E24' : '#0D0D0F',
    tooltipText: '#F5F5F4',
    tooltipBorder: isDark ? '#34343D' : '#27272A',
    shellYellow: '#FFC800',
    shellOrange: '#F58220',
    charcoal: isDark ? '#D4D4D8' : '#18181B',
    slate: isDark ? '#71717A' : '#71717A',
    crimson: '#DC2626',
    emerald: '#16A34A',
  };
}

export function ChartCanvas({
  title,
  subtitle,
  isDark,
  isEmpty = false,
  emptyMessage = 'No matching records for the active filters.',
  heightClass = 'h-64 sm:h-72',
  buildConfig,
  deps,
}: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (isEmpty || !canvasRef.current) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const tokens = getChartThemeTokens(isDark);
    const config = buildConfig(tokens);

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, isEmpty, ...deps]);

  return (
    <section className="flex flex-col rounded-lg border border-[#E5E5E0] bg-white p-4 sm:p-5 dark:border-[#26262B] dark:bg-[#141417]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm sm:text-[15px] font-bold tracking-tight text-[#0D0D0F] dark:text-[#F5F5F4]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[#5A5A62] dark:text-[#A1A1AA]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className={`flex ${heightClass} items-center justify-center rounded-md border border-dashed border-[#E5E5E0] dark:border-[#2A2A32] px-4 text-center text-sm text-[#5A5A62] dark:text-[#A1A1AA]`}>
          {emptyMessage}
        </div>
      ) : (
        <div className={`relative w-full ${heightClass}`}>
          <canvas ref={canvasRef} />
        </div>
      )}
    </section>
  );
}
