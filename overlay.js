// Chat overlay main logic

const chatContainer = document.getElementById('chat-container');
const infoBar = document.getElementById('info-bar');
const statusEl = document.getElementById('connection-status');
const timeEl = document.getElementById('time');
const dateEl = document.getElementById('date');

let streamerSocket;
let seSocket;
let twitchClient;

function init() {
    const orient = getOrientationFromQuery();
    if (orient) setOrientation(orient);
    connectStreamerBot();
    connectTwitch();
    connectStreamElements();
    updateTime();
    setInterval(updateTime, 1000);
}

function getOrientationFromQuery() {
    const params = new URLSearchParams(location.search);
    const o = params.get('orientation');
    if (o === 'vertical' || o === 'horizontal') return o;
    return '';
}

function setOrientation(o) {
    chatContainer.classList.toggle('vertical', o === 'vertical');
    chatContainer.classList.toggle('horizontal', o === 'horizontal');
    infoBar.classList.toggle('vertical', o === 'vertical');
    infoBar.classList.toggle('horizontal', o === 'horizontal');
}

function connectStreamerBot() {
    if (!CONFIG.streamerBot || !CONFIG.streamerBot.wsUrl) return;
    showStatus('Connecting to Streamer.bot');
    streamerSocket = new WebSocket(CONFIG.streamerBot.wsUrl);
    streamerSocket.addEventListener('open', () => hideStatus());
    streamerSocket.addEventListener('message', e => {
        const data = JSON.parse(e.data);
        if (data.event === 'OBS.SceneChanged') {
            if (data.sceneName) {
                if (data.sceneName.includes('[vertical]')) setOrientation('vertical');
                else if (data.sceneName.includes('[horizontal]')) setOrientation('horizontal');
            }
        }
    });
    streamerSocket.addEventListener('close', () => {
        showStatus('Streamer.bot disconnected');
        setTimeout(connectStreamerBot, 5000);
    });
}

function connectTwitch() {
    if (!CONFIG.twitch || !CONFIG.twitch.channel) return;
    twitchClient = new tmi.Client({
        connection: { reconnect: true, secure: true },
        identity: CONFIG.twitch.token !== '[YOUR_TOKEN_HERE]' ? {
            username: CONFIG.twitch.username,
            password: 'oauth:' + CONFIG.twitch.token
        } : undefined,
        channels: [CONFIG.twitch.channel]
    });
    twitchClient.connect();
    twitchClient.on('message', async (channel, tags, message, self) => {
        if (self) return;
        const meta = await fetchUserMeta(tags['display-name'], tags['user-id']);
        displayMessage({
            username: tags['display-name'],
            avatar: meta.avatar,
            pronouns: meta.pronouns,
            watchtime: meta.watchtime,
            platform: 'Twitch',
            text: message,
            badges: tags.badges
        });
    });
}

function connectStreamElements() {
    if (!CONFIG.streamElements || !CONFIG.streamElements.jwtToken) return;
    seSocket = new WebSocket('wss://realtime.streamelements.com/socket');
    seSocket.addEventListener('open', () => {
        seSocket.send(JSON.stringify({ method: 'handshake', token: CONFIG.streamElements.jwtToken }));
    });
    seSocket.addEventListener('message', e => {
        const data = JSON.parse(e.data);
        if (data.type === 'event' && data.event && data.event.type) {
            displayMessage({
                username: 'System',
                text: data.event.type,
                platform: 'StreamElements'
            });
        }
    });
}

function showStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.remove('hidden');
}

function hideStatus() {
    if (!statusEl) return;
    statusEl.classList.add('hidden');
}

function updateTime() {
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

async function fetchUserMeta(username, userId) {
    const meta = { pronouns: '', watchtime: '', avatar: '' };
    try {
        const res = await fetch(`https://pronouns.alejo.io/api/users/${encodeURIComponent(username)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.length && data[0].pronoun_id) meta.pronouns = data[0].pronoun_id;
        }
    } catch (e) { }
    try {
        if (CONFIG.twitch && CONFIG.twitch.clientId && CONFIG.twitch.token !== '[YOUR_TOKEN_HERE]') {
            const uRes = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
                headers: {
                    'Client-ID': CONFIG.twitch.clientId,
                    'Authorization': 'Bearer ' + CONFIG.twitch.token
                }
            });
            if (uRes.ok) {
                const uData = await uRes.json();
                if (uData.data && uData.data.length) meta.avatar = uData.data[0].profile_image_url;
            }
        }
    } catch (e) { }
    try {
        if (CONFIG.streamElements && CONFIG.streamElements.channelId) {
            const wRes = await fetch(`${CONFIG.streamElements.baseUrl}/points/${CONFIG.streamElements.channelId}/${userId}`, {
                headers: { Authorization: `Bearer ${CONFIG.streamElements.jwtToken}` }
            });
            if (wRes.ok) {
                const wData = await wRes.json();
                if (wData && typeof wData.watchtime === 'number') meta.watchtime = wData.watchtime + 'm';
            }
        }
    } catch (e) { }
    return meta;
}

function displayMessage({ username, avatar, pronouns, watchtime, platform, text, badges }) {
    const el = document.createElement('div');
    el.className = `chat-message ${platform.toLowerCase()}`;
    if (badges) {
        if (badges.moderator) el.classList.add('mod');
        if (badges.vip) el.classList.add('vip');
    }
    const meta = document.createElement('div');
    meta.className = 'meta';
    if (avatar) meta.innerHTML += `<img class="avatar" src="${avatar}" alt="avatar">`;
    meta.innerHTML += `<span class="username">${escapeHtml(username)}</span>`;
    if (pronouns) meta.innerHTML += `<span class="pronouns">(${pronouns})</span>`;
    if (watchtime) meta.innerHTML += `<span class="watchtime">${watchtime}</span>`;
    meta.innerHTML += `<span class="platform">${platform}</span>`;
    const content = document.createElement('div');
    content.className = 'content';
    content.innerHTML = escapeHtml(text);
    el.appendChild(meta);
    el.appendChild(content);
    chatContainer.appendChild(el);
    anime({ targets: el, opacity: [0,1], translateY: [20,0], duration: 500, easing: 'easeOutQuad' });
    setTimeout(() => {
        anime({ targets: el, opacity: [1,0], duration: 500, easing: 'easeInQuad', complete: () => el.remove() });
    }, CONFIG.fadeOutDelay || 15000);
    limitMessages();
}

function limitMessages() {
    const messages = chatContainer.getElementsByClassName('chat-message');
    while (messages.length > (CONFIG.maxMessages || 20)) messages[0].remove();
}

window.addEventListener('DOMContentLoaded', init);
