"use client";

import { useEffect, useState } from "react";
import { Leaderboard } from "@/components/game/leaderboard";
import type { LeaderboardEntry } from "@/lib/game-leaderboard";

/**
 * Dauerhafte Bestenlisten unter dem Spielfenster: Allzeit + laufender Monat.
 * Lädt einmal beim Mount aus /api/game-scores. Bei Fehler/leerer Antwort wird
 * schlicht nichts angezeigt (kein Störer auf einer reinen Spaß-Seite).
 */
export function GameLeaderboards() {
  const [monthly, setMonthly] = useState<LeaderboardEntry[]>([]);
  const [allTime, setAllTime] = useState<LeaderboardEntry[]>([]);
  const [monthLabel, setMonthLabel] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/game-scores")
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.ok) return;
        setAllTime(d.allTime ?? []);
        setMonthly(d.monthly ?? d.entries ?? []);
        setMonthLabel(d.monthLabel ?? "");
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded) return null;

  return (
    <div className="mx-auto mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
      <Leaderboard entries={allTime} heading="Bestenliste" monthLabel="Allzeit" className="max-w-none" />
      <Leaderboard entries={monthly} heading="Diesen Monat" monthLabel={monthLabel} className="max-w-none" />
    </div>
  );
}
