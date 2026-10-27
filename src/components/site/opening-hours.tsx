import type { PublicSettings } from "@/features/cms/types";
import { isoWeekdayName } from "@/lib/datetime";

function daysLabel(days: number[]) {
  const sorted = [...days].sort();
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1);
  if (contiguous && sorted.length > 2) return `${isoWeekdayName(sorted[0]!)} a ${isoWeekdayName(sorted.at(-1)!)}`;
  return sorted.map(isoWeekdayName).join(", ");
}

export function OpeningHours({ settings }: { settings: PublicSettings }) {
  if (settings.opening_hours.length === 0) return null;
  return (
    <div>
      <ul className="space-y-1">
        {settings.opening_hours.map((h, i) => (
          <li key={i}>
            <span className="capitalize">{daysLabel(h.days)}</span>: {h.opens}–{h.closes}
          </li>
        ))}
      </ul>
      {settings.opening_hours_note ? <p className="mt-1 text-sm text-muted">{settings.opening_hours_note}</p> : null}
    </div>
  );
}

export function addressText(s: PublicSettings): string | null {
  if (!s.address_line) return null;
  return [s.address_line, s.district, s.city].filter(Boolean).join(", ");
}
