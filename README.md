# 🀄 Mahjong Solitaire - Free Online Tile Matching Puzzle Game

Play Mahjong Solitaire online for free! A classic Shanghai-style tile-matching puzzle game with beautiful design, multiple layouts, and competitive leaderboards.

## 🎮 Features

### Core Gameplay
- **Classic Mahjong Solitaire** - Match identical tiles to clear the board
- **Multiple Layouts** - Turtle (72 tiles) and Pyramid (80 tiles) arrangements
- **Smart Hints** - Up to 5 hints per game to help you find matches
- **Undo System** - Take back your last move
- **Shuffle Option** - Rearrange remaining tiles when stuck (+60s penalty)
- **Keyboard Shortcuts** - `N` new game, `Ctrl+Z` undo, `H` hint

### Visual Design
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Accessibility First** - Large touch targets, keyboard navigation, screen reader support
- **Smooth Animations** - Tile entrance, match effects, and confetti celebrations
- **Color-Coded Tiles** - Traditional Mahjong suit colors for easy recognition
- **Dark Theme** - Easy on the eyes for extended play sessions

### Social Features
- **User Accounts** - Register to save your progress
- **Leaderboards** - Compete for the best scores
- **Score Tracking** - Combo multipliers and time-based scoring
- **High Score System** - One best score per layout per player

## 🚀 Quick Start

### Play Online
Simply visit [http://localhost:3001](http://localhost:3001) to start playing immediately.

### Run with Docker (Recommended)

```bash
# Start the game
docker compose up

# Open browser to http://localhost:3001
```

### Run Locally with Node.js

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start PostgreSQL and update DATABASE_URL in .env

# Run the server
npm start

# Open browser to http://localhost:3000
```

## 📖 How to Play

1. **Match Pairs** - Click two identical tiles to remove them
2. **Free Tiles Only** - Tiles must not be blocked on left or right, and not covered from above
3. **Special Tiles** - Any Flower matches any Flower, any Season matches any Season
4. **Win Condition** - Clear all tiles from the board
5. **Score High** - Match tiles quickly and build combos for higher scores

## 🎯 Game Rules

### Tile Matching
- **Identical Tiles** - Must have the same symbol
- **Flowers** - All 4 flower tiles match each other
- **Seasons** - All 4 season tiles match each other

### Tile Freedom
A tile is **free** (playable) when:
- Not covered by another tile on top
- Has at least one free side (left or right)

### Scoring System
- Base score: **10 points** per match
- Combo multiplier: Score increases with consecutive matches
- Time tracking: Faster completion = better ranking

## 🛠️ Technology Stack

- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Authentication**: JWT-based
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Deployment**: Docker, Docker Compose

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 💡 Tips & Strategies

1. **Start from the Top** - Clear upper layers first to reveal more options
2. **Look Ahead** - Consider which tiles will become free after your move
3. **Use Hints Wisely** - Save hints for when you're truly stuck
4. **Match Strategically** - Don't just match the first pair you see
5. **Time Management** - Balance speed with careful planning

## 📄 REST API

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/me` (auth) - Fetch user profile
- `POST /api/scores` (auth) - Submit score
- `GET /api/leaderboard` - Public leaderboard

## 🎲 Game Layouts

### Turtle Layout (Default)
- 72 tiles (36 pairs)
- Classic pyramid-style arrangement
- Recommended for beginners

### Pyramid Layout
- 80 tiles (40 pairs)
- Symmetrical pyramid structure
- More challenging gameplay

## 🔍 SEO

The app includes SEO optimization:

- **Meta tags** – Title, description, keywords
- **Open Graph & Twitter Cards** – For social sharing
- **Schema.org (JSON-LD)** – WebApplication structured data
- **Semantic HTML** – H1, proper headings
- **robots.txt** – Crawler directives
- **sitemap.xml** – For search engines

### Before deployment
Replace `https://yoursite.com/` in these files with your real domain:
- `public/index.html` (canonical, og:url, og:image, twitter:url, twitter:image, Schema url)
- `public/robots.txt` (Sitemap URL)
- `public/sitemap.xml` (loc URLs)

### Create OG image
Add `public/og-image.png` (1200×630 px) for social previews. Use a screenshot of the game or a branded graphic.

## 🌐 Keywords

Mahjong Solitaire, Shanghai Mahjong, Tile Matching Game, Puzzle Game, Free Online Game, Brain Game, Mahjong Puzzle, Classic Mahjong

---

**Made with ❤️ for Mahjong enthusiasts worldwide**
