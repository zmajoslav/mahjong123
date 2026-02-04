# Performance & Lighthouse

## NO_NAVSTART / "Something went wrong with recording the trace"

Lighthouse sometimes fails to record the page load (metrics show **Error! (NO_NAVSTART)**). This is common when:

- Running against **localhost** or **file://**
- Using Chrome with "Disable cache" or strict extensions
- The page redirects or does heavy work before the first paint

**Recommendation:** Run Lighthouse on the **deployed URL** (e.g. `https://mahjongboss.com`) in an **Incognito** window (or a clean profile) with cache enabled. That usually gives stable metrics (FCP, LCP, TBT, CLS, Speed Index).

**Preloader and NO_NAVSTART:** When the landing/preloader is visible, **no app JavaScript runs until the window `load` event**. The bootstrap only schedules `init()` on `load`. So first paint and navigation are purely HTML+CSS (and deferred scripts don’t run until after parse). Game creation and board render run only after the user clicks "Play". Together this keeps the trace clean so Lighthouse can record metrics. For direct links with `#play`, init still runs on DOMContentLoaded so the game starts immediately.

## Changes made for Lighthouse

- **Fonts:** Removed render-blocking `@import` from CSS; fonts load via `<link>` with `display=swap` in HTML.
- **Scripts:** All body scripts use `defer` so they don’t block parsing.
- **Animations:** Particle and floating-text use `will-change: transform` so they stay composited (GPU-friendly).
- **Cache:** Server sets long `Cache-Control` for static assets (JS, CSS, images, fonts).
- **Compression:** Server uses gzip via the `compression` middleware to reduce response size.
- **LCP request discovery:** Main stylesheet is preloaded (`<link rel="preload" href="/styles.css" as="style">`) so the browser discovers it immediately and doesn’t lazy-load critical paint.
- **Render blocking / 3rd parties:** Google Fonts stylesheet loads with `media="print" onload="this.media='all'"` so it doesn’t block first paint; fonts still apply once loaded.
- **Viewport:** All pages use `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` so mobile tap delay is avoided. If Lighthouse still flags “Optimize viewport”, re-run on the live URL in a real mobile device or emulation.

## Cache lifetimes

The **Express server** sends `Cache-Control: public, max-age=31536000` for static assets (`.js`, `.css`, images, fonts, etc.), so repeat visits benefit from long-lived cache. The service worker (`public/sw.js`) also caches assets. HTML is not given a long cache so updates deploy correctly.

## Minify CSS / JavaScript

Lighthouse may flag "Minify CSS" and "Minify JavaScript". Options:

1. **Host-level:** Many hosts (e.g. cPanel with "Optimize" or a CDN) minify automatically.
2. **Build step:** Run `npm run build:min` before deploy to generate minified assets (see below).

## Optional: build:min

To produce minified files for production:

```bash
npm run build:min
```

This creates `public/client.min.js`, `public/solitaire-engine.min.js`, and `public/styles.min.css`. Point your server or HTML to these in production (e.g. replace script/link `src`/`href` with the `.min` versions when deploying), or configure the server to serve `.min` when `NODE_ENV=production`.

---

## Layout shift culprits (CLS)

Layout shifts happen when content moves after load (e.g. fonts swapping, images loading without dimensions). We use `font-display: swap` so text appears immediately. To reduce CLS further you can:

- Give images and video fixed `width`/`height` (or aspect-ratio) so space is reserved.
- Avoid inserting content above existing content unless in response to user input.
- Use `font metric overrides` (e.g. size-adjust) for critical fonts if you self-host; with Google Fonts this is limited.

## Optimize DOM size

A large DOM increases style/layout work and memory. The game board has many tile nodes by design. If Lighthouse flags this:

- Keep the number of visible tiles to what’s needed for the layout.
- Avoid unnecessary wrapper elements in the tile markup.
- For very large layouts, consider virtualizing off-screen tiles (advanced).

---

## Modern HTTP (HTTP/2, HTTP/3)

Lighthouse may suggest using HTTP/2 or HTTP/3 for multiplexing and better throughput. This is **configured on the server or host**, not in app code:

- **cPanel / Apache:** Enable `mod_http2` or use a host that offers HTTP/2.
- **Nginx:** `listen 443 ssl http2;` (and optionally HTTP/3 if supported).
- **Node behind a reverse proxy:** The proxy (Nginx, Caddy, Cloudflare) typically terminates HTTPS and speaks HTTP/2 to clients; the Node app can stay on HTTP/1.1.
