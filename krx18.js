// KRX18 Forward Widget
// 站点：https://krx18.com/  （DooPlay 主题）
// 列表/搜索走站点 HTML；播放先走 DooPlay 线路，再解析 loadvid 的 HLS。

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SITE = 'https://krx18.com';

const GENRE_OPTIONS = [
    { title: '韩国', value: 'korea' },
    { title: '日本', value: 'japan' },
    { title: '中国', value: 'china' },
    { title: '台湾', value: 'taiwan' },
    { title: '菲律宾', value: 'philippines' },
    { title: '泰国', value: 'thailand' },
    { title: '美国', value: 'usa' },
    { title: '英文字幕', value: 'eng-sub' },
    { title: 'X Clip', value: 'xxx' },
    { title: '亚洲', value: 'asian' },
];

var WidgetMetadata = {
    id: "krx18.com",
    title: "KRX18",
    description: "KRX18 情色电影 / 韩日影片，支持分类、搜索与多线路播放",
    author: "loik160",
    site: SITE,
    version: "1.0.0",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        { title: "最新电影", functionName: "getMovies", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "韩国", functionName: "getKorea", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "日本", functionName: "getJapan", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "中国", functionName: "getChina", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "菲律宾", functionName: "getPhilippines", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "英文字幕", functionName: "getEngSub", params: [{ name: "page", title: "页码", type: "page" }] },
        { title: "X Clip", functionName: "getXxx", params: [{ name: "page", title: "页码", type: "page" }] },
        {
            title: "分类",
            functionName: "getGenre",
            params: [
                { name: "genre", title: "分类", type: "enumeration", enumOptions: GENRE_OPTIONS, value: "korea" },
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

function requestHeaders(referer) {
    return {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        'Referer': referer || SITE + '/',
    };
}

function absoluteUrl(url, base) {
    if (!url) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (/^https?:\/\//i.test(url)) return url;
    const root = base || SITE;
    return url.charAt(0) === '/' ? root + url : root + '/' + url;
}

function pageNum(params) {
    return parseInt((params && (params.page || params.offset)) || 1, 10) || 1;
}

function isChallenge(html) {
    return typeof html === 'string' && html.indexOf('Just a moment') !== -1 && html.length < 20000;
}

async function httpGetRaw(url, referer) {
    const response = await Widget.http.get(url, { headers: requestHeaders(referer) });
    if (!response || response.data == null) throw new Error('请求失败: ' + url);
    if (typeof response.data === 'string' && isChallenge(response.data)) {
        throw new Error('Cloudflare 验证拦截，请稍后重试');
    }
    return response.data;
}

async function httpGet(url, referer) {
    const data = await httpGetRaw(url, referer);
    return typeof data === 'string' ? data : String(data);
}

async function httpPostJson(url, body, referer, extraHeaders) {
    const headers = requestHeaders(referer);
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json, application/vnd.apple.mpegurl, */*';
    headers['Origin'] = (referer || url).split('/').slice(0, 3).join('/');
    if (extraHeaders) {
        for (const key in extraHeaders) headers[key] = extraHeaders[key];
    }
    const response = await Widget.http.post(url, JSON.stringify(body), { headers: headers });
    if (!response || response.data == null) throw new Error('POST 失败: ' + url);
    return response.data;
}

function decodeHtml(text) {
    return String(text || '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); })
        .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); })
        .trim();
}

function stripTags(html) {
    return decodeHtml(String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function movieSlug(url) {
    const match = String(url || '').match(/\/movies\/([^/?#]+)/i);
    return match ? match[1] : '';
}

function pushItem(items, seen, href, title, cover, extra) {
    const link = absoluteUrl(href);
    if (!link || link.indexOf('/movies/') === -1 || seen[link]) return;
    title = decodeHtml(title);
    if (!title) return;
    seen[link] = true;
    const item = {
        id: link,
        type: "url",
        mediaType: "movie",
        title: title,
        posterPath: absoluteUrl(cover),
        backdropPath: absoluteUrl(cover),
        link: link,
    };
    if (extra) {
        if (extra.year) item.releaseDate = String(extra.year);
        if (extra.rating) item.rating = extra.rating;
        if (extra.quality) item.description = extra.quality;
        if (extra.genres) item.genreItems = extra.genres;
    }
    items.push(item);
}

function parseListByCheerio(html) {
    if (!Widget.html || typeof Widget.html.load !== 'function') return [];
    const $ = Widget.html.load(html);
    const items = [];
    const seen = {};
    $('article.item, article.item.movies, .item.movies, .result-item').each(function (_, el) {
        const $el = $(el);
        const $a = $el.find('a[href*="/movies/"]').first();
        const href = $a.attr('href') || '';
        const $img = $el.find('img').first();
        const title = $el.find('h3 a, h3, .title, .data h3 a').first().text().trim()
            || $img.attr('alt')
            || $a.attr('title')
            || '';
        const cover = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || '';
        const year = $el.find('.data span, span').first().text().trim();
        const rating = $el.find('.rating').first().text().trim();
        const quality = $el.find('.quality').first().text().trim();
        pushItem(items, seen, href, title, cover, { year: year, rating: rating, quality: quality });
    });
    return items;
}

function parseListByRegex(html) {
    const items = [];
    const seen = {};
    const blockRe = /<article\b[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let block;
    while ((block = blockRe.exec(html)) !== null) {
        const chunk = block[1];
        const hrefMatch = chunk.match(/href="(https?:\/\/[^"]+\/movies\/[^"]+|\/movies\/[^"]+)"/i);
        if (!hrefMatch) continue;
        const imgMatch = chunk.match(/<img[^>]+(?:src|data-src|data-lazy)=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/i)
            || chunk.match(/<img[^>]+alt=["']([^"']*)["'][^>]+(?:src|data-src)=["']([^"']+)["']/i);
        let cover = '';
        let imgAlt = '';
        if (imgMatch) {
            if (imgMatch[1] && imgMatch[1].indexOf('http') === 0 || (imgMatch[1] && imgMatch[1].indexOf('/') === 0)) {
                cover = imgMatch[1];
                imgAlt = imgMatch[2] || '';
            } else {
                imgAlt = imgMatch[1] || '';
                cover = imgMatch[2] || '';
            }
        }
        const titleMatch = chunk.match(/<h3[^>]*>\s*(?:<a[^>]*>)?([\s\S]*?)<\/(?:a|h3)>/i);
        const title = stripTags(titleMatch ? titleMatch[1] : '') || decodeHtml(imgAlt);
        const yearMatch = chunk.match(/<span>(\d{4})<\/span>/);
        const ratingMatch = chunk.match(/class="rating">([^<]+)/);
        const qualityMatch = chunk.match(/class="quality">([^<]+)/);
        pushItem(items, seen, hrefMatch[1], title, cover, {
            year: yearMatch ? yearMatch[1] : '',
            rating: ratingMatch ? ratingMatch[1].trim() : '',
            quality: qualityMatch ? qualityMatch[1].trim() : '',
        });
    }
    return items;
}

function listScope(html) {
    const archive = String(html || '').match(/id=["']archive-content["'][^>]*>([\s\S]*?)(?:<div class=["']pagination|id=["']paginador|<\/main>|$)/i);
    if (archive && archive[1].indexOf('/movies/') !== -1) return archive[1];
    const grid = String(html || '').match(/class=["']items[^"']*(?:search-grid|normal)[^"']*["'][^>]*>([\s\S]*?)(?:<div class=["']pagination|id=["']paginador|$)/i);
    if (grid && grid[1].indexOf('/movies/') !== -1) return grid[1];
    return html;
}

function parseList(html) {
    const scoped = listScope(html);
    let items = [];
    try { items = parseListByCheerio(scoped); } catch (e) { items = []; }
    if (!items.length) items = parseListByRegex(scoped);
    console.log('[krx18] parseList:', items.length, 'items');
    return items;
}

function listUrl(kind, slug, page) {
    page = parseInt(page, 10) || 1;
    if (kind === 'search') {
        const q = encodeURIComponent(slug);
        return page > 1 ? SITE + '/page/' + page + '/?s=' + q : SITE + '/?s=' + q;
    }
    if (kind === 'movies') {
        return page > 1 ? SITE + '/movies/page/' + page + '/' : SITE + '/movies/';
    }
    if (kind === 'cast') {
        return page > 1 ? SITE + '/cast/' + slug + '/page/' + page + '/' : SITE + '/cast/' + slug + '/';
    }
    if (kind === 'director') {
        return page > 1 ? SITE + '/director/' + slug + '/page/' + page + '/' : SITE + '/director/' + slug + '/';
    }
    return page > 1
        ? SITE + '/genre/' + slug + '/page/' + page + '/'
        : SITE + '/genre/' + slug + '/';
}

async function fetchList(kind, slug, page) {
    const url = listUrl(kind, slug, page);
    console.log('[krx18] fetchList:', url);
    const html = await httpGet(url);
    const items = parseList(html);
    if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
    return items;
}

async function getMovies(params) {
    params = params || {};
    if (params.genreId) return fetchList('genre', params.genreId, pageNum(params));
    if (params.peopleId) return fetchList('cast', params.peopleId, pageNum(params));
    return fetchList('movies', '', pageNum(params));
}

async function getGenre(params) {
    params = params || {};
    const slug = params.genreId || params.genre || GENRE_OPTIONS[0].value;
    return fetchList('genre', slug, pageNum(params));
}

async function getKorea(params) { return fetchList('genre', 'korea', pageNum(params)); }
async function getJapan(params) { return fetchList('genre', 'japan', pageNum(params)); }
async function getChina(params) { return fetchList('genre', 'china', pageNum(params)); }
async function getPhilippines(params) { return fetchList('genre', 'philippines', pageNum(params)); }
async function getEngSub(params) { return fetchList('genre', 'eng-sub', pageNum(params)); }
async function getXxx(params) { return fetchList('genre', 'xxx', pageNum(params)); }

async function search(params) {
    params = params || {};
    const kw = String(params.keyword || params.wd || params.text || params.s || '').trim();
    if (!kw) throw new Error('关键词为空');
    return fetchList('search', kw, pageNum(params));
}

function extractPostId(html, link) {
    const opt = html.match(/data-post=['"](\d+)['"]/i);
    if (opt) return opt[1];
    const body = html.match(/postid-(\d+)/i);
    if (body) return body[1];
    const slug = movieSlug(link);
    const guid = html.match(new RegExp('p=(\\d+)[^>]*>' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    return guid ? guid[1] : '';
}

function extractPlayerOptions(html) {
    const options = [];
    const re = /<li[^>]*class=['"][^'"]*dooplay_player_option[^'"]*['"][^>]*data-type=['"]([^'"]+)['"][^>]*data-post=['"](\d+)['"][^>]*data-nume=['"](\d+)['"][^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = re.exec(html)) !== null) {
        const label = stripTags((match[4].match(/class=['"]title['"][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || '');
        const server = stripTags((match[4].match(/class=['"]server['"][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || '');
        options.push({
            type: match[1],
            post: match[2],
            nume: match[3],
            name: label || ('Server ' + match[3]),
            server: server,
        });
    }
    if (!options.length) {
        const loose = /data-type=['"]([^'"]+)['"][^>]*data-post=['"](\d+)['"][^>]*data-nume=['"](\d+)['"]/gi;
        let m;
        while ((m = loose.exec(html)) !== null) {
            options.push({ type: m[1], post: m[2], nume: m[3], name: 'Server ' + m[3], server: '' });
        }
    }
    return options;
}

function parseJsonSafe(raw) {
    if (raw == null) return null;
    if (typeof raw === 'object') return raw;
    const text = String(raw).trim();
    try { return JSON.parse(text); } catch (e) {}
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch (e2) {}
    }
    return null;
}

async function fetchEmbed(option) {
    const url = SITE + '/wp-json/dooplayer/v2/' + option.post + '/' + option.type + '/' + option.nume;
    console.log('[krx18] dooplayer:', url);
    const raw = await httpGetRaw(url, SITE + '/');
    const data = parseJsonSafe(raw);
    const embed = data && (data.embed_url || data.embed || data.source || data.url);
    if (!embed) throw new Error('线路 ' + option.name + ' 无播放地址');
    return {
        name: option.server ? (option.name + ' ' + option.server) : option.name,
        embed: embed,
        server: option.server || '',
    };
}

function pickCsrf(html) {
    const m = String(html || '').match(/name=["']csrf-token["'][^>]*content=["']([^"']+)/i)
        || String(html || '').match(/content=["']([^"']+)["'][^>]*name=["']csrf-token["']/i);
    return m ? m[1] : '';
}

function pickLoadvidConfig(html) {
    const hash = (String(html || '').match(/videoHash:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    const token = (String(html || '').match(/videoToken:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    return { hash: hash, token: token };
}

async function resolveLoadvidPlaylist(embedUrl) {
    const html = await httpGet(embedUrl, SITE + '/');
    const cfg = pickLoadvidConfig(html);
    if (!cfg.hash || !cfg.token) throw new Error('loadvid 页面缺少 token');
    const origin = embedUrl.split('/').slice(0, 3).join('/');
    const raw = await httpPostJson(origin + '/videos/resolve-token', {
        token: cfg.token,
        hash: cfg.hash,
    }, embedUrl, {
        'X-CSRF-TOKEN': pickCsrf(html),
        'Accept': 'application/vnd.apple.mpegurl,*/*',
    });
    const text = typeof raw === 'string' ? raw : String(raw || '');
    if (text.indexOf('#EXTM3U') === -1) throw new Error('loadvid 未返回 m3u8');
    const firstSeg = (text.match(/https?:\/\/[^\s]+\.(?:png|ts|m4s|jpg)[^\s]*/i) || [])[0] || '';
    return { playlist: text, firstSeg: firstSeg, hash: cfg.hash };
}

function looksLikeMedia(url) {
    return /\.(m3u8|mp4)(\?|$)/i.test(url || '');
}

function resourceOf(name, url, referer) {
    return {
        name: name || '播放',
        url: url,
        customHeaders: requestHeaders(referer || SITE + '/'),
        playerType: looksLikeMedia(url) ? 'system' : 'app',
    };
}

async function collectResources(link) {
    if (!link) throw new Error('播放地址为空');
    if (looksLikeMedia(link)) return [resourceOf('播放', link, SITE + '/')];

    const html = await httpGet(link);
    const options = extractPlayerOptions(html);
    if (!options.length) throw new Error('未找到播放线路，页面结构可能已更新');

    const resources = [];
    const seen = {};
    for (let i = 0; i < options.length; i++) {
        try {
            const embed = await fetchEmbed(options[i]);
            if (!embed.embed || seen[embed.embed]) continue;
            seen[embed.embed] = true;

            if (/loadvid\.com/i.test(embed.embed)) {
                try {
                    await resolveLoadvidPlaylist(embed.embed);
                    resources.unshift(resourceOf(embed.name, embed.embed, embed.embed));
                    continue;
                } catch (err) {
                    console.log('[krx18] loadvid resolve skip:', err.message || err);
                }
            }

            resources.push(resourceOf(embed.name, embed.embed, link));
        } catch (err) {
            console.log('[krx18] embed skip:', options[i].name, err.message || err);
        }
    }
    if (!resources.length) throw new Error('所有播放线路均失败');
    return resources;
}

function parseDetailMeta(html, link) {
    const afterSimilar = String(html || '').split(/Similar titles/i)[1] || html;
    const scope = afterSimilar.split(/Video Sources/i)[0] || afterSimilar;
    const title = stripTags((scope.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '')
        || stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '')
        || stripTags((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').split('|')[0];
    const poster = ((html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1])
        || ((scope.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*alt=["'][^"']*["']/i) || [])[1])
        || '';
    const desc = stripTags((html.match(/property=["']og:description["'][^>]+content=["']([^"']+)/i) || [])[1] || '')
        || stripTags((scope.match(/<div[^>]+class="[^"]*wp-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || '');
    const year = ((scope.match(/>(\d{4})</) || [])[1]) || '';

    const genreItems = [];
    const genreRe = /href="https?:\/\/krx18\.com\/genre\/([^/"]+)\/"[^>]*>([\s\S]*?)<\/a>/gi;
    let gm;
    const genreSeen = {};
    while ((gm = genreRe.exec(scope)) !== null) {
        const id = gm[1];
        const name = stripTags(gm[2]);
        if (!id || !name || genreSeen[id] || name.length > 40) continue;
        genreSeen[id] = true;
        genreItems.push({ id: id, title: name });
    }

    const peoples = [];
    const peopleRe = /href="https?:\/\/krx18\.com\/(cast|director)\/([^/"]+)\/"[\s\S]{0,200}?(?:title=["']([^"']+)["']|>([\s\S]*?)<\/a>)/gi;
    let pm;
    const peopleSeen = {};
    while ((pm = peopleRe.exec(html)) !== null) {
        const id = pm[2];
        const name = decodeHtml(pm[3] || stripTags(pm[4] || ''));
        if (!id || !name || peopleSeen[id] || name.length > 60) continue;
        peopleSeen[id] = true;
        peoples.push({ id: id, title: name, role: pm[1] === 'director' ? '导演' : '演员' });
    }

    const relatedItems = [];
    const relRe = /href="(https?:\/\/krx18\.com\/movies\/[^"]+)"[\s\S]{0,240}?<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
    let rm;
    const relSeen = {};
    relSeen[absoluteUrl(link)] = true;
    while ((rm = relRe.exec(html)) !== null) {
        pushItem(relatedItems, relSeen, rm[1], rm[3] || movieSlug(rm[1]), rm[2]);
        if (relatedItems.length >= 12) break;
    }

    return {
        title: title,
        poster: poster,
        desc: desc,
        year: year,
        genreItems: genreItems,
        peoples: peoples,
        relatedItems: relatedItems,
    };
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[krx18] loadDetail:', link);

    const html = await httpGet(link);
    const meta = parseDetailMeta(html, link);
    const resources = await collectResources(link);
    const playable = resources[0];

    return {
        id: link,
        type: "url",
        mediaType: "movie",
        title: meta.title,
        posterPath: meta.poster,
        backdropPath: meta.poster,
        description: meta.desc,
        releaseDate: meta.year,
        genreItems: meta.genreItems,
        peoples: meta.peoples,
        relatedItems: meta.relatedItems,
        link: link,
        videoUrl: playable.url,
        customHeaders: playable.customHeaders,
        playerType: playable.playerType,
    };
}

async function loadResource(params) {
    params = params || {};
    const raw = params.link || params.videoUrl || params.url || params.id;
    if (!raw) throw new Error('播放地址为空');
    return collectResources(raw);
}
