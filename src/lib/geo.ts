import data from "@/content/geo-articles.json";

export interface GeoFaq {
  q: string;
  a: string;
}
export interface GeoSection {
  h2: string;
  body: string;
}
export interface GeoArticle {
  slug: string;
  kind: "standort" | "ratgeber";
  ort?: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: GeoSection[];
  faq: GeoFaq[];
  keywords?: string[];
}

export const geoArticles = data as GeoArticle[];

export const standorte = (): GeoArticle[] => geoArticles.filter((a) => a.kind === "standort");
export const ratgeber = (): GeoArticle[] => geoArticles.filter((a) => a.kind === "ratgeber");

export function getArticle(kind: GeoArticle["kind"], slug: string): GeoArticle | undefined {
  return geoArticles.find((a) => a.kind === kind && a.slug === slug);
}
