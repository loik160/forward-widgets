// PPP.Porn Forward Widget
// 转换自 XPTV ppp.js（原脚本来自群友“夢”）

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Mobile/15E148 Safari/604.1';
const SITE = 'https://ppp.porn';

const CATEGORY_OPTIONS = [
    { title: '中國AV', value: 'https://ppp.porn/categories/china-av/' },
    { title: '日本片商', value: 'https://ppp.porn/categories/japan-producer/' },
    { title: '素人自拍', value: 'https://ppp.porn/categories/amateur/' },
    { title: '中國', value: 'https://ppp.porn/categories/china/' },
    { title: '台灣', value: 'https://ppp.porn/categories/taiwan/' },
    { title: '日本', value: 'https://ppp.porn/categories/japan/' },
    { title: '東南亞', value: 'https://ppp.porn/categories/se-asia/' },
    { title: '韓國', value: 'https://ppp.porn/categories/korea/' },
    { title: '香港', value: 'https://ppp.porn/categories/hongkong/' },
    { title: 'Cosplay', value: 'https://ppp.porn/categories/cosplay/' },
    { title: '主播', value: 'https://ppp.porn/categories/streamer/' },
    { title: '主觀視角', value: 'https://ppp.porn/categories/first-person-pov/' },
    { title: '凌辱', value: 'https://ppp.porn/categories/bdsm/' },
    { title: '劇情', value: 'https://ppp.porn/categories/drama/' },
    { title: '多P', value: 'https://ppp.porn/categories/threesome/' },
    { title: '探花', value: 'https://ppp.porn/categories/91-tanhua/' },
    { title: '流出', value: 'https://ppp.porn/categories/released/' },
    { title: '無碼', value: 'https://ppp.porn/categories/uncensored/' },
    { title: '百合', value: 'https://ppp.porn/categories/lesbian/' },
    { title: '野外露出', value: 'https://ppp.porn/categories/exhibitionists/' },
    { title: 'OL', value: 'https://ppp.porn/categories/office-lady/' },
    { title: '動漫', value: 'https://ppp.porn/categories/acg/' },
    { title: '古裝', value: 'https://ppp.porn/categories/costume/' },
    { title: '女僕', value: 'https://ppp.porn/categories/maid/' },
    { title: '學生', value: 'https://ppp.porn/categories/student/' },
    { title: '旗袍', value: 'https://ppp.porn/categories/cheongsam/' },
    { title: '獸耳', value: 'https://ppp.porn/categories/kemonomimi/' },
    { title: '瑜伽褲', value: 'https://ppp.porn/categories/yoga-pants/' },
    { title: '真理褲', value: 'https://ppp.porn/categories/dolfin-shorts/' },
    { title: '空姐', value: 'https://ppp.porn/categories/flight-attendant/' },
    { title: '絲襪', value: 'https://ppp.porn/categories/pantyhose/' },
    { title: '護士', value: 'https://ppp.porn/categories/nurse/' },
    { title: '過膝襪', value: 'https://ppp.porn/categories/knee-socks/' },
];

var WidgetMetadata = {
    id: "ppp.porn",
    title: "pppPorn",
    description: "PPP.Porn 精選亞洲素人成人影片，支持分类与搜索",
    author: "夢 (XPTV转换)",
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
        {
            title: "分类",
            functionName: "getCategory",
            params: [
                { name: "href", title: "分类", type: "enumeration", enumOptions: CATEGORY_OPTIONS, value: "https://ppp.porn/categories/china-av/" },
                { name: "page", title: "页码", type: "page" },
            ],
        },
        { title: "中國AV", functionName: "getChinaAv", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "日本", functionName: "getJapan", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "素人自拍", functionName: "getAmateur", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "無碼", functionName: "getUncensored", params: [{ name: "page", title: "页码", type: "page" }] },
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
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? SITE + url : SITE + '/' + url;
}

function requestHeaders(referer) {
    return {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': referer || SITE + '/pp1/',
    };
}

async function httpGet(url, referer) {
    const response = await Widget.http.get(url, {
        headers: requestHeaders(referer),
    });
    if (!response || !response.data) throw new Error('请求失败: ' + url);
    return String(response.data);
}

function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = {};

    function pushItem(href, title, cover, duration, views) {
        const link = absoluteUrl(href);
        if (!href || !title || seen[link]) return;
        seen[link] = true;

        items.push({
            id: link,
            type: "url",
            mediaType: "movie",
            title: title,
            posterPath: absoluteUrl(cover),
            backdropPath: absoluteUrl(cover),
            link: link,
            durationText: duration || '',
            description: views || '',
            customHeaders: requestHeaders(SITE + '/pp1/'),
        });
    }

    $('.item').each((_, element) => {
        const $el = $(element);
        const href = $el.find('h4 a').attr('href') || $el.find('.card-video__img a').attr('href') || $el.find('a').first().attr('href') || '';
        const title = $el.find('h4 a').text().trim() || $el.find('img').attr('alt') || '';
        const cover = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
        const duration = $el.find('.card-video__duration').text().trim();
        const views = $el.find('.card-video__stats span').first().text().trim();
        pushItem(href, title, cover, duration, views);
    });

    if (!items.length) {
        const re = /<div class="item card-video[\s\S]*?<a href="([^"]+)"[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?card-video__duration">([^<]*)/g;
        let match;
        while ((match = re.exec(html)) !== null) {
            pushItem(match[1], match[3].trim(), match[2], match[4].trim(), '');
        }
    }

    console.log('[ppp] parseList:', items.length, 'items');
    return items;
}

async function fetchCategory(href, page) {
    page = parseInt(page, 10) || 1;
    href = absoluteUrl(href || CATEGORY_OPTIONS[0].value);
    const url = href + '?mode=async&function=get_block&block_id=list_videos_common_videos_list&sort_by=post_date&from=' + page;
    console.log('[ppp] fetchCategory:', url);

    const html = await httpGet(url, href);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

async function getCategory(params = {}) {
    return fetchCategory(params.href || CATEGORY_OPTIONS[0].value, params.page || 1);
}

async function getChinaAv(params = {}) {
    return fetchCategory('https://ppp.porn/categories/china-av/', params.page || 1);
}

async function getJapan(params = {}) {
    return fetchCategory('https://ppp.porn/categories/japan/', params.page || 1);
}

async function getAmateur(params = {}) {
    return fetchCategory('https://ppp.porn/categories/amateur/', params.page || 1);
}

async function getUncensored(params = {}) {
    return fetchCategory('https://ppp.porn/categories/uncensored/', params.page || 1);
}

function extractStreams(html) {
    const streams = [];
    const seen = {};
    const re = /https?:\/\/[^\s"'<>]+\.m3u8(?:\?[^"'<>\s]*)?/ig;
    let match;

    while ((match = re.exec(html)) !== null) {
        const url = match[0];
        if (url.indexOf('.m3u8.jpg') !== -1 || url.indexOf('preview.m3u8') !== -1 || seen[url]) continue;
        seen[url] = true;
        streams.push({
            name: '播放',
            url: url,
        });
    }

    streams.sort((a, b) => {
        const as = a.url.indexOf('/stream/') !== -1 ? 0 : 1;
        const bs = b.url.indexOf('/stream/') !== -1 ? 0 : 1;
        return as - bs;
    });

    return streams;
}

function streamToResource(stream, referer) {
    return {
        name: stream.name || '播放',
        url: stream.url,
        customHeaders: requestHeaders(referer || SITE + '/pp1/'),
        playerType: "system",
    };
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[ppp] loadDetail:', link);

    const html = await httpGet(link, SITE + '/pp1/');
    const streams = extractStreams(html);
    if (!streams.length) throw new Error('未找到播放资源，页面结构可能已更新');

    return {
        id: link,
        type: "url",
        mediaType: "movie",
        link: link,
        videoUrl: streams[0].url,
        customHeaders: requestHeaders(link),
    };
}

async function loadResource(params = {}) {
    const raw = params.link || params.videoUrl || params.url || params.id;
    if (!raw) throw new Error('播放地址为空');

    if (/^https?:\/\/[^\s"'<>]+\.m3u8/i.test(raw)) {
        return [streamToResource({ name: params.title || params.name || '播放', url: raw }, params.referer || SITE + '/pp1/')];
    }

    const html = await httpGet(raw, SITE + '/pp1/');
    const streams = extractStreams(html);
    if (!streams.length) throw new Error('未找到播放资源，页面结构可能已更新');
    return streams.map((stream) => streamToResource(stream, raw));
}

async function search(params = {}) {
    const kw = (params.keyword || params.wd || params.text || '').trim();
    const page = parseInt(params.page, 10) || 1;
    if (!kw) throw new Error('关键词为空');

    const text = encodeURIComponent(kw);
    const url = SITE + '/search/' + text + '/?mode=async&function=get_block&block_id=list_videos_videos_list_search_result&q=' + text + '&category_ids=&sort_by=&from_videos=' + page + '&from_albums=' + page;
    console.log('[ppp] search:', url);

    const html = await httpGet(url, SITE + '/pp1/');
    const items = parseList(html);
    if (!items.length) throw new Error('搜索结果为空');
    return items;
}
