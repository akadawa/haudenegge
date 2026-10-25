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

        // Teste Highscores-Modal
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
          // Spiel 1.5s laufen lassen, dann Death Screen mit Highscore-Eintrag testen
          setTimeout(() => {
            send('Runtime.evaluate', {
              expression: `
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
              `
            });
            setTimeout(resolve, 1500);
          }, 1500);
        }, 1500);
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
