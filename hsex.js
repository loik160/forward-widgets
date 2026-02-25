// hsex.men (好色TV) Forward Widget
// 网站：https://hsex.men
// 分类：视频列表、周榜、月榜、5分钟+、10分钟+、搜索

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const SITE = 'https://hsex.men';

// ─── Widget 元数据 ─────────────────────────────────────────────────────────────
var WidgetMetadata = {
    id: "hsex.men",
    title: "好色TV",
    description: "好色TV - 华语区业余自拍偷拍原创成人视频社区",
    author: "hsex.men",
    site: SITE,
    version: "1.3.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        // ── 搜索（参考 jable.js 放入 modules） ──
        {
            title: "搜索",
            functionName: "search",
            params: [
                { name: "keyword", title: "关键词", type: "input" },
                { name: "page", title: "页码", type: "page" },
            ],
        },
        // ── 分类 ──
        { title: "视频列表", functionName: "getVideoList", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "周榜", functionName: "getWeeklyTop", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "月榜", functionName: "getMonthlyTop", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "5分钟+", functionName: "get5Min", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "10分钟+", functionName: "get10Min", params: [{ name: "page", title: "页码", type: "page" }] },
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
    if (!response || !response.data) throw new Error('请求失败: ' + url);
    return response.data;
}

// ─── 解析视频列表 ─────────────────────────────────────────────────────────────
// 网站使用 Bootstrap 3 thumbnail grid，HTML 结构：
//   <div class="thumbnail">
//     <a href="video-1179763.htm">            ← 相对路径，无前导斜杠
//       <img src="https://..." alt="标题">    ← 封面图（或 data-src 懒加载）
//       <span class="label">01:16HD</span>
//     </a>
//     <div class="caption">
//       <h5><a href="video-1179763.htm">视频标题</a></h5>
//     </div>
//   </div>
function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = new Set();

    // 策略1：以 <h5> 内的链接为主（精准识别标题，避免抓到时长文本）
    $('h5').each((_, el) => {
        const $h5 = $(el);
        const $a = $h5.find('a').first();
        const href = $a.attr('href') || '';

        // 只处理 video-数字.htm 格式（相对或绝对路径均支持）
        if (!/video-(\d+)\.htm/.test(href)) return;

        const vodName = $a.text().trim();
        if (!vodName || seen.has(href)) return;
        seen.add(href);

        // 规范化为绝对 URL
        const vodUrl = href.startsWith('http')
            ? href
            : href.startsWith('/')
                ? SITE + href
                : SITE + '/' + href;

        // 提取封面图：向上找 .thumbnail 容器，查找 img 的 src / data-src / data-lazy
        let vodPic = '';
        const $container = $h5.closest('.thumbnail, .item, .video-item, .col-xs-6, .col-sm-4, li');
        if ($container.length) {
            const $img = $container.find('img').first();
            if ($img.length) {
                vodPic = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || $img.attr('data-original') || '';
                // 排除 base64 占位图
                if (vodPic.startsWith('data:')) vodPic = '';
            }
            // 备用：CSS background-image
            if (!vodPic) {
                const $bg = $container.find('[style*="background"]').first();
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

    // 策略2：若 h5 策略无结果，尝试正则从原始 HTML 提取
    // 匹配结构：<img ...src="封面URL"...>...<a href="video-xxx.htm">标题</a>
    if (items.length === 0) {
        console.log('[hsex] h5 策略未找到，启用正则兜底');

        // 提取每个 thumbnail 块
        const blockRe = /<div[^>]+class="[^"]*thumbnail[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
        let block;
        while ((block = blockRe.exec(html)) !== null) {
            const chunk = block[1];

            // 从块中提取 href
            const hrefM = chunk.match(/href=["'](video-(\d+)\.htm)["']/);
            if (!hrefM) continue;
            const href = hrefM[1];
            if (seen.has(href)) continue;
            seen.add(href);

            // 从块中提取标题（h5 内文本）
            const titleM = chunk.match(/<h5[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
            const vodName = titleM ? titleM[1].trim() : '';
            if (!vodName || /^\d{1,2}:\d{2}/.test(vodName)) continue;

            // 从块中提取封面图
            const imgM = chunk.match(/<img[^>]+(?:src|data-src|data-lazy)=["']([^"']+)["']/);
            const vodPic = (imgM && !imgM[1].startsWith('data:')) ? imgM[1] : '';

            const vodUrl = SITE + '/' + href;
            items.push({
                id: vodUrl,
                type: "url",
                mediaType: "movie",
                title: vodName,
                posterPath: vodPic,
                link: vodUrl,
            });
        }
    }

    console.log('[hsex] parseList:', items.length, 'items');
    return items;
}

// ─── 获取分类列表（通用） ──────────────────────────────────────────────────────
async function fetchCategory(prefix, page) {
    page = parseInt(page) || 1;
    const url = SITE + '/' + prefix + '-' + page + '.htm';
    console.log('[hsex] fetchCategory:', url);
    const html = await httpGet(url);

    if (html.includes('challenge-platform') && html.length < 10000) {
        throw new Error('Cloudflare 验证拦截，请稍后重试');
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
async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[hsex] loadDetail:', link);

    const html = await httpGet(link);

    if (html.includes('challenge-platform') && html.length < 10000) {
        throw new Error('Cloudflare 验证拦截，请稍后重试');
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

    // 方法3：JS 变量赋值
    if (!videoUrl) {
        const varMatch = html.match(/(?:url|file|video_url|playUrl|videoUrl|source)\s*[:=]\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
        if (varMatch) videoUrl = varMatch[1];
    }

    // 方法4：泛匹配 .m3u8
    if (!videoUrl) {
        const m3u8Match = html.match(/["'](https?:\/\/[^"']*\.m3u8[^"']*)["']/);
        if (m3u8Match) videoUrl = m3u8Match[1];
    }

    // 方法5：泛匹配 .mp4
    if (!videoUrl) {
        const mp4Match = html.match(/["'](https?:\/\/[^"']*\.mp4[^"']*)["']/);
        if (mp4Match) videoUrl = mp4Match[1];
    }

    // 方法6：data-url / data-src
    if (!videoUrl) {
        const dataMatch = html.match(/data-(?:url|src|file)\s*=\s*["'](https?:\/\/[^"']+)["']/i);
        if (dataMatch) videoUrl = dataMatch[1];
    }

    if (!videoUrl) throw new Error('未找到视频播放 URL，页面结构可能已变化');

    console.log('[hsex] videoUrl:', videoUrl);

    return {
        id: videoUrl,
        type: "url",
        videoUrl: videoUrl,
        mediaType: "movie",
        customHeaders: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        },
    };
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────────
// URL：/search.htm?search={kw}&sort=new&page={page}
async function search(params) {
    params = params || {};
    const kw = (params.keyword || params.wd || '').trim();
    const page = parseInt(params.page) || 1;
    if (!kw) throw new Error('请输入关键词');

    const pageParam = page > 1 ? '&page=' + page : '';
    const url = SITE + '/search.htm?search=' + encodeURIComponent(kw) + '&sort=new' + pageParam;
    console.log('[hsex] search:', url);

    const html = await httpGet(url);

    if (html.includes('challenge-platform') && html.length < 10000) {
        throw new Error('Cloudflare 验证拦截，请稍后重试');
    }

    const items = parseList(html);
    if (!items.length) throw new Error('"' + kw + '" 暂无相关视频');
    return items;
}
