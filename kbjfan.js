// KBJFan Forward Widget
// 转换自 XPTV kbjfan.js

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const SITE = 'https://www.kbjfan.com';

var WidgetMetadata = {
    id: "kbjfan.com",
    title: "KBJFan",
    description: "KBJFan Korean BJ Dance / Nude",
    author: "Yswag (XPTV转换)",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        {
            title: "搜索",
            functionName: "search",
            params: [
                { name: "keyword", title: "关键词", type: "input" },
                { name: "page", title: "页码", type: "page" },
            ],
        },
        { title: "Korean BJ Dance", functionName: "getDance", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "Korean BJ Nude", functionName: "getNude", params: [{ name: "page", title: "页码", type: "page" }] },
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

function absoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? SITE + url : SITE + '/' + url;
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
    const seen = {};

    $('.posts-item').each((_, element) => {
        const $el = $(element);
        const href = $el.find('.item-heading a').attr('href') || $el.find('.item-thumbnail a').attr('href') || '';
        const title = $el.find('.item-heading a').text().trim() || $el.find('img').attr('alt') || '';
        const cover = $el.find('.item-thumbnail img').attr('data-src') || $el.find('.item-thumbnail img').attr('src') || '';
        const pubdate = $el.find('.meta-author span').last().text().trim();
        const tags = [];

        $el.find('.item-tags a').each((_, tagEl) => {
            const tag = $(tagEl).text().replace(/^#\s*/, '').trim();
            if (tag) tags.push(tag);
        });

        const link = absoluteUrl(href);
        if (!link || !title || seen[link]) return;
        seen[link] = true;

        items.push({
            id: link,
            type: "url",
            mediaType: "movie",
            title: title,
            posterPath: absoluteUrl(cover),
            backdropPath: absoluteUrl(cover),
            link: link,
            releaseDate: pubdate,
            description: tags.join(' / '),
        });
    });

    console.log('[kbjfan] parseList:', items.length, 'items');
    return items;
}

async function fetchCategory(typeUrl, page) {
    page = parseInt(page, 10) || 1;
    const url = page > 1 ? SITE + '/' + typeUrl + '/page/' + page + '/' : SITE + '/' + typeUrl + '/';
    console.log('[kbjfan] fetchCategory:', url);

    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

async function getDance(params = {}) {
    return fetchCategory('koreanbjdance', params.page || 1);
}

async function getNude(params = {}) {
    return fetchCategory('koreanbjnude', params.page || 1);
}

function parseTracks(html) {
    const $ = Widget.html.load(html);
    const tracks = [];

    $('.dplayer-featured a').each((_, element) => {
        const $el = $(element);
        const name = $el.text().trim() || '播放';
        const url = $el.attr('video-url') || '';
        if (!url) return;
        tracks.push({ name: name, url: url });
    });

    if (!tracks.length) {
        const playUrl = $('#posts-pay .new-dplayer').attr('video-url') || $('.new-dplayer').attr('video-url') || '';
        if (playUrl) tracks.push({ name: '播放', url: playUrl });
    }

    return tracks;
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[kbjfan] loadDetail:', link);

    const html = await httpGet(link);
    const tracks = parseTracks(html);
    if (!tracks.length) throw new Error('未找到视频播放 URL，页面结构可能已变化');

    const first = tracks[0];
    const episodeItems = tracks.map((track, index) => ({
        id: track.url,
        type: "url",
        mediaType: "movie",
        title: track.name,
        link: track.url,
        episode: index + 1,
    }));

    return {
        id: link,
        type: "url",
        mediaType: "movie",
        link: link,
        videoUrl: first.url,
        episodeItems: episodeItems.length > 1 ? episodeItems : [],
        customHeaders: {
            'User-Agent': UA,
            'Referer': link,
        },
    };
}

async function loadResource(params = {}) {
    const url = params.link || params.videoUrl || params.url || params.id;
    if (!url) throw new Error('播放地址为空');

    return [{
        name: params.title || params.name || '播放',
        url: url,
        customHeaders: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        },
        playerType: "system",
    }];
}

async function search(params = {}) {
    const kw = (params.keyword || params.wd || '').trim();
    const page = parseInt(params.page, 10) || 1;
    if (!kw) throw new Error('关键词为空');

    const path = page > 1 ? '/page/' + page + '/?s=' + encodeURIComponent(kw) : '/?s=' + encodeURIComponent(kw);
    const url = SITE + path;
    console.log('[kbjfan] search:', url);

    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('搜索结果为空');
    return items;
}
