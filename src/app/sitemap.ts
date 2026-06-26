import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { mockEstates } from "@/lib/mock-estates";
import { standorte, ratgeber } from "@/lib/geo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const now = new Date();
  const routes = [
    "",
    "/immobilien",
    "/rechner",
    "/verkaufen",
    "/standorte",
    "/ratgeber",
    "/ueber-uns",
    "/kontakt",
    "/termin",
    "/merkliste",
    "/impressum",
    "/datenschutz",
    "/widerruf",
  ];
  return [
    ...routes.map((r) => ({ url: `${base}${r}`, lastModified: now })),
    ...mockEstates.map((e) => ({
      url: `${base}/immobilien/${e.slug}`,
      lastModified: now,
    })),
    ...standorte().map((a) => ({ url: `${base}/standorte/${a.slug}`, lastModified: now })),
    ...ratgeber().map((a) => ({ url: `${base}/ratgeber/${a.slug}`, lastModified: now })),
  ];
}
