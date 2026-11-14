interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  accentTone?: 'default' | 'warning' | 'danger' | 'positive';
}

export function KpiCard({
  label,
  value,
  subtext,
  accentTone = 'default',
}: KpiCardProps) {
  const valueToneClass =
    accentTone === 'danger'
      ? 'text-[#DC2626] dark:text-[#F87171]'
      : accentTone === 'warning'
        ? 'text-[#C25E00] dark:text-[#F58220]'
        : accentTone === 'positive'
          ? 'text-[#15803D] dark:text-[#4ADE80]'
          : 'text-[#0D0D0F] dark:text-[#F5F5F4]';

  return (
    <div className="flex flex-col justify-between rounded-lg border border-[#E5E5E0] bg-white p-4 dark:border-[#26262B] dark:bg-[#141417]">
      <span className="text-xs font-medium text-[#5A5A62] dark:text-[#A1A1AA]">
        {label}
      </span>
      <div className={`mt-2 font-mono-num text-2xl sm:text-[26px] font-semibold leading-tight tracking-tight ${valueToneClass}`}>
        {value}
      </div>
      <div className="mt-2 border-t border-[#F0F0EC] pt-2 text-xs text-[#5A5A62] tabular-nums dark:border-[#222228] dark:text-[#A1A1AA]">
        {subtext}
      </div>
    </div>
  );
}
