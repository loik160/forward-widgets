WidgetMetadata = {
    id: "huangguoai.com",
    title: "黄果短剧",
    description: "黄果 AI 成人短剧、漫剧、换脸与魔改视频",
    author: "loik160",
    site: "https://huangguoai.com",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 300,
    modules: [
        { title: "最近上新", functionName: "getNewest", cacheDuration: 300, params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "精选推荐", functionName: "getRecommend", cacheDuration: 600, params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "AI 成人短剧", functionName: "getAiDuanju", cacheDuration: 300, params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "AI 成人漫剧", functionName: "getAiManju", cacheDuration: 300, params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "AI 换脸", functionName: "getAiHuanlian", cacheDuration: 300, params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "AI 魔改", functionName: "getAiMogai", cacheDuration: 300, params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "热播榜", functionName: "getHotRank", cacheDuration: 300, params: [] },
        { id: "loadResource", title: "播放资源", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] },
    ],
    search: {
        title: "搜索",
        functionName: "search",
        params: [
            { name: "keyword", title: "关键词", type: "input" },
            { name: "page", title: "页码", type: "page" },
        ],
    },
};

const SITE = "https://huangguoai.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function requestHeaders(referer) {
    return {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
        "Referer": referer || SITE + "/",
    };
}

function mediaHeaders(referer) {
    return {
        "User-Agent": UA,
        "Accept": "*/*",
        "Referer": referer || SITE + "/",
        "Origin": SITE,
    };
}

function sleep(ms) {
    return new Promise(function (resolve) {
        if (typeof setTimeout === "function") setTimeout(resolve, ms);
        else resolve();
    });
}

function isTransientError(error) {
    return /timeout|timed out|ECONN|ENOTFOUND|429|502|503|520|521|522|524|请求失败/i.test(String(error && error.message || error || ""));
}

async function withRetry(fn, times) {
    let lastError;
    const total = times || 2;
    for (let i = 0; i < total; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i >= total - 1 || !isTransientError(error)) break;
            await sleep(250 * (i + 1));
        }
    }
    throw lastError;
}

async function httpGet(url, referer) {
    return withRetry(async function () {
        const response = await Widget.http.get(url, { headers: requestHeaders(referer) });
        if (!response || response.data == null) throw new Error("请求失败: " + url);
        return typeof response.data === "string" ? response.data : String(response.data);
    }, 2);
}

function absoluteUrl(url) {
    const value = decodeHtml(String(url || "").trim());
    if (!value) return "";
    if (value.indexOf("//") === 0) return "https:" + value;
    if (/^https?:\/\//i.test(value)) return value;
    return value.charAt(0) === "/" ? SITE + value : SITE + "/" + value;
}

function decodeHtml(value) {
    return String(value || "")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); })
        .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); });
}

function stripTags(value) {
    return decodeHtml(String(value || "")
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<[^>]+>/g, " "))
        .replace(/[ \t\f\v]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
}

function attr(tag, name) {
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(tag || "").match(new RegExp("\\b" + escaped + "=[\\\"']([^\\\"']*)", "i"));
    return match ? decodeHtml(match[1]) : "";
}

function mainScope(html) {
    const source = String(html || "");
    const start = source.search(/<main\b/i);
    if (start < 0) return source;
    const end = source.indexOf("</main>", start);
    return end < 0 ? source.slice(start) : source.slice(start, end + 7);
}

function parseCards(html) {
    const source = mainScope(html);
    const marker = /<div\b[^>]*class=["']hg-drama-card["'][^>]*>/gi;
    const starts = [];
    let match;
    while ((match = marker.exec(source)) !== null) starts.push(match.index);
    const items = [];
    const seen = {};

    for (let i = 0; i < starts.length; i++) {
        const chunk = source.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : source.length);
        const linkMatch = chunk.match(/href=["'](\/detail\/(\d+)\/)["']/i);
        if (!linkMatch) continue;
        const link = absoluteUrl(linkMatch[1]);
        if (seen[link]) continue;

        const openTag = (chunk.match(/^<div\b[^>]*>/i) || [""])[0];
        const coverBlock = (chunk.match(/<div\b[^>]*class=["'][^"']*hg-drama-card__cover[^"']*["'][^>]*>[\s\S]*?<\/div>/i) || [chunk])[0];
        const imageTag = (coverBlock.match(/<img\b[^>]*>/i) || [""])[0];
        const titleBlock = (chunk.match(/class=["'][^"']*hg-drama-card__title[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || "";
        const descBlock = (chunk.match(/class=["'][^"']*hg-drama-card__desc[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i) || [])[1] || "";
        const scoreText = stripTags((coverBlock.match(/class=["'][^"']*hg-drama-card__score[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || "");
        const episodeText = stripTags((coverBlock.match(/class=["'][^"']*hg-drama-card__episode[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || "");
        const typeName = attr(openTag, "data-track-type-name");
        const title = attr(openTag, "data-track-title") || attr(imageTag, "alt") || stripTags(titleBlock) || ("视频 " + linkMatch[2]);
        const poster = absoluteUrl(attr(imageTag, "data-src") || attr(imageTag, "src"));
        const ratingMatch = scoreText.match(/[\d.]+/);

        seen[link] = true;
        items.push({
            id: link,
            type: "url",
            mediaType: "tv",
            title: title,
            link: link,
            posterPath: poster,
            coverUrl: poster,
            rating: ratingMatch ? parseFloat(ratingMatch[0]) : undefined,
            description: stripTags(descBlock),
            durationText: episodeText || typeName || undefined,
            genreTitle: typeName || undefined,
        });
    }
    return items;
}

function parseRankItems(html) {
    const source = mainScope(html);
    const marker = /<div\b[^>]*class=["']hg-rank-item["'][^>]*data-rank-item[^>]*>/gi;
    const starts = [];
    let match;
    while ((match = marker.exec(source)) !== null) starts.push(match.index);
    const items = [];

    for (let i = 0; i < starts.length; i++) {
        const chunk = source.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : source.length);
        const openTag = (chunk.match(/^<div\b[^>]*>/i) || [""])[0];
        const linkMatch = chunk.match(/href=["'](\/detail\/(\d+)\/)["']/i);
        const imageTag = (chunk.match(/<img\b[^>]*data-src=["'][^"']+["'][^>]*>/i) || [""])[0];
        if (!linkMatch || !imageTag) continue;

        const titleBlock = (chunk.match(/class=["'][^"']*hg-rank-item__title[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || "";
        const descBlock = (chunk.match(/class=["'][^"']*hg-rank-item__desc[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "";
        const tagsBlock = (chunk.match(/class=["'][^"']*hg-rank-item__tags[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "";
        const heatBlock = (chunk.match(/class=["'][^"']*hg-rank-item__heat-value[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || "";
        const rankBlock = (chunk.match(/class=["'][^"']*hg-rank-num[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1] || "";
        const tagText = stripTags(tagsBlock);
        const ratingMatch = tagText.match(/([\d.]+)\s*分/);
        const link = absoluteUrl(linkMatch[1]);
        const poster = absoluteUrl(attr(imageTag, "data-src") || attr(imageTag, "src"));
        const rank = stripTags(rankBlock).replace(/^0+/, "") || String(i + 1);

        items.push({
            id: link,
            type: "url",
            mediaType: "tv",
            title: attr(openTag, "data-track-title") || stripTags(titleBlock) || ("视频 " + linkMatch[2]),
            link: link,
            posterPath: poster,
            coverUrl: poster,
            rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
            description: stripTags(descBlock),
            durationText: "第 " + rank + " 名 · 热力 " + (stripTags(heatBlock) || "--"),
            genreTitle: attr(openTag, "data-track-type-name") || undefined,
        });
    }
    return items;
}

function pageNumber(params) {
    return Math.max(1, parseInt(params && params.page, 10) || 1);
}

function parseRoute(value, kind) {
    const match = String(value || "").match(new RegExp("^" + kind + ":([a-z0-9_-]+)$", "i"));
    return match ? match[1] : "";
}

function pagedPath(base, page) {
    if (page <= 1) return base;
    return base.replace(/\/$/, "") + "/" + page + "/";
}

async function fetchList(base, params) {
    params = params || {};
    const page = pageNumber(params);
    const tag = parseRoute(params.genreId, "tag");
    const author = parseRoute(params.peopleId, "author");
    let path;

    if (tag) path = page <= 1 ? "/tag/" + tag + "/" : "/tag/" + tag + "/page/" + page + "/";
    else if (author) path = page <= 1 ? "/author/" + author + "/" : "/author/" + author + "/video/" + page + "/";
    else path = pagedPath(base, page);

    const url = absoluteUrl(path);
    console.log("[huangguoai] list:", url);
    const items = parseCards(await httpGet(url));
    if (!items.length) throw new Error("未解析到视频列表，页面结构可能已更新");
    return items;
}

async function getNewest(params) { return fetchList("/newest", params); }
async function getRecommend(params) { return fetchList("/recommend", params); }
async function getAiDuanju(params) { return fetchList("/ai-duanju/", params); }
async function getAiManju(params) { return fetchList("/ai-manju/", params); }
async function getAiHuanlian(params) { return fetchList("/ai-huanlian/", params); }
async function getAiMogai(params) { return fetchList("/ai-mogai/", params); }
async function getHotRank() {
    const url = SITE + "/ranks/hot/";
    console.log("[huangguoai] rank:", url);
    const items = parseRankItems(await httpGet(url));
    if (!items.length) throw new Error("未解析到热播榜，页面结构可能已更新");
    return items;
}

function detailUrlFromLink(link) {
    const value = absoluteUrl(link);
    const match = value.match(/\/detail\/(\d+)\//i) || value.match(/\/video\/(\d+)\//i);
    return match ? SITE + "/detail/" + match[1] + "/" : "";
}

function episodeNumberFromLink(link) {
    const match = String(link || "").match(/\/ep-(\d+)\//i);
    return match ? parseInt(match[1], 10) : 1;
}

function parseDetail(html, requestedLink) {
    const source = mainScope(html);
    const hero = (source.match(/<div\b[^>]*class=["']hg-web-detail__hero["'][^>]*>[\s\S]*?<div\b[^>]*class=["']hg-web-detail__episodes["']/i) || [source])[0];
    const title = stripTags((hero.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
    const descBlock = (hero.match(/class=["'][^"']*hg-web-detail__desc[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "";
    const posterBlock = (hero.match(/class=["'][^"']*hg-web-detail__poster[^"']*["'][^>]*>[\s\S]*?<\/div>/i) || [""])[0];
    const posterTag = (posterBlock.match(/<img\b[^>]*>/i) || [""])[0];
    const poster = absoluteUrl(attr(posterTag, "data-src") || attr(posterTag, "src"));
    const metaText = stripTags((hero.match(/class=["'][^"']*hg-web-detail__meta[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "");
    const scoreMatch = metaText.match(/([\d.]+)\s*分/);
    const dateMatch = metaText.match(/(20\d{2}-\d{2}-\d{2})/);
    const authorBlock = (hero.match(/class=["'][^"']*hg-web-detail__author[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) || [])[1] || "";
    const authorMatch = authorBlock.match(/href=["']\/author\/(\d+)\/["'][^>]*>([\s\S]*?)<\/a>/i);
    const authorImage = (authorBlock.match(/<img\b[^>]*>/i) || [""])[0];
    const tags = [];
    const tagScope = (hero.match(/class=["'][^"']*hg-web-detail__tags[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "";
    const tagRegex = /href=["']\/tag\/([a-z0-9_-]+)\/["'][^>]*>([\s\S]*?)<\/a>/gi;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(tagScope)) !== null) {
        tags.push({ id: "tag:" + tagMatch[1], title: stripTags(tagMatch[2]) });
    }

    const episodes = [];
    const epRegex = /<a\b[^>]*href=["'](\/video\/(\d+)\/(?:ep-(\d+)\/)?)["'][^>]*data-ep-id=["'](\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let epMatch;
    while ((epMatch = epRegex.exec(source)) !== null) {
        const number = parseInt(epMatch[4] || epMatch[3], 10) || episodes.length + 1;
        const playLink = absoluteUrl(epMatch[1]);
        episodes.push({
            id: playLink,
            type: "url",
            mediaType: "tv",
            title: "第 " + number + " 集",
            link: playLink,
            episode: number,
            posterPath: poster,
        });
    }

    const relatedStart = source.search(/<div\b[^>]*class=["']hg-web-detail__related["']/i);
    const relatedItems = relatedStart >= 0 ? parseCards(source.slice(relatedStart)) : [];
    const detailLink = detailUrlFromLink(requestedLink);
    const activeLink = /\/video\//i.test(String(requestedLink || "")) ? absoluteUrl(requestedLink) : detailLink;
    const activeEpisode = episodeNumberFromLink(activeLink);
    const peoples = authorMatch ? [{
        id: "author:" + authorMatch[1],
        title: stripTags(authorMatch[2]),
        avatar: absoluteUrl(attr(authorImage, "data-src") || attr(authorImage, "src")),
        role: "作者",
    }] : [];

    return {
        id: activeLink,
        type: "url",
        mediaType: "tv",
        title: title || "黄果短剧",
        link: activeLink,
        posterPath: poster,
        coverUrl: poster,
        detailPoster: poster,
        rating: scoreMatch ? parseFloat(scoreMatch[1]) : undefined,
        releaseDate: dateMatch ? dateMatch[1] : undefined,
        description: stripTags(descBlock).replace(/\s*展开\s*$/, ""),
        genreItems: tags,
        peoples: peoples,
        episode: activeEpisode,
        episodeItems: episodes,
        relatedItems: relatedItems,
    };
}

async function loadDetail(link) {
    const detailUrl = detailUrlFromLink(link);
    if (!detailUrl) return null;
    console.log("[huangguoai] detail:", detailUrl);
    return parseDetail(await httpGet(detailUrl), link);
}

function playPageFromLink(link) {
    const value = absoluteUrl(link);
    if (/\/video\/\d+\//i.test(value)) return value;
    const match = value.match(/\/detail\/(\d+)\//i);
    return match ? SITE + "/video/" + match[1] + "/" : "";
}

function parseVideoInitialData(html) {
    const match = String(html || "").match(/<script\b[^>]*id=["']videoInitialData["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) throw new Error("播放页缺少 videoInitialData");
    try {
        return JSON.parse(match[1]);
    } catch (error) {
        throw new Error("播放配置解析失败");
    }
}

async function loadResource(params) {
    params = params || {};
    const raw = params.link || params.id || params.videoUrl || params.url;
    if (!raw) throw new Error("播放地址为空");
    if (/^https?:\/\/[^\s"']+\.(?:m3u8|mp4)(?:\?|$)/i.test(raw)) {
        return [{ name: params.title || "播放", url: raw, customHeaders: mediaHeaders(SITE + "/"), playerType: "system" }];
    }

    const playPage = playPageFromLink(raw);
    if (!playPage) throw new Error("无法识别播放页");
    console.log("[huangguoai] play:", playPage);
    const data = parseVideoInitialData(await httpGet(playPage, detailUrlFromLink(playPage)));
    const episode = parseInt(data.ep, 10) || episodeNumberFromLink(playPage);
    const media = data.videoSrc || data.previewSrc || (data.epPlaySrcs && (data.epPlaySrcs[String(episode)] || data.epPlaySrcs[episode]));
    if (!media || !/\.(?:m3u8|mp4)(?:\?|$)/i.test(media)) throw new Error("当前集未返回可播放地址");

    return [{
        name: (data.title || params.title || "播放") + (episode ? " · 第 " + episode + " 集" : ""),
        description: /\.m3u8(?:\?|$)/i.test(media) ? "HLS" : "MP4",
        url: media,
        customHeaders: mediaHeaders(playPage),
        playerType: "system",
    }];
}

async function search(params) {
    params = params || {};
    const keyword = String(params.keyword || "").trim();
    if (!keyword) throw new Error("请输入搜索关键词");
    const page = pageNumber(params);
    const base = "/search/video/" + encodeURIComponent(keyword) + "/";
    const url = absoluteUrl(page <= 1 ? base : base + page + "/");
    console.log("[huangguoai] search:", url);
    return parseCards(await httpGet(url));
}
