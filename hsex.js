// hsex.men (好色TV) Forward Widget
// 网站：https://hsex.men
// 分类：视频列表、周榜、月榜、5分钟+、10分钟+

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const SITE = 'https://hsex.men';

// ─── Widget 元数据 ─────────────────────────────────────────────────────────────
var WidgetMetadata = {
    id: "hsex.men",
    title: "好色TV",
    description: "好色™ Tv – 华语区业余自拍、偷拍、原创成人视频社区",
    author: "hsex.men",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        {
            title: "视频列表",
            functionName: "getVideoList",
            params: [{ name: "page", title: "页码", type: "page" }]
        },
        {
            title: "周榜 (Weekly Top)",
            functionName: "getWeeklyTop",
            params: [{ name: "page", title: "页码", type: "page" }]
        },
        {
            title: "月榜 (Monthly Top)",
            functionName: "getMonthlyTop",
            params: [{ name: "page", title: "页码", type: "page" }]
        },
        {
            title: "5分钟+",
            functionName: "get5Min",
            params: [{ name: "page", title: "页码", type: "page" }]
        },
        {
            title: "10分钟+",
            functionName: "get10Min",
            params: [{ name: "page", title: "页码", type: "page" }]
        },
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
// HTML 结构示例（hsex.men）：
//   <div class="video-list"> 或 <ul class="video-list">
//     <li class="video-item"> 或 <div class="item">
//       <a href="/video-1179763.htm">
//         <div class="img" style="background-image:url('https://...')"></div>
//         <span class="duration">09:55</span>
//       </a>
//       <h5 class="title"><a href="/video-1179763.htm">视频标题</a></h5>
//     </li>
//   </div>
function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];

    // 尝试多种选择器匹配视频列表项
    // hsex.men 使用 <a href="/video-XXXXXX.htm"> 模式
    $('a[href^="/video-"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') || '';

        // 过滤掉不是视频详情页的链接（只保留 /video-数字.htm 格式）
        if (!/^\/video-\d+\.htm$/.test(href)) return;

        // 提取标题（优先从 h5/h4/title 属性，其次从链接文本）
        let vodName = '';
        // 查找相邻的标题元素
        const $parent = $a.parent();
        const $li = $parent.closest('li, .item, .video-item');
        if ($li.length) {
            vodName = $li.find('h5, h4, h3, .title').first().text().trim();
        }
        // 如果没找到，尝试 a 链接的 title 属性或文本
        if (!vodName) vodName = $a.attr('title') || $a.text().trim();

        // 提取封面图（背景图片或 img 标签）
        let vodPic = '';
        const $imgDiv = $a.find('[style*="background-image"]').first();
        if ($imgDiv.length) {
            const style = $imgDiv.attr('style') || '';
            const m = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
            if (m) vodPic = m[1];
        }
        if (!vodPic) {
            const $img = $a.find('img').first();
            if ($img.length) vodPic = $img.attr('src') || $img.attr('data-src') || '';
        }

        if (!href || !vodName) return;

        const vodUrl = `${SITE}${href}`;
        // 去重：同一个 href 可能出现多次（列表 + 推荐）
        if (items.some(i => i.link === vodUrl)) return;

        items.push({
            id: vodUrl,
            type: "url",
            mediaType: "movie",
            title: vodName,
            posterPath: vodPic,
            link: vodUrl,
        });
    });

    console.log('[hsex] parseList:', items.length, 'items');
    return items;
}

// ─── 获取分类列表（通用） ──────────────────────────────────────────────────────
// URL 格式：
//   /list-1.htm           → 视频列表第1页
//   /list-2.htm           → 视频列表第2页
//   /top7_list-1.htm      → 周榜
//   /top_list-1.htm       → 月榜
//   /5min_list-1.htm      → 5~10 分钟
//   /long_list-1.htm      → 10 分钟以上
async function fetchCategory(prefix, page) {
    page = parseInt(page) || 1;
    const url = `${SITE}/${prefix}-${page}.htm`;
    console.log('[hsex] fetchCategory:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，可能选择器需要更新');
    return items;
}

// ─── 各分类入口 ───────────────────────────────────────────────────────────────
async function getVideoList(p) { return fetchCategory('list', p.page || 1); }
async function getWeeklyTop(p) { return fetchCategory('top7_list', p.page || 1); }
async function getMonthlyTop(p) { return fetchCategory('top_list', p.page || 1); }
async function get5Min(p) { return fetchCategory('5min_list', p.page || 1); }
async function get10Min(p) { return fetchCategory('long_list', p.page || 1); }

// ─── loadDetail：从视频详情页提取播放 URL ─────────────────────────────────────
// hsex.men 视频播放器通常嵌入在页面中，常见格式：
//   <video src="https://...mp4">
//   jwplayer('player').setup({ file: 'https://...m3u8' })
//   var video_url = 'https://...';
//   player.src([{ src: '...m3u8', type: 'application/x-mpegURL' }])
async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[hsex] loadDetail:', link);

    const html = await httpGet(link);
    let videoUrl = null;

    // 方法1：直接 src 属性中的 .m3u8 或 .mp4
    const srcMatch = html.match(/src\s*=\s*["'](https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)['"]/i);
    if (srcMatch) videoUrl = srcMatch[1];

    // 方法2：JavaScript 变量 url / file / video_url / playUrl
    if (!videoUrl) {
        const varMatch = html.match(/(?:url|file|video_url|playUrl|videoUrl|src)\s*[:=]\s*["'](https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)['"]/i);
        if (varMatch) videoUrl = varMatch[1];
    }

    // 方法3：泛匹配任意 m3u8 URL
    if (!videoUrl) {
        const m3u8Match = html.match(/["'](https?:\/\/[^"']*\.m3u8[^"']*)['"]/);
        if (m3u8Match) videoUrl = m3u8Match[1];
    }

    // 方法4：泛匹配任意 mp4 URL
    if (!videoUrl) {
        const mp4Match = html.match(/["'](https?:\/\/[^"']*\.mp4[^"']*)['"]/);
        if (mp4Match) videoUrl = mp4Match[1];
    }

    // 方法5：查找 data-url 或 data-src 属性
    if (!videoUrl) {
        const dataMatch = html.match(/data-(?:url|src|file)\s*=\s*["'](https?:\/\/[^"']+)['"]/i);
        if (dataMatch) videoUrl = dataMatch[1];
    }

    if (!videoUrl) {
        throw new Error('未找到视频播放 URL，页面结构可能已变化');
    }

    console.log('[hsex] videoUrl:', videoUrl);

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
// URL 格式：/search.htm?search={kw}&sort=new
// 搜索结果 HTML 结构与分类列表相同
async function search(params = {}) {
    const kw = params.keyword || params.wd || '';
    const page = parseInt(params.page) || 1;
    if (!kw) throw new Error('关键词为空');

    // 支持分页：page > 1 时使用 &page= 参数
    const pageParam = page > 1 ? `&page=${page}` : '';
    const url = `${SITE}/search.htm?search=${encodeURIComponent(kw)}&sort=new${pageParam}`;
    console.log('[hsex] search:', url);
    const html = await httpGet(url);
    return parseList(html);
}
