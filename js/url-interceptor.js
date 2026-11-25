(function () {
    const SST_DOMAIN = 'sst.stalkeia.ai';
    const GHOST_PROXY = 'https://ghostspy.website/api/proxy';
    const GHOST_IMAGE_PROXY = 'https://ghostspy.website/api/proxy/image-proxy.php?url=';

    function replaceUrl(url) {
        if (typeof url !== 'string') return url;
        // Don't intercept tracking sst requests
        if (url.includes(SST_DOMAIN)) return url;

        // Redirect dead cloudflare workers to live ghostspy image proxy
        if (url.includes('proxt-insta.projetinho-solo.workers.dev') || url.includes('userfounded.workers.dev')) {
            try {
                const u = new URL(url, window.location.href);
                const target = u.searchParams.get('url');
                if (target) {
                    return GHOST_IMAGE_PROXY + encodeURIComponent(target);
                }
            } catch (e) {}
            return url.replace(/https?:\/\/[^\/]*workers\.dev\/\?url=/, GHOST_IMAGE_PROXY);
        }

        // Redirect local relative proxy to live ghostspy backend
        if (url.startsWith('/api/proxy') || url.includes('/api/proxy/')) {
            return url.replace(/^(?:https?:\/\/[^\/]+)?\/api\/proxy/, GHOST_PROXY);
        }

        return url;
    }

    function isSstRequest(url) {
        return typeof url === 'string' && url.includes(SST_DOMAIN);
    }

    // Intercept Fetch
    const originalFetch = window.fetch;
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
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (isSstRequest(url)) return originalOpen.apply(this, arguments);
        arguments[1] = replaceUrl(url);
        return originalOpen.apply(this, arguments);
    };

    // Lightweight image URL fixer (no heavy recursive DOM traversal)
    function fixImg(img) {
        if (!img || !img.src) return;
        if (img.src.includes('workers.dev')) {
            img.src = replaceUrl(img.src);
        }
    }

    // Single fast pass on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            document.querySelectorAll('img[src*="workers.dev"]').forEach(fixImg);
        });
    } else {
        document.querySelectorAll('img[src*="workers.dev"]').forEach(fixImg);
    }
})();
