# OBS Chat Overlay

## Project Overview

This repository contains an OBS-compatible HTML overlay for displaying chat messages with a Marathon-inspired design. The overlay connects to **Streamer.bot** for chat data, adapts its layout based on the active OBS scene, and augments messages with pronoun and watchtime metadata from third-party APIs. Animations are powered by **anime.js** and a subtle connection status indicator lets you know when Streamer.bot is online.

## Features

- **Scene-based orientation** – scenes tagged with `[vertical]` or `[horizontal]` automatically switch the layout.
- **Real-time chat display** using the Streamer.bot WebSocket API.
- **Platform detection** for Twitch or YouTube messages with colored tags.
- **User metadata** – optional pronoun lookups and watchtime stats.
- **Anime.js animations** for message entrance and fade out.
- **Marathon theme** – black background, neon accents and grid overlays.
- **Connection status indicator** that appears until Streamer.bot sends data.

## Installation

1. Clone or download this repository.
2. Serve the files locally or via a web server, e.g. `C:\OBS\overlays\chat`.
3. In OBS:
   - Add a **Browser Source**.
   - Set the source to `index.html` (local file path or URL).
   - Adjust width, height and FPS as needed.

## Configuration

The overlay relies on several external services.

### Streamer.bot WebSocket

Edit `overlay.js` and update `CONFIG.streamerBotWsUrl` with the WebSocket address for Streamer.bot. Include any tokens if your instance requires authentication.

### Twitch API

`CONFIG.twitchToken` is used when fetching pronouns or additional metadata. See the [Twitch API documentation](https://dev.twitch.tv/docs/api/) for creating an app and acquiring an OAuth token. Depending on your setup you may need scopes for reading chat and user data.

### Orientation Detection

Scenes are parsed for `[vertical]` or `[horizontal]` in the name. If no tag is found the last used orientation persists. Rename your scenes (e.g. `Gameplay [horizontal]`) to enable automatic switching.

### Style Customization

The CSS theme is defined in `style.css`. Edit the variables at the top of the file to adjust colors and fonts:

```css
:root {
    --bg-color: #000;
    --accent-teal: #00ffc6;
    --accent-magenta: #ff00a8;
    --accent-crimson: #ff304f;
    --accent-lime: #aaff00;
    --text-color: #ffffff;
}
```

You can also tweak message box styles, animation durations, and platform colors.

## File Overview

- **index.html** – Base HTML for the overlay and connection status element.
- **style.css** – Marathon-inspired styling and responsive layout rules.
- **overlay.js** – Connects to Streamer.bot, listens for scene changes and chat messages, fetches metadata, and triggers animations.
- **assets/** – (optional) icons or images referenced by the overlay.

## Dependencies

- [anime.js](https://animejs.com/) – included via CDN in `index.html`.
- [Streamer.bot API](https://docs.streamer.bot/api/csharp) – WebSocket connection and optional stats endpoint.
- [Twitch API](https://dev.twitch.tv/docs/api/) – used for pronoun/metadata lookups.

## Troubleshooting

- **No chat showing** – verify the Streamer.bot WebSocket URL and ensure the connection status indicator disappears after messages arrive.
- **Layout not changing** – confirm scene names contain `[vertical]` or `[horizontal]`.
- **Pronouns or watchtime missing** – check that your Twitch token and stats endpoints are configured correctly.

## License

This project is released under the terms of the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.
