// Vercel Serverless Function — Instagram Profile Proxy
// Substitui o endpoint ghostspy.website/api/proxy/instagram.php

const INSTAGRAM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  Accept: "*/*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "X-IG-App-ID": "936619743392459",
  "X-Requested-With": "XMLHttpRequest",
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Site-Key, CF-Turnstile-Token, X-Turnstile-Token",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function writeResponse(res, status, payload = null, extra = {}) {
  const hdr = { ...corsHeaders(res.getHeader?.("origin")), ...extra };
  res.writeHead(status, hdr);
  if (payload !== null) {
    res.end(JSON.stringify(payload));
  } else {
    res.end();
  }
}

// ---------- Fetch profile via Instagram web API ----------
async function fetchProfileFromInstagram(username) {
  const urls = [
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
  ];
  let lastError = null;
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        method: "GET",
        headers: INSTAGRAM_HEADERS,
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (resp.status === 404) {
        return { error: "Usuário não encontrado", status: 404 };
      }
      if (!resp.ok) {
        lastError = `HTTP ${resp.status}`;
        continue;
      }
      const data = await resp.json();
      const user = data?.data?.user;
      if (!user) {
        lastError = "User data empty";
        continue;
      }
      return {
        pk: user.id || "",
        username: user.username || username,
        full_name: user.full_name || "",
        biography: user.biography || "",
        profile_pic_url: user.profile_pic_url || user.profile_pic_url_hd || "",
        profile_pic_url_hd: user.profile_pic_url_hd || user.profile_pic_url || "",
        is_private: user.is_private || false,
        is_verified: user.is_verified || false,
        is_business: user.is_business_account || false,
        media_count: user.edge_owner_to_timeline_media?.count || 0,
        follower_count: user.edge_followed_by?.count || 0,
        following_count: user.edge_follow?.count || 0,
      };
    } catch (e) {
      lastError = e.message || String(e);
    }
  }
  // fallback graphql
  try {
    const graphqlUrl = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(graphqlUrl, {
      method: "GET",
      headers: INSTAGRAM_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      const user = data?.graphql?.user || data?.user;
      if (user) {
        return {
          pk: user.id || user.pk || "",
          username: user.username || username,
          full_name: user.full_name || "",
          biography: user.biography || "",
          profile_pic_url: user.profile_pic_url || "",
          profile_pic_url_hd: user.profile_pic_url_hd || user.profile_pic_url || "",
          is_private: user.is_private || false,
          is_verified: user.is_verified || false,
          is_business: user.is_business_account || false,
          media_count: user.edge_owner_to_timeline_media?.count || user.media_count || 0,
          follower_count: user.edge_followed_by?.count || user.follower_count || 0,
          following_count: user.edge_follow?.count || user.following_count || 0,
        };
      }
    }
  } catch (e) {
    lastError = e.message || String(e);
  }
  return { error: lastError || "Perfil não encontrado", status: 500 };
}

// ---------- Fetch complete/all data ----------
async function fetchCompleteData(username) {
  const profile = await fetchProfileFromInstagram(username);
  if (profile.error) return profile;
  return {
    ...profile,
    lista_perfis_publicos: [],
    followers: [],
    chaining_results: [],
    posts: [],
    followers_posts: [],
    feed_posts: [],
    error_count: 0,
    success: true,
    results: [{ source: "proxy" }],
  };
}

// ---------- Handler ----------
export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || "*";
  const headers = corsHeaders(origin);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return writeResponse(res, 200, null, headers);
  }

  const { tipo, username, action } = req.query;

  // Leads endpoint - permissive defaults
  if (req.url.includes("leads.php") || action) {
    return writeResponse(
      res,
      200,
      {
        success: true,
        exists: false,
        searchCount: 0,
        canSearch: true,
        blockReason: null,
        gracePeriodExpired: false,
        gracePeriodRemaining: 900,
        gracePeriodMinutes: 15,
      },
      headers
    );
  }

  if (!username) {
    return writeResponse(res, 400, { error: "Missing username parameter" }, headers);
  }

  const cleanUsername = username.replace(/^@+/, "").trim();
  if (!cleanUsername || cleanUsername.length > 30) {
    return writeResponse(res, 400, { error: "Invalid username" }, headers);
  }

  try {
    let result;
    switch (tipo) {
      case "perfil":
        result = await fetchProfileFromInstagram(cleanUsername);
        break;
      case "busca_completa":
      case "all":
        result = await fetchCompleteData(cleanUsername);
        break;
      default:
        result = await fetchProfileFromInstagram(cleanUsername);
    }
    if (result.error && !result.username) {
      const status = result.status || 500;
      return writeResponse(res, status, { error: result.error }, headers);
    }
    return writeResponse(res, 200, result, headers);
  } catch (e) {
    console.error("Proxy error:", e);
    return writeResponse(
      res,
      500,
      { error: e.message || "Internal server error" },
      headers
    );
  }
}
