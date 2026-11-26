// Vercel Serverless Function — Leads Proxy
// Substitui ghostspy.website/api/proxy/leads.php
// Sempre retorna que o usuário pode pesquisar (bypass de restrição)

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Site-Key, CF-Turnstile-Token, X-Turnstile-Token",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function writeResponse(res, status, payload = null, extra = {}) {
  const hdr = { ...corsHeaders(res.getHeader?.("origin")), ...extra };
  res.writeHead(status, hdr);
  if (payload !== null) res.end(JSON.stringify(payload));
  else res.end();
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return writeResponse(res, 200);

  const { action } = req.query;

  // Respostas permissivas para todos os endpoints de leads
  const permissive = {
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
  };

  // Qualquer ação (check_status, check_status_by_ip, save_search, etc.)
  return writeResponse(res, 200, permissive);
}
