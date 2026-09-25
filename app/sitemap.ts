import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "ar"].map((path) => ({
    url: `https://zijtech.com/${path}`,
    changeFrequency: "monthly" as const,
    priority: path ? 0.9 : 1,
    alternates: { languages: { en: "https://zijtech.com/", ar: "https://zijtech.com/ar" } },
  }));
}
