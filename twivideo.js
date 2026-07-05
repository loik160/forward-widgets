// twivideo Forward Widget
// 转换自 XPTV twivideo.js

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0';
const SITE = 'https://twivideo.net';

var WidgetMetadata = {
    id: "twivideo.net",
    title: "twivideo",
    description: "twivideo 视频下载与排行",
    author: "Yswag (XPTV转换)",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        { title: "新着DL", functionName: "getNew", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "ランキング 24時間", functionName: "getRanking24", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "ランキング 3日間", functionName: "getRanking72", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "ランキング 1週間", functionName: "getRanking168", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "急上昇", functionName: "getTrending", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "高評価", functionName: "getLikeRanking", params: [{ name: "page", title: "页码", type: "page" }] },
        { id: "loadResource", title: "播放资源", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] },
    ],
    search: {
        title: "搜索",
        functionName: "search",
        params: [],
    },
};

const CATEGORIES = {
    newDL: { type: '0', order: 'post_date', ty: 'p4' },
    ranking24: { type: 'ranking', order: '24', ty: 'p6' },
    ranking72: { type: 'ranking', order: '72', ty: 'p6' },
    ranking168: { type: 'ranking', order: '168', ty: 'p6' },
    trending: { type: 'trending', order: 'r_count', ty: 'p7' },
    likeRanking: { type: 'likeranking', order: '24', ty: 'p6' },
};

function absoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? SITE + url : SITE + '/' + url;
}

function isCloudflareBlocked(html) {
    return /Attention Required|cf-error-details|challenge-platform|Cloudflare/i.test(String(html || ''));
}

function formEncode(data) {
    return Object.keys(data)
        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');
}

async function postForm(url, body) {
    const response = await Widget.http.post(url, formEncode(body), {
        headers: {
            'User-Agent': UA,
            'Referer': SITE + '/',
            'Origin': SITE,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });
    if (!response || !response.data) throw new Error('请求失败: ' + url);
    if (isCloudflareBlocked(response.data)) throw new Error('Cloudflare 拦截，请稍后重试或在可访问网络中使用');
    return response.data;
}

function parseTitle($, element, index) {
    const $el = $(element);
    return $el.find('.item_link').attr('data-id') ||
        $el.find('.item_title, .title, .item_text').first().text().trim() ||
        'twivideo #' + (index + 1);
}

function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = {};

    $('div.art_li').each((index, element) => {
        const $el = $(element);
        const href = $el.find('.item_link').attr('href') || $el.find('a[href]').first().attr('href') || '';
        const img = $el.find('.item_image img').attr('src') || $el.find('img').first().attr('src') || '';
        const title = parseTitle($, element, index);
        const link = absoluteUrl(href);

        if (!link || seen[link]) return;
        seen[link] = true;

        items.push({
            id: link,
            type: "url",
            mediaType: "movie",
            title: title,
            posterPath: absoluteUrl(img),
            link: link,
            videoUrl: link,
            customHeaders: {
                'User-Agent': UA,
                'Referer': SITE + '/',
            },
        });
    });

    console.log('[twivideo] parseList:', items.length, 'items');
    return items;
}

async function fetchCategory(category, page) {
    page = parseInt(page, 10) || 1;
    const offset = (page - 1) * 50;
    const html = await postForm(SITE + '/templates/view_lists.php', {
        offset: offset,
        limit: 50,
        tag: 'null',
        type: category.type,
        order: category.order,
        le: 1000,
        ty: category.ty,
        offset_int: offset,
    });
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

async function getNew(params = {}) { return fetchCategory(CATEGORIES.newDL, params.page || 1); }
async function getRanking24(params = {}) { return fetchCategory(CATEGORIES.ranking24, params.page || 1); }
async function getRanking72(params = {}) { return fetchCategory(CATEGORIES.ranking72, params.page || 1); }
async function getRanking168(params = {}) { return fetchCategory(CATEGORIES.ranking168, params.page || 1); }
async function getTrending(params = {}) { return fetchCategory(CATEGORIES.trending, params.page || 1); }
async function getLikeRanking(params = {}) { return fetchCategory(CATEGORIES.likeRanking, params.page || 1); }

function normalizePlayableUrl(url) {
    return absoluteUrl(url);
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    const videoUrl = normalizePlayableUrl(link);

    return {
        id: videoUrl,
        type: "url",
        mediaType: "movie",
        link: videoUrl,
        videoUrl: videoUrl,
        customHeaders: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        },
    };
}

async function loadResource(params = {}) {
    const url = params.link || params.videoUrl || params.url || params.id;
    if (!url) throw new Error('播放地址为空');

    return [{
        name: params.title || params.name || '播放',
        url: normalizePlayableUrl(url),
        customHeaders: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        },
        playerType: "system",
    }];
}

async function search(params = {}) {
    const kw = (params.keyword || params.wd || params.text || '').trim();
    if (!kw) throw new Error('关键词为空');

    const html = await postForm(SITE + '/templates/ajax_twitteroauth_v2.php', {
        url: encodeURIComponent(kw),
    });

    const $ = Widget.html.load(html);
    const items = parseList(html);
    if (items.length) return items;

    const href = $('.item_link').attr('href') || $('a[href]').first().attr('href') || '';
    const img = $('img').first().attr('src') || '';
    const title = $('.item_link').attr('data-id') || $('title').text().trim() || kw;
    const link = absoluteUrl(href);

    if (!link) throw new Error('搜索结果为空');

    return [{
        id: link,
        type: "url",
        mediaType: "movie",
        title: title,
        posterPath: absoluteUrl(img),
        link: link,
        videoUrl: link,
        customHeaders: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        },
    }];
}
