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
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
