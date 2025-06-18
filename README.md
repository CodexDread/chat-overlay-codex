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

### Twitch
Create a Twitch application to obtain a **Client ID** and OAuth token. The token must include chat capabilities (IRC) and any scopes you use for additional API requests.

### StreamElements
Generate a JWT socket token from the StreamElements overlay settings. This token allows the overlay to listen for alert events and request user data such as watchtime.

### Streamer.bot
Set the `wsUrl` to the WebSocket address of your Streamer.bot instance. Scene change events are used to switch orientation automatically.

## Files

- `index.html` – main overlay markup.
- `styles.css` – styling and layout rules.
- `config.js` – configuration constants (edit to match your channel).
- `overlay.js` – application logic and API integrations.

## License

This project is released under the terms of the **GNU General Public License v3.0**.

## StreamElements Overlay Setup

To use the overlay directly inside the StreamElements editor:

1. Create a new **Custom Widget** in your StreamElements overlay.
2. Copy the contents of `se-overlay/html.html` into the widget's **HTML** tab.
3. Copy the contents of `se-overlay/css.css` into the **CSS** tab.
4. Copy the contents of `se-overlay/js.js` into the **JS** tab.
5. Replace the placeholder tokens in the `CONFIG` object with your Twitch, StreamElements and Streamer.bot credentials.
6. Save the widget and add it to your overlay scene.
7. Use a query parameter `?orientation=horizontal` in the overlay URL or emit an OBS scene change event containing `[horizontal]` or `[vertical]` from Streamer.bot to switch layouts.
8. Add `?debug=true` to the URL if you want the debug console visible on load. Press **Ctrl+D** (or **Alt+D**) to toggle it at any time during testing.

The debug console logs connection states and any errors.

