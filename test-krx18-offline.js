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
            if (/views\.api9str25\.cfd\/view\//i.test(url)) return { data: "ok" };
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
    console.log("✅ krx18 direct-id regression ok", { fileId, calls: calls.length });
})().catch((error) => {
    console.error("❌", error);
    process.exit(1);
});
