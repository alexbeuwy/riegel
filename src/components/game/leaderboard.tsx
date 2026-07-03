import { Icon } from "@/components/icon";
import { fmtEuro } from "@/lib/game-houses";
import type { LeaderboardEntry } from "@/lib/game-leaderboard";

/** Rang-Bestenliste fürs Blitzverkauf-Ergebnis — hebt den eigenen Eintrag hervor. */
export function Leaderboard({
  entries,
  monthLabel,
  highlightId,
}: {
  entries: LeaderboardEntry[];
  monthLabel: string;
  highlightId?: string | null;
}) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-bg/60 text-left backdrop-blur">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-[0.65rem] uppercase tracking-[0.2em] text-faint">
        <Icon name="users" size={13} className="text-accent" />
        <span className="flex-1">Bestenliste</span>
        <span>{monthLabel}</span>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-5 text-sm text-faint">
          Noch niemand in {monthLabel} — du kannst der/die Erste sein.
        </p>
      ) : (
        <ol className="max-h-64 overflow-y-auto px-2 py-2">
          {entries.map((e, i) => {
            const rank = i + 1;
            const mine = Boolean(highlightId) && e.id === highlightId;
            return (
              <li
                key={e.id}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm ${
                  mine ? "bg-accent/15 text-fg" : "text-fg/90"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-medium tabular-nums ${
                    rank === 1
                      ? "bg-accent text-on-accent"
                      : rank <= 3
                        ? "bg-accent/25 text-accent-strong"
                        : "border border-border text-faint"
                  }`}
                >
                  {rank}
                </span>
                <span className="flex-1 truncate">{e.playerName}</span>
                <span className="shrink-0 tabular-nums text-accent-strong">{fmtEuro(e.score)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
