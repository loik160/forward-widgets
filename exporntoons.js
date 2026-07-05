// ExPornToons Forward Widget
// 转换自 XPTV EXPORNTOONS.js

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)';
const SITE = 'https://exporntoons.net';

var WidgetMetadata = {
    id: "exporntoons.net",
    title: "exporntoons",
    description: "ExPornToons 动画视频，主要支持搜索",
    author: "fangkuia/XPTV转换",
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
        { title: "最新", functionName: "getLatest", params: [{ name: "page", title: "页码", type: "page" }] },
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

async function httpGet(url, referer) {
    const response = await Widget.http.get(url, {
        headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': referer || SITE + '/',
        },
    });
    if (!response || !response.data) throw new Error('请求失败: ' + url);
    const html = String(response.data);
    if (html.indexOf('Just a moment') !== -1 || html.indexOf('challenge-platform') !== -1 || html.indexOf('cf-mitigated') !== -1) {
        throw new Error('Cloudflare 验证拦截，请稍后重试');
    }
    return html;
}

function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = {};

    $('.item').each((_, element) => {
        const $el = $(element);
        const href = $el.find('.item_link').attr('href') || $el.find('a').first().attr('href') || '';
        const title = $el.find('.title').text().trim() || $el.find('img').attr('alt') || $el.find('a').attr('title') || '';
        const cover = $el.find('.i_img img').attr('data-src')
            || $el.find('.i_img img').attr('src')
            || $el.find('img').attr('data-src')
            || $el.find('img').attr('src')
            || '';
        const remark = $el.find('.duration, .time, .quality').first().text().trim();
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
            description: remark,
            customHeaders: {
                'User-Agent': UA,
                'Referer': SITE + '/',
            },
        });
    });

    console.log('[exporntoons] parseList:', items.length, 'items');
    return items;
}

async function fetchList(path, page) {
    page = parseInt(page, 10) || 1;
    const url = SITE + path + '?p=' + page;
    console.log('[exporntoons] fetchList:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

async function getLatest(params = {}) {
    return fetchList('/now', params.page || 1);
}

function parsePlaylist(html) {
    const match = String(html || '').match(/window\.playlist\s*=\s*({[\s\S]*?});/);
    if (!match || !match[1]) return [];

    try {
        const playlist = JSON.parse(match[1]);
        const sources = Array.isArray(playlist.sources) ? playlist.sources : [];
        const tracks = [];
        const seen = {};

        sources.forEach((source) => {
            if (!source || !source.file || seen[source.file]) return;
            seen[source.file] = true;

            const label = source.label ? String(source.label) : '';
            tracks.push({
                name: label ? (label.endsWith('p') ? label : label + 'p') : '播放',
                url: source.file,
                type: source.type || 'mp4',
                isDefault: !!source.default,
            });
        });

        tracks.sort((a, b) => {
            if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
            const ah = parseInt(a.name, 10) || 0;
            const bh = parseInt(b.name, 10) || 0;
            return bh - ah;
        });

        return tracks;
    } catch (error) {
        console.log('[exporntoons] parsePlaylist error:', error.message);
        return [];
    }
}

function extractMediaUrls(html) {
    const tracks = parsePlaylist(html);
    if (tracks.length) return tracks;

    const urls = [];
    const seen = {};
    const re = /["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/ig;
    let match;
    while ((match = re.exec(html)) !== null) {
        const url = match[1];
        if (seen[url]) continue;
        seen[url] = true;
        urls.push({
            name: url.indexOf('.m3u8') !== -1 ? 'HLS' : '播放',
            url: url,
            type: url.indexOf('.m3u8') !== -1 ? 'hls' : 'mp4',
        });
    }
    return urls;
}

function streamToResource(track, referer) {
    return {
        name: track.name || '播放',
        url: absoluteUrl(track.url),
        customHeaders: {
            'User-Agent': UA,
            'Referer': referer || SITE + '/',
        },
        playerType: "system",
    };
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[exporntoons] loadDetail:', link);

    const html = await httpGet(link, SITE + '/');
    const tracks = extractMediaUrls(html);
    if (!tracks.length) throw new Error('未找到播放资源，页面结构可能已更新');

    const first = tracks[0];
    const episodeItems = tracks.map((track, index) => ({
        id: track.url,
        type: "url",
        mediaType: "movie",
        title: track.name || '播放',
        link: track.url,
        episode: index + 1,
    }));

    return {
        id: link,
        type: "url",
        mediaType: "movie",
        link: link,
        videoUrl: absoluteUrl(first.url),
        episodeItems: episodeItems.length > 1 ? episodeItems : [],
        customHeaders: {
            'User-Agent': UA,
            'Referer': link,
        },
    };
}

async function loadResource(params = {}) {
    const raw = params.link || params.videoUrl || params.url || params.id;
    if (!raw) throw new Error('播放地址为空');

    if (/^https?:\/\/[^"']+\.(?:m3u8|mp4)/i.test(raw)) {
        return [streamToResource({ name: params.title || params.name || '播放', url: raw }, params.referer || SITE + '/')];
    }

    const html = await httpGet(raw, SITE + '/');
    const tracks = extractMediaUrls(html);
    if (!tracks.length) throw new Error('未找到播放资源，页面结构可能已更新');
    return tracks.map((track) => streamToResource(track, raw));
}

async function search(params = {}) {
    const kw = (params.keyword || params.wd || params.text || '').trim();
    const page = parseInt(params.page, 10) || 1;
    if (!kw) throw new Error('关键词为空');

    const url = SITE + '/video/' + encodeURIComponent(kw) + '?p=' + page;
    console.log('[exporntoons] search:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('搜索结果为空');
    return items;
}
