# Rickware - Labs© Website

Static website of the Rickware - Labs platform. It is published on GitHub Pages and also shown inside the launcher.
The website is a thin client: every decision (prices, rolls, ownership, licenses, limits, locks, security checks) is made by the
backend at `https://rickware-labs-api.apps.bot-hosting.cloud`. Nothing security relevant is validated or stored in the browser.

## Project Structure

```
Rickware - Labs - Website/
├── index.html                 Main page (Home, Store, Dashboard, Forum, Reviews, Bank, Account Settings)
├── sites/                     Sub pages (inventory, chest opening, Lab-Pass and more)
├── css/                       Stylesheets, rwl_upgrade.css holds the shared effects, lightbox, download center and low effect rules
├── js/
│   ├── rwl_boot.js            Language engine, theme engine, automatic low effect mode
│   ├── api_client.js          API wrapper, request signing, Turnstile header, cosmetic rendering helpers
│   ├── main.js                Main page logic
│   ├── inventory.js           Virtualized inventory, config bar and hover previews
│   ├── lab-pass.js            Lab-Pass, level purchase, claim all, quest swaps
│   ├── rwl_scenes.js          Animated seasonal theme scenes on a single canvas
│   ├── rwl_guard.js           Turnstile, adblock detection, input telemetry, security block screens
│   ├── rwl_upgrade.js         Live viewers, image lightbox, download center, XP exchange, personal data area
│   ├── rwl_fx.js              Server driven client effects
│   ├── rwl_troll_extra.js     Additional server driven client effects
│   └── i18n/                  Language packs (de, ru, fr, es, it, pt, ja, ko, zh)
├── config/products.json       Product list including the base changelogs
└── images/                    Logos, icons and inventory artwork
```

## Run Locally

The website has no build step. Serve the folder with any static web server:

```bash
python -m http.server 8080
```

The backend only accepts origins listed in `app.allowed_origins`, so add your local origin there when testing against a real backend.

## Deployment

Deploy the backend first, then publish this folder on GitHub Pages. New website code relies on the new backend endpoints.

## Languages

English is the main language. All text in the code is English, and `rwl_boot.js` translates the rendered page with the language packs.

Every new English UI text needs an entry in all 9 packs in `js/i18n/`:

```js
RWLI18n.register("de", { "English text": "Translated text" }, [["Claim All ({#0})", "Alle Abholen ({#0})"]]);
```

Patterns use numbered placeholders: `{0}` matches any text and `{#0}` matches a number.

Visitors get the language of their IP address. Signed in users get English unless they choose another language in Preferences.

## Dialogs

Native browser popups are not used. Use `RWLDialog.confirm({ title, message, confirmText, danger })` and `RWLDialog.alert(message)` from `rwl_boot.js`. Both return a promise. `window.alert` opens the same dialog.

## Security Features

| Feature | How it works |
|---------|--------------|
| Signed API requests | `api_client.js` signs signed in requests with HMAC SHA-256, a timestamp and a one time nonce. The key comes from the backend and is bound to the session. |
| Cloudflare Turnstile | Shown on sign in, registration and password reset when enabled in the Security Center. |
| Anti adblock | Signed in users only. Combines bait element, bait iframe, bait script, ad network probe, removed snippet and server beacon checks. A detected blocker blurs the whole page until it is turned off. Visitors without an account are not blocked. |
| Anti automation | Sends only the number of key presses, clicks, mouse moves and scroll events per second, never the typed content. |
| Security screens | A locked account sees the reason and the end of the lock. The session is ended by the backend. |

These checks support the backend. They run on the client, so a determined attacker can bypass them. The backend remains the authority.

## Performance

- Inventory grids are virtualized, so only the visible items are rendered.
- Avatar decorations use small animated WebP thumbnails from the backend.
- Nameplate videos only load while they are visible.
- Theme scenes draw prerendered sprites on one canvas and adapt to the device.
- Slow devices are detected automatically and switch to the low effect mode (`rwl-low-fx`), which removes `backdrop-filter`, shine animations and card shadows.
- Users can also turn on Reduced Effects in Preferences.

## Cosmetics

| Category | Notes |
|----------|-------|
| Themes | 40 exclusive special themes for 2026 to 2030, sorted first by year, each with its own icon and interactive scene (`js/rwl_scene_pieces.js`). Later seasonal themes up to 2050 stay locked until their year starts, unless `cosmetics.release_all_seasonal_themes` is enabled. |
| Name Colors | Includes mythic effects. Animated colors have a playback speed and a direction. |
| Avatar Decorations, Nameplates | Playback speed plus a hue, saturation and brightness filter with a Default button. |
| Nameplate Outlines | 137 items, each with its own animated effect (`css/rwl_frames.css`). Color editor with one field per effect color and a Default button. |
| Content Borders | 137 items for review boxes, forum posts, comments and replies, with the same color editor. |

Every inventory area has a search bar in both tabs, themes can also be filtered by year. All settings are stored and validated on the backend and apply everywhere.

## Launcher Bridge

Inside the launcher the page talks to `window.RickwareBridge`. The download center uses the `getDownloads` bridge method and shows
speed, progress, updates and running sessions. Outside the launcher it explains that tool downloads run inside the launcher.
