import { notFound } from "next/navigation";
import { GeoArticleView } from "@/components/geo-article-view";
import { ratgeber, getArticle } from "@/lib/geo";

export function generateStaticParams() {
  return ratgeber().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle("ratgeber", slug);
  if (!a) return { title: "Ratgeber" };
  return {
    title: a.metaTitle,
    description: a.metaDescription,
    alternates: { canonical: `/ratgeber/${a.slug}` },
    keywords: a.keywords,
  };
}

export default async function RatgeberArtikelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle("ratgeber", slug);
  if (!a) notFound();
  return <GeoArticleView article={a} />;
}
