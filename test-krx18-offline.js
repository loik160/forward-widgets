// Deterministic regression test for the playkrx18 direct-id path.
// Run: node test-krx18-offline.js
const fs = require("fs");
const assert = require("assert/strict");

const calls = [];
const fileId = "6a5f35d8ee633ccb01a35233";

global.Widget = {
    http: {
        get: async (url) => {
            calls.push({ method: "GET", url });
            if (/play\.playkrx18\.site\/play\//i.test(url)) {
                throw new Error("protected player page must not be fetched");
            }
            if (/krx18\.com\/director\/sample-director\//i.test(url)) {
                return { data: '<article class="item movies"><a href="/movies/directed-film/"><img src="/poster.jpg" alt="Directed Film"></a><h3><a href="/movies/directed-film/">Directed Film</a></h3></article>' };
            }
            throw new Error("unmocked GET: " + url);
        },
        post: async (url, body, options) => {
            calls.push({ method: "POST", url, body, headers: (options && options.headers) || {} });
            assert.ok(url.endsWith("/playiframe"), "wrong play API endpoint");
            return { data: { url: "https://m3u8-play-240924.playkrx18.site/m3u8/tp1-rdv1/1080/" + fileId + "/index.m3u8" } };
        },
    },
    html: { load: () => ({}) },
    storage: { get() {}, set() {} },
};
global.WidgetMetadata = {};

eval(fs.readFileSync("./krx18.js", "utf8"));

(async () => {
    assert.equal(playFileIdFromUrl("https://play.playkrx18.site/play/" + fileId), fileId);

    const media = await resolvePlaykrx18("https://play.playkrx18.site/play/" + fileId);
    assert.match(media, new RegExp(fileId));
    assert.equal(calls.some((c) => /play\.playkrx18\.site\/play\//i.test(c.url)), false);

    const post = calls.find((c) => c.method === "POST");
    assert.ok(post, "playiframe POST missing");
    assert.match(post.body, /^data=/);
    assert.equal(calls.some((c) => /views\.api9str25\.cfd\/view\//i.test(c.url)), false);

    const peopleHtml = [
        '<div class="person" itemprop="director">',
        '<a href="https://krx18.com/director/sample-director/"><img alt="Sample Director"></a>',
        '<a itemprop="url" href="https://krx18.com/director/sample-director/">Sample Director</a>',
        '</div>',
        '<div class="person" itemprop="actor">',
        '<a href="https://krx18.com/cast/sample-actor/"><img alt="Sample Actor isRole"></a>',
        '<a itemprop="url" href="https://krx18.com/cast/sample-actor/">Sample Actor</a>',
        '</div>',
    ].join('');
    const people = parseDetailMeta(peopleHtml, "https://krx18.com/movies/sample/").peoples;
    assert.deepEqual(people.map((p) => p.id), ["director:sample-director", "cast:sample-actor"]);
    assert.deepEqual(parsePeopleRoute(people[0].id), { kind: "director", slug: "sample-director" });
    assert.deepEqual(parsePeopleRoute("legacy-actor"), { kind: "cast", slug: "legacy-actor" });

    const directed = await getKorea({ peopleId: people[0].id, page: 1 });
    assert.equal(directed[0].title, "Directed Film");
    assert.ok(calls.some((c) => /\/director\/sample-director\//.test(c.url)), "owning module must route director clicks to /director/");
    console.log("✅ krx18 direct-id regression ok", { fileId, calls: calls.length });
})().catch((error) => {
    console.error("❌", error);
    process.exit(1);
});
