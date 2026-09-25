import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/instructor", "/account", "/login", "/forgot-password", "/reset-password", "/forbidden"],
    },
    sitemap: "https://zijtech.com/sitemap.xml",
    host: "https://zijtech.com",
  };
}
