import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { mockEstates } from "@/lib/mock-estates";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const now = new Date();
  const routes = [
    "",
    "/immobilien",
    "/rechner",
    "/verkaufen",
    "/ueber-uns",
    "/kontakt",
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
  ];
}
