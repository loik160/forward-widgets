// 4k-av Forward Widget
// 转换自 XPTV 4kav.js（原作者："夢"）

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
const SITE = 'https://4kmp.com';

var WidgetMetadata = {
    id: "4kmp.com",
    title: "4k-av",
    description: "4k-av 影视资源，包含电影和电视剧",
    author: "夢 (XPTV转换)",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        { title: "首页", functionName: "getHome", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "电影", functionName: "getMovies", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "电视剧", functionName: "getTV", params: [{ name: "page", title: "页码", type: "page" }] },
        { id: "loadResource", title: "播放资源", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] },
    ],
    search: {
        title: "搜索",
        functionName: "search",
        params: [],
    },
};

const CATEGORIES = {
    home: SITE,
    movie: SITE + '/movie',
    tv: SITE + '/tv',
};

function absoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? SITE + url : SITE + '/' + url;
}

function getPageNumber(html) {
    const $ = Widget.html.load(html);
    const pageNumber = $('#MainContent_header_nav .page-number').text().trim();
    const match = pageNumber.match(/\/\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
}

async function httpGet(url, referer) {
    const response = await Widget.http.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': referer || SITE + '/',
        },
    });
    if (!response || !response.data) throw new Error('请求失败: ' + url);
    return response.data;
}

function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = new Set();

    $('#MainContent_newestlist .virow .NTMitem').each((_, element) => {
        const $el = $(element);
        const href = $el.find('.title a').attr('href') || '';
        const title = $el.find('.title h2').text().trim() || $el.find('.title a').text().trim();
        const poster = $el.find('.poster img').attr('src') || $el.find('.poster img').attr('data-src') || '';
        const remark = $el.find('label[title="分辨率"]').text().trim().split('/')[0].trim();

        if (!href || !title) return;
        const vodUrl = absoluteUrl(href);
        if (seen.has(vodUrl)) return;
        seen.add(vodUrl);

        items.push({
            id: vodUrl,
            type: "url",
            mediaType: "movie",
            title: title,
            posterPath: absoluteUrl(poster),
            link: vodUrl,
            description: remark,
        });
    });

    console.log('[4kav] parseList:', items.length, 'items');
    return items;
}

async function fetchCategory(baseUrl, page) {
    page = parseInt(page, 10) || 1;
    let url = baseUrl;

    if (page > 1) {
        const firstPageHtml = await httpGet(baseUrl);
        const lastPage = getPageNumber(firstPageHtml);
        const targetPage = Math.max(lastPage - page + 1, 1);
        url = baseUrl.replace(/\/$/, '') + '/page-' + targetPage + '.html';
    }

    console.log('[4kav] fetchCategory:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

async function getHome(p) { return fetchCategory(CATEGORIES.home, p.page || 1); }
async function getMovies(p) { return fetchCategory(CATEGORIES.movie, p.page || 1); }
async function getTV(p) { return fetchCategory(CATEGORIES.tv, p.page || 1); }

function parseTracks(html, fallbackUrl) {
    const $ = Widget.html.load(html);
    const tracks = [];

    $('#rtlist li').each((_, element) => {
        const $el = $(element);
        const name = $el.find('span').text().trim() || '播放';
        const imgSrc = $el.find('img').attr('src') || '';
        const episodeUrl = imgSrc ? imgSrc.replace('screenshot.jpg', '') : '';

        if (!episodeUrl) return;
        tracks.push({
            name: name,
            url: absoluteUrl(episodeUrl),
        });
    });

    if (!tracks.length) {
        tracks.push({
            name: '播放',
            url: fallbackUrl,
        });
    }

    return tracks;
}

function extractVideoUrl(html) {
    const $ = Widget.html.load(html);
    let videoUrl = $('#MainContent_videowindow video source').attr('src') || '';

    if (!videoUrl) {
        const sourceMatch = html.match(/<source[^>]+src=["']([^"']+)["']/i);
        videoUrl = sourceMatch ? sourceMatch[1] : '';
    }

    if (!videoUrl) {
        const mediaMatch = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
        videoUrl = mediaMatch ? mediaMatch[1] : '';
    }

    return videoUrl;
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[4kav] loadDetail:', link);

    const html = await httpGet(link);
    const tracks = parseTracks(html, link);
    const firstTrack = tracks[0];
    const resource = await resolveResource(firstTrack.url, link, firstTrack.name);
    const episodeItems = tracks.map((track, index) => ({
        id: track.url,
        type: "url",
        mediaType: "tv",
        title: track.name,
        link: track.url,
        episode: index + 1,
    }));

    console.log('[4kav] videoUrl:', resource.url);

    return {
        id: link,
        type: "url",
        videoUrl: resource.url,
        mediaType: "movie",
        title: firstTrack.name,
        link: link,
        episodeItems: episodeItems.length > 1 ? episodeItems : [],
        customHeaders: resource.customHeaders,
    };
}

async function resolveResource(playUrl, referer, name) {
    const normalizedUrl = playUrl.replace('www.', '');
    const playHtml = normalizedUrl === referer ? await httpGet(referer) : await httpGet(normalizedUrl, referer);
    const videoUrl = extractVideoUrl(playHtml);

    if (!videoUrl) throw new Error('未找到视频播放 URL，页面结构可能已变化');

    return {
        name: name || '播放',
        url: absoluteUrl(videoUrl),
        customHeaders: {
            'Referer': normalizedUrl,
            'User-Agent': UA,
        },
        playerType: "system",
    };
}

async function loadResource(params = {}) {
    const playUrl = params.link || params.videoUrl || params.url;
    if (!playUrl) throw new Error('播放地址为空');

    return [
        await resolveResource(playUrl, params.referer || SITE + '/', params.title || params.name),
    ];
}

async function search(params = {}) {
    const kw = (params.keyword || params.wd || '').trim();
    if (!kw) throw new Error('关键词为空');

    const url = SITE + '/s?q=' + encodeURIComponent(kw);
    console.log('[4kav] search:', url);
    const html = await httpGet(url);
    return parseList(html);
}
