-- Rechner-Eingaben Hausgeld + Kernsanierung (11.08.2026, Fall Manfred
-- „Landauer Warte"): Der Rechner fragt bei Wohnungen jetzt das monatliche
-- Hausgeld ab (realer Preisdrücker) und bei Altbau-„neuwertig" die
-- Kernsanierung. Beides muss am Lead persistiert werden, sonst rechnet das
-- interne Report-Regenerat (/api/intern/report) mit anderen Eingaben als das
-- damals versendete PDF. Die Route hat einen Legacy-Fallback und funktioniert
-- auch OHNE diese Migration — dann ohne Persistenz der neuen Felder.
alter table public.valuation_requests
  add column if not exists hausgeld_monat numeric,
  add column if not exists kernsaniert boolean;
