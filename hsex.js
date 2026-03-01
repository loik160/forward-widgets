// hsex.men (好色TV) Forward Widget

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const SITE = "https://hsex.men";
const VIDEO_PATH_RE = /video-(\d+)\.htm/i;
const IMG_ATTRS = ["src", "data-src", "data-lazy", "data-original", "data-url"];
const MAX_REDIRECTS = 5;

var WidgetMetadata = {
    id: "hsex.men",
    title: "好色TV",
    description: "好色TV - 华语区业余自拍偷拍原创成人视频社区",
    author: "hsex.men",
    site: SITE,
    version: "1.4.2",
    requiredVersion: "0.0.1",
    detailCacheDuration: 60,
    modules: [
        {
            title: "搜索",
            functionName: "search",
            params: [
                { name: "keyword", title: "关键词", type: "input" },
                { name: "page", title: "页码", type: "page" },
            ],
        },
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

function normalizePage(page) {
    const n = parseInt(page, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

function isCloudflareBlocked(html) {
    if (!html || typeof html !== "string") return false;
    if (html.length > 10000) return false;
    return html.includes("challenge-platform") || html.includes("__cf_chl") || html.includes("cf-browser-verification");
}

function toAbsoluteUrl(raw) {
    if (!raw) return "";
    const url = String(raw).trim();
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return SITE + url;
    return SITE + "/" + url;
}

function getNormalizedVideoUrl(rawHref) {
    const href = String(rawHref || "").trim();
    if (!href) return "";
    const matched = href.match(VIDEO_PATH_RE);
    if (!matched) return "";
    return `${SITE}/video-${matched[1]}.htm`;
}

function cleanMediaUrl(url) {
    let out = String(url || "").trim();
    if (!out) return "";
    out = out.replace(/\\\//g, "/");
    out = out.replace(/&amp;/g, "&");
    out = toAbsoluteUrl(out);
    return out;
}

function resolveUrl(base, target) {
    try {
        return new URL(target, base).toString();
    } catch (_) {
        return toAbsoluteUrl(target);
    }
}

async function httpGet(url, referer, redirectCount) {
    const count = redirectCount || 0;
    const response = await Widget.http.get(url, {
        headers: {
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": referer || SITE + "/",
        },
    });

    if (!response || !response.data) {
        const status = response && typeof response.status !== "undefined" ? response.status : 0;
        if ([301, 302, 303, 307, 308].includes(status) && response.headers && response.headers.location) {
            if (count >= MAX_REDIRECTS) {
                throw new Error("重定向次数过多: " + url);
            }
            const next = resolveUrl(url, response.headers.location);
            return httpGet(next, referer, count + 1);
        }
        throw new Error("请求失败: " + url);
    }

    const statusCode = response.status;
    if ([301, 302, 303, 307, 308].includes(statusCode) && response.headers && response.headers.location) {
        if (count >= MAX_REDIRECTS) {
            throw new Error("重定向次数过多: " + url);
        }
        const next = resolveUrl(url, response.headers.location);
        return httpGet(next, referer, count + 1);
    }

    if (isCloudflareBlocked(response.data)) {
        throw new Error("Cloudflare 验证拦截，请稍后重试");
    }

    return response.data;
}

function pickCoverFromNode($scope) {
    if (!$scope || !$scope.length) return "";

    const $img = $scope.find("img").first();
    if ($img.length) {
        for (let i = 0; i < IMG_ATTRS.length; i++) {
            const val = $img.attr(IMG_ATTRS[i]);
            if (val && !String(val).startsWith("data:")) {
                return toAbsoluteUrl(val);
            }
        }

        const srcset = $img.attr("srcset");
        if (srcset) {
            const first = srcset.split(",")[0].trim().split(" ")[0];
            if (first) return toAbsoluteUrl(first);
        }
    }

    const $bg = $scope.find('[style*="background"]').first();
    if ($bg.length) {
        const style = $bg.attr("style") || "";
        const m = style.match(/url\(['"]?([^'")\s]+)['"]?\)/i);
        if (m && m[1]) return toAbsoluteUrl(m[1]);
    }

    return "";
}

function pickTitle($container, $anchor) {
    if ($container && $container.length) {
        const h5Text = $container.find("h5 a").first().text().trim();
        if (h5Text) return h5Text;

        const imgAlt = $container.find("img").first().attr("alt") || "";
        if (imgAlt.trim()) return imgAlt.trim();
    }

    const aText = ($anchor && $anchor.text && $anchor.text()) ? $anchor.text().trim() : "";
    if (aText) return aText;

    return "";
}

function isInvalidTitle(title) {
    const t = String(title || "").trim();
    if (!t) return true;
    if (/^(HD|SD|FHD|4K)$/i.test(t)) return true;
    if (/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*(HD|SD|FHD|4K))?$/i.test(t)) return true;
    if (/^\d+\s*(次播放|views?)$/i.test(t)) return true;
    return false;
}

function buildVideoItem(vodUrl, title, cover) {
    return {
        id: vodUrl,
        type: "url",
        mediaType: "movie",
        title: String(title || "").trim(),
        posterPath: toAbsoluteUrl(cover || ""),
        link: vodUrl,
    };
}

function getVideoIds(items) {
    return (items || []).map(it => it && it.id).filter(Boolean);
}

function isSamePageResult(currentItems, firstPageItems) {
    const a = getVideoIds(currentItems);
    const b = getVideoIds(firstPageItems);
    if (!a.length || !b.length) return false;
    const n = Math.min(a.length, b.length, 8);
    for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function extractSearchPaginationUrls(html, page, keyword, encodedKeyword) {
    const urls = [];
    const seen = new Set();
    const targetFrom = (page - 1) * 20;
    const hrefRe = /href=["']([^"']+)["']/ig;
    let m;

    while ((m = hrefRe.exec(html)) !== null) {
        const href = String(m[1] || "").replace(/&amp;/g, "&").trim();
        if (!href || !/search/i.test(href)) continue;

        const full = resolveUrl(SITE + "/", href);
        const inKeywordScope = full.includes(encodedKeyword) || full.includes(keyword);
        if (!inKeywordScope) continue;

        const isTargetPage =
            full.includes(`page=${page}`) ||
            full.includes(`p=${page}`) ||
            full.includes(`pageindex=${page}`) ||
            full.includes(`from=${targetFrom}`) ||
            new RegExp(`(?:-|/)${page}(?:\\.htm|/|$)`).test(full);

        if (!isTargetPage) continue;
        if (seen.has(full)) continue;

        seen.add(full);
        urls.push(full);
    }

    return urls;
}

function parseList(html) {
    const $ = Widget.html.load(html);
    const items = [];
    const seen = new Set();

    $("h5 a[href*='video-'], .caption a[href*='video-']").each((_, el) => {
        const $a = $(el);
        const vodUrl = getNormalizedVideoUrl($a.attr("href") || "");
        if (!vodUrl || seen.has(vodUrl)) return;

        const $container = $a.closest(".thumbnail, .item, .video-item, .col-xs-6, .col-sm-4, .col-md-3, li");
        const title = $a.text().trim();
        if (isInvalidTitle(title)) return;

        const cover = pickCoverFromNode($container.length ? $container : $a);
        seen.add(vodUrl);
        items.push(buildVideoItem(vodUrl, title, cover));
    });

    $("a[href*='video-']").each((_, el) => {
        const $a = $(el);
        const rawHref = $a.attr("href") || "";
        const vodUrl = getNormalizedVideoUrl(rawHref);
        if (!vodUrl || seen.has(vodUrl)) return;

        const $container = $a.closest(".thumbnail, .item, .video-item, .col-xs-6, .col-sm-4, .col-md-3, li");
        const title = pickTitle($container, $a);
        if (isInvalidTitle(title)) return;

        const cover = pickCoverFromNode($container.length ? $container : $a);

        seen.add(vodUrl);
        items.push(buildVideoItem(vodUrl, title, cover));
    });

    if (items.length === 0) {
        console.log("[hsex] selector 策略未命中，启用正则兜底");
        const hrefRe = /href=["']([^"']*video-(\d+)\.htm[^"']*)["']/ig;
        let m;
        while ((m = hrefRe.exec(html)) !== null) {
            const vodUrl = `${SITE}/video-${m[2]}.htm`;
            if (seen.has(vodUrl)) continue;

            const chunk = html.slice(Math.max(0, m.index - 800), Math.min(html.length, m.index + 1200));
            const titleM = chunk.match(/<h5[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) || chunk.match(/alt=["']([^"']+)["']/i);
            const title = titleM ? String(titleM[1] || "").trim() : "";
            if (isInvalidTitle(title)) continue;

            const imgM = chunk.match(/<img[^>]+(?:src|data-src|data-lazy|data-original|data-url)=["']([^"']+)["']/i);
            const cover = imgM ? toAbsoluteUrl(imgM[1]) : "";

            seen.add(vodUrl);
            items.push(buildVideoItem(vodUrl, title, cover));
        }
    }

    console.log("[hsex] parseList:", items.length, "items");
    return items;
}

async function fetchCategory(prefix, page) {
    const currentPage = normalizePage(page);
    const url = `${SITE}/${prefix}-${currentPage}.htm`;
    console.log("[hsex] fetchCategory:", url);

    const html = await httpGet(url);
    const items = parseList(html);

    if (!items.length && currentPage === 1) {
        throw new Error("视频列表为空，网站结构可能已更新");
    }

    return items;
}

async function getVideoList(p) { return fetchCategory("list", (p || {}).page); }
async function getWeeklyTop(p) { return fetchCategory("top7_list", (p || {}).page); }
async function getMonthlyTop(p) { return fetchCategory("top_list", (p || {}).page); }
async function get5Min(p) { return fetchCategory("5min_list", (p || {}).page); }
async function get10Min(p) { return fetchCategory("long_list", (p || {}).page); }

function mediaScore(url) {
    let score = 0;
    if (/\.mp4(\?|$)/i.test(url)) score += 120;
    if (/\.m3u8(\?|$)/i.test(url)) score += 100;
    if (/(master|index|playlist|stream|play|source)/i.test(url)) score += 20;
    if (/(audio|aac|stereo)/i.test(url)) score += 15;
    if (/(preview|poster|thumb|sample|trailer|mute|silent|cover)/i.test(url)) score -= 90;
    return score;
}

function extractPlayableUrl(html) {
    const candidates = [];
    const seen = new Set();
    const rules = [
        /<source[^>]+src=["']([^"']+)["']/ig,
        /<video[^>]+src=["']([^"']+)["']/ig,
        /(?:url|file|video_url|playUrl|videoUrl|source)\s*[:=]\s*["']([^"']+)["']/ig,
        /["']((?:https?:)?\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)["']/ig,
        /["'](\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)["']/ig,
        /data-(?:url|src|file)\s*=\s*["']([^"']+)["']/ig,
    ];

    for (let i = 0; i < rules.length; i++) {
        const re = rules[i];
        let m;
        while ((m = re.exec(html)) !== null) {
            const cleaned = cleanMediaUrl(m[1]);
            if (!cleaned || !/\.(m3u8|mp4)(\?|$)/i.test(cleaned)) continue;
            if (seen.has(cleaned)) continue;
            seen.add(cleaned);
            candidates.push(cleaned);
        }
    }

    if (!candidates.length) return "";
    candidates.sort((a, b) => mediaScore(b) - mediaScore(a));
    return candidates[0];
}

async function loadDetail(link) {
    if (!link) throw new Error("link 不能为空");
    console.log("[hsex] loadDetail:", link);

    const html = await httpGet(link, link);
    const videoUrl = extractPlayableUrl(html);

    if (!videoUrl) {
        throw new Error("未找到视频播放 URL，页面结构可能已变化");
    }

    console.log("[hsex] videoUrl:", videoUrl);
    return {
        id: videoUrl,
        type: "url",
        videoUrl: videoUrl,
        mediaType: "movie",
        customHeaders: {
            "User-Agent": UA,
            "Referer": SITE + "/",
        },
    };
}

async function search(params) {
    const payload = params || {};
    const kw = String(payload.keyword || payload.wd || "").trim();
    const page = normalizePage(payload.page);

    if (!kw) {
        throw new Error("请输入关键词");
    }

    const encoded = encodeURIComponent(kw);
    const queryBase = `${SITE}/search.htm?search=${encoded}&sort=new`;
    console.log("[hsex] search:", queryBase);
    const firstHtml = await httpGet(queryBase, SITE + "/");
    const firstItems = parseList(firstHtml);

    let items = firstItems;
    if (page > 1) {
        const from = (page - 1) * 20;
        const discovered = extractSearchPaginationUrls(firstHtml, page, kw, encoded);
        const candidateUrls = [
            ...discovered,
            `${queryBase}&page=${page}`,
            `${queryBase}&p=${page}`,
            `${queryBase}&pageindex=${page}`,
            `${queryBase}&from=${from}`,
            `${SITE}/search-${kw}-${page}.htm`,
            `${SITE}/search-${encoded}-${page}.htm`,
            `${SITE}/search/${kw}/${page}.htm`,
            `${SITE}/search/${encoded}/${page}.htm`,
            `${SITE}/search/${kw}.htm?page=${page}`,
        ];

        const unique = [];
        const seen = new Set();
        for (let i = 0; i < candidateUrls.length; i++) {
            const u = String(candidateUrls[i] || "").trim();
            if (!u || seen.has(u)) continue;
            seen.add(u);
            unique.push(u);
        }

        let loaded = false;
        for (let i = 0; i < unique.length; i++) {
            const url = unique[i];
            console.log("[hsex] search page:", url);
            try {
                const html = await httpGet(url, queryBase);
                const parsed = parseList(html);
                if (!parsed.length) continue;
                if (isSamePageResult(parsed, firstItems)) continue;
                items = parsed;
                loaded = true;
                break;
            } catch (_) {
            }
        }

        if (!loaded) {
            throw new Error(`搜索第 ${page} 页加载失败（站点分页规则可能已变化）`);
        }
    }

    if (!items.length && page === 1) {
        throw new Error(`"${kw}" 暂无相关视频`);
    }

    return items;
}
