// KanAV Forward Widget v5.0
// 转换自 XPTV kanav.js（原作者："夢"）
// 参考 ocd0711/forward_module 中 ddys.js / 91porn.js 的正确写法

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';
const SITE = 'https://kanav.ad';

var WidgetMetadata = {
    id: "kanav.ad",
    title: "KanAV",
    description: "KanAV 免费高清视频",
    author: "夢 (XPTV转换)",
    site: SITE,
    version: "5.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 1,
    modules: [
        { title: "中文字幕", functionName: "getCategory1", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "日韩有码", functionName: "getCategory2", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "日韩无码", functionName: "getCategory3", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "国产AV", functionName: "getCategory4", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "自拍泄密", functionName: "getCategory30", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "探花约炮", functionName: "getCategory31", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "主播录制", functionName: "getCategory32", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "动漫番剧", functionName: "getCategory20", params: [{ name: "page", title: "页码", type: "page" }] },
    ],
    search: {
        title: "搜索",
        functionName: "search",
        params: [],
    },
};

// ─── 纯 JS Base64 解码 ────────────────────────────────────────────────────────
// 等同于 CryptoJS.enc.Base64.parse(str).toString(CryptoJS.enc.Utf8)
// 兼容 JavaScriptCore（不依赖浏览器 atob）
function base64Decode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    str = str.replace(/[^A-Za-z0-9+/]/g, '');
    let result = '';
    let i = 0;
    while (i < str.length) {
        const c1 = chars.indexOf(str[i++]);
        const c2 = chars.indexOf(str[i++]);
        const c3 = i < str.length ? chars.indexOf(str[i]) : 0; i++;
        const c4 = i < str.length ? chars.indexOf(str[i]) : 0; i++;
        const b1 = (c1 << 2) | (c2 >> 4);
        const b2 = ((c2 & 15) << 4) | (c3 >> 2);
        const b3 = ((c3 & 3) << 6) | c4;
        result += String.fromCharCode(b1);
        if (c3 !== 64) result += String.fromCharCode(b2);
        if (c4 !== 64) result += String.fromCharCode(b3);
    }
    return result;
}

// ─── 列表解析（使用 Widget.html.load 官方 cheerio API）──────────────────────
// 对应原 XPTV getCards：$('.post-list .col-md-3').each(...)
function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];

    $('.post-list .col-md-3').each((_, element) => {
        const $el = $(element);
        const entryTitle = $el.find('.entry-title');
        const videoItem = $el.find('.video-item');

        const vodPath = entryTitle.find('a').attr('href');
        const vodName = entryTitle.find('a').attr('title') || entryTitle.find('a').text().trim();
        const vodPic = videoItem.find('.featured-content-image a img').attr('data-original') || '';
        const remark = videoItem.find('span.model-view-left').text().trim();
        const duration = videoItem.find('span.model-view').text().trim();

        if (!vodPath || !vodName) return;

        const vodUrl = `${SITE}${vodPath}`;

        // ⚠️ 参照 ddys.js / 91porn.js 的正确写法：
        //   - type 必须为 "url"（不是 "link"）
        //   - id 和 link 都设为详情页 URL
        //   - 点击后 Forward 会调用 loadDetail(link)
        items.push({
            id: vodUrl,
            type: "url",
            mediaType: "movie",
            title: vodName,
            posterPath: vodPic,
            link: vodUrl,
            durationText: duration,
            description: remark,
        });
    });

    console.log('[kanav] parseList:', items.length, 'items');
    return items;
}

// ─── HTTP 请求封装 ─────────────────────────────────────────────────────────────
async function httpGet(url) {
    const response = await Widget.http.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': `${SITE}/`,
        },
    });
    if (!response || !response.data) {
        throw new Error(`请求失败: ${url}`);
    }
    return response.data;
}

// ─── 分类请求 ──────────────────────────────────────────────────────────────────
async function fetchCategory(categoryId, page) {
    const url = `${SITE}/index.php/vod/type/id/${categoryId}/page/${page}.html`;
    console.log('[kanav] fetchCategory:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (items.length === 0) throw new Error('视频列表为空');
    return items;
}

async function getCategory1(p) { return fetchCategory(1, p.page || 1); }
async function getCategory2(p) { return fetchCategory(2, p.page || 1); }
async function getCategory3(p) { return fetchCategory(3, p.page || 1); }
async function getCategory4(p) { return fetchCategory(4, p.page || 1); }
async function getCategory20(p) { return fetchCategory(20, p.page || 1); }
async function getCategory30(p) { return fetchCategory(30, p.page || 1); }
async function getCategory31(p) { return fetchCategory(31, p.page || 1); }
async function getCategory32(p) { return fetchCategory(32, p.page || 1); }

// ─── 提取 player_aaaa ─────────────────────────────────────────────────────────
// 对应原 XPTV getTracks：$('script:contains(player_aaaa)').text().replace('var player_aaaa=','')
function extractPlayerData(html) {
    const marker = 'player_aaaa=';
    const mi = html.indexOf(marker);
    if (mi === -1) {
        console.log('[kanav] player_aaaa NOT FOUND, html length:', html.length);
        return null;
    }
    const start = html.indexOf('{', mi + marker.length);
    if (start === -1) return null;

    let depth = 0, end = -1;
    for (let i = start; i < html.length; i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) return null;

    try {
        const parsed = JSON.parse(html.substring(start, end + 1));
        console.log('[kanav] player_aaaa OK, encrypt:', parsed.encrypt);
        return parsed;
    } catch (e) {
        console.log('[kanav] player_aaaa JSON.parse error:', e.message);
        return null;
    }
}

// ─── loadDetail：解析播放页，返回真实视频地址 ─────────────────────────────────
// 对应原 XPTV getTracks + getPlayinfo
// 参照 ddys.js loadDetail 返回格式：{ type:"url", videoUrl, mediaType, customHeaders }
async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[kanav] loadDetail:', link);

    const html = await httpGet(link);
    const player = extractPlayerData(html);
    if (!player) throw new Error('未找到 player_aaaa');

    const rawUrl = player.url;
    if (!rawUrl) throw new Error('player_aaaa.url 为空');

    // 解码（与原 XPTV getTracks 保持一致）
    //   encrypt=0: 直接使用
    //   encrypt=1: URL 解码
    //   encrypt=2: Base64 → URL 解码（对应 CryptoJS.enc.Base64.parse(...).toString(Utf8)）
    const enc = parseInt(player.encrypt) || 0;
    let videoUrl;
    if (enc === 0) {
        videoUrl = rawUrl;
    } else if (enc === 1) {
        videoUrl = decodeURIComponent(rawUrl);
    } else {
        videoUrl = decodeURIComponent(base64Decode(rawUrl));
    }

    console.log('[kanav] videoUrl:', videoUrl);

    if (!videoUrl || !videoUrl.startsWith('http')) {
        throw new Error(`无效视频地址: ${videoUrl}`);
    }

    // ⚠️ 参照 ddys.js loadDetail 返回格式：type:"url", videoUrl, mediaType, customHeaders
    return {
        id: videoUrl,
        type: "url",
        videoUrl: videoUrl,
        mediaType: "movie",
        customHeaders: {
            'Referer': `${SITE}/`,
            'User-Agent': UA,
        },
    };
}

// ─── 搜索 ──────────────────────────────────────────────────────────────────────
async function search(params = {}) {
    const kw = params.keyword || params.wd || '';
    const page = params.page || 1;
    if (!kw) throw new Error('关键词为空');

    const url = `${SITE}/index.php/vod/search/by/time_add/page/${page}/wd/${encodeURIComponent(kw)}.html`;
    console.log('[kanav] search:', url);
    const html = await httpGet(url);
    return parseList(html);
}
