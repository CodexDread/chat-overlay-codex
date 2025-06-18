# OBS Dynamic Chat Overlay

This project provides a fully browser-based chat overlay for OBS. It combines the Twitch API, StreamElements API, Streamer.bot WebSocket events and [anime.js](https://github.com/juliangarnier/anime) to produce an animated, scene-aware chat display.

## Features

- Orientation can be set by query parameter (`?orientation=vertical|horizontal`) or changed on the fly via Streamer.bot scene change events.
- Real-time Twitch chat connection using `tmi.js`.
- StreamElements WebSocket support for alerts and additional metadata.
- Optional pronoun display through [pronouns.alejo.io](https://pronouns.alejo.io/) and watchtime lookups via StreamElements.
- Animated entrance/fade of messages using anime.js.
- Theme customization via `styles.css`.

## Getting Started

1. Clone or download this repository.
2. Serve the files locally or on a web server reachable by OBS.
3. In OBS add a **Browser Source** pointing to `index.html`. You can append `?orientation=horizontal` or `?orientation=vertical` if you want to force a mode.
4. Adjust width, height and FPS in OBS to fit your layout.

## Configuration

All configuration is stored in `config.js`. The file contains placeholders for tokens and IDs:

```javascript
const CONFIG = {
    streamerBot: { wsUrl: 'ws://localhost:8080/StreamerBot' },
    twitch: {
        channel: '[CHANNEL]',
        username: '[BOT_USERNAME]',
        token: '[YOUR_TOKEN_HERE]',
        clientId: '[CLIENT_ID]'
    },
    streamElements: {
        jwtToken: '[YOUR_SE_JWT]',
        channelId: '[SE_CHANNEL_ID]',
        baseUrl: 'https://api.streamelements.com/kappa/v2'
    }
};
```

