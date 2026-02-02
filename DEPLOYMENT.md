# Mahjong Boss – Full Deployment Plan

Step-by-step guide for deploying on Namecheap shared hosting (cPanel / CloudLinux NodeJS Selector).

---

## 1. Prerequisites

- [ ] cPanel access
- [ ] SSH access (optional but recommended)
- [ ] PostgreSQL database created in cPanel (MySQL Databases → PostgreSQL)
- [ ] Domain `mahjongboss.com` added and pointed to your hosting

---

## 2. Database Setup

### 2.1 Create the database in cPanel

1. **cPanel → PostgreSQL Databases** (or MySQL Databases, depending on your plan)
2. Create database: `letswnsc_mahjong` (or note the exact name cPanel assigns)
3. Create user: `letswnsc_mahjonger` with a strong password
4. Add the user to the database with **ALL PRIVILEGES**

### 2.2 Run migrations (required for auth & leaderboard)

The app needs `schema.sql` applied once. Run this **from the server** (SSH or cPanel Run JS script):

```bash
cd /home/letswnsc/repositories/mahjong123
source /home/letswnsc/nodevenv/repositories/mahjong123/24/bin/activate
node src/scripts/runMigrations.js
```

**Via cPanel "Run JS script":**

- Set **Script path** to: `src/scripts/runMigrations.js`
- Click **Run** (ensure env vars DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are set first)

Expected output: `Migrations completed successfully.`

If migrations fail, the app will still start but **auth and leaderboard** will return 503 until the schema is applied.

---

## 3. Environment Variables (cPanel → Setup Node.js App → Environment variables)

| Name             | Value                          | Required |
|------------------|--------------------------------|----------|
| `NODE_ENV`       | `production`                   | Yes      |
| `PORT`           | `3001`                         | Yes      |
| `HOST`           | `127.0.0.1`                   | Yes (for reverse proxy) |
| `ALLOWED_ORIGINS`| `https://mahjongboss.com`      | Yes      |
| `JWT_SECRET`     | Long random string (min 16 chars) | Yes   |
| `DB_HOST`        | `localhost` (or host from cPanel) | Yes (for auth/leaderboard) |
| `DB_PORT`        | `5432`                         | Yes      |
| `DB_NAME`        | `letswnsc_mahjong`             | Yes      |
| `DB_USER`        | `letswnsc_mahjonger`           | Yes      |
| `DB_PASSWORD`    | Your DB password               | Yes      |
| `BASE_URL`       | `https://mahjongboss.com`      | Optional |

**Important:** Add `HOST=127.0.0.1` if missing. If your DB uses a remote host, set `DB_HOST` to that value (e.g. `localhost` or the host cPanel shows).

---

## 4. cPanel Node.js App Configuration

1. **cPanel → Setup Node.js App** (or Application Manager)
2. **Edit** the app using root `/home/letswnsc/repositories/mahjong123` (do NOT create a new app; use the existing one)
3. Set:

   | Field                   | Value                               |
   |-------------------------|-------------------------------------|
   | Application root        | `repositories/mahjong123`           |
   | Application startup file| `cpanel-start.js`                   |
   | Application URL         | `mahjongboss.com`                   |
   | Node.js version         | 24.x                                |
   | Application mode        | Production                          |

4. **Run NPM Install** (wait for completion)
5. **Restart** the app

---

## 5. Domain and Document Root (critical for “It works!” stub)

If you still see **"It works! NodeJS 24.6.0"** after the above:

- **mahjongboss.com** is being served by another Node app (the default stub) or by a different document root.

### Fix: ensure only YOUR app is mapped to mahjongboss.com

1. In **Setup Node.js App**, list ALL Node.js applications
2. Find the app whose **Application URL** is `mahjongboss.com`
   - If it’s the stub app → **Edit** it and change its URL to something else (e.g. `stub.internal`), or **Delete** it
   - If it’s your `mahjong123` app → its URL is correct; the issue is elsewhere
3. Ensure your **mahjong123** app has **Application URL** = `mahjongboss.com`
4. **Restart** your mahjong123 app

### Alternative: domain uses public_html

If `mahjongboss.com`’s document root is `public_html` (or `public_html/mahjongboss.com`), that folder may be serving a static page or another app. In that case:

- Either change the domain’s document root to point to your Node app, or
- Contact Namecheap support and ask them to map `mahjongboss.com` to your Node.js app (root `repositories/mahjong123`).

---

## 6. Deployment Checklist (after code changes)

When you push new code:

1. **Pull** on the server:
   ```bash
   cd /home/letswnsc/repositories/mahjong123
   git pull
   ```
2. **Run NPM Install** in cPanel (if `package.json` or `package-lock.json` changed)
3. **Run migrations** (only if schema changed):
   ```bash
   node src/scripts/runMigrations.js
   ```
4. **Restart** the Node.js app in cPanel

---

## 7. Verification

| Test                         | Expected result                         |
|-----------------------------|-----------------------------------------|
| `https://mahjongboss.com/ping` | Plain text: `Mahjong app OK`         |
| `https://mahjongboss.com/`  | Mahjong game loads                       |
| `https://mahjongboss.com/health` | JSON: `{"ok":true}`                 |

If `/ping` shows **"It works! NodeJS 24.6.0"** → the domain is still mapped to the stub app. Follow **Section 5**.

---

## 8. Troubleshooting

| Symptom                    | Likely cause                         | Action                                      |
|----------------------------|--------------------------------------|---------------------------------------------|
| "It works!" on mahjongboss.com | Wrong app mapped to domain      | Change/remove stub app URL (Section 5)      |
| Connection refused on 3001 | App not running or wrong port        | Check cPanel logs; restart app              |
| 503 on /api/auth, /api/*   | DB not connected or schema missing   | Run migrations (Section 2.2); check DB vars |
| npm install fails (node_modules) | CloudLinux symlink conflict   | Use cPanel "Run NPM Install"; don’t create node_modules manually |
| App crashes on startup     | DB connection error or bad env       | Check stderr.log; temporarily remove DB vars to test |

### View app logs (SSH)

```bash
# cPanel may write logs here (paths vary by host):
tail -100 /home/letswnsc/repositories/mahjong123/stderr.log
# Or check cPanel → Metrics → Errors
```

---

## 9. Quick Reference: File Roles

| File                 | Purpose                                          |
|----------------------|--------------------------------------------------|
| `cpanel-start.js`    | Entry point for cPanel (set as startup file)     |
| `src/server.js`      | Standard entry (used for local dev, Docker)      |
| `schema.sql`         | DB schema (run via `node src/scripts/runMigrations.js`) |
| `.htaccess`          | Reverse proxy to Node app (if domain uses this dir) |
