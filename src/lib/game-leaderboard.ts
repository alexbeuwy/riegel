/** Gemeinsame Typen für die Blitzverkauf-Bestenliste (Client + API-Route). */
export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  soldCount: number;
  createdAt: string;
}

/** Erster Tag des aktuellen UTC-Monats — die Bestenliste "resettet" rein über
 *  diesen Zeitraum-Filter, nicht durch Löschen (siehe supabase-schema.sql §7). */
export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTH_NAMES[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
}
