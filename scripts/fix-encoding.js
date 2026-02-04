const fs = require('fs');
const path = require('path');

const newSidebar = `
      <button class="sidebar__close" id="sidebarClose" type="button" aria-label="Close sidebar">✕ Close</button>
      <section class="panel">
        <div class="panel__header">
          <h2><span class="panel__icon">❓</span> Help</h2>
        </div>
        <div class="menu-item">
          <div class="menu-item__content">
            <p class="menu-item__text">Use the top bar to choose a layout and highlight playable tiles.</p>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-item__content">
            <p class="menu-item__text">Use the bottom bar for game actions.</p>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-item__content">
            <p class="menu-item__text"><strong>Tip:</strong> Drag the board to move around.</p>
          </div>
        </div>
        
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="shortcut-label">New deal</span>
            <kbd>N</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-label">Undo</span>
            <kbd>Ctrl+Z</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-label">Hint</span>
            <kbd>H</kbd>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__header">
          <h2><span class="panel__icon">📊</span> Statistics</h2>
        </div>
        <div id="statsPanel" class="stats-panel"></div>
      </section>
      
      <section class="panel">
        <div class="panel__header">
          <h2><span class="panel__icon">🏆</span> Leaderboard</h2>
          <button type="button" class="btn btn--ghost btn--sm" id="loadLeaderboardBtn">Refresh</button>
        </div>
        <div id="leaderboard" class="leaderboard"></div>
      </section>
    `;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('public', (file) => {
    if (path.basename(file) === 'index.html') {
        let content = fs.readFileSync(file, 'utf8');
        const pattern = /<aside class="sidebar sidebar--overlay sidebar--hidden" id="sidebar">[\s\S]*?<\/aside>/;
        const replacement = `<aside class="sidebar sidebar--overlay sidebar--hidden" id="sidebar">${newSidebar}</aside>`;
        
        if (pattern.test(content)) {
            const newContent = content.replace(pattern, replacement);
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`Fixed encoding in ${file}`);
        }
    }
});
