import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://friendsbehindbars.com";

  const pages: { route: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { route: "",                priority: 1.0, freq: "weekly" },
    { route: "/catalog",        priority: 0.9, freq: "daily"  },
    { route: "/categories",     priority: 0.9, freq: "weekly" },
    { route: "/how-it-works",   priority: 0.8, freq: "monthly" },
    { route: "/faq",            priority: 0.8, freq: "monthly" },
    { route: "/contact",        priority: 0.6, freq: "monthly" },
    { route: "/signup",         priority: 0.7, freq: "monthly" },
    { route: "/login",          priority: 0.5, freq: "monthly" },
    { route: "/privacy",        priority: 0.4, freq: "monthly" },
    { route: "/terms",          priority: 0.4, freq: "monthly" },
    { route: "/content-rules",  priority: 0.5, freq: "monthly" },
  ];

  return pages.map(({ route, priority, freq }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  }));
}
