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
};

const chatContainer = document.getElementById('chat-container');
let socket;

function connectWebSocket() {
    socket = new WebSocket(CONFIG.streamerBotWsUrl);
    socket.addEventListener('open', () => console.log('WS connected'));
    socket.addEventListener('message', handleSocketMessage);
    socket.addEventListener('close', () => setTimeout(connectWebSocket, 5000));
}

function handleSocketMessage(event) {
    const data = JSON.parse(event.data);
    if (data.event === 'OBS.SceneChanged') {
        updateOrientation(data.sceneName);
    } else if (data.event === 'Twitch.ChatMessage') {
        processChatMessage(data);
    }
}

function updateOrientation(sceneName) {
    if (!sceneName) return;
    if (sceneName.includes('[vertical]')) {
        chatContainer.classList.remove(CONFIG.orientationClassNames.horizontal);
        chatContainer.classList.add(CONFIG.orientationClassNames.vertical);
    } else if (sceneName.includes('[horizontal]')) {
        chatContainer.classList.remove(CONFIG.orientationClassNames.vertical);
        chatContainer.classList.add(CONFIG.orientationClassNames.horizontal);
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

connectWebSocket();
