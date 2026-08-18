-- Conversion-Tracking für den Immobilienrechner (18.08.2026, Auftrag Alex:
-- „mehr Conversions durch den Rechner und sehen, ob er überhaupt angefangen
-- oder genutzt wird — und MEHR LEUTE, DIE DAS PDF HOLEN").
--
-- Warum eine eigene Tabelle statt eines externen Analytics-Tools: der Funnel
-- soll ohne Cookie-Banner, ohne Drittland-Transfer und ohne Consent-Gate
-- messbar sein. Deshalb ist hier bewusst NICHTS personenbeziehbar:
--   * KEINE IP, KEIN User-Agent, KEIN Referrer — die Route /api/track schreibt
--     diese Felder gar nicht erst (die IP dient nur flüchtig dem Rate-Limit).
--   * pageload_id ist eine Zufalls-Id EINES Seitenaufrufs (kein Cookie, kein
--     localStorage, keine Wiedererkennung über Seiten/Besuche hinweg). Sie
--     verknüpft nur die Schritte derselben Rechner-Session, damit der Funnel
--     Uniques statt Klick-Spam zählt. Typ `text` (nicht uuid), weil der Client
--     ohne crypto.randomUUID auf ein eigenes Zufallsformat zurückfällt.
--   * x_pct/y_pct sind grobe 5 %-Raster-Buckets (0–100), keine Pixel — aus der
--     Heatmap lässt sich kein Fingerabdruck bauen.
--   * created_at kommt aus der SERVERZEIT; der Client-Zeitstempel wird
--     verworfen (unzuverlässige Uhren, unnötiges Datum mehr).
--
-- Die App funktioniert auch OHNE diese Migration: /api/track loggt den
-- Insert-Fehler und antwortet weiterhin 204, /api/intern/conversion meldet
-- „noch keine Daten". Das Dashboard aktiviert sich automatisch, sobald die
-- Tabelle existiert.

create table if not exists public.rechner_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Event-Name aus der Allowlist in src/lib/track.ts (rechner_start,
  -- rechner_step, rechner_analyse, rechner_ergebnis, report_form_geoeffnet,
  -- report_angefordert, rechner_klick). Bewusst kein Enum: neue Events sollen
  -- ohne Migration deploybar sein, die Allowlist steht im Route-Code.
  event text not null,
  step smallint,          -- nur rechner_step: 1–3
  quelle text,            -- nur report_form_geoeffnet: 'cta' | 'badge'
  x_pct smallint,         -- nur rechner_klick: 0–100 in 5er-Schritten
  y_pct smallint,         -- nur rechner_klick: 0–100 in 5er-Schritten
  bereich text,           -- nur rechner_klick: grober Bereichs-Slug
  pageload_id text not null
);

-- Jede Auswertung im /intern-Tab „Conversion" filtert auf einen Zeitraum
-- (7/30 Tage) und danach auf das Event — genau diese Reihenfolge.
create index if not exists rechner_events_created_event_idx
  on public.rechner_events (created_at desc, event);

alter table public.rechner_events enable row level security;

-- KEINE Policy für anon/public — bewusst, analog expose_confirmations
-- (Migration 20260810205500) und der RLS-Härtung 20260810204917:
-- Geschrieben wird ausschließlich serverseitig über /api/track mit dem
-- service_role-Key (umgeht RLS), gelesen ausschließlich über
-- /api/intern/conversion nach Zugangsprüfung. RLS an + keine Policy =
-- deny by default für den öffentlichen anon-Key im Browser-Bundle. Damit
-- kann niemand von außen Funnel-Zahlen fälschen oder auslesen.

comment on table public.rechner_events is
  'Anonyme Funnel-/Heatmap-Events des Immobilienrechners. Ohne IP, UA und ohne Wiedererkennung (pageload_id gilt nur für EINEN Seitenaufruf). Nur service_role.';
