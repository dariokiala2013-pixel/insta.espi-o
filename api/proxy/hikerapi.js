// Vercel Serverless Function — HikerAPI Proxy

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Site-Key, CF-Turnstile-Token, X-Turnstile-Token",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function writeResponse(res, status, payload, extra = {}) {
  const hdr = { ...corsHeaders(), ...extra };
  res.writeHead(status, hdr);
  res.end(payload !== null ? JSON.stringify(payload) : "");
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return writeResponse(res, 200, null);
  }

  const apiKey = process.env.HIKERAPI_KEY;
  if (!apiKey) {
    return writeResponse(res, 503, {
      error: "HikerAPI not configured. Set HIKERAPI_KEY in Vercel env.",
    });
  }

  const { path, ...queryParams } = req.query || {};
  if (!path) {
    return writeResponse(res, 400, { error: "Missing path parameter" });
  }

  try {
    const params = new URLSearchParams(queryParams);
    const hikerUrl = `https://api.hikerapi.com${path}?${params.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(hikerUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-access-key": apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    return writeResponse(res, response.status, data);
  } catch (e) {
    console.error("HikerAPI proxy error:", e);
    return writeResponse(res, 500, {
      error: e.message || "HikerAPI request failed",
    });
  }
}
