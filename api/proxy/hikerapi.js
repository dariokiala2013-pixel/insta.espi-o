// Vercel Serverless Function — HikerAPI Proxy
// Substitui ghostspy.website/api/proxy/hikerapi.php

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Site-Key, CF-Turnstile-Token, X-Turnstile-Token",
    "Content-Type": "application/json; charset=utf-8",
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || "*";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return res.status(200).set(headers).end();
  }

  // HikerAPI requer uma chave de API válida. 
  // Se tiveres uma, define HIKERAPI_KEY nas variáveis de ambiente do Vercel.
  const apiKey = process.env.HIKERAPI_KEY;

  if (!apiKey) {
    // Sem chave HikerAPI, retorna erro sugestivo
    return res.status(503).set(headers).json({
      error: "HikerAPI not configured. Set HIKERAPI_KEY environment variable in Vercel.",
    });
  }

  const { path, ...queryParams } = req.query;

  if (!path) {
    return res.status(400).set(headers).json({ error: "Missing path parameter" });
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
    return res.status(response.status).set(headers).json(data);
  } catch (e) {
    console.error("HikerAPI proxy error:", e);
    return res.status(500).set(headers).json({ error: e.message || "HikerAPI request failed" });
  }
}
