// UAA Forward Widget
// 转换自 XPTV uua.js（原脚本来自群友“夢”）

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const SITE = 'https://www.uaa.com';

const CATEGORY_MAP = {
    chinese: { title: '国产视频', tip: 'chinese-av-porn', origin: 1 },
    jav: { title: '日本AV', tip: 'jav', origin: 1 },
    uncensored: { title: '无码流出', category: '无码流出', origin: 2 },
    anime: { title: 'H动漫', origin: 3 },
    all_origin_1: { title: '全部-国产/日本', origin: 1 },
    all_origin_2: { title: '全部-无码/流出', origin: 2 },
    all_origin_3: { title: '全部-H动漫', origin: 3 },
    guochan: { title: '国产', category: '国产', origin: 1 },
    chinese_subtitle: { title: '中文字幕', category: '中文字幕', origin: 1 },
    amateur: { title: '素人', category: '素人', origin: 1 },
    selfie: { title: '自拍', category: '自拍', origin: 1 },
    leaked: { title: '流出', category: '流出', origin: 2 },
    fc2: { title: 'FC2', category: 'FC2', origin: 2 },
    cosplay: { title: 'Cosplay', category: 'Cosplay', origin: 2 },
    vr: { title: 'VR', category: 'VR', origin: 2 },
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_MAP).map((key) => ({
    title: CATEGORY_MAP[key].title,
    value: key,
}));

const TAG_OPTIONS = [
    '国产', '日本', '中文字幕', '无码', '流出', '素人', '自拍', 'FC2', 'Cosplay', 'VR',
    '巨乳', '爆乳', '美乳', '贫乳', '人妻', '熟女', '少妇', '学生', '制服', '黑丝',
    '丝袜', 'OL', '教师', '护士', '女同', '口交', '颜射', '内射', '骑乘', '后入',
    '剧情', '调教', '按摩', '痴女', '萝莉', '御姐', '动漫', '3D', '里番', '同人',
].map((tag) => ({ title: tag, value: tag }));

var WidgetMetadata = {
    id: "uaa.com",
    title: "有爱爱",
    description: "UAA 有爱爱视频，支持分类、标签与搜索",
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
        { title: "国产视频", functionName: "getChinese", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "日本AV", functionName: "getJav", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "无码流出", functionName: "getUncensored", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "H动漫", functionName: "getAnime", params: [{ name: "page", title: "页码", type: "page" }] },
        {
            title: "分类",
            functionName: "getCategory",
            params: [
                { name: "category", title: "分类", type: "enumeration", enumOptions: CATEGORY_OPTIONS, value: "chinese" },
                { name: "page", title: "页码", type: "page" },
            ],
        },
        {
            title: "标签",
            functionName: "getTag",
            params: [
                { name: "tag", title: "标签", type: "enumeration", enumOptions: TAG_OPTIONS, value: "中文字幕" },
                { name: "origin", title: "来源", type: "enumeration", enumOptions: [
                    { title: "全部", value: "" },
                    { title: "国产/日本", value: "1" },
                    { title: "无码/流出", value: "2" },
                    { title: "H动漫", value: "3" },
                ], value: "" },
                { name: "page", title: "页码", type: "page" },
            ],
        },
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

function appendParam(params, key, value) {
    if (value === undefined || value === null || value === '') return;
    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
}

function buildListUrl(options, page) {
    page = parseInt(page, 10) || 1;
    options = options || {};

    if (options.tip) {
        let url = SITE + '/' + options.tip;
        if (page > 1) {
            const params = [];
            appendParam(params, 'origin', options.origin);
            appendParam(params, 'sort', options.sort || 1);
            appendParam(params, 'page', page);
            url += '?' + params.join('&');
        }
        return url;
    }

    const params = [];
    appendParam(params, 'category', options.category);
    appendParam(params, 'origin', options.origin);
    appendParam(params, 'tag', options.tag);
    appendParam(params, 'sort', options.sort === undefined ? 1 : options.sort);
    appendParam(params, 'page', page);
    return SITE + '/video/list?' + params.join('&');
}

async function httpGet(url, referer) {
    const response = await Widget.http.get(url, {
        headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': referer || SITE + '/',
        },
    });
    if (!response || !response.data) throw new Error('请求失败: ' + url);
    return response.data;
}

function assertNotBlocked(html) {
    if (String(html || '').indexOf('challenge-platform') !== -1 || String(html || '').indexOf('cf-mitigated') !== -1) {
        throw new Error('Cloudflare 验证拦截，请稍后重试');
    }
}

function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = {};

    $('li.video_li').each((_, element) => {
        const $el = $(element);
        const href = $el.find('.title a').attr('href') || $el.find('a').first().attr('href') || '';
        const title = $el.find('.title a').text().trim() || $el.find('a').attr('title') || $el.find('img').attr('alt') || '';
        const cover = $el.find('img.cover').attr('src')
            || $el.find('img.cover').attr('data-cfsrc')
            || $el.find('img').attr('data-src')
            || $el.find('img').attr('data-original')
            || $el.find('img').attr('src')
            || '';
        const pubdate = $el.find('span').first().text().trim();
        const remark = $el.find('.duration, .time, .label').first().text().trim();
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
            releaseDate: pubdate,
            description: remark || pubdate,
            customHeaders: {
                'User-Agent': UA,
                'Referer': SITE + '/',
            },
        });
    });

    if (!items.length) {
        $('a[href*="/video/"], a[href*="/play/"], a[href*="/watch/"]').each((_, element) => {
            const $a = $(element);
            const href = $a.attr('href') || '';
            const $container = $a.closest('li, .item, .video, .video-item, .card');
            const title = $a.text().trim() || $a.attr('title') || $container.find('img').attr('alt') || '';
            const cover = $container.find('img').attr('data-src') || $container.find('img').attr('data-original') || $container.find('img').attr('src') || '';
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
            });
        });
    }

    console.log('[uaa] parseList:', items.length, 'items');
    return items;
}

async function fetchList(options, page) {
    const url = buildListUrl(options, page);
    console.log('[uaa] fetchList:', url);
    const html = await httpGet(url);
    assertNotBlocked(html);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

async function getChinese(params = {}) { return fetchList(CATEGORY_MAP.chinese, params.page || 1); }
async function getJav(params = {}) { return fetchList(CATEGORY_MAP.jav, params.page || 1); }
async function getUncensored(params = {}) { return fetchList(CATEGORY_MAP.uncensored, params.page || 1); }
async function getAnime(params = {}) { return fetchList(CATEGORY_MAP.anime, params.page || 1); }

async function getCategory(params = {}) {
    const key = params.category || 'chinese';
    const category = CATEGORY_MAP[key] || CATEGORY_MAP.chinese;
    return fetchList(category, params.page || 1);
}

async function getTag(params = {}) {
    const tag = params.tag || '中文字幕';
    return fetchList({
        tag: tag,
        origin: params.origin || '',
        sort: 1,
    }, params.page || 1);
}

function extractVideoUrl(html) {
    const $ = Widget.html.load(html);
    let videoUrl = $('#mui-player').attr('src') || $('#mui-player source').attr('src') || '';

    if (!videoUrl) videoUrl = $('video source').attr('src') || $('video').attr('src') || '';

    if (!videoUrl) {
        const sourceMatch = html.match(/<source[^>]+src=["']([^"']+)["']/i);
        videoUrl = sourceMatch ? sourceMatch[1] : '';
    }

    if (!videoUrl) {
        const playerMatch = html.match(/(?:url|file|src|videoUrl|playUrl)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
        videoUrl = playerMatch ? playerMatch[1] : '';
    }

    if (!videoUrl) {
        const mediaMatch = html.match(/["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
        videoUrl = mediaMatch ? mediaMatch[1] : '';
    }

    return absoluteUrl(videoUrl);
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[uaa] loadDetail:', link);

    const html = await httpGet(link, SITE + '/');
    assertNotBlocked(html);
    const videoUrl = extractVideoUrl(html);
    if (!videoUrl) throw new Error('未找到播放地址，页面结构可能已更新');

    return {
        id: link,
        type: "url",
        mediaType: "movie",
        link: link,
        videoUrl: videoUrl,
        customHeaders: {
            'User-Agent': UA,
            'Referer': link,
            'Origin': SITE,
        },
    };
}

async function loadResource(params = {}) {
    const raw = params.link || params.videoUrl || params.url || params.id;
    if (!raw) throw new Error('播放地址为空');

    if (/^https?:\/\/[^"']+\.(?:m3u8|mp4)/i.test(raw)) {
        return [{
            name: params.title || params.name || '播放',
            url: raw,
            customHeaders: {
                'User-Agent': UA,
                'Referer': params.referer || SITE + '/',
                'Origin': SITE,
            },
            playerType: "system",
        }];
    }

    const detail = await loadDetail(raw);
    return [{
        name: params.title || params.name || '播放',
        url: detail.videoUrl,
        customHeaders: detail.customHeaders,
        playerType: "system",
    }];
}

async function search(params = {}) {
    const kw = (params.keyword || params.wd || params.text || '').trim();
    const page = parseInt(params.page, 10) || 1;
    if (!kw) throw new Error('关键词为空');

    const url = page > 1
        ? SITE + '/video/list?keyword=' + encodeURIComponent(kw) + '&category=&origin=&tag=&sort=0&page=' + page
        : SITE + '/video/list?searchType=1&keyword=' + encodeURIComponent(kw);

    console.log('[uaa] search:', url);
    const html = await httpGet(url);
    assertNotBlocked(html);
    const items = parseList(html);
    if (!items.length) throw new Error('搜索结果为空');
    return items;
}
