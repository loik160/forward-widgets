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
    version: "1.1.0",
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
        params: [
            { name: "keyword", title: "关键词", type: "text" },
        ],
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
// 网站使用相对路径（无前导斜杠），实际 HTML 结构：
//
//   <!-- Bootstrap 3 thumbnail grid -->
//   <div class="col-xs-6 col-sm-4 col-md-3">
//     <div class="thumbnail">
//       <a href="video-1179763.htm">          ← 无前导斜杠！
//         <span class="label">01:16</span>
//       </a>
//       <div class="caption">
//         <h5><a href="video-1179763.htm">视频标题</a></h5>
//         <p><a href="user.htm?author=xxx">用户名</a> 68次观看 34分钟前</p>
//       </div>
//     </div>
//   </div>
//
// 关键：href 是相对的（video-XXXXXX.htm），需用 a[href*="video-"] 匹配
function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = new Set();  // 用 Set 去重，比 Array.some 更快

    // 策略1：优先从 h5 > a 提取标题（最精准，避免抓到时长文本）
    $('h5').each((_, el) => {
        const $h5 = $(el);
        const $a = $h5.find('a').first();
        let href = $a.attr('href') || '';

        // 匹配 video-数字.htm 或 /video-数字.htm
        if (!/video-\d+\.htm/.test(href)) return;

        const vodName = $a.text().trim();
        if (!vodName || seen.has(href)) return;
        seen.add(href);

        // 规范化 URL（无论是相对还是绝对路径都处理）
        const vodUrl = href.startsWith('http')
            ? href
            : href.startsWith('/')
                ? `${SITE}${href}`
                : `${SITE}/${href}`;

        // 提取封面图：往上找 .thumbnail，再找 img 或 background-image
        let vodPic = '';
        const $thumb = $h5.closest('.thumbnail, .item, .video-item, .card, li, div');
        if ($thumb.length) {
            // img 标签
            const $img = $thumb.find('img').first();
            if ($img.length) {
                vodPic = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || '';
            }
            // CSS background-image
            if (!vodPic) {
                const $bg = $thumb.find('[style*="background"]').first();
                if ($bg.length) {
                    const m = ($bg.attr('style') || '').match(/url\(['"]?([^'")\s]+)['"]?\)/);
                    if (m) vodPic = m[1];
                }
            }
        }

        items.push({
            id: vodUrl,
            type: "url",
            mediaType: "movie",
            title: vodName,
            posterPath: vodPic,
            link: vodUrl,
        });
    });

    // 策略2：如果 h5 没找到，退回到所有 video 链接（用正则从原始 HTML 提取）
    if (items.length === 0) {
        console.log('[hsex] h5 策略未找到条目，尝试正则提取');

        // 从原始 HTML 用正则匹配视频块：title 属性 或 href+文本组合
        // 匹配格式：href="video-XXXXXX.htm">视频标题</a>
        const linkRe = /href=["'](?:https?:\/\/hsex\.men\/)?(video-(\d+)\.htm)["'][^>]*>([^<]{5,})</g;
        let m;
        while ((m = linkRe.exec(html)) !== null) {
            const href = m[1];
            const title = m[3].trim();
            // 过滤掉看起来像时长的短文本（如 "01:16HD"、"10:27"）
            if (/^\d{1,2}:\d{2}/.test(title)) continue;
            if (seen.has(href)) continue;
            seen.add(href);

            const vodUrl = `${SITE}/${href}`;
            items.push({
                id: vodUrl,
                type: "url",
                mediaType: "movie",
                title: title,
                posterPath: '',
                link: vodUrl,
            });
        }
    }

    console.log('[hsex] parseList:', items.length, 'items');
    return items;
}

// ─── 获取分类列表（通用） ──────────────────────────────────────────────────────
// URL格式（均为相对，实际补全为绝对）：
//   /list-1.htm           → 视频列表
//   /top7_list-1.htm      → 周榜
//   /top_list-1.htm       → 月榜
//   /5min_list-1.htm      → 5~10分钟
//   /long_list-1.htm      → 10分钟以上
async function fetchCategory(prefix, page) {
    page = parseInt(page) || 1;
    const url = `${SITE}/${prefix}-${page}.htm`;
    console.log('[hsex] fetchCategory:', url);
    const html = await httpGet(url);

    // 检测 Cloudflare 挑战页面
    if (html.includes('cf-browser-verification') || html.includes('challenge-platform') && html.length < 10000 && !html.includes('video-')) {
        throw new Error('遇到 Cloudflare 验证，请稍后重试或在浏览器中打开本站后再试');
    }

    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

// ─── 各分类入口 ───────────────────────────────────────────────────────────────
async function getVideoList(p) { return fetchCategory('list', p.page || 1); }
async function getWeeklyTop(p) { return fetchCategory('top7_list', p.page || 1); }
async function getMonthlyTop(p) { return fetchCategory('top_list', p.page || 1); }
async function get5Min(p) { return fetchCategory('5min_list', p.page || 1); }
async function get10Min(p) { return fetchCategory('long_list', p.page || 1); }

// ─── loadDetail：从视频详情页提取播放 URL ─────────────────────────────────────
// hsex.men 视频播放器常见形式：
//   <video src="https://...mp4">
//   jwplayer('player').setup({ file: 'https://...m3u8' })
//   var video_url = 'https://...';
//   sources: [{ src: '...m3u8', type: '...' }]
async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[hsex] loadDetail:', link);

    const html = await httpGet(link);

    // 检测 Cloudflare 挑战
    if (html.includes('challenge-platform') && html.length < 10000) {
        throw new Error('Cloudflare 验证阻断了请求，请稍后重试');
    }

    let videoUrl = null;

    // 方法1：<video src="...">
    const videoTagMatch = html.match(/<video[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    if (videoTagMatch) videoUrl = videoTagMatch[1];

    // 方法2：src 属性含 .m3u8 或 .mp4
    if (!videoUrl) {
        const srcMatch = html.match(/src\s*=\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
        if (srcMatch) videoUrl = srcMatch[1];
    }

    // 方法3：JS 变量 url/file/video_url/playUrl/videoUrl
    if (!videoUrl) {
        const varMatch = html.match(/(?:url|file|video_url|playUrl|videoUrl)\s*[:=]\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
        if (varMatch) videoUrl = varMatch[1];
    }

    // 方法4：泛匹配任意 .m3u8 URL
    if (!videoUrl) {
        const m3u8Match = html.match(/["'](https?:\/\/[^"']*\.m3u8[^"']*)["']/);
        if (m3u8Match) videoUrl = m3u8Match[1];
    }

    // 方法5：泛匹配任意 .mp4 URL
    if (!videoUrl) {
        const mp4Match = html.match(/["'](https?:\/\/[^"']*\.mp4[^"']*)["']/);
        if (mp4Match) videoUrl = mp4Match[1];
    }

    // 方法6：data-url/data-src/data-file 属性
    if (!videoUrl) {
        const dataMatch = html.match(/data-(?:url|src|file)\s*=\s*["'](https?:\/\/[^"']+)["']/i);
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
// URL 格式：/search.htm?search={kw}&sort=new&page={page}
// 支持翻页
async function search(params = {}) {
    const kw = (params.keyword || params.wd || '').trim();
    const page = parseInt(params.page) || 1;
    if (!kw) throw new Error('请输入关键词');

    const pageParam = page > 1 ? `&page=${page}` : '';
    const url = `${SITE}/search.htm?search=${encodeURIComponent(kw)}&sort=new${pageParam}`;
    console.log('[hsex] search:', url);
    const html = await httpGet(url);

    if (html.includes('challenge-platform') && html.length < 10000) {
        throw new Error('Cloudflare 验证阻断了请求，请稍后重试');
    }

    const items = parseList(html);
    if (!items.length) throw new Error(`"${kw}" 暂无相关视频`);
    return items;
}
