// Vercel Serverless Function — Leads Proxy
// Substitui ghostspy.website/api/proxy/leads.php
// Retorna sempre que o utilizador pode pesquisar (bypass da restrição)

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  const { action } = req.query;

  switch (action) {
    case "check_status":
    case "check_status_by_ip":
      return res.status(200).set(headers).json({
        success: true,
        exists: false,
        searchCount: 0,
        canSearch: true,
        blockReason: null,
        gracePeriodExpired: false,
        gracePeriodRemaining: 900,
        gracePeriodMinutes: 15,
        previousUsername: null,
        leadData: null,
      });

    case "save_search":
      return res.status(200).set(headers).json({
        success: true,
        message: "Search saved",
      });

    default:
      return res.status(200).set(headers).json({
        success: true,
        canSearch: true,
      });
  }
}
