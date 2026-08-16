interface PexelsPhoto {
  id: number;
  src: { large2x: string; large: string; medium: string };
  alt: string;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#e5e5e5"/></svg>'
  ).toString("base64");

export async function searchPexelsImage(query: string): Promise<string> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return FALLBACK_IMAGE;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: apiKey }, next: { revalidate: 60 * 60 * 24 } }
    );
    if (!res.ok) return FALLBACK_IMAGE;

    const data = (await res.json()) as PexelsSearchResponse;
    return data.photos[0]?.src.large2x ?? FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}
