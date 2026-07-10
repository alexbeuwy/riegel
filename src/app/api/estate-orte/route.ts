import { NextResponse } from "next/server";
import { getEstateOrte } from "@/lib/estates";

/**
 * Liefert die real verfügbaren Orte aus dem OnOffice-Bestand (bzw. die
 * Mock-Orte im Fallback). Das Suchprofil (/konto) nutzt das, damit die
 * Regionen-Auswahl die echten Möglichkeiten spiegelt statt einer festen Liste.
 * Öffentlich unkritisch (nur Ortsnamen), gecacht über getEstateData (5 Min).
 */
export async function GET() {
  const orte = await getEstateOrte();
  return NextResponse.json({ orte });
}
