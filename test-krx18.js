// Live backtest for krx18.js
// Run: node test-krx18.js
const fs = require("fs");
const { execFileSync } = require("child_process");
const assert = require("assert/strict");

const calls = [];

function request(url, options = {}) {
    const spec = JSON.stringify({
        url: url,
        method: options.method || "GET",
        headers: options.headers || {},
        body: options.body || "",
    });
    const out = execFileSync("python3", ["-c", [
        "import json,sys,urllib.request",
        "spec=json.loads(sys.stdin.read())",
        "data=spec.get('body') or None",
        "body=data.encode() if data else None",
        "req=urllib.request.Request(spec['url'], data=body, headers=spec.get('headers') or {}, method=spec.get('method') or 'GET')",
        "with urllib.request.urlopen(req, timeout=25) as r:",
        "    raw=r.read()",
        "    typ=r.headers.get('content-type') or ''",
        "    text=raw.decode('utf-8','replace')",
        "    payload=text",
        "    if 'json' in typ.lower():",
        "        try: payload=json.loads(text)",
        "        except Exception: payload=text",
        "    sys.stdout.write(json.dumps({'status': r.status, 'type': typ, 'data': payload}))",
    ].join("\n")], { input: spec, encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
    const parsed = JSON.parse(out);
    return { data: parsed.data, status: parsed.status, headers: { "content-type": parsed.type } };
}

global.Widget = {
    http: {
        get: async (url, options) => {
            calls.push({ method: "GET", url: url });
            return request(url, { method: "GET", headers: (options && options.headers) || {} });
        },
        post: async (url, body, options) => {
            calls.push({ method: "POST", url: url, body: String(body || ""), headers: (options && options.headers) || {} });
            return request(url, {
                method: "POST",
                headers: (options && options.headers) || {},
                body: typeof body === "string" ? body : JSON.stringify(body || {}),
            });
        },
    },
    html: {
        load: () => ({
            find() { return this; },
            each() { return this; },
            first() { return this; },
            attr() { return ""; },
            text() { return ""; },
        }),
    },
    storage: { _m: {}, get(k) { return this._m[k]; }, set(k, v) { this._m[k] = v; } },
};
global.WidgetMetadata = {};

eval(fs.readFileSync("./krx18.js", "utf8"));

function assertVideoItem(item, where) {
    assert.ok(item, where + " missing item");
    assert.equal(item.type, "url", where + " type");
    assert.equal(item.mediaType, "movie", where + " mediaType");
    assert.ok(item.title, where + " title");
    assert.ok(item.link && item.link.indexOf("/movies/") !== -1, where + " link");
    assert.equal(item.id, item.link, where + " id/link");
    assert.equal(item.stills, undefined, where + " stills should be absent");
    assert.equal(item.recommendations, undefined, where + " recommendations should be absent");
    assert.equal(item.poster_path, undefined, where + " poster_path should be absent");
}

(async () => {
    assert.equal(
        cryptoJsDecrypt("53616c7465645f5f826a00a746b49747abff8e2a8adb90f4f64c0983fb895d3c8018570c2c2f886dcaa4a6f0c2140ddb", "jcLycoRJT6OWjoWspgLMOZwS3aSS0lEn"),
        "6a7df19bee633ccb01c0d498"
    );
    assert.equal(
        cryptoJsDecrypt("53616c7465645f5f761b6882efc19a1bdd36e794d845bba48a7aab14b3619b888be6b023614048912c5000101e094f8d", "PZZ3J3LDbLT0GY7qSA5wW5vchqgpO36O"),
        "64ca9e03aa97fec013a4c341"
    );
    assert.equal(cryptoJsDecrypt(cryptoJsEncrypt("hello-krx18", "vlVbUQhkOhoSfyteyzGeeDzU0BHoeTyZ"), "vlVbUQhkOhoSfyteyzGeeDzU0BHoeTyZ"), "hello-krx18");
    assert.equal(
        cryptoJsDecrypt(cryptoJsEncryptHex("hello-hex", "vlVbUQhkOhoSfyteyzGeeDzU0BHoeTyZ"), "vlVbUQhkOhoSfyteyzGeeDzU0BHoeTyZ"),
        "hello-hex"
    );
    assert.equal(md5hex("abc"), "900150983cd24fb0d6963f7d28e17f72");
    assert.equal(
        cryptoJsDecrypt(
            "53616c7465645f5f2a6164a583b3dacad7b52a53b2b9381d4ccbecc30a27d657487dd0e459368bba262cb2207e43e235c99f5418040f03267fff6689941af7818a49bad45ba6817d76976181cf976d4867e125afdb1b5b04da591aa790adeb487b98c7be776024aa74dc04760eaeec3c8c745260338cbed95c3876297f17db1781d82f82c06dc3010b77280aad839ea4956abe49de45fe54a4f3738e6bd6d55b56990abe557aaff431bfc3f346989c906556a1cb20196418098bdb4d28f5492857f0a515eb6188de44d0f012d0e39fff2132b0b4d84c4990bc91b30b2ded67716403035022a4e23239e389331ad43b65",
            "oJwmvmVBajMaRCTklxbfjavpQO7SZpsL"
        ).indexOf("https://m3u8-play-"),
        0
    );
    assert.ok(looksLikeMedia("https://m3u8-play-240924.playkrx18.site/m3u8/tp1-rdv1/1080/abc"));
    console.log("crypto ok");

    const movies = await getMovies({ page: 1 });
    assert.ok(movies.length >= 8, "movies list too short: " + movies.length);
    movies.slice(0, 5).forEach((it, i) => assertVideoItem(it, "movies[" + i + "]"));
    console.log("list", movies.length, movies[0].title);

    const page2 = await getMovies({ page: 2 });
    assert.ok(page2.length >= 8, "page2 empty");
    assert.ok(page2[0].link !== movies[0].link, "page2 should differ from page1");
    console.log("page2", page2.length, page2[0].title);

    const korea = await getKorea({ page: 1 });
    assert.ok(korea.length >= 8, "korea list empty");
    korea.slice(0, 3).forEach((it, i) => assertVideoItem(it, "korea[" + i + "]"));
    console.log("korea", korea.length, korea[0].title);

    const found = await search({ keyword: "korea", page: 1 });
    assert.ok(found.length >= 3, "search empty");
    found.slice(0, 3).forEach((it, i) => assertVideoItem(it, "search[" + i + "]"));
    console.log("search", found.length, found[0].title);

    const detail = await loadDetail(movies[0].link);
    assert.equal(detail.type, "url");
    assert.equal(detail.link, movies[0].link);
    assert.ok(detail.title, "detail title");
    assert.ok(!/^Free Watch/i.test(detail.title), "detail title should not be SEO title: " + detail.title);
    assert.equal(detail.link, movies[0].link, "detail keeps movie link");
    assert.equal(detail.stills, undefined);
    assert.ok(Array.isArray(detail.genreItems) || detail.genreItems === undefined || Array.isArray(detail.genreItems));
    if (detail.genreItems && detail.genreItems.length) {
        assert.ok(detail.genreItems[0].id, "genreItems.id required");
        assert.ok(detail.genreItems[0].title, "genreItems.title required");
    }
    assert.ok(Array.isArray(detail.relatedItems), "relatedItems should be array");
    if (detail.relatedItems.length) assertVideoItem(detail.relatedItems[0], "related[0]");
    console.log("detail", detail.title, "genres", (detail.genreItems || []).length, "related", detail.relatedItems.length);

    const resources = await loadResource({ link: movies[0].link });
    assert.ok(resources.length >= 1, "no resources");
    resources.forEach((r, i) => {
        assert.ok(r.url, "resource[" + i + "].url");
        assert.ok(r.name, "resource[" + i + "].name");
        assert.ok(r.playerType === "app" || r.playerType === "system", "playerType");
        assert.ok(/\.(m3u8|mp4)(\?|$)|data:application\/vnd\.apple\.mpegurl|\/m3u8\/|m3u8-play-/i.test(r.url), "resource[" + i + "] must be media, got " + r.url.slice(0, 100));
        assert.ok(!/playkrx18\.site\/play\/|loadvid\.com\/videos\/play\/|mov18plus\.cloud\/\?v=/i.test(r.url), "resource[" + i + "] is still an embed page");
    });
    console.log("resources", resources.map((r) => r.name + " -> " + r.url.slice(0, 70)));

    const later = movies[movies.length - 1];
    const laterRes = await loadResource({ link: later.link });
    assert.ok(laterRes.length >= 1, "later item has no resources: " + later.title);
    laterRes.forEach((r, i) => {
        assert.ok(/\.(m3u8|mp4)(\?|$)|data:application\/vnd\.apple\.mpegurl|\/m3u8\/|m3u8-play-/i.test(r.url), "later[" + i + "] must be media, got " + r.url.slice(0, 100));
        assert.ok(!/playkrx18\.site\/play\/|loadvid\.com\/videos\/play\/|mov18plus\.cloud\/\?v=/i.test(r.url), "later[" + i + "] is still an embed page");
    });
    console.log("later", later.title, laterRes.map((r) => r.name + " -> " + r.url.slice(0, 80)));
    assert.equal(laterRes[0].playerType, "app", "signed playkrx18 HLS should use app player for audio compatibility");
    assert.equal(laterRes[0].customHeaders["X-Forward-Skip-Redirect-Probe"], "1", "signed HLS should skip the startup probe");

    const page2Res = await loadResource({ link: page2[0].link });
    assert.ok(page2Res.length >= 1, "page2 item has no resources: " + page2[0].title);
    page2Res.forEach((r, i) => {
        assert.ok(/\.(m3u8|mp4)(\?|$)|data:application\/vnd\.apple\.mpegurl|\/m3u8\/|m3u8-play-/i.test(r.url), "page2[" + i + "] must be media, got " + r.url.slice(0, 100));
    });
    assert.notEqual(page2Res[0].url, laterRes[0].url, "different movies must not resolve to the same media URL");
    assert.equal(page2Res[0].playerType, "app", "page2 playkrx18 HLS should use app player");
    console.log("page2 resource", page2[0].title, page2Res.map((r) => r.url.slice(0, 80)));

    const playCalls = calls.filter((c) => c.method === "POST" && c.url.indexOf("/playiframe") !== -1);
    assert.ok(playCalls.length >= 2, "expected per-video playiframe POST requests");
    assert.equal(
        calls.filter((c) => c.method === "GET" && /play\.playkrx18\.site\/play\//i.test(c.url)).length,
        0,
        "standard playkrx18 embeds must not fetch the Cloudflare-protected player page"
    );
    assert.equal(calls.filter((c) => /views\.api9str25\.cfd\/view\//i.test(c.url)).length, 0, "playback should not wait for the optional view ping");

    const dooCalls = calls.filter((c) => c.url.indexOf("/wp-json/dooplayer/v2/") !== -1);
    assert.ok(dooCalls.length >= 1, "dooplayer API was not called");
    assert.ok(dooCalls[0].url.indexOf("/movie/") !== -1, "dooplayer url should include /movie/");
    console.log("dooplayer", dooCalls[0].url);

    const clip = await loadDetail("https://krx18.com/movies/593486/");
    console.log("clip", clip.title, clip.videoUrl ? clip.videoUrl.slice(0, 80) : "(no direct url)");
    if (clip.videoUrl) {
        assert.ok(/\.(m3u8|mp4)|data:application\/vnd\.apple\.mpegurl/i.test(clip.videoUrl), "clip media url");
    }

    const peopleDetail = await loadDetail("https://krx18.com/movies/sex-and-zen-3-1998/");
    const director = peopleDetail.peoples.find((p) => p.role === "导演");
    const actor = peopleDetail.peoples.find((p) => p.role === "演员");
    assert.ok(director && director.id.startsWith("director:"), "director id must preserve director route");
    assert.ok(actor && actor.id.startsWith("cast:"), "actor id must preserve cast route");
    assert.equal(director.title, "Aman Chang Man");
    assert.equal(actor.title, "Jane Chung Chun");

    console.log("✅ krx18 live ok", { calls: calls.length, movies: movies.length, resources: resources.length });
})().catch((e) => {
    console.error("❌", e);
    process.exit(1);
});
