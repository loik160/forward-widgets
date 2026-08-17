// Live regression test for huangguoai.js.
// Run: node test-huangguoai.js
const fs = require("fs");
const assert = require("assert/strict");

const calls = [];

global.Widget = {
    http: {
        get: async (url, options = {}) => {
            calls.push({ method: "GET", url, headers: options.headers || {} });
            const response = await fetch(url, { headers: options.headers || {} });
            if (!response.ok) throw new Error("HTTP " + response.status + ": " + url);
            return { data: await response.text(), status: response.status };
        },
    },
    storage: { get() {}, set() {} },
    html: { load() { return {}; } },
};
global.WidgetMetadata = {};

eval(fs.readFileSync("./huangguoai.js", "utf8"));

function assertItem(item, where) {
    assert.ok(item, where + " missing");
    assert.equal(item.type, "url", where + " type");
    assert.equal(item.mediaType, "tv", where + " mediaType");
    assert.ok(item.title, where + " title");
    assert.match(item.link, /huangguoai\.com\/detail\/\d+\//, where + " link");
    assert.ok(item.posterPath, where + " poster");
    assert.equal(item.poster_path, undefined, where + " raw poster field");
}

(async () => {
    assert.equal(WidgetMetadata.id, "huangguoai.com");
    assert.equal(WidgetMetadata.modules.find((item) => item.id === "loadResource").cacheDuration, 0);

    const newest = await getNewest({ page: 1 });
    assert.ok(newest.length >= 15, "newest list too short");
    newest.slice(0, 5).forEach((item, index) => assertItem(item, "newest[" + index + "]"));

    const page2 = await getNewest({ page: 2 });
    assert.ok(page2.length >= 15, "newest page 2 too short");
    assert.notEqual(page2[0].link, newest[0].link, "pagination did not advance");

    const sections = [getRecommend, getAiDuanju, getAiManju, getAiHuanlian, getAiMogai, getHotRank];
    for (const loadSection of sections) {
        const sectionItems = await loadSection({ page: 1 });
        assert.ok(sectionItems.length >= 1, loadSection.name + " list missing");
        assertItem(sectionItems[0], loadSection.name + "[0]");
    }

    const found = await search({ keyword: "神瞳", page: 1 });
    assert.ok(found.some((item) => item.title.indexOf("神瞳") !== -1), "search result mismatch");

    const detail = await loadDetail("https://huangguoai.com/detail/12/");
    assert.equal(detail.title, "神瞳觉醒");
    assert.ok(detail.description, "detail description");
    assert.ok(detail.episodeItems.length >= 10, "episodes missing");
    assert.ok(detail.genreItems.length >= 1, "tags missing");
    assert.ok(detail.peoples.length >= 1, "author missing");
    assert.ok(detail.relatedItems.length >= 1, "related items missing");
    assert.equal(detail.videoUrl, undefined, "signed URL must not be cached in detail");
    assert.equal(detail.stills, undefined, "wrong stills field leaked");
    assert.equal(detail.recommendations, undefined, "wrong recommendations field leaked");

    const firstResource = await loadResource({ link: detail.episodeItems[0].link });
    assert.equal(firstResource.length, 1);
    assert.match(firstResource[0].url, /\.m3u8(?:\?|$)/i);
    assert.equal(firstResource[0].playerType, "system");
    assert.equal(firstResource[0].customHeaders["X-Forward-Skip-Redirect-Probe"], undefined);

    const lastResource = await loadResource({ link: detail.episodeItems[detail.episodeItems.length - 1].link });
    assert.match(lastResource[0].url, /\.m3u8(?:\?|$)/i);
    assert.notEqual(lastResource[0].url, firstResource[0].url, "different episodes resolved to the same stream");

    const manifest = await fetch(firstResource[0].url, { headers: firstResource[0].customHeaders });
    assert.equal(manifest.ok, true, "manifest request failed");
    assert.match(await manifest.text(), /^#EXTM3U/);

    const tagList = await getNewest({ genreId: detail.genreItems[0].id, page: 1 });
    assert.ok(tagList.length >= 1, "tag routing failed");
    const authorList = await getNewest({ peopleId: detail.peoples[0].id, page: 1 });
    assert.ok(authorList.length >= 1, "author routing failed");

    console.log("✅ huangguoai live ok", {
        newest: newest.length,
        page2: page2.length,
        sections: sections.length,
        episodes: detail.episodeItems.length,
        calls: calls.length,
    });
})().catch((error) => {
    console.error("❌", error);
    process.exit(1);
});
