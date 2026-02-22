// xChina (小黄书) Forward Widget
// 网站：https://xchina.co

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const SITE = 'https://xchina.co';

// 分类系列 ID（来自 /categories.html 页面）
const SERIES = {
    zhongwenAV: 'series-63824a975d8ae',   // 中文AV
    ribenAV: 'series-6206216719462',   // 日本AV
    moteSipai: 'series-6030196781d85',   // 模特私拍
    yeyuPaishe: 'series-617d3e7acdcc8',   // 业余拍摄
    seqingDianyin: 'series-61c4d9b653b6d',   // 情色电影
    qitaYingpian: 'series-60192e83c9e05',   // 其他影片
};

var WidgetMetadata = {
    id: "xchina.co",
    title: "xChina 小黄书",
    description: "小黄书 – 华语区成人影片，中文AV、日本AV、模特私拍等",
    author: "xchina.co",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        { title: "中文AV", functionName: "getZhongwenAV", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "日本AV", functionName: "getRibenAV", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "模特私拍", functionName: "getMoteSipai", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "业余拍摄", functionName: "getYeyuPaishe", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "情色电影", functionName: "getSeqingDianyin", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "其他影片", functionName: "getQitaYingpian", params: [{ name: "page", title: "页码", type: "page" }] },
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
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': SITE + '/',
        },
    });
    if (!response || !response.data) throw new Error(`请求失败: ${url}`);
    return response.data;
}

// ─── 解析视频列表 ─────────────────────────────────────────────────────────────
// HTML 结构：
//   <div class="item video">
//     <a href="/video/id-XXXXX.html" title="视频标题">
//       <div role="img" class="img" style="background-image:url('https://img.xchina.download/cover/XXXXX.webp');"></div>
//     </a>
//   </div>
function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];

    $('.item.video a[href^="/video/id-"]').each((_, el) => {
        const $a = $(el);
        const vodPath = $a.attr('href') || '';
        const vodName = $a.attr('title') || '';

        // 提取背景图片 URL（封面图）
        const styleAttr = $a.find('.img').attr('style') || '';
        const picMatch = styleAttr.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        const vodPic = picMatch ? picMatch[1] : '';

        if (!vodPath || !vodName) return;

        const vodUrl = `${SITE}${vodPath}`;
        items.push({
            id: vodUrl,
            type: "url",
            mediaType: "movie",
            title: vodName,
            posterPath: vodPic,
            link: vodUrl,
        });
    });

    console.log('[xchina] parseList:', items.length, 'items');
    return items;
}

// ─── 获取分类列表（通用） ──────────────────────────────────────────────────────
// URL 格式：
//   第1页：/videos/{seriesId}.html
//   第N页：/videos/{seriesId}/{page}.html
async function fetchSeries(seriesId, page) {
    page = page || 1;
    const url = page === 1
        ? `${SITE}/videos/${seriesId}.html`
        : `${SITE}/videos/${seriesId}/${page}.html`;

    console.log('[xchina] fetchSeries:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空');
    return items;
}

// ─── 各分类入口 ───────────────────────────────────────────────────────────────
async function getZhongwenAV(p) { return fetchSeries(SERIES.zhongwenAV, p.page || 1); }
async function getRibenAV(p) { return fetchSeries(SERIES.ribenAV, p.page || 1); }
async function getMoteSipai(p) { return fetchSeries(SERIES.moteSipai, p.page || 1); }
async function getYeyuPaishe(p) { return fetchSeries(SERIES.yeyuPaishe, p.page || 1); }
async function getSeqingDianyin(p) { return fetchSeries(SERIES.seqingDianyin, p.page || 1); }
async function getQitaYingpian(p) { return fetchSeries(SERIES.qitaYingpian, p.page || 1); }

// ─── loadDetail：从视频详情页提取 m3u8 链接 ───────────────────────────────────
// 视频 URL 直接嵌入在页面 HTML 中，格式：
//   src="https://video.xchina.download/m3u8/{id}/720.m3u8?expires=...&md5=..."
// 注意：URL 带有有效期签名，每次请求页面才能获取有效链接
async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[xchina] loadDetail:', link);

    const html = await httpGet(link);

    // 方法1：提取 src 中的 m3u8 URL（带签名）
    let videoUrl = null;

    const srcMatch = html.match(/src\s*=\s*["'](https:\/\/video\.xchina\.download\/m3u8\/[^"']+)["']/);
    if (srcMatch) {
        videoUrl = srcMatch[1];
    }

    // 方法2：查找任何 .m3u8 URL
    if (!videoUrl) {
        const m3u8Match = html.match(/["'](https?:\/\/[^"']*\.m3u8[^"']*)["']/);
        if (m3u8Match) {
            videoUrl = m3u8Match[1];
        }
    }

    // 方法3：查找 video.xchina.download 域名下的任何 URL
    if (!videoUrl) {
        const vMatch = html.match(/["'](https?:\/\/video\.xchina\.download\/[^"']+)["']/);
        if (vMatch) {
            videoUrl = vMatch[1];
        }
    }

    if (!videoUrl) {
        throw new Error('未找到视频播放 URL，页面结构可能已变化');
    }

    console.log('[xchina] videoUrl:', videoUrl);

    return {
        id: videoUrl,
        type: "url",
        videoUrl: videoUrl,
        mediaType: "movie",
        customHeaders: {
            'User-Agent': UA,
            'Referer': `${SITE}/`,
        },
    };
}

// ─── 搜索 ────────────────────────────────────────────────────────────────────
// URL 格式：/search.html?keyword={kw}&page={page}
// 搜索结果 HTML 结构与分类列表相同（div.item.video）
async function search(params = {}) {
    const kw = params.keyword || params.wd || '';
    const page = params.page || 1;
    if (!kw) throw new Error('关键词为空');

    const url = `${SITE}/search.html?keyword=${encodeURIComponent(kw)}&page=${page}`;
    console.log('[xchina] search:', url);
    const html = await httpGet(url);
    return parseList(html);
}
