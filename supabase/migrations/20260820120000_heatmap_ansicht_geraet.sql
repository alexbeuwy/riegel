-- Heatmap brauchbar machen (20.08.2026, Betreiber-Feedback Alex: „Wie macht
-- diese Heatmap Sinn ohne die einzelnen Steps zu haben, und viel zu grob —
-- exakte Punkte oder Heatmap wie bei Hotjar ist viel besser").
--
-- Zwei Ursachen, warum die alte Heatmap nichts aussagte:
--
--  1. KEINE ANSICHT. x_pct/y_pct werden relativ zur DOKUMENTHÖHE gemessen.
--     Die ist in Schritt 1 („Objektart", kurze Seite) eine völlig andere als
--     auf der Ergebnisseite (sehr lang). Alle Klicks landeten trotzdem auf
--     EINEM Referenzbild übereinander — „60 % Scrolltiefe" bedeutete je nach
--     Schritt etwas anderes. Neue Spalte `ansicht` trennt das sauber.
--  2. ZU GROB. 5-%-Buckets sind auf dem Desktop ~70 px breit — breiter als
--     der Abstand zwischen zwei Buttons. Ab jetzt 0,5-%-Buckets: die Skala
--     von x_pct/y_pct läuft nicht mehr 0–100 in 5er-Schritten, sondern
--     0–200 in 1er-Schritten (= 0,5 % je Stufe, ~7 px auf dem Desktop).
--     Es bleiben BUCKETS, keine Pixel — die Datenschutz-Zusage der Tabelle
--     (kein Fingerabdruck aus der Heatmap) gilt unverändert.
--
-- `geraet` ist bewusst nur die grobe Klasse aus der Viewport-Breite
-- (desktop/mobil), KEIN User-Agent und kein Gerätemodell — gerade genug, um
-- Mobil-Klicks nicht auf ein Desktop-Referenzbild zu projizieren.

alter table public.rechner_events
  add column if not exists ansicht text,   -- nur rechner_klick: objektart|standort|eckdaten|analyse|ergebnis|seite
  add column if not exists geraet text;    -- nur rechner_klick: desktop|mobil

-- Bestandsdaten auf die neue Skala heben (alt: 0–100 in 5er-Schritten →
-- neu: 0–200). Der Filter `ansicht is null` macht das idempotent: nach dem
-- ersten Lauf trägt jede Altzeile 'alt' und wird nicht erneut verdoppelt.
-- 'alt' ist bewusst KEIN gültiger Ansichtsname der App — diese Klicks lassen
-- sich keiner Ansicht mehr zuordnen und erscheinen im Dashboard unter
-- „ohne Ansicht (Altdaten)", statt eine Genauigkeit vorzutäuschen.
update public.rechner_events
   set x_pct = x_pct * 2,
       y_pct = y_pct * 2,
       ansicht = 'alt',
       geraet = coalesce(geraet, 'unbekannt')
 where event = 'rechner_klick'
   and ansicht is null;

-- Die Heatmap filtert immer erst auf Zeitraum + Event und danach auf die
-- Ansicht — dieser Index bedient genau diese Reihenfolge.
create index if not exists rechner_events_klick_ansicht_idx
  on public.rechner_events (created_at desc, ansicht)
  where event = 'rechner_klick';

comment on column public.rechner_events.x_pct is
  'Nur rechner_klick: 0-200 = 0,5-%-Bucket der Dokumentbreite (bis 20.08.2026: 0-100 in 5er-Schritten).';
comment on column public.rechner_events.y_pct is
  'Nur rechner_klick: 0-200 = 0,5-%-Bucket der Dokumenthoehe (bis 20.08.2026: 0-100 in 5er-Schritten).';
comment on column public.rechner_events.ansicht is
  'Nur rechner_klick: sichtbare Rechner-Ansicht zum Klickzeitpunkt. Ohne sie ist y_pct nicht interpretierbar, weil jede Ansicht eine andere Dokumenthoehe hat.';
comment on column public.rechner_events.geraet is
  'Nur rechner_klick: grobe Klasse aus der Viewport-Breite (desktop|mobil). Kein User-Agent, kein Geraetemodell.';
