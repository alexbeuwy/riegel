# Migration-Intake — Datenblatt für einen neuen Makler

> **Zweck:** Die **einzige** Datenquelle, aus der der Migration-Orchestrator
> (`docs/migration-orchestrator.md`) Makler-Angaben beziehen darf. beuwy füllt dieses
> Blatt **gemeinsam mit dem Makler** aus und legt es als `intake.yaml` ab.
>
> **Markierungen:**
> - `PFLICHT` — ohne diesen Wert startet die Migration nicht sinnvoll.
> - `CREDENTIAL` — rote Liste (Playbook §5): nur echte, vom Makler bestätigte Angaben.
>   Fehlt der Wert → `TODO` eintragen, der Orchestrator setzt sichtbare Platzhalter
>   und listet die Lücke im Abschlussreport. **Niemals raten oder von RIEGEL kopieren.**
> - `OPTIONAL` — Orchestrator kann generieren/recherchieren oder die Sektion weglassen.
>
> Secrets (API-Keys, Passwörter) gehören **nie** in diese Datei — hier steht nur,
> **ob** sie vorliegen und wo sie gesetzt werden (Vercel-Env).

```yaml
# ================= intake.yaml — Vorlage =================
# Beispielwerte auskommentiert (fiktiver Makler in Darmstadt).

makler:
  name: ""                 # PFLICHT — Marken-Auftritt, z. B. "Muster Immobilien"
  legalName: ""            # CREDENTIAL — exakte Handelsregister-Firmierung, z. B. "Muster Immobilien GmbH"
  tagline: ""              # OPTIONAL — sonst generiert der Orchestrator einen Vorschlag
  description: ""          # OPTIONAL — Meta-Description, sonst generiert
  domain: ""               # PFLICHT — kanonische Domain inkl. https://, z. B. "https://muster-immobilien.de"
  familienbetrieb: false   # PFLICHT — steuert, ob das Familien-Narrativ (ueber-uns) zulässig ist

kontakt:
  phone: ""                # PFLICHT — Hauptnummer, Anzeigeformat
  email: ""                # PFLICHT — zentrale Kontaktadresse (wird auch EMAIL_TO)
  whatsapp: ""             # OPTIONAL — nur Ziffern, international (leer = Feature aus)

standorte:                 # PFLICHT — mind. 1; Reihenfolge = Hauptstandort zuerst
  - city: ""               #   z. B. "Darmstadt"
    street: ""
    zip: ""
    phone: ""

region:
  bundesland: ""           # PFLICHT — steuert BORIS-Abdeckung (RLP/Hessen angebunden, Playbook §7)
  marktgebiet_label: ""    # PFLICHT — z. B. "Rhein-Main" (ersetzt "Metropolregion Rhein-Neckar")
  kernstaedte: []          # PFLICHT — Städte für Geo-Seiten/Preisatlas, z. B.
                           #   ["Darmstadt", "Griesheim", "Weiterstadt", "Pfungstadt", ...]
                           #   Koordinaten/Nachfragefaktoren recherchiert der Orchestrator.
  preisniveau_quelle: ""   # OPTIONAL — falls der Makler eigene Marktberichte hat

branding:
  akzentfarbe_hex: ""      # PFLICHT — z. B. "#0a7d4f"; wird site.brandColor + --color-accent
  logo_quelle: ""          # PFLICHT — wo liegen Logo-Dateien (SVG hell/dunkel/Bildmarke)?
                           #   Pfad/URL/Übergabeordner. Fehlt → Platzhalter-Wortmarke + TODO.
  bildwelt_quelle: ""      # OPTIONAL — Bunny-Zone/Ordner mit Makler-Fotos; fehlt → neutrale Platzhalter
  display_font: ""         # OPTIONAL — Ersatz für "Akira Super Bold" (Lizenz!); leer → System-Fallback
  og_claim: ""             # OPTIONAL — Claim fürs OG-Image (RIEGELs "Fast Food"-Claim wird NIE übernommen)

socials:                   # OPTIONAL — nur echte, existierende Profile; leer = Icon entfällt
  instagram: ""
  facebook: ""
  youtube: ""
  linkedin: ""

recht:                     # CREDENTIAL — komplett vom Makler, 1:1 wie in amtlichen Dokumenten
  rechtsform: ""           #   z. B. "GmbH", "e.K."
  registergericht: ""      #   z. B. "Amtsgericht Darmstadt"
  register_nr: ""          #   z. B. "HRB 12345"
  ust_id: ""               #   USt-IdNr. oder "keine"
  par34c_behoerde: ""      #   erteilende Behörde der §34c-Erlaubnis
  aufsichtsbehoerde: ""    #   zuständige Aufsichtsbehörde inkl. Anschrift
  verantwortliche_person: "" # V.i.S.d.P. / Inhaber:in — ersetzt "Sylwia Riegel" an ~6 Stellen
  anschrift_rechtstexte: "" # Ladungsfähige Anschrift (kann vom Standort abweichen)
  berufshaftpflicht: ""    # OPTIONAL — Versicherer + Geltungsraum, falls genannt werden soll

team:                      # CREDENTIAL — nur reale Personen mit deren Einwilligung (Foto + Nennung!)
  - name: ""
    rolle: ""
    foto_quelle: ""        # leer → Initialen-Platzhalter
    kurzvita: ""           # OPTIONAL

trust:                     # CREDENTIAL — nur belegbare, EIGENE Angaben; leere Listen = Sektion wird entfernt
  auszeichnungen: []       #   z. B. [{titel: "", jahr: "", verleiher: "", nachweis: ""}]
  testimonials: []         #   z. B. [{name: "", text: "", einwilligung: true}]
  plattform_bewertungen: []#   z. B. [{plattform: "Google", score: "", anzahl: "", profil_url: ""}]
  kennzahlen: {}           #   ersetzt riegel-stats: nur belegbare Werte (Verkäufe, Jahre am Markt, ...)

integrationen:
  onoffice_vertrag: false        # PFLICHT — API-Freischaltung beauftragt/vorhanden?
  onoffice_expose_vorlagen: []   # PFLICHT vor Phase 7 — exakte Titel der PDF-Vorlagen im Account
  supabase_projekt: false        # Phase A: eigenes Projekt angelegt? (nie geteilt!)
  resend_domain: ""              # Versand-(Sub-)Domain, z. B. "m.muster-immobilien.de"
  bunny_zone: ""                 # Storage-/Pull-Zone-Hostname, z. B. "muster.b-cdn.net"
  vercel_projekt: false          # Projekt mit Domain als Primary Domain?

env_gesetzt:               # PFLICHT vor Go-Live — nur Ja/Nein, Werte NUR in Vercel!
  ONOFFICE_TOKEN: false          # + ONOFFICE_SECRET
  SUPABASE: false                # URL, ANON_KEY, SERVICE_ROLE_KEY, PAT
  RESEND_API_KEY: false
  EMAIL_FROM: false              # ⚠️ größte Stille-Falle (Playbook §4)
  EMAIL_TO: false                # sonst laufen Anfragen zu RIEGEL!
  INTERN_EMAILS: false           # sonst /intern-Zugriff für Sissy/Alex
  FEEDBACK_TO_CC: false
  BUNNY: false                   # CDN_HOST, STORAGE_ZONE, STORAGE_HOST, ACCESS_KEY
  ADMIN_PASSWORD: false          # neu generiert, nicht wiederverwendet
  CRON_SECRET: false

inhalte:                   # OPTIONAL — je mehr, desto weniger generisch der Content
  usps: []                 #   was den Makler wirklich unterscheidet
  spezialgebiete: []       #   Objektarten-Schwerpunkte (steuert Experten-Seiten)
  gruendungsjahr: ""
  story: ""                #   Stichpunkte zur Firmengeschichte für /ueber-uns
# =========================================================
```

## Ausfüll-Hinweise für beuwy

- **`kernstaedte` bestimmt den Content-Umfang:** RIEGEL fährt 18 Städte × Geo-Artikel
  + Preisatlas. Weniger Städte = schnellere Migration; die Liste lässt sich später
  erweitern (Playbook §3.3).
- **`bundesland` früh klären:** außerhalb RLP/Hessen gibt es keinen angebundenen
  amtlichen Bodenrichtwert-Dienst — der Rechner läuft dann auf Modellwerten ohne
  „amtlich"-Badge. Das ist eine bewusste Produktentscheidung, keine Lücke
  (`docs/preisatlas-research.md`).
- **Leere `trust`-Listen sind okay** — die Website degradiert sauber (Sektion weg).
  Ein einziger erfundener Award wäre dagegen abmahnfähig.
- **Team-Einwilligungen schriftlich einholen**, bevor Fotos/Namen online gehen
  (Persönlichkeitsrecht — Playbook §5).
