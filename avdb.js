// AVDB Forward Widget
// 转换自 XPTV avdb.js
// 对应网站：https://avdbapi.com

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)';
const API_BASE = 'https://avdbapi.com/api.php/provide/vod';
const SITE = 'https://avdbapi.com';

var WidgetMetadata = {
    id: "avdbapi.com",
    title: "AVDB",
    description: "AVDB - AV数据库，海量资源",
    author: "XPTV转换",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 1,
    modules: [
        // 分类将通过 getCategories 动态加载，Forward 不支持动态分类，
        // 所以预设常见分类（参照 avdb 常见类型）
        { title: "最新更新", functionName: "getLatest", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "无码高清", functionName: "getCat1", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "有码高清", functionName: "getCat2", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "中文字幕", functionName: "getCat3", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "欧美", functionName: "getCat4", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "3P/群交", functionName: "getCat5", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "人妻/熟女", functionName: "getCat6", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "制服诱惑", functionName: "getCat7", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "女同百合", functionName: "getCat8", params: [{ name: "page", title: "页码", type: "page" }] },
    ],
    search: {
        title: "搜索",
        functionName: "search",
        params: [],
    },
};

// ─── HTTP 请求封装 ─────────────────────────────────────────────────────────────
async function httpGet(url) {
    const response = await Widget.http.get(url, {
        headers: {
            'User-Agent': UA,
        },
    });
    if (!response || !response.data) throw new Error(`请求失败: ${url}`);
    return response.data;
}

// ─── 解析视频列表 ──────────────────────────────────────────────────────────────
// API 返回 JSON，list 数组包含视频条目
// 字段：id, name, poster_url, tag, created_at, vod_time
function parseVideoList(data) {
    let json;
    try {
        json = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        throw new Error('API 返回数据解析失败：' + e.message);
    }

    const list = json.list || [];
    if (!list.length) return [];

    return list.map(e => ({
        id: String(e.id),
        type: "url",
        mediaType: "movie",
        title: e.name || e.origin_name || String(e.id),
        posterPath: e.poster_url || '',
        subtitleText: e.tag || (e.category ? e.category.join('/') : ''),
        link: String(e.id),
    }));
}

// ─── 获取分类列表（通用）─────────────────────────────────────────────────────
async function fetchCategory(typeId, page) {
    // typeId=0 表示全量最新，无分类过滤
    let url;
    if (!typeId || typeId === 0) {
        url = `${API_BASE}?ac=detail&pg=${page}`;
    } else {
        url = `${API_BASE}?t=${typeId}&ac=detail&pg=${page}`;
    }
    console.log('[avdb] fetchCategory:', url);
    const data = await httpGet(url);
    const items = parseVideoList(data);
    if (!items.length) throw new Error('视频列表为空');
    return items;
}

// ─── 各分类入口 ────────────────────────────────────────────────────────────────
// Forward 要求每个模块对应一个具名函数
// 分类 ID 需要运行时从 API 获取；这里先按 avdb 常见类型 ID 预设
// 实际 ID 可能因站点调整而变化，预设值基于原始脚本及常见分类

async function getLatest(p) { return fetchCategory(0,  p.page || 1); }
async function getCat1(p)   { return fetchCategory(1,  p.page || 1); }
async function getCat2(p)   { return fetchCategory(2,  p.page || 1); }
async function getCat3(p)   { return fetchCategory(3,  p.page || 1); }
async function getCat4(p)   { return fetchCategory(4,  p.page || 1); }
async function getCat5(p)   { return fetchCategory(5,  p.page || 1); }
async function getCat6(p)   { return fetchCategory(6,  p.page || 1); }
async function getCat7(p)   { return fetchCategory(7,  p.page || 1); }
async function getCat8(p)   { return fetchCategory(8,  p.page || 1); }

// ─── loadDetail：获取播放地址 ─────────────────────────────────────────────────
// 对应原脚本 getTracks + getPlayinfo：
//   1. 通过 ?ac=detail&ids={id} 获取 episodes.server_data.Full.link_embed（embed页URL）
//   2. 请求 embed 页，用正则提取 playerInstance.setup() 中的 aboutlink + file
async function loadDetail(id) {
    if (!id) throw new Error('id 不能为空');
    console.log('[avdb] loadDetail id:', id);

    // Step 1: 获取 embed 播放器链接
    const detailUrl = `${API_BASE}?ac=detail&ids=${id}`;
    const detailData = await httpGet(detailUrl);

    let json;
    try {
        json = typeof detailData === 'string' ? JSON.parse(detailData) : detailData;
    } catch (e) {
        throw new Error('详情数据解析失败：' + e.message);
    }

    const item = json.list && json.list[0];
    if (!item) throw new Error('详情数据为空');

    const embedUrl = item.episodes &&
        item.episodes.server_data &&
        item.episodes.server_data.Full &&
        item.episodes.server_data.Full.link_embed;

    if (!embedUrl) throw new Error('未找到 embed 播放地址');
    console.log('[avdb] embedUrl:', embedUrl);

    // Step 2: 请求 embed 页面，提取真实视频地址
    const embedHtml = await Widget.http.get(embedUrl, {
        headers: {
            'User-Agent': UA,
            'Referer': `${SITE}/`,
        },
    });

    const html = embedHtml && embedHtml.data;
    if (!html) throw new Error('embed 页面加载失败');

    // 原脚本正则：playerInstance.setup( {...} )
    // 提取 aboutlink 和 file 拼接为最终视频 URL
    let videoUrl = null;

    // 方法1：提取 playerInstance.setup 中的 aboutlink + file
    const setupMatch = html.match(/playerInstance\.setup\(\s*(\{[\s\S]*?\})\s*\)/);
    if (setupMatch) {
        const setupObj = setupMatch[1];
        const aboutlinkMatch = setupObj.match(/aboutlink\s*:\s*["']([^"']+)["']/);
        const fileMatch = setupObj.match(/file\s*:\s*["']([^"']+)["']/);
        if (aboutlinkMatch && fileMatch) {
            videoUrl = aboutlinkMatch[1] + fileMatch[1];
        }
    }

    // 方法2：直接找 .m3u8 链接
    if (!videoUrl) {
        const m3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
        if (m3u8Match) {
            videoUrl = m3u8Match[0];
        }
    }

    // 方法3：找 file: "xxx" 形式
    if (!videoUrl) {
        const fileMatch = html.match(/file\s*:\s*["']([^"']+(?:\.m3u8|\.mp4)[^"']*)["']/);
        if (fileMatch) {
            videoUrl = fileMatch[1];
        }
    }

    if (!videoUrl) {
        throw new Error('未能从 embed 页面提取视频 URL，页面结构可能已变化');
    }

    console.log('[avdb] videoUrl:', videoUrl);

    return {
        id: videoUrl,
        type: "url",
        videoUrl: videoUrl,
        mediaType: "movie",
        customHeaders: {
            'User-Agent': UA,
            'Referer': embedUrl + '/',
        },
    };
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────────
// URL: ?ac=detail&wd={keyword}&pg={page}
async function search(params = {}) {
    const kw = params.keyword || params.wd || '';
    const page = params.page || 1;
    if (!kw) throw new Error('关键词为空');

    const url = `${API_BASE}?ac=detail&wd=${encodeURIComponent(kw)}&pg=${page}`;
    console.log('[avdb] search:', url);
    const data = await httpGet(url);
    return parseVideoList(data);
}
