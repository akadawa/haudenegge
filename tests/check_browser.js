// Überprüft im echten Headless Chrome, ob index.html ohne Fehler lädt und läuft
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let file = req.url.split('?')[0];
  if (file === '/' || file === '') file = '/index.html';
  const filePath = path.join(__dirname, '..', file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + file);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const PORT = 3899;
server.listen(PORT, async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    `http://localhost:${PORT}`,
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');

    if (!pageTab || !pageTab.webSocketDebuggerUrl) {
      console.log('Kein Debugger-Port.');
      process.exit(1);
    }

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let id = 1;
    const send = (method, params = {}) => ws.send(JSON.stringify({ id: id++, method, params }));

    const errors = [];
    const logs = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails);
      } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        errors.push(msg.params.entry.text);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        logs.push(msg.params.type + ': ' + msg.params.args.map(a => a.value).join(' '));
      }
    };

    await new Promise((resolve) => {
      ws.onopen = async () => {
        send('Runtime.enable');
        send('Log.enable');
        send('Page.enable');

        // Teste Highscores-Modal & Spielstart
        setTimeout(async () => {
          send('Runtime.evaluate', {
            expression: `
              document.getElementById('btn-highscores').click();
              const rows = document.querySelectorAll('#highscores-body tr');
              console.log('Highscore rows in browser: ' + rows.length);
              document.getElementById('btn-highscores-back').click();
              // Klick auf Start-Button simulieren
              document.getElementById('btn-play').click();
              'started';
            `
          });

          // Teste Level-Up (Darf NICHT durch 's' abgebrochen werden!)
          setTimeout(() => {
            send('Runtime.evaluate', {
              expression: `
                const ui = window.HDE.ui;
                const game = window.HDE.game;
                game.openLevelUp('level');
                console.log('LevelUp open: ' + ui.dom.levelUpScreen.classList.contains('active'));

                // Drücke 's' (wie bei WASD-Bewegung)
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
                const stillOpenAfterS = ui.dom.levelUpScreen.classList.contains('active');
                console.log('LevelUp still open after pressing S: ' + stillOpenAfterS);

                // Wähle Option 1
                window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
                const closedAfterPick = !ui.dom.levelUpScreen.classList.contains('active');
                console.log('LevelUp closed after choosing 1: ' + closedAfterPick);

                // Teste ESC Pause
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                const pauseActive = ui.dom.pauseScreen.classList.contains('active');
                const statePaused = (game.state === 'paused');
                console.log('Pause active on ESC: ' + pauseActive + ', state: ' + statePaused);

                // ESC erneut drücken um weiterzuspielen
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                const resumed = !ui.dom.pauseScreen.classList.contains('active') && (game.state === 'playing');
                console.log('Resumed on second ESC: ' + resumed);

                // Teste Sirenen-Waffe und Skalierung im echten Canvas
                game.addWeapon('siren', 1);
                const rInit = game.getWeapon('siren').stats.range;
                game.passives['megaphone'] = 3;
                game.recompute();
                const rBoost = game.getWeapon('siren').stats.range;
                console.log('Siren range scales in browser: ' + (rBoost > rInit) + ' (' + rInit + ' -> ' + rBoost + ')');
              `
            });

            // Teste Speichern & LocalStorage Reload
            setTimeout(() => {
              send('Runtime.evaluate', {
                expression: `
                  const Save = window.HDE.Save;
                  const Meta = window.HDE.Meta;
                  Save.data.shells = 500;
                  Save.save();
                  Meta.buyNode(Save.data, 'm1');
                  Save.save();
                  const rawLocal = localStorage.getItem('hau_den_egge_save');
                  const parsed = JSON.parse(rawLocal);
                  console.log('LocalStorage node m1 saved: ' + (parsed.nodes && parsed.nodes.m1 === 1));

                  // Simuliere Game Over
                  window.HDE.ui.showDeathScreen({
                    stage: 4,
                    time: 210,
                    level: 15,
                    kills: 180,
                    bossKills: 3,
                    shells: 95
                  });
                  // Trage Namen ein und klicke Submit
                  document.getElementById('highscore-name-input').value = 'TestKlopper';
                  document.getElementById('btn-submit-highscore').click();
                  const status = document.getElementById('highscore-status').textContent;
                  console.log('Highscore submit status: ' + status);

                  // Überprüfe HP Bar Styling
                  const hpLabel = document.getElementById('hp-label');
                  const hpStyle = window.getComputedStyle(hpLabel);
                  console.log('HP label white-space: ' + hpStyle.whiteSpace);

                  // Überprüfe HUD-Positionierung: Unten in der Mitte & keine Überlagerung
                  const bottomRow = document.querySelector('.hud-bottom-row');
                  const itemRow = document.querySelector('.hud-item-row');
                  const hpBox = document.querySelector('.hp-bar-container');
                  const shellBox = document.querySelector('.shells-box');
                  const stageBadge = document.getElementById('stage-badge');

                  const bRect = bottomRow.getBoundingClientRect();
                  const iRect = itemRow.getBoundingClientRect();
                  const hpRect = hpBox.getBoundingClientRect();
                  const sRect = shellBox.getBoundingClientRect();
                  const stRect = stageBadge.getBoundingClientRect();

                  const screenCenterX = window.innerWidth / 2;
                  const rowCenterX = (bRect.left + bRect.right) / 2;
                  const isCentered = Math.abs(screenCenterX - rowCenterX) < 15;
                  const isAtBottom = bRect.bottom <= window.innerHeight && bRect.top >= window.innerHeight - 80;
                  const overlapsItems = !(bRect.top >= iRect.bottom || bRect.bottom <= iRect.top || bRect.left >= iRect.right || bRect.right <= iRect.left);
                  const elementsOverlap = !(hpRect.right <= sRect.left && sRect.right <= stRect.left);

                  console.log('HUD bottom-row centered: ' + isCentered + ' (offset: ' + Math.abs(screenCenterX - rowCenterX).toFixed(1) + 'px)');
                  console.log('HUD bottom-row at bottom: ' + isAtBottom + ' (bottom: ' + bRect.bottom + ', window: ' + window.innerHeight + ')');
                  console.log('HUD overlaps item-row: ' + overlapsItems);
                  console.log('HUD elements overlap each other: ' + elementsOverlap);
                  if (!isCentered || !isAtBottom || overlapsItems || elementsOverlap) {
                    throw new Error('HUD positioning error: centered=' + isCentered + ', atBottom=' + isAtBottom + ', overlapsItems=' + overlapsItems + ', elementsOverlap=' + elementsOverlap);
                  }
                `
              });
              setTimeout(resolve, 1500);
            }, 1200);
          }, 1200);
        }, 1200);
      };
    });

    console.log('Browser Logs:', logs);
    if (errors.length > 0) {
      console.error('Browser Fehler gefunden:', errors);
      process.exit(1);
    } else {
      console.log('✓ Browser-Test erfolgreich: 0 Fehler beim Laden und Starten!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fehler beim Chrome-Check:', err);
    process.exit(1);
  } finally {
    chrome.kill();
    server.close();
  }
});
