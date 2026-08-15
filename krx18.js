// KRX18 Forward Widget
// 站点：https://krx18.com/  （DooPlay 主题）
// 列表/搜索走站点 HTML；播放解析 playkrx18 / loadvid 直链，不再把网页地址交给播放器。

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
    version: "1.2.0",
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
    if (typeof html !== 'string') return false;
    return (html.indexOf('Just a moment') !== -1 || html.indexOf('challenge-platform') !== -1 || html.indexOf('cf-mitigated') !== -1)
        && html.length < 20000;
}

function sleep(ms) {
    return new Promise(function (resolve) {
        if (typeof setTimeout === 'function') setTimeout(resolve, ms);
        else resolve();
    });
}

function isTransientError(err) {
    const msg = String(err && err.message ? err.message : err || '');
    return /Cloudflare|超时|timeout|失败|ECONN|ENOTFOUND|429|502|503|520|521|522|524/i.test(msg);
}

async function withRetry(fn, times) {
    times = times || 3;
    let last = null;
    for (let i = 0; i < times; i++) {
        try {
            return await fn();
        } catch (err) {
            last = err;
            console.log('[krx18] retry', i + 1, '/', times, err.message || err);
            if (i < times - 1 && isTransientError(err)) await sleep(250 * (i + 1));
            else if (i < times - 1) await sleep(150);
        }
    }
    throw last;
}

async function httpGetRaw(url, referer) {
    return withRetry(async function () {
        const response = await Widget.http.get(url, { headers: requestHeaders(referer) });
        if (!response || response.data == null) throw new Error('请求失败: ' + url);
        if (typeof response.data === 'string' && isChallenge(response.data)) {
            throw new Error('Cloudflare 验证拦截，请稍后重试');
        }
        return response.data;
    });
}

async function httpGet(url, referer) {
    const data = await httpGetRaw(url, referer);
    return typeof data === 'string' ? data : String(data);
}

async function httpPostForm(url, body, referer) {
    return withRetry(async function () {
        const headers = requestHeaders(referer);
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        headers['Accept'] = 'application/json, text/javascript, */*; q=0.01';
        headers['X-Requested-With'] = 'XMLHttpRequest';
        headers['Origin'] = (referer || url).split('/').slice(0, 3).join('/');
        const response = await Widget.http.post(url, body, { headers: headers });
        if (!response || response.data == null) throw new Error('POST 失败: ' + url);
        return response.data;
    }, 2);
}

async function httpPostJson(url, body, referer, extraHeaders) {
    return withRetry(async function () {
        const headers = requestHeaders(referer);
        headers['Content-Type'] = 'application/json';
        headers['Accept'] = 'application/json, application/vnd.apple.mpegurl, */*';
        headers['Origin'] = (referer || url).split('/').slice(0, 3).join('/');
        if (extraHeaders) {
            for (const key in extraHeaders) headers[key] = extraHeaders[key];
        }
        const response = await Widget.http.post(url, JSON.stringify(body), { headers: headers });
        if (!response || response.data == null) throw new Error('POST 失败: ' + url);
        if (typeof response.data === 'string' && isChallenge(response.data)) {
            throw new Error('Cloudflare 验证拦截，请稍后重试');
        }
        return response.data;
    }, 2);
}

const PLAY_FILE_KEY = 'jcLycoRJT6OWjoWspgLMOZwS3aSS0lEn';
const PLAY_USER_KEY = 'PZZ3J3LDbLT0GY7qSA5wW5vchqgpO36O';
const PLAY_REQ_KEY = 'vlVbUQhkOhoSfyteyzGeeDzU0BHoeTyZ';
const PLAY_API_FALLBACK = 'https://api-play-240924.playkrx18.site/api/tp1rd';

function md5(bytes) {
    if (typeof bytes === 'string') bytes = utf8Encode(bytes);
    const x = [];
    for (let i = 0; i < bytes.length; i++) x[i >> 2] |= bytes[i] << ((i % 4) << 3);
    const len = bytes.length * 8;
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    const add = function (x, y) { const lsw = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff); };
    const rol = function (n, c) { return (n << c) | (n >>> (32 - c)); };
    const cmn = function (q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b); };
    const ff = function (a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); };
    const gg = function (a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); };
    const hh = function (a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); };
    const ii = function (a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); };
    for (let i = 0; i < x.length; i += 16) {
        const oa = a, ob = b, oc = c, od = d;
        a = ff(a, b, c, d, x[i + 0], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586); c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426); c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417); c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101); c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632); c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i + 0], 20, -373897302);
        a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083); c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690); c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784); c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463); c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353); c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i + 0], 11, -358537222); c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835); c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = ii(a, b, c, d, x[i + 0], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415); c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606); c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744); c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379); c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od);
    }
    const out = [];
    [a, b, c, d].forEach(function (n) { for (let i = 0; i < 4; i++) out.push((n >>> (i * 8)) & 255); });
    return out;
}
function md5hex(data) {
    return md5(data).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function utf8Encode(str) {
    const s = unescape(encodeURIComponent(String(str)));
    const out = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 255);
    return out;
}
function utf8Decode(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64enc(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
        out += B64[a >> 2];
        out += B64[((a & 3) << 4) | ((b || 0) >> 4)];
        out += i + 1 < bytes.length ? B64[((b & 15) << 2) | ((c || 0) >> 6)] : '=';
        out += i + 2 < bytes.length ? B64[c & 63] : '=';
    }
    return out;
}
function b64dec(str) {
    str = String(str || '').replace(/[^A-Za-z0-9+/=]/g, '');
    const out = [];
    for (let i = 0; i < str.length; i += 4) {
        const a = B64.indexOf(str[i]), b = B64.indexOf(str[i + 1]);
        const c = B64.indexOf(str[i + 2]), d = B64.indexOf(str[i + 3]);
        out.push(((a << 2) | (b >> 4)) & 255);
        if (str[i + 2] !== '=') out.push((((b & 15) << 4) | (c >> 2)) & 255);
        if (str[i + 3] !== '=') out.push((((c & 3) << 6) | d) & 255);
    }
    return out;
}
function hexToBytes(hex) {
    const s = String(hex || '').replace(/[^0-9a-f]/gi, '');
    const out = [];
    for (let i = 0; i < s.length; i += 2) out.push(parseInt(s.substr(i, 2), 16));
    return out;
}
function evpKDF(password, salt, keyLen, ivLen) {
    const pass = typeof password === 'string' ? utf8Encode(password) : password;
    let derived = [], block = [];
    while (derived.length < keyLen + ivLen) {
        block = md5(block.concat(pass, salt));
        derived = derived.concat(block);
    }
    return { key: derived.slice(0, keyLen), iv: derived.slice(keyLen, keyLen + ivLen) };
}
const SBOX = [99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];
const INV_SBOX = [];
for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
function xtime(a) { a &= 255; return ((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 255; }
function mul(a, b) { let p = 0; for (let i = 0; i < 8; i++) { if (b & 1) p ^= a; const hi = a & 0x80; a = (a << 1) & 255; if (hi) a ^= 0x1b; b >>= 1; } return p & 255; }
function subWord(w) { return [SBOX[w[0]], SBOX[w[1]], SBOX[w[2]], SBOX[w[3]]]; }
function rotWord(w) { return [w[1], w[2], w[3], w[0]]; }
function xorW(a, b) { return [a[0] ^ b[0], a[1] ^ b[1], a[2] ^ b[2], a[3] ^ b[3]]; }
function expandKey(key) {
    const Nk = key.length / 4, Nr = Nk + 6, w = [];
    for (let i = 0; i < Nk; i++) w[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
    for (let i = Nk; i < 4 * (Nr + 1); i++) {
        let temp = w[i - 1].slice();
        if (i % Nk === 0) temp = xorW(subWord(rotWord(temp)), [RCON[i / Nk], 0, 0, 0]);
        else if (Nk > 6 && i % Nk === 4) temp = subWord(temp);
        w[i] = xorW(w[i - Nk], temp);
    }
    return { w: w, Nr: Nr };
}
function addRoundKey(s, w, rnd) { for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[r][c] ^= w[rnd * 4 + c][r]; }
function subBytes(s, inv) { const box = inv ? INV_SBOX : SBOX; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s[r][c] = box[s[r][c]]; }
function shiftRows(s, inv) { for (let r = 1; r < 4; r++) { const row = s[r].slice(); for (let c = 0; c < 4; c++) s[r][c] = inv ? row[(c - r + 4) % 4] : row[(c + r) % 4]; } }
function mixColumns(s, inv) {
    for (let c = 0; c < 4; c++) {
        const a = [s[0][c], s[1][c], s[2][c], s[3][c]];
        if (!inv) {
            s[0][c] = xtime(a[0]) ^ xtime(a[1]) ^ a[1] ^ a[2] ^ a[3];
            s[1][c] = a[0] ^ xtime(a[1]) ^ xtime(a[2]) ^ a[2] ^ a[3];
            s[2][c] = a[0] ^ a[1] ^ xtime(a[2]) ^ xtime(a[3]) ^ a[3];
            s[3][c] = xtime(a[0]) ^ a[0] ^ a[1] ^ a[2] ^ xtime(a[3]);
        } else {
            s[0][c] = mul(a[0], 14) ^ mul(a[1], 11) ^ mul(a[2], 13) ^ mul(a[3], 9);
            s[1][c] = mul(a[0], 9) ^ mul(a[1], 14) ^ mul(a[2], 11) ^ mul(a[3], 13);
            s[2][c] = mul(a[0], 13) ^ mul(a[1], 9) ^ mul(a[2], 14) ^ mul(a[3], 11);
            s[3][c] = mul(a[0], 11) ^ mul(a[1], 13) ^ mul(a[2], 9) ^ mul(a[3], 14);
        }
    }
}
function aesBlock(input, exp, inv) {
    const s = [[], [], [], []];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[r][c] = input[c * 4 + r];
    if (!inv) {
        addRoundKey(s, exp.w, 0);
        for (let rnd = 1; rnd < exp.Nr; rnd++) { subBytes(s, false); shiftRows(s, false); mixColumns(s, false); addRoundKey(s, exp.w, rnd); }
        subBytes(s, false); shiftRows(s, false); addRoundKey(s, exp.w, exp.Nr);
    } else {
        addRoundKey(s, exp.w, exp.Nr);
        for (let rnd = exp.Nr - 1; rnd > 0; rnd--) { shiftRows(s, true); subBytes(s, true); addRoundKey(s, exp.w, rnd); mixColumns(s, true); }
        shiftRows(s, true); subBytes(s, true); addRoundKey(s, exp.w, 0);
    }
    const out = [];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out.push(s[r][c]);
    return out;
}
function xorBlock(a, b) { return a.map(function (v, i) { return v ^ b[i]; }); }
function pkcs7pad(data) { const n = 16 - (data.length % 16); const out = data.slice(); for (let i = 0; i < n; i++) out.push(n); return out; }
function pkcs7unpad(data) { if (!data.length) return data; const n = data[data.length - 1]; if (n < 1 || n > 16 || n > data.length) return data; return data.slice(0, data.length - n); }
function aesCbcEncrypt(plain, key, iv) {
    const exp = expandKey(key), padded = pkcs7pad(plain), out = [];
    let prev = iv.slice();
    for (let i = 0; i < padded.length; i += 16) {
        const blk = xorBlock(padded.slice(i, i + 16), prev);
        prev = aesBlock(blk, exp, false);
        for (let j = 0; j < 16; j++) out.push(prev[j]);
    }
    return out;
}
function aesCbcDecrypt(cipher, key, iv) {
    const exp = expandKey(key), out = [];
    let prev = iv.slice();
    for (let i = 0; i < cipher.length; i += 16) {
        const blk = cipher.slice(i, i + 16);
        const plain = xorBlock(aesBlock(blk, exp, true), prev);
        prev = blk;
        for (let j = 0; j < 16; j++) out.push(plain[j]);
    }
    return pkcs7unpad(out);
}
function cryptoJsDecrypt(input, pass) {
    const s = String(input || '').trim();
    const raw = (/^[0-9a-f]+$/i.test(s) && s.indexOf('53616c7465645f5f') === 0) ? hexToBytes(s) : b64dec(s);
    if (raw.length < 16) throw new Error('cipher too short');
    const kv = evpKDF(pass, raw.slice(8, 16), 32, 16);
    return utf8Decode(aesCbcDecrypt(raw.slice(16), kv.key, kv.iv));
}
function cryptoJsEncrypt(plain, pass) {
    const salt = [];
    for (let i = 0; i < 8; i++) salt.push(Math.floor(Math.random() * 256));
    const kv = evpKDF(pass, salt, 32, 16);
    const ct = aesCbcEncrypt(utf8Encode(plain), kv.key, kv.iv);
    return b64enc(utf8Encode('Salted__').concat(salt, ct));
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
    return withRetry(async function () {
        const html = await httpGet(url);
        const items = parseList(html);
        if (!items.length) throw new Error('视频列表为空，网站结构可能已更新');
        return items;
    }, 2);
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
    const seen = {};
    const re = /<li([^>]*class=['"][^'"]*dooplay_player_option[^'"]*['"][^>]*)>([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = re.exec(html)) !== null) {
        const attrs = match[1] + ' ' + match[2];
        const type = ((attrs.match(/data-type=['"]([^'"]+)['"]/i) || [])[1] || 'movie');
        const post = ((attrs.match(/data-post=['"](\d+)['"]/i) || [])[1] || '');
        const nume = ((attrs.match(/data-nume=['"](\d+)['"]/i) || [])[1] || '');
        if (!post || !nume) continue;
        const key = type + ':' + post + ':' + nume;
        if (seen[key]) continue;
        seen[key] = true;
        options.push({
            type: type,
            post: post,
            nume: nume,
            name: stripTags((match[2].match(/class=['"]title['"][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || '') || ('Server ' + nume),
            server: stripTags((match[2].match(/class=['"]server['"][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || ''),
        });
    }
    if (!options.length) {
        const loose = /data-post=['"](\d+)['"][^>]*data-nume=['"](\d+)['"][^>]*data-type=['"]([^'"]+)['"]|data-type=['"]([^'"]+)['"][^>]*data-post=['"](\d+)['"][^>]*data-nume=['"](\d+)['"]/gi;
        let m;
        while ((m = loose.exec(html)) !== null) {
            const type = m[3] || m[4] || 'movie';
            const post = m[1] || m[5];
            const nume = m[2] || m[6];
            const key = type + ':' + post + ':' + nume;
            if (!post || !nume || seen[key]) continue;
            seen[key] = true;
            options.push({ type: type, post: post, nume: nume, name: 'Server ' + nume, server: '' });
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

function looksLikeMedia(url) {
    const s = String(url || '');
    return /\.(m3u8|mp4)(\?|$)/i.test(s) || /^data:application\/vnd\.apple\.mpegurl/i.test(s);
}

function cleanMediaUrl(url) {
    return String(url || '').replace(/[\\,;"')\]]+$/g, '');
}

function findMediaUrl(text) {
    const urls = String(text || '').match(/https?:\/\/[^\s"'<>\\]+/g) || [];
    for (let i = 0; i < urls.length; i++) {
        const url = cleanMediaUrl(urls[i]);
        if (looksLikeMedia(url)) return url;
    }
    const plain = cleanMediaUrl(text);
    return looksLikeMedia(plain) ? plain : '';
}

function maybeDecrypt(text) {
    const s = String(text || '').trim();
    const payload = s.split('|')[0];
    if (!payload) return s;
    if (payload.indexOf('U2FsdGVkX1') === 0 || payload.indexOf('53616c7465645f5f') === 0 || payload.indexOf('Salted__') === 0) {
        try { return cryptoJsDecrypt(payload, PLAY_REQ_KEY); } catch (e) { return s; }
    }
    return s;
}

function extractMediaFromPlayResponse(raw) {
    const bag = [];
    function take(value) {
        if (value == null) return;
        if (typeof value === 'string') {
            bag.push(value);
            const decoded = maybeDecrypt(value);
            if (decoded !== value) {
                bag.push(decoded);
                const inner = parseJsonSafe(decoded);
                if (inner && typeof inner === 'object') take(inner);
            }
            return;
        }
        if (typeof value === 'object') {
            const keys = ['url', 'file', 'hls', 'link', 'src', 'video', 'data', 'source', 'embed_url', 'videoUrl', 'play_url'];
            for (let i = 0; i < keys.length; i++) if (value[keys[i]]) take(value[keys[i]]);
        }
    }
    take(raw);
    take(parseJsonSafe(raw));
    take(typeof raw === 'string' ? raw : JSON.stringify(raw || ''));
    for (let i = 0; i < bag.length; i++) {
        const url = findMediaUrl(bag[i]);
        if (url) return url;
    }
    return '';
}

function cryptoJsEncryptHex(plain, pass) {
    const salt = [];
    for (let i = 0; i < 8; i++) salt.push(Math.floor(Math.random() * 256));
    const kv = evpKDF(pass, salt, 32, 16);
    const ct = aesCbcEncrypt(utf8Encode(plain), kv.key, kv.iv);
    return utf8Encode('Salted__').concat(salt, ct).map(function (b) {
        return ('0' + (b & 255).toString(16)).slice(-2);
    }).join('');
}

function playkrxPayload(idfile, iduser, hlsSupport) {
    return JSON.stringify({
        idfile: idfile,
        iduser: iduser,
        domain_play: SITE,
        platform: 'MacIntel',
        hlsSupport: !!hlsSupport,
        jwplayer: {
            Browser: { chrome: true, version: { version: '131.0.0', major: 131, minor: 0 } },
            OS: { mac: true, version: { version: '10.15.7' } },
            Features: { flash: false, flashVersion: 0, iframe: true, backgroundLoading: true, passiveEventListeners: true },
            browser: { chrome: true },
            os: { mac: true },
            features: { hls: true },
        },
    });
}

async function resolvePlaykrx18(embedUrl) {
    const html = await httpGet(embedUrl, SITE + '/');
    const idfileEnc = (html.match(/idfile_enc\s*=\s*["']([^"']+)/) || [])[1];
    const idUserEnc = (html.match(/idUser_enc\s*=\s*["']([^"']+)/) || [])[1];
    const api = ((html.match(/DOMAIN_API\s*=\s*['"]([^'"]+)/) || [])[1] || PLAY_API_FALLBACK).replace(/\/$/, '');
    if (!idfileEnc || !idUserEnc) throw new Error('playkrx18 缺少加密 ID');

    const idfile = cryptoJsDecrypt(idfileEnc, PLAY_FILE_KEY);
    const iduser = cryptoJsDecrypt(idUserEnc, PLAY_USER_KEY);
    const endpoint = api + '/playiframe';
    console.log('[krx18] playiframe:', endpoint);
    const attempts = [
        { packed: cryptoJsEncrypt(playkrxPayload(idfile, iduser, true), PLAY_REQ_KEY), as: 'form' },
    ];
    for (let i = 0; i < attempts.length; i++) {
        const cipher = attempts[i].packed;
        const packed = cipher + '|' + md5hex(cipher);
        try {
            const raw = attempts[i].as === 'form'
                ? await httpPostForm(endpoint, 'data=' + encodeURIComponent(packed), embedUrl)
                : await httpPostJson(endpoint, { data: packed }, embedUrl);
            const media = extractMediaFromPlayResponse(raw);
            if (media) return media;
            const preview = typeof raw === 'string' ? raw.slice(0, 180) : JSON.stringify(raw).slice(0, 180);
            console.log('[krx18] playiframe miss', attempts[i].as, preview);
        } catch (err) {
            console.log('[krx18] playiframe err', err.message || err);
        }
    }
    throw new Error('playkrx18 未返回直链');
}

async function resolveLoadvidPlaylist(embedUrl) {
    return withRetry(async function () {
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
        const direct = findMediaUrl(text);
        return {
            url: direct || ('data:application/vnd.apple.mpegurl;base64,' + b64enc(utf8Encode(text))),
            playlist: text,
        };
    }, 3);
}

async function resolveEmbedMedia(embedUrl) {
    if (looksLikeMedia(embedUrl)) return embedUrl;
    const leaked = findMediaUrl(embedUrl);
    if (leaked) return leaked;

    if (/loadvid\.com/i.test(embedUrl)) {
        const resolved = await resolveLoadvidPlaylist(embedUrl);
        return resolved.url;
    }
    if (/playkrx18\.site/i.test(embedUrl)) {
        return resolvePlaykrx18(embedUrl);
    }

    const html = await httpGet(embedUrl, SITE + '/');
    const fromPage = findMediaUrl(html);
    if (fromPage) return fromPage;
    throw new Error('该线路没有可播放直链');
}

function resourceOf(name, url, referer) {
    const isData = /^data:/i.test(url);
    return {
        name: name || '播放',
        url: url,
        customHeaders: isData ? undefined : requestHeaders(referer || SITE + '/'),
        playerType: isData ? 'app' : 'system',
    };
}

async function collectResourcesFromHtml(html, link) {
    const options = extractPlayerOptions(html);
    if (!options.length) throw new Error('未找到播放线路，页面结构可能已更新');
    options.sort(function (a, b) {
        const rank = function (o) { return /loadvid/i.test(String(o.server || o.name || '')) ? 0 : 1; };
        return rank(a) - rank(b);
    });

    const resources = [];
    const seen = {};
    const preferred = [];
    const fallback = [];
    for (let i = 0; i < options.length; i++) {
        if (/loadvid/i.test(String(options[i].server || options[i].name || ''))) preferred.push(options[i]);
        else fallback.push(options[i]);
    }
    const queue = preferred.concat(fallback);

    async function addFromOption(option) {
        const embed = await fetchEmbed(option);
        if (!embed.embed || seen[embed.embed]) return;
        seen[embed.embed] = true;
        if (/playkrx18\.site/i.test(embed.embed) && resources.length) {
            console.log('[krx18] skip playkrx18, already have a stream');
            return;
        }
        const media = await resolveEmbedMedia(embed.embed);
        if (!media || seen[media]) return;
        seen[media] = true;
        const item = resourceOf(embed.name, media, embed.embed);
        if (looksLikeMedia(media) && media.indexOf('data:') !== 0) resources.unshift(item);
        else resources.push(item);
    }

    for (let i = 0; i < queue.length; i++) {
        try {
            await addFromOption(queue[i]);
            if (resources.length) break;
        } catch (err) {
            console.log('[krx18] embed skip:', queue[i].name, err.message || err);
        }
    }
    const playable = resources.filter(function (r) { return looksLikeMedia(r.url); });
    if (!playable.length) throw new Error('所有播放线路均未解析到直链');
    return playable;
}

function pickMovieLink(params) {
    const cands = [params && params.link, params && params.id, params && params.url, params && params.videoUrl];
    for (let i = 0; i < cands.length; i++) {
        const value = String(cands[i] || '');
        if (/\/movies\//i.test(value) && value.indexOf('data:') !== 0 && !/\.(m3u8|mp4)(\?|$)/i.test(value)) {
            return value;
        }
    }
    return '';
}

async function collectResources(link) {
    if (!link) throw new Error('播放地址为空');
    if (/^https?:\/\//i.test(link) && looksLikeMedia(link) && link.indexOf('data:') !== 0) {
        return [resourceOf('播放', link, SITE + '/')];
    }
    const movieLink = /\/movies\//i.test(link) ? link : '';
    if (!movieLink) throw new Error('播放地址为空');
    return withRetry(function () { return collectResourcesFromHtmlWait(movieLink); }, 2);
}

async function collectResourcesFromHtmlWait(link) {
    const html = await httpGet(link);
    return collectResourcesFromHtml(html, link);
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
        customHeaders: requestHeaders(link),
        playerType: 'system',
    };
}

async function loadResource(params) {
    params = params || {};
    const movieLink = pickMovieLink(params);
    if (movieLink) return collectResources(movieLink);

    const raw = params.link || params.videoUrl || params.url || params.id;
    if (raw && looksLikeMedia(raw) && String(raw).indexOf('data:') !== 0) {
        return [resourceOf('播放', raw, SITE + '/')];
    }
    throw new Error('播放地址为空');
}
