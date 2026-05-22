import { NextResponse } from "next/server";

type StockPhoto = {
  id: string;
  url: string;
  thumb: string;
  description: string;
  source: "pexels" | "unsplash";
  photographer: string;
  originalUrl: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const source = searchParams.get("source") || "pexels";

  if (!query) {
    return NextResponse.json({ success: false, error: "Query is required." }, { status: 400 });
  }

  const photos: StockPhoto[] = [];

  if (source === "pexels" || source === "both") {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (pexelsKey) {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=24&orientation=portrait`,
        { headers: { Authorization: pexelsKey } }
      );
      const data = await res.json();
      for (const photo of data.photos || []) {
        photos.push({
          id: `pexels-${photo.id}`,
          url: photo.src.large,
          thumb: photo.src.medium,
          description: photo.alt || query,
          source: "pexels",
          photographer: photo.photographer,
          originalUrl: photo.url,
        });
      }
    }
  }

  if (source === "unsplash" || source === "both") {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=24&orientation=portrait`,
        { headers: { Authorization: `Client-ID ${unsplashKey}` } }
      );
      const data = await res.json();
      for (const photo of data.results || []) {
        photos.push({
          id: `unsplash-${photo.id}`,
          url: photo.urls.regular,
          thumb: photo.urls.small,
          description: photo.description || photo.alt_description || query,
          source: "unsplash",
          photographer: photo.user.name,
          originalUrl: photo.links.html,
        });
      }
    }
  }

  return NextResponse.json({ success: true, photos });
}
