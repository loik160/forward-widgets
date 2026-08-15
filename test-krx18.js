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
            calls.push({ method: "POST", url: url });
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
    assert.ok(detail.videoUrl, "detail videoUrl");
    assert.equal(detail.stills, undefined);
    assert.ok(Array.isArray(detail.genreItems) || detail.genreItems === undefined || Array.isArray(detail.genreItems));
    if (detail.genreItems && detail.genreItems.length) {
        assert.ok(detail.genreItems[0].id, "genreItems.id required");
        assert.ok(detail.genreItems[0].title, "genreItems.title required");
    }
    assert.ok(Array.isArray(detail.relatedItems), "relatedItems should be array");
    if (detail.relatedItems.length) assertVideoItem(detail.relatedItems[0], "related[0]");
    console.log("detail", detail.title, "videoUrl", detail.videoUrl.slice(0, 80), "genres", (detail.genreItems || []).length, "related", detail.relatedItems.length);

    const resources = await loadResource({ link: movies[0].link });
    assert.ok(resources.length >= 1, "no resources");
    resources.forEach((r, i) => {
        assert.ok(r.url, "resource[" + i + "].url");
        assert.ok(r.name, "resource[" + i + "].name");
        assert.ok(r.playerType === "app" || r.playerType === "system", "playerType");
    });
    console.log("resources", resources.map((r) => r.name + " -> " + r.url.slice(0, 70)));

    const dooCalls = calls.filter((c) => c.url.indexOf("/wp-json/dooplayer/v2/") !== -1);
    assert.ok(dooCalls.length >= 1, "dooplayer API was not called");
    assert.ok(dooCalls[0].url.indexOf("/movie/") !== -1, "dooplayer url should include /movie/");
    console.log("dooplayer", dooCalls[0].url);

    const clip = await loadDetail("https://krx18.com/movies/593486/");
    assert.ok(clip.videoUrl, "clip videoUrl");
    console.log("clip", clip.title, clip.videoUrl.slice(0, 80));

    console.log("✅ krx18 live ok", { calls: calls.length, movies: movies.length, resources: resources.length });
})().catch((e) => {
    console.error("❌", e);
    process.exit(1);
});
