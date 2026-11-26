// Vercel Serverless Function — Image Proxy
// Substitui ghostspy.website/api/proxy/image-proxy.php
// Faz proxy de imagens do CDN do Instagram para evitar CORS

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || "*";

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    // Validar que é um URL de imagem do Instagram/Facebook CDN
    const allowed = [
      "cdninstagram.com",
      "fbcdn.net",
      "instagram.com",
      "scontent",
    ];
    const isAllowed = allowed.some((domain) => decodedUrl.includes(domain));
    if (!isAllowed) {
      return res.status(403).json({ error: "URL not allowed" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(decodedUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream ${response.status}` });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("Image proxy error:", e);
    return res.status(500).json({ error: "Failed to fetch image" });
  }
}
