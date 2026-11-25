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
- `js/rwl_theme_sound.js`: themes can have a looping sound (the Halloween 2026 and 2027 themes use their theme song). Default volume 30 %, volume 0 to 100 and a mute switch live in the theme settings and are stored on the backend. The launcher floating menu shows the same controls while the theme has sound.

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
- `js/rwl_theme_sound.js` loads the sound through an authenticated request (no file URL) and keeps it in the cache storage, loops it, default volume 30, volume slider and a mute switch in the theme settings. Every theme with a sound gets the same settings, it works on every page (also Labcord and the Asset Archive) and continues across page changes and tabs, see the last section.

## Chat, Labcord And Emoji
- `js/rwl_emoji.js` with `js/rwl_emoji_data.js` and `js/emoji_names/<lang>.js` is the picker (search in the current language, nine categories). The font is `fonts/twemoji.woff2` (license next to it), applied through `css/rwl_social.css`.
- Links to images and GIFs show the media in the chat through the backend media proxy. Pets, badges and nameplates appear in the chat window, the profile cards and Labcord. Name colours with the direction *center to outside* shrink-wrap the text so the colours really run from the inside.
- `js/i18n/<lang>_atlas.js` holds the texts of this round including the server messages shown in the chat.

## Images
- Every image exists exactly once. New: `images/main/labs_coin.webp` and the six locker images in `images/assets/inventory/`. Removed: the four old coin images, `images/main/rickware-labs_chest.webp` (the chest lives in `images/assets/lab_pass/`), `images/partner/r_l_logo_1.webp` and every image that no page or config references.

## Presence, Icons And Labcord Tools (round 2026-11-22)
- `js/rwl_presence.js` and the account setting *Display Always Online (Admin Only)* now describe the new rule: other members see the status the member picked, the real status stays untouched.
- `RWL.uiIcon(name, size)` in `js/api_client.js` returns built in SVG icons (`emoji`, `emoji_add`, `reply`, `edit`, `pin`, `eye_off`, `trash`, `close`, `plus`, `crown`, `users`, `gift`, `lock`, `search`, ...). The chat, the groups, Labcord, the gifts dialog and the notification popups use them instead of emoji, no image files are needed. They follow the text colour and therefore every theme.
- Labcord: centered *Add Server* button, Quick Switcher (`js/labcord_switcher.js`, Ctrl or Cmd + K or the search button in the rail), search in the loaded messages and a pinned messages list in server channels (`js/rwl_social.js`, `js/rwl_groups.js`), headings, lists and subtext in `renderMarkdown()`. Personal Pets next to usernames are animated unless reduced effects or low end mode is on.
- Avatar decorations are a few pixels smaller everywhere (`css/main.css`, `css/rwl_upgrade.css`, `css/rwl_social.css`, `css/labcord.css`).
- Theme sound: `js/rwl_theme_sound.js` keeps volume and mute per theme (`mountField(container, themeId)` in the locker theme settings, title *Sound Settings*) and resumes the position after a page change (`sessionStorage`, only theme id and seconds).
- Languages: `rwl_boot.js` also loads `js/i18n/<lang>_apex.js`.

## Payment Methods, Download Menu And Visual Fixes (November 2026, second round)
- `sites/payment_methods.html` with `css/payment_methods.css` and `js/payment_methods.js`: the payment methods of the store in the account page design, stacked layout with a two column navigation on phones.
- `downloadLauncher()` in `js/main.js` opens a platform menu (`.launcher-platform-*` in `css/main.css`): Windows is selectable, macOS and Linux stay disabled until `GET /api/launcher/installer/info` reports them as available.
- `js/lab_hub.js`: `formatCompact()` shortens numbers in the Personal Pet area.
- `js/inventory.js`: the theme settings button also shows for themes that only have a sound (`item.sound_url`).
- `sites/Discord Asset Archiv/css/main.css`: the color channel variables were replaced by literal values so the theme engine can recolor the page, the frame overlay variables were adjusted.
- Language packs: `js/i18n/<lang>_apex.js`.


## Lab Pass Special Quests (November 2026, third round)
- `js/lab-pass.js`: the Daily Challenges card shows the special quests of the payload (`daily_challenges.specials`) on top (gold card with the tag *Special*, progress, remaining time and reward chips with pictures). Completed special quests move to the bottom and stay there until their days are over, also when *Hide Completed* is used. Extra quests of the day carry a *Bonus* tag. Styles: `css/lab-pass.css` (`.lp-special-*`, `.lp-bonus-tag`).
- Language packs: `js/i18n/<lang>_apex.js`.

## Discord Linking, Discord Account Card And Idle Status (November 2026, fourth round)
- `sites/account_settings.html`: the card `Link Your Discord Account` sits right below the title (hidden until the server says that no account is linked), the read only Discord card sits inside `Account Information`. `js/discord_link.js` runs the flow (digits only input, `Link Account`, timer `Resend in m:ss`, `Resend`, error text from the server, status polling every 4 seconds) and renders the card. Only images from the badge repository and the Discord CDN are accepted, every value is escaped, real Discord colors carry `--rwl-keep` so the theme engine leaves them alone. `css/discord_link.css` follows the theme engine, no inline script, no stored data in the browser.
- `css/sessions.css`: the values of a session stay on one line and scroll with a thin bar.
- `js/main.js`: the dashboard members refresh their status every 30 seconds (`refreshDashboardPresence`), `js/rwl_presence.js`: `effectiveSelf()` (own status with automatic idle), `js/labcord.js`: own status and friend rows show idle and do not disturb, `js/bazaar.js` and `css/bazaar.css`: seller dot for away and do not disturb.
- Language packs: `js/i18n/<lang>_apex.js`.

## Notification Center, Continuous Theme Music And Token Handling (November 2026, fifth round)
- `index.html`: the bell (`#notificationWrapper`) sits between the cart and the sign in area and is only shown while signed in. `js/rwl_notification_center.js` renders the glass drop down (`css/rwl_notification_center.css`): *Recent* (30 newest of every area with an area marker), one tab per area with its history and *Load more*, *Mark all read*, *Clear this area*, *Clear all*, relative times in the language of the page (`Intl.RelativeTimeFormat`), the badge, a refresh every 60 seconds, a refresh on every `notification` event of the event hub and when the tab becomes visible. A click on a message marks it as read first and then opens the target (a fixed list of pages and tabs). Every name and title is escaped. Follows every theme, works on phones (the panel becomes a sheet below the top bar).
- `js/rwl_theme_sound.js` (rewritten): audio kept in the cache storage `rwl-theme-sound-v1` (removed on sign out), shared timeline `rwl_theme_sound_timeline` in the local storage (start position of every page and tab), one playing tab (owner record plus broadcast channel `rwl_theme_sound`), no pause while the tab is hidden, shared volume and mute, retry of failed downloads, start at the first user action when autoplay is blocked. Public functions and events stay the same (`setVolume`, `setMuted`, `mountField`, `state`, `active`, `refresh`, `rwl-theme-sound-change`).
- `js/api_client.js`: session renewal through one lock (`navigator.locks`) for all tabs, adoption of the newest token of the remembered sign in (only for the same session id), a broadcast of renewed tokens to other tabs (`rwl_tokens`), one retry with the shared token and a sign out only when the server rejects the session. A temporary failure returns an error answer with status 502 instead of the 401 so no page signs the member out.
- `sites/Discord Asset Archiv/js/main.js` and `css/main.css`: the upper frame parts use `--frame-top-offset` (1.5 percent), the lower parts keep `--frame-bottom-offset`.
- `js/rwl_upgrade.js` and `css/rwl_upgrade.css`: the settings row *Display Always Online (Admin Only)* shows *Manually activated by* and the username when the owner unlocked it for this member.
- Language packs: `js/i18n/<lang>_apex.js`.

## Idle Lab, Redeem Reveal, Stacks, Product Pause And Theme Sound (November 2026, sixth round)
- Idle Lab (`js/lab_hub.js`, `css/lab_hub.css`): every click counts at once on the page and is sent in chunks of `click_chunk_size` (10) to `POST /api/growth/lab/click` together with the gaps between the clicks. A shorter last burst is sent after 700 ms without a click, after 3 seconds at the latest and when the page is hidden or closed (`pagehide`, `visibilitychange`). The shown research is the server value plus the clicks that are still on their way, a failed request is retried. Clicks that are not real (`isTrusted` false) are ignored. If the server freezes the lab (`423` with `X-Lab-Frozen-Seconds`) the whole lab is replaced by a countdown and nothing can be clicked until it ends. New sections: critical discoveries, milestones with claim buttons, breakthroughs and lab statistics.
- Redeem result (`renderCodes()`, `redeemCode()`): the answer `entries` of `POST /api/growth/codes/redeem` is shown as boxes side by side, grouped by category (*Currency And Boosts*, *Name Colors*, *Nameplates*, *Avatar Decorations*, *Launcher Themes*, *Nameplate Outlines*, *Content Borders*), every item animated the way members use it, with the rarity, a note if it was added or already owned, a staggered reveal and no motion for `prefers-reduced-motion`.
- Locker (`js/inventory.js`): coupon codes, license keys, license vouchers and repeated items are one slot with a counter (`.inv-stack-count`), the button *All* opens the list of keys of a stack. Gifts (`js/rwl_gifts.js`) and the Lab Bazaar (`js/bazaar.js`) show *Left after sending*, *Left in your inventory* and the number left after listing.
- Mystery chest (`sites/chest_opening.html`): the stop position of the roulette is computed from the measured card centers, so the card under the marker is the received item.
- Products (`js/main.js`): `refreshToolState()` applies `catalog_overlay` and `product_states` of the backend (`applyCatalogOverlay()`, `mergeChannelProducts()`): products created or edited in the owner panel replace or extend the static `config/products.json`, hidden ids (deleted products, beta products for non beta members) are removed, paused products get the label *Paused*, the reason, disabled buy and download buttons and a note in the product dialog. Images that start with `/api/product_media/` are loaded from the API host.
- Theme sound (`js/rwl_theme_sound.js`): default volume 30, a status line below the volume slider (loading, playing, playing in another window, click to start, retrying), exactly one tab plays, the others follow the same timeline. Halloween 2026 and 2027 use `RwL-Halloween-Theme.ogg` from the sounds folder of the server.
- Languages: the new pack `js/i18n/<lang>_zenith.js` (nine languages) is loaded by `js/rwl_boot.js` next to the older packs.

## Smooth Theme Fades, Source Downloads, Card Share And XP Note (November 2026, seventh round)
- `js/rwl_boot.js`: animated launcher themes are applied once with `hsl(calc(var(--rwl-fg-hue) + offset) S L)` colors; `CSS.registerProperty` registers the angles `--rwl-fg-hue` and `--rwl-bg-hue`, a generated style element (`#rwlThemeHueAnimation`) animates them with `@keyframes rwlThemeHueShift`. The class `rwl-hue-driven` on the root element marks the mode, `rwl-low-fx` switches to 20 steps per second and `rwl-hue-paused` freezes it while the page scrolls. The old stepped engine (`animationFrame`) stays as the fallback for browsers without `CSS.registerProperty`.
- Speed sliders (`inventory.js`, `lab_hub.js`, `labcord_extras.js`) start at `speed_min` (1.00x for animated themes and gradient name colors). `api_client.js` and the panel script `cosmetic_view.js` close open gradients (`seamlessStops`) and use linear timing for every name effect.
- `css/main.css`: the favourite star moves below the image counter of a product card.
- `js/launcher_bridge.js`: `runAction(productId, kind)`; `kind === 'source'` only calls `installTool`. `main.js` and `inventory.js` pass `source` for Discord bots, websites and every source code license (`download_only` of the license stacks).
- `js/lab_hub.js`: button *Share To Discord* (needs a linked account, the answer texts come from the server), redeem result box with expired XP, note about XP and manual linking for members without a linked Discord account (`GET /api/growth/hub` -> `discord_linked`), styles in `css/lab_hub.css`.
- Languages: pack `meridian` (`js/i18n/<lang>_meridian.js`) is loaded by `rwl_boot.js` on every page.
