const https = require('https');

function fetchText(url) {
    return new Promise(function(resolve, reject) {
        https.get(url, { headers: { 'User-Agent': 'NebrasFactory/1.0' } }, function(res) {
            let data = '';
            res.on('data', function(chunk) { data += chunk; });
            res.on('end', function() {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error('HTTP ' + res.statusCode));
                    return;
                }
                resolve(data);
            });
        }).on('error', reject);
    });
}

function normalizeLinks(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function(link) {
        const url = String(link.url || link.href || link.link || '').trim();
        if (!url || !/^https?:\/\//i.test(url)) return null;
        return {
            title: String(link.title || link.label || link.name || '').trim() || url.replace(/^https?:\/\//i, ''),
            url: url,
            image: String(link.thumbnail || link.thumbnailUrl || link.image || link.thumbnail_url || '').trim()
        };
    }).filter(Boolean);
}

function parseNextData(html) {
    const match = String(html || '').match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return [];
    try {
        const json = JSON.parse(match[1]);
        const pp = json.props && json.props.pageProps ? json.props.pageProps : {};
        const links = pp.links || (pp.account && pp.account.links) || (pp.profile && pp.profile.links) || [];
        return normalizeLinks(links);
    } catch (err) {
        return [];
    }
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
        return;
    }

    try {
        const username = String((req.query && req.query.username) || 'abdelrhmanomranmd').trim().replace(/[^a-zA-Z0-9._-]/g, '');
        if (!username) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: 'missing_username' }));
            return;
        }

        let links = [];
        try {
            const apiUrl = 'https://linktr.ee/api/profiles/' + encodeURIComponent(username);
            const apiText = await fetchText(apiUrl);
            const apiJson = JSON.parse(apiText);
            links = normalizeLinks(apiJson.links || (apiJson.data && apiJson.data.links) || (apiJson.profile && apiJson.profile.links));
        } catch (apiErr) {
            /* fallback to HTML */
        }

        if (!links.length) {
            const html = await fetchText('https://linktr.ee/' + encodeURIComponent(username));
            links = parseNextData(html);
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: true, username: username, links: links }));
    } catch (err) {
        console.error('linktree-profile error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'server_error' }));
    }
};
