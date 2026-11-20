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
│   ├── rwl_tutorial.js        First sign in welcome tour
│   ├── rwl_presence.js        Online, Do Not Disturb and Away
│   ├── rwl_notifications.js   System notifications (browser and launcher)
│   ├── rwl_theme_sound.js     Theme sounds with volume and mute
│   ├── rwl_switch_plan.js     Switch Plan popup
│   ├── rwl_nav.js             Sidebar sync and nameplate badges
│   ├── labcord_extras.js      Typing indicator and name colour picker for Labcord
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

The Windows installer is a build artifact of `Rickware - Labs - Installer` and is not stored in this folder. `config/config.json` holds its download path (`windows_launcher_file_path`, plus `macos_launcher_file_path` and `linux_launcher_file_path`). Installer V1.3.1 fixes a crash on non-English Windows (`AttributeError: 'NoneType' object has no attribute 'lower'`), so the rebuilt `rickware-labs_launcher_installer_windows_x64.exe` and its `.sha256` file have to be published under that path. No website file changes for it.

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

Texts of the growth round (Lab Hub, affiliate program, group chats, gifts, tool list, companion) live in `js/i18n/<lang>_growth.js`. `rwl_boot.js` loads this pack on every page automatically.

## Lab Hub

`sites/lab_hub.html` with `js/lab_hub.js` and `css/lab_hub.css` (sidebar tab *Lab Hub*, config key `lab_hub_tab`). Tabs: overview with events, community goals and activity, leaderboard, Experiment Crates with open odds, lab companion, idle lab, profile card, redeem codes, invite rewards and bug reports. Every value comes from `/api/growth/*`, the page never decides anything on its own. In the launcher the bug report attaches the latest launcher logs through the bridge method `getRecentLogs`.

## Affiliate Program

`sites/affiliate.html` with `js/affiliate.js` and `css/affiliate.css`, linked after *Sessions* in every settings page and in the profile menu. `js/rwl_growth.js` captures `?ref=CODE`, registers the visit through `/api/affiliate/visit` and keeps the returned token in `sessionStorage` until the registration sends it to the backend.

## Companion, Gifts And Group Chats

- `js/rwl_growth.js` (loaded by `api_client.js` on every page): floating lab companion, event banner, gift and bug reward popups.
- `js/rwl_gifts.js`: gift picker opened from the extended profile (*Send Gift*).
- `js/rwl_groups.js`: end to end encrypted group chats inside the chat window, invite links (`?group_invite=CODE`).
- `js/rwl_social.js`: draggable chat window, animated minimize to a floating bubble in the top left corner, chat list with direct messages and groups, avatar decorations, delete for me or everyone and the shared clear request.

## Tool List

The *Owned* view has favourites, category filters and search, launch counters, beta badges and the tool of the day banner with the 24 hour free trial (`/api/growth/tools`, `/api/growth/products/public`).

## Personal Pet
The Lab Hub tab is called Personal Pet. `js/rwl_pets.js` draws every body, variant and decoration from its key, names, rarities and unlock levels come from `/api/growth/companion/catalog`. The pickers filter by rarity, slot and name and show 30 entries per page.

## Profile Card Editor
The Profile Card tab of the Lab Hub is an editor for layout, colours, font, background, tagline, social links, name colour, card border, avatar decoration and nameplate. The preview is rendered by the backend, animated cards are downloaded as GIF.

## Labcord
`sites/labcord.html`, `js/labcord.js` and `css/labcord.css`. The page needs a login, sets `window.RWL_SURFACE = 'labcord'` and docks the encrypted chat component of `rwl_social.js` and `rwl_groups.js` into the main area. Server rail, channel list with categories, friends view, member list by role, server settings and the decoration switcher are part of `labcord.js`. The chat popup has an Open Labcord button and a channel picker.

## Other Changes
- The Customer Panel moved from the left sidebar into the profile menu.
- Category tabs follow a fixed order, Beta has its own tab.
- Owned Discord Bots, Websites and source only products show Download instead of Launch.
- The XP exchange has a Half button, a switch between XP and Lab Coins and themed step buttons.
- Auctions can be created in hours or days.
- New texts are in `js/i18n/<lang>_nova.js`, loaded automatically by `rwl_boot.js`.

## Welcome Tour
`js/rwl_tutorial.js` shows a guided tour (28 steps: every sidebar area, the top bar, the nameplate, the store and the dashboard) the first time a member signs in. It cannot be skipped and it is never shown again. The backend decides: `GET /api/experience/tutorial` returns `required`, `POST /api/experience/tutorial/complete` stores the result. Accounts created before the tour existed only see it when `tutorial.include_existing_accounts` is enabled in the owner panel.

## Navigation
- Top bar order: Dashboard, Lab Hub, Home, GitHub, Asset Archive, Status. `js/rwl_nav.js` keeps the sidebar in sync: Home highlights Store, Dashboard, Lab Hub and GitHub clear the sidebar selection. On screens up to 768 px the tabs form their own scrollable row below the search bar, between 901 and 1100 px they wrap below the bar.
- The account type and permission badges are small boxes inside the nameplate, right of the cart (`.rwl-nameplate-badges`).
- **Asset Archive** (`asset_archive_tab` in `config/config.json`) opens `sites/Discord Asset Archiv/index.html` in a new tab and needs no account.
- The Beta category only exists for Beta, Admin and Owner accounts, the backend filters it (`product_channel_service`).

## Product Modal
Download and Launch are shown in the extended view for every product but only work inside the launcher (`RWLLauncher.runAction`). On the website the button stays greyed out with an explanation. Inside the launcher it reads **Download** until the tool is installed and **Launch** afterwards, source products only offer Download. Owned products replace **Buy Now** with **Switch Plan** (`js/rwl_switch_plan.js`): a popup lists upgrades, downgrades and the source code with the prorated credit from `GET /api/plans/{product_id}`. The checkout sends `switchFrom`, the backend calculates the price and retires the old license when the order is fulfilled.

## Presence, Notifications And Sound
- `js/rwl_presence.js`: Online, Do Not Disturb and Away (never invisible). The status applies to Labcord, the chat popup and the dashboard. The page switches to Away after the idle limit (default 5 minutes), the launcher reports system idle through the `idle` event. Admins with forced online always show as online, only visually. Status dots blink smoothly everywhere, also on phones (`.rwl-status-dot` keyframes in `css/rwl_experience.css`).
- `js/rwl_notifications.js`: system notifications for messages, friend requests and Labcord activity. In the browser through the Notification API after the member allowed it, in the launcher through `showNotification`. Do Not Disturb silences them.
- `js/rwl_theme_sound.js`: themes can have a looping sound (the Halloween 2026 and 2027 themes use their theme song). Default volume 37 %, volume 0 to 100 and a mute switch live in the theme settings and are stored on the backend. The launcher floating menu shows the same controls while the theme has sound.

## Member Profiles Everywhere
Names and avatars in forum posts, comments, reviews, the dashboard and Labcord open the same extended profile (`data-profile-user`, handled once in `js/rwl_social.js`) with Message, Add Friend and Block. Signed out visitors are not redirected, the click is ignored. The profile shows the real account type and permission badges, the same as the nameplate.

## Labcord
`sites/labcord.html` is titled `Rickware - Labs© - LabCord`. Groups are called **servers** everywhere. Icon limits come from the backend (10 MB members, 25 MB admins, 100 MB owners, owner panel section *Labcord*). Admin and Owner accounts have every permission in every server without a visible mark. New in this round:
- Role colours support the complete name colour catalog and a scope: usernames and category title, or only the category title in the member list. Colour pickers follow the active theme.
- Drag and drop ordering for categories, channels, roles and servers, saved by the backend.
- Reactions, edit, reply and pinned messages in the chat component (`js/rwl_groups.js`) and a custom typing indicator (presets or free text, shown instead of the name and "is typing") plus the name colour picker in `js/labcord_extras.js` with `css/labcord_extras.css`.
- Files, links and images stay Admin and Owner only. There will never be voice, video or voice messages.
- The direct message composer is always visible (grid rows fixed in `css/labcord.css`).
- The dashboard has an **Open LabCord** button left of Messages.

## Asset Archive
`sites/Discord Asset Archiv/` is part of the platform now. Assets are not read from this folder any more, the page asks the backend (`/api/asset_archive/overview`, `items`, `media/{id}`, `download/{id}`, `download_all`, `showcase`) which reads the file database. Items have opaque ids, the page never shows a path. A category without files shows **No assets found**. The preview shows the first member of the database for visitors and the own profile for signed in members, in the active launcher theme. Downloads are streamed as ZIP archives in chunks. Files of this folder: `config/archive_routes.js` (API routes), `config/archive_labels.js` (texts, plural names), `js/modules/archive_api.js`, `asset_utils.js` and `download_manager.js`.

## Personal Pet And Profile Card
Personal Pets go up to level 10000. Every level pays XP (`level_reward` in the companion catalog, growing with the level) but only when Discord is linked, otherwise the page shows a note with a link. Pets and decorations animate permanently, `prefers-reduced-motion` only applies when the member enabled Reduced Effects (`rwl-user-reduced-fx`). The profile card renderer uses the same name colour logic as the page (direction, speed, effect, custom settings) and a corrected decoration ratio.

## Responsive Layout
Every page was checked at 390 px without horizontal scrolling. The top bar compacts in steps (labels hidden below 1700 px, tabs wrap below 1100 px, own tab row below 768 px).

## Languages
`rwl_boot.js` loads `js/i18n/<lang>_orbit.js` on every page automatically (texts of this round for all 9 languages, including patterns such as "You can own at most {#0} servers").

## Top Bar, Login And Locker
- One *Login / Register* button opens the login page (switch between both forms there). The *Download Launcher* button sits between the logo and the store search and asks the backend for the installer of the visitor's platform. `config/config.json` key `download_button` shows or hides it, the old `*_launcher_file_path` keys are gone because the backend serves the file.
- The login form has a *Remember me* switch (`#login-remember`). Inside the launcher it is the launcher Auto Login. The account settings keep the *Keep me signed in* switch.
- Locker and inventory: the category images carry no text, the name is shown under the logo. Unequipping an item asks for a second confirmation (`RWLDialog.confirm`).

## Theme Sound
- `js/rwl_theme_sound.js` loads the sound through an authenticated request into memory (no file URL), loops it, default volume 30, volume slider and a mute switch in the theme settings. Every theme with a sound gets the same settings, it works on Labcord and the Asset Archive.

## Chat, Labcord And Emoji
- `js/rwl_emoji.js` with `js/rwl_emoji_data.js` and `js/emoji_names/<lang>.js` is the picker (search in the current language, nine categories). The font is `fonts/twemoji.woff2` (license next to it), applied through `css/rwl_social.css`.
- Links to images and GIFs show the media in the chat through the backend media proxy. Pets, badges and nameplates appear in the chat window, the profile cards and Labcord. Name colours with the direction *center to outside* shrink-wrap the text so the colours really run from the inside.
- `js/i18n/<lang>_atlas.js` holds the texts of this round including the server messages shown in the chat.

## Images
- Every image exists exactly once. New: `images/main/labs_coin.webp` and the six locker images in `images/assets/inventory/`. Removed: the four old coin images, `images/main/rickware-labs_chest.webp` (the chest lives in `images/assets/lab_pass/`), `images/partner/r_l_logo_1.webp` and every image that no page or config references.
