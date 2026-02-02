# Fix: mahjongboss.com showing "It works! NodeJS 24.6.0" instead of Mahjong app

Your app runs (e.g. on port 3001), but the **domain** is still pointed at the default Node.js stub. Fix it from cPanel and/or support.

---

## 1. Fix from cPanel (try this first)

### A. Point the domain to your app

1. In cPanel, open **Setup Node.js App** (or **Application Manager** / **Node.js Selector**).
2. Find your **mahjong123** application (the one with **Application root** = `repositories/mahjong123` and **Startup file** = `src/server.js`).
3. Check **Application URL**: it must be exactly the domain you use (**mahjongboss.com** and, if you use it, **www.mahjongboss.com**). If it shows something else (e.g. a different domain or subdomain), add/change it so **mahjongboss.com** is linked to this app.
4. Ensure **Application root** is `repositories/mahjong123` (or the full path to the folder that contains `src/server.js` and your `.htaccess`).
5. Click **Restart** for the application.
6. Wait a minute, then open **https://mahjongboss.com/ping**. You should see **Mahjong app OK**.

### B. Where .htaccess must be

The `.htaccess` that proxies to port 3001 is in your repo: `repositories/mahjong123/.htaccess`.  
For it to be used, the **domain’s document root** must be that folder (or a folder that contains this file). In cPanel Node.js apps, that’s usually set by **Application root**; if the domain is instead pointing at `public_html` or another directory, that directory would need its own `.htaccess` (see below).

### C. If the domain uses public_html

If mahjongboss.com is set to serve from **public_html** (or another folder) instead of `repositories/mahjong123`, put a **copy** of `.htaccess` in that folder so the proxy runs when someone visits the domain:

- Copy the contents of `repositories/mahjong123/.htaccess` into `public_html/.htaccess` (or the domain’s document root).
- Ensure your Node app is running (e.g. port 3001) and restart it if needed.

---

## 2. If [P] (proxy) is not allowed

Some hosts don’t allow the `[P]` flag in `.htaccess`. If you get a **500 error** with the current rule, the server may have proxy disabled for user `.htaccess`. In that case you can’t fix it yourself; ask support to either enable proxy for your account or route mahjongboss.com to your Node app (Section 3). Do **not** remove `[P]` and use only `[L]` for the same URL — that would redirect the browser to `http://127.0.0.1:3001`, which won’t work for visitors.

---

## 3. What to ask Namecheap support

If the domain still shows the stub after the steps above, open a ticket and send something like this (adjust paths/port if different):

**Subject:** Domain mahjongboss.com serves default Node.js stub instead of my app

**Message:**

I have a Node.js app (Express) deployed via cPanel Node.js Selector. The app runs and listens on port 3001. When I open **https://mahjongboss.com** or **https://mahjongboss.com/ping**, I still see the default "It works! NodeJS 24.6.0" page instead of my application.

- **Application root:** `repositories/mahjong123` (contains `src/server.js`, `package.json`, `.htaccess`)
- **Startup file:** `src/server.js`
- **App port:** 3001
- **Expected behavior:** https://mahjongboss.com/ping should return plain text: **Mahjong app OK** (my app’s health check). Currently it returns the stub page.

Please:

1. Confirm which Node.js application and document root are set for **mahjongboss.com** (and **www** if applicable).
2. Ensure the domain is routed to my app (port 3001), not to the default Node.js stub.
3. If the proxy flag [P] in `.htaccess` is disabled, please enable it for my account or configure the reverse proxy so that mahjongboss.com forwards to 127.0.0.1:3001.

Thank you.

---

## 4. Quick check after any change

- **https://mahjongboss.com/ping** → should show only: **Mahjong app OK**
- **https://mahjongboss.com** → should show your Mahjong game

If `/ping` still shows "It works! NodeJS 24.6.0", the domain is still hitting the stub; repeat cPanel steps or rely on support.
