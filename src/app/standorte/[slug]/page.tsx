import { notFound } from "next/navigation";
import { GeoArticleView } from "@/components/geo-article-view";
import { standorte, getArticle } from "@/lib/geo";

export function generateStaticParams() {
  return standorte().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle("standort", slug);
  if (!a) return { title: "Standort" };
  return {
    title: a.metaTitle,
    description: a.metaDescription,
    alternates: { canonical: `/standorte/${a.slug}` },
    keywords: a.keywords,
  };
}

export default async function StandortPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle("standort", slug);
  if (!a) notFound();
  return <GeoArticleView article={a} />;
}
