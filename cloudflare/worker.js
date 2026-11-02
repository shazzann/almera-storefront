/**
 * Cloudflare Worker: Almera Media Edge CDN & Proxy Architecture
 * Subdomain: cdn.almera.lk
 * Target: Supabase Storage Object Endpoint
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. Health check & root preview (friendly response when opening cdn.almera.lk directly)
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("Almera Media CDN is operational", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 2. CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 3. Only allow GET & HEAD for media CDN
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // 4. Supabase Project Origin
    const SUPABASE_ORIGIN = "https://aalqjdmnkoxtwwuunhhe.supabase.co";
    const targetUrl = new URL(url.pathname + url.search, SUPABASE_ORIGIN);

    // 5. Forward essential headers (supports Range requests & browser format negotiation)
    const forwardHeaders = new Headers();
    const range = request.headers.get("range");
    const accept = request.headers.get("accept");
    const ifNoneMatch = request.headers.get("if-none-match");

    if (range) forwardHeaders.set("range", range);
    if (accept) forwardHeaders.set("accept", accept);
    if (ifNoneMatch) forwardHeaders.set("if-none-match", ifNoneMatch);

    // 6. Fetch from Supabase with Cloudflare Edge Caching rules
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          "200-299": 31536000, // Cache successful media for 1 year at the edge
          "404": 60,           // Only cache 404s for 60 seconds (allows newly uploaded files to show immediately)
          "500-599": 0,        // Never cache origin server errors
        },
      },
    });

    // 7. Strip sensitive origin cookies and apply public cache headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.delete("set-cookie"); // Keep responses stateless and safe for public caching

    if (response.ok) {
      newHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (response.status === 404) {
      newHeaders.set("Cache-Control", "public, max-age=60");
    } else {
      newHeaders.set("Cache-Control", "no-store");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};

