const CONFIG = {
    maxMessages: 10,
    fadeOutDelay: 10000,
    orientationClassNames: {
        vertical: 'vertical',
        horizontal: 'horizontal'
    },
    platformColors: {
        twitch: '#9146FF',
        youtube: '#FF0000'
    },
    streamerBotWsUrl: 'ws://localhost:8080/StreamerBot', // placeholder
    twitchToken: '[placeholder]',
    statsRefreshInterval: 30000,
};

const chatContainer = document.getElementById('chat-container');
const statusEl = document.getElementById('connection-status');
const infoBar = document.getElementById('info-bar');
const timeEl = document.getElementById('time');
const dateEl = document.getElementById('date');
const viewerEl = document.getElementById('viewer-count');
const followerEl = document.getElementById('follower-count');
const subEl = document.getElementById('subscriber-count');
let socket;
let statusAnim;

function connectWebSocket() {
    showStatus('Streamer.bot Not Connected');
    socket = new WebSocket(CONFIG.streamerBotWsUrl);
    socket.addEventListener('open', () => console.log('WS connected'));
    socket.addEventListener('message', handleSocketMessage);
    socket.addEventListener('close', () => {
        showStatus('Streamer.bot Disconnected');
        setTimeout(connectWebSocket, 5000);
    });
}

function handleSocketMessage(event) {
    const data = JSON.parse(event.data);
    if (statusEl && !statusEl.classList.contains('hidden')) hideStatus();
    if (data.event === 'OBS.SceneChanged') {
        updateOrientation(data.sceneName);
    } else if (data.event === 'Twitch.ChatMessage') {
        processChatMessage(data);
    }
}

function updateOrientation(sceneName) {
    if (!sceneName) return;
    let orient = '';
    if (sceneName.includes('[vertical]')) orient = CONFIG.orientationClassNames.vertical;
    else if (sceneName.includes('[horizontal]')) orient = CONFIG.orientationClassNames.horizontal;
    if (!orient) return;
    chatContainer.classList.toggle(CONFIG.orientationClassNames.vertical, orient === CONFIG.orientationClassNames.vertical);
    chatContainer.classList.toggle(CONFIG.orientationClassNames.horizontal, orient === CONFIG.orientationClassNames.horizontal);
    if (infoBar) {
        infoBar.classList.toggle(CONFIG.orientationClassNames.vertical, orient === CONFIG.orientationClassNames.vertical);
        infoBar.classList.toggle(CONFIG.orientationClassNames.horizontal, orient === CONFIG.orientationClassNames.horizontal);
        anime({
            targets: infoBar,
            opacity: [0, 1],
            duration: 500,
            easing: 'easeOutQuad'
        });
    }
}

async function processChatMessage(message) {
    const user = message.user || {};
    const username = user.displayName || user.name || 'Unknown';
    const platform = message.platform || 'twitch';

    const meta = await fetchUserMeta(username);

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${platform}`;
    if (user.badges) {
        if (user.badges.includes('moderator')) messageEl.classList.add('mod');
        if (user.badges.includes('vip')) messageEl.classList.add('vip');
    }

    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.innerHTML = `
        <span class="username">${username}</span>
        ${meta.pronouns ? `<span class="pronouns">(${meta.pronouns})</span>` : ''}
        ${meta.watchtime ? `<span class="watchtime">${meta.watchtime}</span>` : ''}
        <span class="platform">${platform}</span>
    `;

    const contentEl = document.createElement('div');
    contentEl.className = 'content';
    contentEl.innerHTML = parseMessage(message.text || message.message);

    messageEl.appendChild(metaEl);
    messageEl.appendChild(contentEl);

    chatContainer.appendChild(messageEl);
    animateIn(messageEl);
    limitMessages();
    scheduleFadeOut(messageEl);
}

function parseMessage(text) {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function animateIn(el) {
    anime({
        targets: el,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        easing: 'easeOutQuad'
    });
}

function scheduleFadeOut(el) {
    setTimeout(() => {
        anime({
            targets: el,
            opacity: [1, 0],
            duration: 500,
            easing: 'easeInQuad',
            complete: () => el.remove()
        });
    }, CONFIG.fadeOutDelay);
}

function limitMessages() {
    const messages = chatContainer.getElementsByClassName('chat-message');
    while (messages.length > CONFIG.maxMessages) {
        messages[0].remove();
    }
}

async function fetchUserMeta(username) {
    const meta = { pronouns: '', watchtime: '' };
    try {
        const pronounRes = await fetch(`https://pronouns.alejo.io/api/users/${encodeURIComponent(username)}`);
        if (pronounRes.ok) {
            const pData = await pronounRes.json();
            if (pData.length && pData[0].pronoun_id) meta.pronouns = pData[0].pronoun_id;
        }
    } catch (e) {
        console.warn('Pronoun fetch failed', e);
    }

    try {
        const statsRes = await fetch('http://localhost:8080/api/watchtime?user=' + encodeURIComponent(username), {
            headers: { 'Authorization': 'Bearer [placeholder]' }
        });
        if (statsRes.ok) {
            const sData = await statsRes.json();
            if (sData && sData.watchtime) meta.watchtime = sData.watchtime;
        }
    } catch (e) {
        console.warn('Stats fetch failed', e);
    }
    return meta;
}

function showStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('hidden');
    if (statusAnim) statusAnim.pause();
    statusAnim = anime({
        targets: statusEl,
        opacity: [0.3, 1],
        direction: 'alternate',
        easing: 'easeInOutSine',
        duration: 1000,
        loop: true
    });
}

function hideStatus() {
    if (!statusEl) return;
    if (statusAnim) statusAnim.pause();
    anime({
        targets: statusEl,
        opacity: [1, 0],
        duration: 500,
        easing: 'easeOutQuad',
        complete: () => statusEl.classList.add('hidden')
    });
}

connectWebSocket();

function updateTime() {
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

async function updateChannelStats() {
    try {
        const res = await fetch('http://localhost:8080/api/channelStats', {
            headers: { 'Authorization': 'Bearer [placeholder]' }
        });
        if (res.ok) {
            const data = await res.json();
            if (viewerEl) {
                viewerEl.textContent = `Viewers: ${data.viewers}`;
                animateInfoUpdate(viewerEl);
            }
            if (followerEl) {
                followerEl.textContent = `Followers: ${data.followers}`;
                animateInfoUpdate(followerEl);
            }
            if (subEl) {
                subEl.textContent = `Subs: ${data.subscribers}`;
                animateInfoUpdate(subEl);
            }
        }
    } catch (e) {
        console.warn('Channel stats fetch failed', e);
    }
}

updateTime();
updateChannelStats();
setInterval(updateTime, 1000);
setInterval(updateChannelStats, CONFIG.statsRefreshInterval);

function animateInfoUpdate(el) {
    anime({
        targets: el,
        color: [CONFIG.platformColors.twitch, '#ffffff'],
        duration: 800,
        easing: 'easeInOutSine'
    });
}
