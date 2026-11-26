(function () {
    const SST_DOMAIN = 'sst.stalkeia.ai';
    
    // Usar o próprio domínio como proxy (Vercel serverless functions em /api/proxy/)
    const LOCAL_PROXY = '/api/proxy';
    const LOCAL_IMAGE_PROXY = '/api/proxy/image-proxy?url=';

    function replaceUrl(url) {
        if (typeof url !== 'string') return url;
        // Don't intercept tracking sst requests
        if (url.includes(SST_DOMAIN)) return url;

        // Redirect dead cloudflare workers to local image proxy
        if (url.includes('proxt-insta.projetinho-solo.workers.dev') || url.includes('userfounded.workers.dev')) {
            try {
                var u = new URL(url, window.location.href);
                var target = u.searchParams.get('url');
                if (target) {
                    return LOCAL_IMAGE_PROXY + encodeURIComponent(target);
                }
            } catch (e) {}
            return url.replace(/https?:\/\/[^\/]*workers\.dev\/\?url=/, LOCAL_IMAGE_PROXY);
        }

        // Redirect ghostspy.website proxy calls to local Vercel API
        if (url.includes('ghostspy.website/api/proxy')) {
            return url.replace(/https?:\/\/ghostspy\.website\/api\/proxy/, LOCAL_PROXY);
        }

        // Redirect local relative proxy to local Vercel API (keep as-is, they already point to /api/proxy)
        if (url.startsWith('/api/proxy') || url.includes('/api/proxy/')) {
            return url;
        }

        return url;
    }

    function isSstRequest(url) {
        return typeof url === 'string' && url.includes(SST_DOMAIN);
    }

    // Intercept Fetch
    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (typeof input === 'string') {
            if (isSstRequest(input)) return originalFetch.call(this, input, init);
            input = replaceUrl(input);
        } else if (input instanceof URL) {
            if (isSstRequest(input.toString())) return originalFetch.call(this, input, init);
            input = new URL(replaceUrl(input.toString()));
        } else if (input instanceof Request) {
            if (isSstRequest(input.url)) return originalFetch.call(this, input, init);
            input = new Request(replaceUrl(input.url), input);
        }
        return originalFetch.call(this, input, init);
    };

    // Intercept XMLHttpRequest
    var originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (isSstRequest(url)) return originalOpen.apply(this, arguments);
        arguments[1] = replaceUrl(url);
        return originalOpen.apply(this, arguments);
    };

    // Lightweight image URL fixer (no heavy recursive DOM traversal)
    function fixImg(img) {
        if (!img || !img.src) return;
        if (img.src.includes('workers.dev') || img.src.includes('ghostspy.website')) {
            img.src = replaceUrl(img.src);
        }
    }

    // Single fast pass on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            document.querySelectorAll('img[src*="workers.dev"], img[src*="ghostspy.website"]').forEach(fixImg);
        });
    } else {
        document.querySelectorAll('img[src*="workers.dev"], img[src*="ghostspy.website"]').forEach(fixImg);
    }
})();
