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

## Server Status Banner

`js/rwl_boot.js` checks `GET /health` on every page load, for visitors and signed in users, and watches all API requests. Problems show a banner at the top of the page right away: server problems, no connection, blocked connection, too many requests or limited service. It checks again with growing pauses, and shows a short note with a Reload button when the server is back. Analytics and live viewer failures alone never show it, because ad blockers can cause them. Maintenance and freeze keep their own screen.

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

## Friends, Messages And Notifications

- `js/rwl_social.js` + `css/rwl_social.css`: dashboard cards in the nameplate format, hover profile popout, extended profile modal, notification center (messages, friend and message requests, friends), Discord style direct messages with end to end encryption (WebCrypto ECDH P-256, HKDF, AES-GCM). Keys only live in memory, the vault is unlocked with the chat passphrase.
- Dashboard cards are the nameplate itself (the nameplate video fills the whole card, about 58 px high): avatar with decoration and presence, name, badges and the online or last online state. Clicking or pressing Enter on a card always opens the extended profile with Message, Add Friend and Block. Hovering shows a read only preview that never blocks clicks (`pointer-events: none`) and disappears as soon as the pointer leaves the card.
- The extended profile shows the member's profile banner (static poster on low end devices, data saver mode or reduced motion). Without a banner, or when it fails to load, the nameplate is shown. Banner URLs are only accepted from `/api/profile_banner/` on the API host.
- Messages to members without a key are sealed with the sender's own key and delivered automatically after the recipient activated encrypted messages (`/api/social/pending`, `/api/social/messages/{id}/deliver`). The composer stays usable; it is only locked with a visible reason for unaccepted incoming requests or declined requests. Drafts survive a conversation reload. The notification center offers **Activate** for members without a key.
- Inside the launcher (`html.rwl-launcher-host`, set by `launcher_bridge.js`) the composer and the popups keep the bottom right corner free for the floating settings button. Popups move next to an open chat.
- `js/rwl_social_notify.js` is loaded on every page by `api_client.js`, runs one long poll and shows popups for messages, friend requests and bazaar events.
- `js/rwl_social_settings.js`: bio, privacy and safety section on `sites/account_settings.html`.

## Profile Banner

`sites/account_settings.html` and `js/account_settings.js`: section **Profile Banner** under the profile picture with a live preview (banner or the equipped nameplate), upload with progress (signed multipart request) and **Remove Banner** with a confirmation dialog. The page does not validate files; format, size (20 MB by default) and dimensions are checked by the backend and errors are shown in red.

## Lab Bazaar

`sites/bazaar.html`, `js/bazaar.js`, `css/bazaar.css`: browse, buy, bid, trade, sell wizard (fixed price, auction, trade slots), history drawer. Sidebar key `bazaar_tab` in `config/config.json`. The sidebar tab always opens the bazaar. Guests can browse listings and details, every action (buy, bid, trade, sell, history, own listings and bids) leads to the login page, and the backend requires a session for all of them.

## Inventory

Owned / Favourite / Index tabs, Pass Licenses (owned only), SVG theme icons (`js/rwl_icons.js`), flicker free virtual grid with keyed tiles, automatic media retries, modern config menu with a themed color picker, lightweight theme preview on low end devices.

## Behavior Analysis

`js/rwl_behavior.js` (loaded by `api_client.js`) sends pointer deltas, timings and typing rhythm to the backend every 15 seconds. Password fields are ignored. The device fingerprint header `X-RWL-Device` is only sent after the backend announces support.

## Languages For New Features

New texts live in `js/i18n/<lang>_community.js` and are loaded by pages that set `data-i18n-extra="community"` on the `rwl_boot.js` script tag (index, inventory, bazaar, account settings).
