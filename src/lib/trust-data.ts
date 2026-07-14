/**
 * Bewertungsdaten & Kundenstimmen — recherchiert & verifiziert (Stand 2026-07-02).
 * NUR Plattformen mit direkt bestätigtem ODER mehrfach kreuzverifiziertem Wert.
 * Kununu (kein Profil auffindbar) ist bewusst NICHT drin.
 * Google ist auf Wunsch aufgenommen — Anzahl aus Alex' Ablesung (Speyer 414 +
 * Ludwigshafen 35 = 449). Sterne 4,8 provisorisch (Aggregator-Wert), BITTE von
 * Alex final bestätigen + kanonische Google-Profil-URL(s) nachreichen.
 * IVD-Mitgliedschaft ist nicht belegbar — echte Verbandszugehörigkeit ist BVFI
 * (Manfred Riegel, Regionaldirektor), das steht stattdessen im Streifen.
 */
import type { IconName } from "@/components/icon";

export interface TrustPlatform {
  key: string;
  name: string;
  rating: number; // auf der jeweiligen Skala (siehe scaleMax)
  scaleMax: number;
  count: number;
  url: string;
  icon: IconName;
}

export const TRUST_PLATFORMS: TrustPlatform[] = [
  // Sterne 4,8 = provisorisch (bitte bestätigen); Anzahl 449 = Speyer 414 + LU 35 (Alex).
  { key: "google", name: "Google", rating: 4.8, scaleMax: 5, count: 449, url: "https://www.google.com/maps/search/?api=1&query=RIEGEL+Immobilien+Speyer", icon: "pin" },
  { key: "immoscout24", name: "ImmoScout24", rating: 4.7, scaleMax: 5, count: 148, url: "https://www.immobilienscout24.de/anbieter/profil/riegel-immobilien/riegel-immobilien", icon: "home" },
  { key: "trustpilot", name: "Trustpilot", rating: 4.6, scaleMax: 5, count: 34, url: "https://de.trustpilot.com/review/www.riegel-immobilien.de", icon: "star" },
  { key: "trustlocal", name: "Trustlocal", rating: 8.6, scaleMax: 10, count: 30, url: "https://trustlocal.de/rheinland-pfalz/ludwigshafen-am-rhein/immobilienmakler/riegel-immobilien/", icon: "shield" },
  { key: "golocal", name: "golocal", rating: 4.5, scaleMax: 5, count: 17, url: "https://www.golocal.de/speyer/immobilien/riegel-immobilien-Ln8eb/", icon: "compass" },
];

export interface TrustBadge {
  key: string;
  label: string;
  sub: string;
  icon: IconName;
}

/** Reine Auszeichnungs-/Verbands-Badges (keine Sterne-Skala). */
export const TRUST_BADGES: TrustBadge[] = [
  { key: "immoaward", label: "ImmoAward 2025", sub: "Top 21 von 25.000+ Maklern", icon: "sparkle" },
  { key: "bvfi", label: "BVFI", sub: "Regionaldirektor Manfred Riegel", icon: "shield" },
  { key: "facebook", label: "Facebook", sub: "riegelimmobilien", icon: "users" },
];

export interface Testimonial {
  text: string;
  autor: string;
  plattform: string;
  sterne: number | null;
  url: string;
}

/** Echte, öffentlich einsehbare Bewertungen (Original-Wortlaut, gekürzt wo markiert). */
export const TESTIMONIALS: Testimonial[] = [
  {
    text: "Der Hausverkauf mit Riegel Immobilien Speyer war dank Frau Redmann ein voller Erfolg! Ihr außergewöhnliches Engagement und ihre hervorragende Organisation haben den gesamten Verkaufsprozess reibungslos gemacht.",
    autor: "golocal-Kunde",
    plattform: "golocal",
    sterne: 5,
    url: "https://www.golocal.de/speyer/immobilien/riegel-immobilien-Ln8eb/",
  },
  {
    text: "Riegel Immobilien zeichnet sich durch sein kompetentes und zuvorkommendes Personal aus, das stets im Dialog mit seinen Kunden steht.",
    autor: "Familie Bartmann",
    plattform: "golocal",
    sterne: 5,
    url: "https://www.golocal.de/speyer/immobilien/riegel-immobilien-Ln8eb/",
  },
  {
    text: "Wir haben unsere Wohnung sehr schnell verkaufen können. Die Betreuung war von Anfang an sehr freundlich, kompetent.",
    autor: "massoa",
    plattform: "golocal",
    sterne: 5,
    url: "https://www.golocal.de/speyer/immobilien/riegel-immobilien-Ln8eb/",
  },
  {
    text: "Von der Einschätzung meiner Immobilie bis hin zum Verkauf stand Herr Riegel mir beiseite.",
    autor: "Melanie Korkmaz",
    plattform: "golocal",
    sterne: 5,
    url: "https://www.golocal.de/speyer/immobilien/riegel-immobilien-Ln8eb/",
  },
  {
    text: "Ich würde jederzeit wieder zu Riegel Immobilien gehen. Alle Mitarbeiter waren zu jeder Zeit sehr freundlich, kompetent und flexibel.",
    autor: "Ramona Lamb",
    plattform: "Trustlocal (Google)",
    sterne: null,
    url: "https://trustlocal.de/rheinland-pfalz/ludwigshafen-am-rhein/immobilienmakler/riegel-immobilien/",
  },
  {
    text: "Vielen Dank an Frau Magdalena Czerwinski. Wir sind sehr zufrieden. Alles lief reibungslos.",
    autor: "Kat",
    plattform: "Trustlocal (Google)",
    sterne: null,
    url: "https://trustlocal.de/rheinland-pfalz/ludwigshafen-am-rhein/immobilienmakler/riegel-immobilien/",
  },
];
