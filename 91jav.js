// 91JAV Forward Widget
// 转换自 XPTV 91jav.js（原作者："夢"）
// 域名参考：https://91jav.fun → https://agent.uuowmem.com

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const SITE = 'https://agent.uuowmem.com';

var WidgetMetadata = {
    id: "91jav.fun",
    title: "91JAV",
    description: "91JAV 中文字幕高清AV",
    author: "夢 (XPTV转换)",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 1,
    modules: [
        // 分类 ID 来自网站 /cn/theme/ 页面
        { title: "中文字幕", functionName: "getCat3", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "角色剧情", functionName: "getCat2", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "制服诱惑", functionName: "getCat4", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "丝袜美腿", functionName: "getCat6", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "直接开啪", functionName: "getCat5", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "多P群交", functionName: "getCat8", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "男友视角", functionName: "getCat9", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "羞辱强暴", functionName: "getCat10", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "无码高清", functionName: "getCat11", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "盗摄偷拍", functionName: "getCat12", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "女同百合", functionName: "getCat13", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "捆绑调教", functionName: "getCat7", params: [{ name: "page", title: "页码", type: "page" }] },
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
            'Referer': `${SITE}/`,
        },
    });
    if (!response || !response.data) throw new Error(`请求失败: ${url}`);
    return response.data;
}

// ─── 列表解析 ──────────────────────────────────────────────────────────────────
// HTML 结构：
//   <div class="video-img-box">
//     <a href="/cn/videos/ID">
//       <img class="zximg" z-image-loader-url="POSTER_URL" alt="TITLE" />
//       <span class="label">DURATION</span>
//     </a>
//   </div>
//
// 使用 Widget.html.load（cheerio）解析，可靠处理非标准属性 z-image-loader-url

function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];

    // .video-img-box 是每个视频卡片的外层容器，用于排除热搜等区域的 /cn/videos/ 链接
    $('.video-img-box a[href^="/cn/videos/"]').each((_, el) => {
        const $a = $(el);
        const $img = $a.find('img.zximg');

        const vodPath = $a.attr('href') || '';
        const vodName = $img.attr('alt') || '';
        // z-image-loader-url 是懒加载封面属性；fallback 到 src
        const vodPic = $img.attr('z-image-loader-url') || $img.attr('src') || '';
        const duration = $a.find('span.label').first().text().trim();

        if (!vodPath || !vodName) return;

        const vodUrl = `${SITE}${vodPath}`;
        items.push({
            id: vodUrl,
            type: "url",
            mediaType: "movie",
            title: vodName,
            posterPath: vodPic,
            link: vodUrl,
            durationText: duration,
        });
    });

    console.log('[91jav] parseList:', items.length, 'items');
    return items;
}

// ─── 分类请求 ──────────────────────────────────────────────────────────────────
// URL 格式：/cn/theme/detail/{id}/update/{page}/
async function fetchCategory(categoryId, page) {
    const url = `${SITE}/cn/theme/detail/${categoryId}/update/${page}/`;
    console.log('[91jav] fetchCategory:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (items.length === 0) throw new Error('视频列表为空');
    return items;
}

async function getCat2(p) { return fetchCategory(2, p.page || 1); }
async function getCat3(p) { return fetchCategory(3, p.page || 1); }
async function getCat4(p) { return fetchCategory(4, p.page || 1); }
async function getCat5(p) { return fetchCategory(5, p.page || 1); }
async function getCat6(p) { return fetchCategory(6, p.page || 1); }
async function getCat7(p) { return fetchCategory(7, p.page || 1); }
async function getCat8(p) { return fetchCategory(8, p.page || 1); }
async function getCat9(p) { return fetchCategory(9, p.page || 1); }
async function getCat10(p) { return fetchCategory(10, p.page || 1); }
async function getCat11(p) { return fetchCategory(11, p.page || 1); }
async function getCat12(p) { return fetchCategory(12, p.page || 1); }
async function getCat13(p) { return fetchCategory(13, p.page || 1); }

// ─── loadDetail：从播放页提取 hlsUrl ─────────────────────────────────────────
// 对应原 XPTV getTracks + getPlayinfo：
//   data.match(/var hlsUrl = "(.*?)";/)[1]
async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[91jav] loadDetail:', link);

    const html = await httpGet(link);

    // 对应原脚本：let playUrl = data.match(/var hlsUrl = "(.*?)";/)[1]
    const hlsMatch = html.match(/var hlsUrl\s*=\s*"([^"]+)"/);
    if (!hlsMatch || !hlsMatch[1]) {
        throw new Error('未找到 hlsUrl，页面结构可能已变化');
    }

    const videoUrl = hlsMatch[1];
    console.log('[91jav] videoUrl:', videoUrl);

    if (!videoUrl.startsWith('http')) {
        throw new Error(`无效视频地址: ${videoUrl}`);
    }

    return {
        id: videoUrl,
        type: "url",
        videoUrl: videoUrl,
        mediaType: "movie",
        customHeaders: {
            'Referer': `${SITE}/`,
            'User-Agent': UA,
        },
    };
}

// ─── 搜索 ────────────────────────────────────────────────────────────────────
// URL 格式：/cn/search/{keyword}/update/{page}/
async function search(params = {}) {
    const kw = params.keyword || params.wd || '';
    const page = params.page || 1;
    if (!kw) throw new Error('关键词为空');

    const url = `${SITE}/cn/search/${encodeURIComponent(kw)}/update/${page}/`;
    console.log('[91jav] search:', url);
    const html = await httpGet(url);
    return parseList(html);
}
