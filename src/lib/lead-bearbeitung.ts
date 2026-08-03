/**
 * Typen für die Lead-Bearbeitung im /intern-Cockpit (Tabelle lead_bearbeitung).
 * Jede Zeile hängt per (quelle, quelle_id) an genau einem Report
 * (valuation_requests) oder einer Anfrage (leads) und hält den
 * Bearbeitungsstand (Status, Notiz, Wiedervorlage, optionale OnOffice-Adress-ID).
 */

export type LeadQuelle = "report" | "lead";

export type LeadStatus = "neu" | "kontaktiert" | "termin" | "gewonnen" | "verloren";

export const LEAD_STATUS_VALUES: LeadStatus[] = [
  "neu",
  "kontaktiert",
  "termin",
  "gewonnen",
  "verloren",
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  neu: "Neu",
  kontaktiert: "Kontaktiert",
  termin: "Termin",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
};

export interface LeadBearbeitung {
  quelle: LeadQuelle;
  quelle_id: string;
  status: LeadStatus;
  notiz: string | null;
  wiedervorlage: string | null;
  onoffice_adresse_id: string | null;
  geaendert_am: string;
}

/** Karte "<quelle>:<quelle_id>" -> Bearbeitungsstand, wie sie das /api/intern
 *  GET fürs Dashboard mitliefert (nur die für die Anzeige relevanten Felder). */
export type LeadBearbeitungMap = Record<
  string,
  Pick<LeadBearbeitung, "status" | "notiz" | "wiedervorlage" | "onoffice_adresse_id">
>;

/** Schlüssel für die Bearbeitungs-Map, konsistent client- wie serverseitig zu bilden. */
export function bearbeitungKey(quelle: LeadQuelle, quelleId: string): string {
  return `${quelle}:${quelleId}`;
}
