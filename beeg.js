// Beeg Forward Widget
// 转换自 XPTV beeg.js（原作者：John Smith）

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SITE = 'https://beeg.com';
const API_BASE = 'https://store.externulls.com';
const PAGE_SIZE = 24;
const SEARCH_SCAN_PAGES = 3;

const CHANNELS = [
    { title: 'Blacked', value: 'blacked' },
    { title: 'Vixen', value: 'vixencom' },
    { title: 'Team Skeet', value: 'teamskeet' },
    { title: 'Teen Mega World', value: 'teenmegaworld' },
    { title: 'Nubiles', value: 'nubilesporn' },
    { title: 'Wow Girls', value: 'wowgirls' },
    { title: 'Bratty Sis', value: 'brattysis' },
    { title: 'Adult Time', value: 'adulttime' },
    { title: 'Family Strokes', value: 'familystrokes' },
    { title: 'Ultra Films', value: 'ultrafilms' },
    { title: 'Nubile Films', value: 'nubilefilms' },
    { title: 'LetsDoeIt', value: 'letsdoeit' },
    { title: 'Family XXX', value: 'familyxxx' },
    { title: 'Tiny 4K', value: 'tiny4k' },
    { title: 'New Sensations', value: 'newsensations' },
    { title: 'Naughty America', value: 'naughtyamerica' },
    { title: 'Sis Loves Me', value: 'sislovesme' },
    { title: 'Pure Taboo', value: 'puretaboo' },
    { title: 'Step Siblings Caught', value: 'stepsiblingscaught' },
    { title: 'Moms Teach Sex', value: 'momsteachsex' },
    { title: 'Hot Wife XXX', value: 'hotwifexxx' },
    { title: 'Porn Force', value: 'pornforce' },
    { title: 'Dorcel Club', value: 'dorcelclub' },
    { title: 'Vixen Plus', value: 'vixenplus' },
    { title: 'My Family Pies', value: 'myfamilypies' },
    { title: "My Friend's Hot Mom", value: 'myfriendshotmom' },
    { title: 'Bare Back Studios', value: 'barebackstudios' },
    { title: 'NF Busty', value: 'nfbusty' },
    { title: 'Passion HD', value: 'passionhd' },
    { title: '21 Naturals', value: '21naturals' },
    { title: 'Teen Fidelity', value: 'teenfidelity' },
    { title: 'Tushy', value: 'tushy' },
    { title: 'Porn World', value: 'pornworld' },
    { title: 'Cum 4K', value: 'cum4k' },
    { title: 'My Pervy Family', value: 'mypervyfamily' },
    { title: 'Porn Fidelity', value: 'pornfidelity' },
    { title: 'NVG', value: 'nvg' },
    { title: 'Exploited College Girls', value: 'exploitedcollegegirls' },
    { title: 'Deeper', value: 'deeperofficial' },
    { title: 'Bellesa Plus', value: 'bellesaplus' },
    { title: 'Princess Cum', value: 'princesscum' },
    { title: 'White Boxxx', value: 'whiteboxxx' },
    { title: 'Pure Mature', value: 'puremature' },
    { title: 'Perv Mom', value: 'pervmom' },
    { title: 'Blacked Raw', value: 'blackedraw' },
    { title: 'Mom Wants to Breed', value: 'momwantstobreed' },
    { title: '21 Sextury', value: '21sextury' },
    { title: 'Hegre', value: 'hegre' },
    { title: 'Life Selector', value: 'lifeselector' },
    { title: 'Exxxtra Small', value: 'exxtrasmall' },
    { title: 'JAV HD', value: 'javhd' },
    { title: 'Girl Cum', value: 'girlcumofficial' },
    { title: 'Sex Art', value: 'sexart' },
    { title: "Tonight's Girlfriend", value: 'tonightsgirlfriend' },
    { title: 'Dad Crush', value: 'dadcrush' },
    { title: 'Lubed', value: 'lubedcom' },
    { title: 'VIP 4K', value: 'vip4k' },
    { title: 'Evil Angel', value: 'evilangel' },
    { title: 'JAV Hub', value: 'javhub' },
    { title: 'Caribbeancom', value: 'caribbeancom' },
    { title: "My Sister's Hot Friend", value: 'mysistershotfriend' },
    { title: 'Daughter Swap', value: 'daughterswap' },
];

const MODELS = [
    { title: 'Eva Elfie', value: 'evaelfie' },
    { title: 'Angela White', value: 'angelawhite' },
    { title: 'Dani Daniels', value: 'danidaniels' },
    { title: 'Mia Malkova', value: 'miamalkova' },
    { title: 'Riley Reid', value: 'rileyreid' },
    { title: 'Mila Lioness', value: 'milalioness' },
    { title: 'Alexa Grace', value: 'alexagrace' },
    { title: 'Alina Lopez', value: 'alinalopez' },
    { title: 'Comatozze', value: 'comatozze' },
    { title: 'Candy Love', value: 'candylove' },
    { title: 'Diana Rider', value: 'dianarider' },
    { title: 'Sweetie Fox', value: 'sweetiefox' },
    { title: 'Lana Rhoades', value: 'lanarhoades' },
    { title: 'Julie Jess', value: 'juliejess' },
    { title: 'Anny Walker', value: 'annywalker' },
    { title: 'Angel X', value: 'angelx' },
    { title: 'Shinaryen', value: 'shinaryen' },
    { title: 'Abella Danger', value: 'abelladanger' },
    { title: 'Sybil', value: 'sybil' },
    { title: 'Emilia Bunny', value: 'emiliabunny' },
    { title: 'Syndicete', value: 'syndicete' },
    { title: 'Jenny Kitty', value: 'jennykitty' },
    { title: 'Emily Willis', value: 'emilywillis' },
    { title: 'Elsa Jean', value: 'elsajean' },
    { title: 'Nicole Aniston', value: 'nicoleaniston' },
    { title: 'Fantasy Babe', value: 'fantasybabe' },
    { title: 'Lena Paul', value: 'lenapaul' },
    { title: 'Bonnie Blaze', value: 'bonnieblaze' },
    { title: 'Cory Chase', value: 'corychase' },
    { title: 'Martin & Paola', value: 'martinpaola' },
    { title: 'Dick For Lily', value: 'dickforlily' },
    { title: 'Gabbie Carter', value: 'gabbiecarter' },
    { title: 'Lexi Lore', value: 'lexilore' },
    { title: 'Kate Kuray', value: 'katekuray' },
    { title: 'Blake Blossom', value: 'blakeblossom' },
    { title: 'Carla Cute', value: 'carlacute' },
    { title: 'Hotties Two', value: 'hottiestwo' },
    { title: 'Adriana Chechik', value: 'adrianachechik' },
    { title: 'Yummy Mira', value: 'yummymira' },
    { title: 'Reislin', value: 'reislin' },
    { title: 'Anastangel', value: 'anastangel' },
    { title: 'Gina Valentina', value: 'ginavalentina' },
    { title: 'Kenzie Reeves', value: 'kenzie Reeves' },
    { title: 'Valentina Nappi', value: 'valentinanappi' },
    { title: 'Leah Meow', value: 'leahmeow' },
    { title: 'Carry Light', value: 'carrylight' },
    { title: 'Purple Bitch', value: 'purplebitch' },
    { title: 'Pink Loving', value: 'pinkloving' },
    { title: 'My Anny', value: 'myanny' },
    { title: 'Lil Karina', value: 'lilkarina' },
    { title: 'Melody Marks', value: 'melodymarks' },
    { title: 'Luxury Mur', value: 'luxurymur' },
    { title: 'Diana Daniels', value: 'danadaniels' },
    { title: 'Stacy Cruz', value: 'stacycruz' },
    { title: 'Allinika', value: 'allinika' },
    { title: 'Autumn Falls', value: 'autumnfalls' },
    { title: 'Sola Zola', value: 'solazola' },
    { title: 'Krystal Boyd', value: 'krystalboyd' },
    { title: 'Lexi Luna', value: 'lexiluna' },
    { title: 'Lauren Phillips', value: 'laurenphillips' },
    { title: 'Kera Bear', value: 'kerabear' },
    { title: 'Little Caprice', value: 'littlecaprice' },
    { title: 'Sia Siberia', value: 'siasiberia' },
    { title: 'Molly Red Wolf', value: 'mollyredwolf' },
    { title: 'Samantha Flair', value: 'samanthaflair' },
    { title: 'Luxury Girl', value: 'luxurygirl' },
    { title: 'Molly Little', value: 'mollylittle' },
    { title: 'Kelly Aleman', value: 'kellyaleman' },
    { title: 'Yinyleon', value: 'yinyleon' },
    { title: 'Liya Silver', value: 'liyasilver' },
    { title: 'Telari Love', value: 'telarilove' },
    { title: 'Skye Young', value: 'skyeyoung' },
    { title: 'Tru Kait', value: 'trukait' },
    { title: 'Eliza Ibarra', value: 'elizaibarra' },
    { title: 'Jenny Lux', value: 'jennylux' },
    { title: 'Anissa Kate', value: 'anissakate' },
    { title: 'Haley Reed', value: 'haleyreed' },
    { title: 'Kyler Quinn', value: 'kylerquinn' },
    { title: 'Skylar Vox', value: 'skylarvox' },
    { title: 'Leah Gotti', value: 'leahgotti' },
    { title: 'Lina Migurtt', value: 'linamigurtt' },
    { title: 'Dillion Harper', value: 'dillionharper' },
    { title: 'Brandi Love', value: 'brandilove' },
    { title: 'Jia Lissa', value: 'jialissa' },
    { title: 'Brooke Tilli', value: 'brooketilli' },
    { title: 'Miss Lexa', value: 'misslexa' },
    { title: 'Bunny Rabbits', value: 'bunnyrabbits' },
    { title: 'Leo Lulu', value: 'leolulu' },
    { title: 'Layla Ray', value: 'laylaray' },
    { title: 'Web To Love', value: 'webtolove' },
    { title: 'Nancy Ace', value: 'nancyace' },
    { title: 'Hansel & Grettel', value: 'hanselgrettel' },
    { title: 'Xreindeers', value: 'xreindeers' },
    { title: 'Tiffany Tatum', value: 'tiffanystatum' },
    { title: 'Mirari', value: 'mirari' },
    { title: 'Adria Rae', value: 'adriarae' },
    { title: 'Kristel Jack', value: 'kristeljack' },
    { title: 'Mila Solana', value: 'milasolana' },
    { title: 'Alexis Fawx', value: 'alexisfawx' },
];

var WidgetMetadata = {
    id: "beeg.com",
    title: "Beeg",
    description: "Beeg 视频资源，支持首页、频道、模特与搜索",
    author: "John Smith (XPTV转换)",
    site: SITE,
    version: "1.0.1",
    requiredVersion: "0.0.1",
    detailCacheDuration: 0,
    modules: [
        { title: "Home", functionName: "getHome", params: [{ name: "page", title: "页码", type: "page" }] },
        {
            title: "Channels",
            functionName: "getChannel",
            params: [
                { name: "slug", title: "频道", type: "enumeration", enumOptions: CHANNELS, value: "vixencom" },
                { name: "page", title: "页码", type: "page" },
            ],
        },
        {
            title: "Models",
            functionName: "getModel",
            params: [
                { name: "slug", title: "模特", type: "enumeration", enumOptions: MODELS, value: "evaelfie" },
                { name: "page", title: "页码", type: "page" },
            ],
        },
        { id: "loadResource", title: "播放资源", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] },
    ],
    search: {
        title: "搜索",
        functionName: "search",
        params: [],
    },
};

async function httpGetJson(url) {
    const response = await Widget.http.get(url, {
        headers: {
            'User-Agent': UA,
            'Origin': SITE,
            'Referer': SITE + '/',
        },
    });
    if (!response || !response.data) throw new Error('请求失败: ' + url);
    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
}

function formatDuration(seconds) {
    seconds = Math.floor(Number(seconds) || 0);
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return m + ':' + String(s).padStart(2, '0');
}

function getTitle(video) {
    const fileData = video && video.file && video.file.data ? video.file.data : [];
    for (const item of fileData) {
        if (item.cd_column === 'sf_name' && item.cd_value) return item.cd_value;
    }
    return 'Untitled';
}

function buildPoster(fileId, video) {
    const fcFacts = video.fc_facts && video.fc_facts[0];
    const thumbs = fcFacts && fcFacts.fc_thumbs ? fcFacts.fc_thumbs : [];
    if (thumbs.length) return 'https://thumbs.externulls.com/videos/' + fileId + '/' + thumbs[0] + '.jpg';
    return 'https://img.externulls.com/' + fileId + '/preview_01.jpg';
}

function buildItem(video) {
    const fcFacts = video.fc_facts && video.fc_facts[0];
    const fileData = video.file && video.file.data ? video.file.data : [];
    const fileId = video.file && video.file.id ? video.file.id : (fileData[0] && fileData[0].cd_file) || (fcFacts && fcFacts.id);
    if (!fileId) return null;

    const title = getTitle(video);
    const height = (video.file && video.file.fl_height) || 0;
    const duration = formatDuration(video.file && video.file.fl_duration);
    const poster = buildPoster(fileId, video);
    const tags = Array.isArray(video.tags) ? video.tags.map((tag) => tag.tg_name).filter(Boolean) : [];
    const streams = hlsResourcesToStreams(video.file && video.file.hls_resources);
    const link = buildLinkPayload(fileId, streams);

    return {
        id: String(fileId),
        type: "url",
        mediaType: "movie",
        title: title,
        posterPath: poster,
        backdropPath: poster,
        link: link,
        durationText: duration,
        description: [height ? height + 'p' : '', tags.slice(0, 3).join(' / ')].filter(Boolean).join(' · '),
        customHeaders: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        },
    };
}

async function fetchVideos(slug, page) {
    page = parseInt(page, 10) || 1;
    const offset = (page - 1) * PAGE_SIZE;
    const url = API_BASE + '/tag/videos/' + encodeURIComponent(slug) + '?limit=' + PAGE_SIZE + '&offset=' + offset;
    console.log('[beeg] fetchVideos:', url);

    const videos = await httpGetJson(url);
    if (!Array.isArray(videos)) throw new Error('视频列表格式异常');

    const items = videos.map(buildItem).filter(Boolean);
    if (!items.length) throw new Error('视频列表为空');
    return items;
}

async function getHome(params = {}) {
    return fetchVideos('index', params.page || 1);
}

async function getChannel(params = {}) {
    return fetchVideos(params.slug || 'vixencom', params.page || 1);
}

async function getModel(params = {}) {
    return fetchVideos(params.slug || 'evaelfie', params.page || 1);
}

function hlsResourcesToStreams(hlsResources) {
    const streams = [];
    if (!hlsResources) return streams;

    for (const key of Object.keys(hlsResources)) {
        const value = hlsResources[key];
        if (!value || key === 'fl_cdn_multi') continue;
        const match = key.match(/fl_cdn_(\d+)/);
        const height = match ? parseInt(match[1], 10) : 0;
        streams.push({
            height: height,
            name: height ? height + 'p' : key,
            url: 'https://video.beeg.com/' + value,
        });
    }

    streams.sort((a, b) => b.height - a.height);

    if (!streams.length && hlsResources.fl_cdn_multi) {
        streams.push({
            height: 0,
            name: 'Auto',
            url: 'https://video.beeg.com/' + hlsResources.fl_cdn_multi,
        });
    }

    return streams;
}

async function httpGetText(url) {
    const response = await Widget.http.get(url, {
        headers: {
            'User-Agent': UA,
            'Origin': SITE,
            'Referer': SITE + '/',
        },
    });
    if (!response || !response.data) throw new Error('请求失败: ' + url);
    return String(response.data);
}

function parseMasterPlaylist(masterUrl, text) {
    const lines = String(text || '').split(/\r?\n/);
    const streams = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.indexOf('#EXT-X-STREAM-INF') !== 0) continue;

        const next = lines[i + 1] || '';
        if (!next || next[0] === '#') continue;

        const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
        const codecMatch = line.match(/CODECS="([^"]+)"/);
        const height = resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0;
        const codec = codecMatch ? codecMatch[1] : '';

        let url = next;
        if (url.startsWith('/')) url = 'https://video.beeg.com' + url;
        else if (!url.startsWith('http')) {
            const base = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
            url = base + url;
        }

        streams.push({
            height: height,
            codec: codec,
            name: height ? height + 'p' : 'Auto',
            url: url,
        });
    }

    return streams;
}

function sortPlayableStreams(streams) {
    const preference = { 720: 1, 480: 2, 1080: 3, 360: 4, 240: 5 };
    return streams.sort((a, b) => {
        const ap = preference[a.height] || 99;
        const bp = preference[b.height] || 99;
        if (ap !== bp) return ap - bp;
        return (b.height || 0) - (a.height || 0);
    });
}

async function expandMasterStreams(streams) {
    if (!streams || !streams.length) return [];

    const expanded = [];
    for (const stream of streams) {
        if (!stream.url || stream.url.indexOf('/multi=') === -1) {
            expanded.push(stream);
            continue;
        }

        try {
            const masterText = await httpGetText(stream.url);
            const variants = parseMasterPlaylist(stream.url, masterText);
            const h264 = variants.filter((variant) => variant.codec.indexOf('avc1.') !== -1);
            expanded.push.apply(expanded, h264.length ? h264 : variants);
        } catch (e) {
            console.log('[beeg] expandMasterStreams error:', e.message);
            expanded.push(stream);
        }
    }

    return sortPlayableStreams(expanded);
}

function buildLinkPayload(fileId, streams) {
    if (!streams || !streams.length) return String(fileId);
    return JSON.stringify({
        fileId: String(fileId),
        streams: streams,
    });
}

function parseLinkPayload(value) {
    if (!value) return { fileId: '' };
    if (typeof value !== 'string') return value;
    if (value[0] !== '{') return { fileId: value };

    try {
        const parsed = JSON.parse(value);
        return parsed || { fileId: value };
    } catch (e) {
        return { fileId: value };
    }
}

function streamToResource(stream) {
    return {
        name: stream.name || 'Auto',
        url: stream.url,
        customHeaders: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        },
        playerType: "system",
    };
}

async function fetchFile(fileId) {
    let id = String(fileId || '').replace(/^-0/, '');
    if (!id) throw new Error('fileId 为空');
    return httpGetJson(API_BASE + '/facts/file/' + encodeURIComponent(id));
}

async function resolveStreams(fileId, cachedStreams) {
    let streams = [];
    if (cachedStreams && cachedStreams.length) {
        streams = await expandMasterStreams(cachedStreams);
        if (streams.length) return streams.map(streamToResource);
    }

    const data = await fetchFile(fileId);
    const hlsResources = data && data.file && data.file.hls_resources;
    streams = await expandMasterStreams(hlsResourcesToStreams(hlsResources));
    if (!streams.length) throw new Error('未找到播放资源');
    return streams.map(streamToResource);
}

async function loadDetail(link) {
    if (!link) throw new Error('link 不能为空');
    console.log('[beeg] loadDetail:', link);

    const payload = parseLinkPayload(link);
    const streams = await resolveStreams(payload.fileId || link, payload.streams);
    return {
        id: String(payload.fileId || link),
        type: "url",
        mediaType: "movie",
        link: link,
        videoUrl: streams[0].url,
        customHeaders: streams[0].customHeaders,
    };
}

async function loadResource(params = {}) {
    const raw = params.link || params.id || params.video_id || params.file_id || params.videoUrl;
    if (!raw) throw new Error('播放资源 ID 为空');

    if (/^https?:\/\//.test(raw)) {
        return [streamToResource({ name: params.title || params.name || 'Auto', url: raw })];
    }

    const payload = parseLinkPayload(raw);
    return resolveStreams(payload.fileId || raw, payload.streams);
}

function normalizeText(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function splitQueryWords(text) {
    return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 2);
}

function titleMatchesQuery(title, words) {
    const normalized = normalizeText(title);
    if (!normalized) return false;
    if (!words.length) return true;
    return words.every((word) => normalized.includes(word));
}

async function search(params = {}) {
    const kw = (params.keyword || params.wd || '').trim();
    const page = parseInt(params.page, 10) || 1;
    if (!kw) throw new Error('关键词为空');

    const words = splitQueryWords(kw);
    const items = [];
    const seen = {};
    const startPage = (page - 1) * SEARCH_SCAN_PAGES + 1;
    const endPage = startPage + SEARCH_SCAN_PAGES - 1;

    for (let currentPage = startPage; currentPage <= endPage && items.length < PAGE_SIZE; currentPage++) {
        const videos = await fetchVideos('index', currentPage);
        for (const item of videos) {
            if (!seen[item.id] && titleMatchesQuery(item.title, words)) {
                seen[item.id] = true;
                items.push(item);
                if (items.length >= PAGE_SIZE) break;
            }
        }
    }

    return items;
}
