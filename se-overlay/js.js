const CONFIG = {
  twitch: {
    channel: '[CHANNEL]',
    token: '[TWITCH_TOKEN]',
    clientId: '[CLIENT_ID]'
  },
  streamElements: {
    jwtToken: '[SE_SOCKET_TOKEN]'
  },
  streamerBot: {
    wsUrl: '[WEBSOCKET_URL]'
  },
  maxMessages: 20,
  fadeTime: 15000,
  debug: false
};

(function(){
  const chat = document.getElementById('chat-container');
  const debugEl = document.getElementById('debug-console');
  let streamerWs, twitchClient, seSocket;

  function loadScript(url){
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function logDebug(msg, err){
    if(debugEl.classList.contains('hide')) return;
    const ts = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.textContent = `[${ts}] ${msg}`;
    if(err) line.style.color = '#f55';
    debugEl.appendChild(line);
    debugEl.scrollTop = debugEl.scrollHeight;
    (err ? console.error : console.log)(msg);
  }

  function initDebugConsole(){
    const params = new URLSearchParams(location.search);
    if(params.get('debug') === 'true' || CONFIG.debug) {
      debugEl.classList.remove('hide');
    }
    document.addEventListener('keydown', e => {
      if((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.altKey)) {
        debugEl.classList.toggle('hide');
      }
    });
  }

  function applyOrientationSettings(o){
    chat.classList.toggle('horizontal', o === 'horizontal');
    chat.classList.toggle('vertical', o !== 'horizontal');
    logDebug('Orientation set to ' + o);
  }

  function getOrientationFromQuery(){
    const val = new URLSearchParams(location.search).get('orientation');
    return val === 'horizontal' ? 'horizontal' : 'vertical';
  }

  function handleNewChatMessage({user, avatar, text}){
    renderChatLine({user, avatar, text});
  }

  function renderChatLine({user, avatar, text}){
    const msg = document.createElement('div');
    msg.className = 'chat-message';

    const meta = document.createElement('div');
    meta.className = 'meta';
    if(avatar) meta.innerHTML += `<img src="${avatar}" alt="">`;
    meta.innerHTML += `<span>${user}</span>`;
    msg.appendChild(meta);

    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = text;
    msg.appendChild(content);

    chat.appendChild(msg);
    if(window.anime){
      anime({ targets: msg, opacity: [0,1], translateY: [20,0], duration: 400 });
      setTimeout(() => {
        anime({ targets: msg, opacity: [1,0], duration: 400, complete: () => msg.remove() });
      }, CONFIG.fadeTime);
    } else {
      msg.style.opacity = '1';
      setTimeout(() => msg.remove(), CONFIG.fadeTime);
    }
    trimMessages();
  }

  function trimMessages(){
    const msgs = chat.getElementsByClassName('chat-message');
    while(msgs.length > CONFIG.maxMessages) msgs[0].remove();
  }

  async function verifyTwitch(){
    if(!CONFIG.twitch.token || CONFIG.twitch.token === '[TWITCH_TOKEN]') {
      logDebug('No Twitch token provided');
      return;
    }
    try {
      const res = await fetch('https://api.twitch.tv/helix/users', {
        headers:{
          'Client-ID': CONFIG.twitch.clientId,
          'Authorization': 'Bearer ' + CONFIG.twitch.token
        }
      });
      if(res.ok){
        const data = await res.json();
        logDebug('Twitch auth OK: ' + data.data[0].display_name);
      } else {
        logDebug('Twitch auth failed: ' + res.status, true);
      }
    } catch(e){
      logDebug('Twitch check error: ' + e.message, true);
    }
  }

  async function verifyStreamElements(){
    if(!CONFIG.streamElements.jwtToken || CONFIG.streamElements.jwtToken === '[SE_SOCKET_TOKEN]') {
      logDebug('No StreamElements token');
      return;
    }
    try {
      const res = await fetch('https://api.streamelements.com/kappa/v2/users/me', {
        headers: { 'Authorization': 'Bearer ' + CONFIG.streamElements.jwtToken }
      });
      if(res.ok){
        const data = await res.json();
        logDebug('SE auth OK: ' + data.username);
      } else {
        logDebug('SE auth failed: ' + res.status, true);
      }
    } catch(e){
      logDebug('SE check error: ' + e.message, true);
    }
  }

  function connectStreamerBot(){
    if(!CONFIG.streamerBot.wsUrl || CONFIG.streamerBot.wsUrl === '[WEBSOCKET_URL]') {
      logDebug('No Streamer.bot URL');
      return;
    }
    streamerWs = new WebSocket(CONFIG.streamerBot.wsUrl);
    streamerWs.addEventListener('open', () => logDebug('Streamer.bot connected'));
    streamerWs.addEventListener('close', () => {
      logDebug('Streamer.bot disconnected');
      setTimeout(connectStreamerBot, 5000);
    });
    streamerWs.addEventListener('message', e => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if(data.event === 'OBS.SceneChanged' && data.sceneName){
        if(data.sceneName.includes('[horizontal]')) applyOrientationSettings('horizontal');
        else if(data.sceneName.includes('[vertical]')) applyOrientationSettings('vertical');
      }
    });
  }

  function connectTwitchChat(){
    if(!CONFIG.twitch.channel) return;
    twitchClient = new tmi.Client({
      connection:{ reconnect:true, secure:true },
      channels:[CONFIG.twitch.channel]
    });
    if(CONFIG.twitch.token !== '[TWITCH_TOKEN]') {
      twitchClient.opts.identity = {
        username: CONFIG.twitch.channel,
        password: 'oauth:' + CONFIG.twitch.token
      };
    }
    twitchClient.on('message', (channel, tags, message, self) => {
      if(self) return;
      handleNewChatMessage({
        user: tags['display-name'],
        avatar: tags['user-id'] ? `https://static-cdn.jtvnw.net/jtv_user_pictures/${tags['user-id']}-profile_image-70x70.png` : '',
        text: message
      });
    });
    twitchClient.connect()
      .then(() => logDebug('Twitch chat connected'))
      .catch(e => logDebug('Twitch connect failed: ' + e.message, true));
  }

  function connectSESocket(){
    if(!CONFIG.streamElements.jwtToken || CONFIG.streamElements.jwtToken === '[SE_SOCKET_TOKEN]') return;
    seSocket = new WebSocket('wss://realtime.streamelements.com/socket');
    seSocket.addEventListener('open', () => {
      logDebug('SE socket connected');
      seSocket.send(JSON.stringify({ method: 'handshake', token: CONFIG.streamElements.jwtToken }));
    });
    seSocket.addEventListener('close', () => logDebug('SE socket disconnected'));
    seSocket.addEventListener('message', e => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if(data.type === 'event') {
        handleNewChatMessage({ user:'SE', text: data.event.type });
      }
    });
  }

  function initConnections(){
    verifyTwitch();
    verifyStreamElements();
    connectStreamerBot();
    connectTwitchChat();
    connectSESocket();
  }

  function loadLibraries(){
    return Promise.all([
      loadScript('https://raw.githubusercontent.com/juliangarnier/anime/master/lib/anime.umd.min.js'),
      loadScript('https://raw.githubusercontent.com/tmijs/tmi.js/main/dist/tmi.min.js')
    ]);
  }

  async function init(){
    initDebugConsole();
    applyOrientationSettings(getOrientationFromQuery());
    try {
      await loadLibraries();
    } catch(e){
      logDebug('Library load error: ' + e.message, true);
    }
    initConnections();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
