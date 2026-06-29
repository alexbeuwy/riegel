import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // KI-Crawler ausdrücklich erlauben → RIEGEL-Inhalte dürfen in KI-Antworten zitiert werden.
  const aiBots = [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
    "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended",
    "Applebot-Extended", "CCBot",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
