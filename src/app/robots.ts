import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // KI-Crawler ausdrücklich erlauben → RIEGEL-Inhalte dürfen in KI-Antworten zitiert werden.
  const aiBots = [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
    "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended",
    "Applebot-Extended", "CCBot",
  ];
  // APIs, internes Dashboard und nutzerspezifische Seiten nicht crawlen.
  const disallow = ["/api/", "/intern", "/konto", "/merkliste"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: [
      `${site.url}/sitemap.xml`,
      // Zwei Diagnose-Sitemaps zusätzlich eingereicht: dieselben URLs stehen
      // bereits in sitemap.xml, das ist laut Sitemap-Protokoll zulässig. Sie
      // teilen den Bestand nur in "volatile Objektseiten" und "stabile Inhalte"
      // auf, damit die Search Console den Indexierungsstatus getrennt ausweist.
      `${site.url}/sitemap-immobilien.xml`,
      `${site.url}/sitemap-inhalte.xml`,
    ],
    // Die Host-Direktive (nicht-standardisiert, ursprünglich von Yandex genutzt)
    // erwartet nur den nackten Hostnamen ohne Schema. Mit vollem site.url stand
    // hier fälschlich "Host: https://riegel-immobilien.de" statt des Hostnamens.
    host: new URL(site.url).hostname,
  };
}
