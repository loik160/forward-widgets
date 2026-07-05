// Rou Video Forward Widget
// 转换自 XPTV rou.js（原脚本来自群友“tou tie”）

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
const SITE = 'https://rou.video';

var WidgetMetadata = {
    id: "rou.video",
    title: "肉视频",
    description: "肉视频 - 国产AV、探花、自拍流出、OnlyFans、日本等",
    author: "tou tie (XPTV转换)",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        { title: "国产AV", functionName: "getGuochanAV", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "探花", functionName: "getTanHua", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "自拍流出", functionName: "getZipai", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "OnlyFans", functionName: "getOnlyFans", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "日本", functionName: "getJapan", params: [{ name: "page", title: "页码", type: "page" }] },
        { id: "loadResource", title: "播放资源", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] },
    ],
    search: {
        title: "搜索",
        functionName: "search",
        params: [],
    },
};

const TAGS = {
    guochanAV: '國產AV',
    tanHua: '探花',
    zipai: '自拍流出',
    onlyFans: 'OnlyFans',
    japan: '日本',
};

function absoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? SITE + url : SITE + '/' + url;
}

function formatDuration(seconds) {
    seconds = Math.floor(Number(seconds) || 0);
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
        ? [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
        : [m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function base64Decode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;

    str = String(str || '').replace(/[^A-Za-z0-9+/=]/g, '');

    while (i < str.length) {
        const enc1 = chars.indexOf(str.charAt(i++));
        const enc2 = chars.indexOf(str.charAt(i++));
        const enc3 = chars.indexOf(str.charAt(i++));
        const enc4 = chars.indexOf(str.charAt(i++));

        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;

        output += String.fromCharCode(chr1);
        if (enc3 !== 64 && enc3 !== -1) output += String.fromCharCode(chr2);
        if (enc4 !== 64 && enc4 !== -1) output += String.fromCharCode(chr3);
    }

    return output;
}

function decodeEv(ev) {
    if (!ev || !ev.d) return null;
    const decoded = base64Decode(ev.d)
        .split('')
        .map((c) => String.fromCharCode(c.charCodeAt(0) - ev.k))
        .join('');
    return JSON.parse(decoded);
}

function parseNextData(html) {
    const $ = Widget.html.load(html);
    const scriptContent = $('#__NEXT_DATA__').html();
    if (!scriptContent) return null;
    return JSON.parse(scriptContent);
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

function videoToItem(video) {
    const id = video.id || video.vid || '';
    const title = video.nameZh || video.name || '';
    const link = absoluteUrl('/v/' + id);
    const remark = video.tags && video.tags.length ? video.tags.join(' / ') : '';

    if (!id || !title) return null;

    return {
        id: link,
        type: "url",
        mediaType: "movie",
        title: title,
        posterPath: video.coverImageUrl || '',
        backdropPath: video.coverImageUrl || '',
        link: link,
        durationText: formatDuration(video.duration),
        description: remark,
    };
}

function parseListFromNextData(html) {
    const data = parseNextData(html);
    const pageProps = data && data.props && data.props.pageProps;
    if (!pageProps) return [];

    const videos = pageProps.videos || pageProps.items || pageProps.videoList || pageProps.list || [];
    if (!Array.isArray(videos)) return [];

    return videos.map(videoToItem).filter(Boolean);
}

function parseListFromDom(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = new Set();

    $('.grid.grid-cols-2.mb-6 > div').each((_, element) => {
        const $el = $(element);
        if ($el.find('.relative').length === 0) return;

        const href = $el.find('.relative a').attr('href') || '';
        const title = $el.find('img:last').attr('alt') || '';
        const cover = $el.find('img').attr('src') || '';
        const subTitle = $el.find('.relative a > div:eq(1)').text().trim();
        const hdInfo = $el.find('.relative a > div:first').text().trim();

        if (!href || !title) return;
        const link = absoluteUrl(href);
        if (seen.has(link)) return;
        seen.add(link);

        items.push({
            id: link,
            type: "url",
            mediaType: "movie",
            title: title,
            posterPath: cover,
            backdropPath: cover,
            link: link,
            description: subTitle || hdInfo,
        });
    });

    return items;
}

function parseList(html) {
    let items = parseListFromNextData(html);
    if (!items.length) items = parseListFromDom(html);
    console.log('[rou] parseList:', items.length, 'items');
    return items;
}

async function fetchTag(tag, page) {
    page = parseInt(page, 10) || 1;
    const url = page > 1
        ? SITE + '/t/' + encodeURIComponent(tag) + '?order=createdAt&page=' + page
        : SITE + '/t/' + encodeURIComponent(tag);

    console.log('[rou] fetchTag:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

async function getGuochanAV(p) { return fetchTag(TAGS.guochanAV, p.page || 1); }
async function getTanHua(p) { return fetchTag(TAGS.tanHua, p.page || 1); }
async function getZipai(p) { return fetchTag(TAGS.zipai, p.page || 1); }
async function getOnlyFans(p) { return fetchTag(TAGS.onlyFans, p.page || 1); }
async function getJapan(p) { return fetchTag(TAGS.japan, p.page || 1); }

function extractVideoUrl(html) {
    const data = parseNextData(html);
    const pageProps = data && data.props && data.props.pageProps;
    const decoded = pageProps && pageProps.ev ? decodeEv(pageProps.ev) : null;
    let videoUrl = decoded && decoded.videoUrl ? decoded.videoUrl : '';

    if (!videoUrl) {
        const match = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
        videoUrl = match ? match[1] : '';
    }

    return videoUrl ? videoUrl.replace('.jpg', '.m3u8') : '';
}

async function resolveResource(link, title) {
    const html = await httpGet(link);
    const videoUrl = extractVideoUrl(html);
    if (!videoUrl) throw new Error('未找到视频播放 URL，页面结构可能已变化');

    return {
        name: title || '播放',
        url: videoUrl,
        customHeaders: {
            'User-Agent': UA,
            'Referer': link,
        },
        playerType: "system",
    };
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[rou] loadDetail:', link);

    const resource = await resolveResource(link, '播放');
    return {
        id: link,
        type: "url",
        videoUrl: resource.url,
        mediaType: "movie",
        link: link,
        customHeaders: resource.customHeaders,
    };
}

async function loadResource(params = {}) {
    const link = params.link || params.videoUrl || params.url;
    if (!link) throw new Error('播放地址为空');

    if (link.indexOf('/v/') === -1 && /\.(m3u8|mp4)(?:\?|$)/i.test(link)) {
        return [{
            name: params.title || params.name || '播放',
            url: link,
            customHeaders: {
                'User-Agent': UA,
                'Referer': SITE + '/',
            },
            playerType: "system",
        }];
    }

    return [await resolveResource(link, params.title || params.name)];
}

async function search(params = {}) {
    const kw = (params.keyword || params.wd || '').trim();
    const page = parseInt(params.page, 10) || 1;
    if (!kw) throw new Error('关键词为空');

    const url = SITE + '/search?q=' + encodeURIComponent(kw) + '&t=&page=' + page;
    console.log('[rou] search:', url);
    const html = await httpGet(url);
    return parseList(html);
}
