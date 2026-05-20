import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://friendsbehindbars.com";

  const routes = [
    "",
    "/about",
    "/how-it-works",
    "/catalog",
    "/categories",
    "/subscriptions",
    "/facilities",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/content-rules",
    "/install",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
