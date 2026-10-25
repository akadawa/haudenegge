/* Hau den Egge - Hauptprogramm, Game Loop & Input */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});
  const { Game, Renderer, UI, Save, Audio, Sprites } = HDE;

  let game = null;
  let renderer = null;
  let ui = null;
  let lastTime = 0;

  // Tastatur-Eingaben
  const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
  };

  // Touch Joystick
  let touchActive = false;
  let touchCenter = { x: 0, y: 0 };
  let touchVector = { x: 0, y: 0 };

  function initInput() {
    window.addEventListener('keydown', e => {
      if (e.key in keys) {
        keys[e.key] = true;
        Audio.resume();
      }
    });

    window.addEventListener('keyup', e => {
      if (e.key in keys) {
        keys[e.key] = false;
      }
    });

    // Touch Support
    const touchArea = document.getElementById('touch-controls');
    const touchStick = document.getElementById('touch-stick');
    if (!touchArea) return;

    // Nur auf mobilen Geräten anzeigen oder bei Touchstart
    window.addEventListener('touchstart', () => {
      touchArea.style.display = 'block';
    }, { once: true });

    touchArea.addEventListener('touchstart', e => {
      e.preventDefault();
      Audio.resume();
      const t = e.touches[0];
      const rect = touchArea.getBoundingClientRect();
      touchCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      touchActive = true;
      handleTouchMove(t);
    }, { passive: false });

    touchArea.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!touchActive) return;
      handleTouchMove(e.touches[0]);
    }, { passive: false });

    const endTouch = () => {
      touchActive = false;
      touchVector = { x: 0, y: 0 };
      if (touchStick) touchStick.style.transform = 'translate(-50%, -50%)';
    };

    touchArea.addEventListener('touchend', endTouch);
    touchArea.addEventListener('touchcancel', endTouch);

    function handleTouchMove(t) {
      const dx = t.clientX - touchCenter.x;
      const dy = t.clientY - touchCenter.y;
      const dist = Math.hypot(dx, dy);
      const maxR = 40;
      const clamped = Math.min(dist, maxR);
      const nx = dist > 0 ? (dx / dist) : 0;
      const ny = dist > 0 ? (dy / dist) : 0;

      touchVector = { x: nx * (clamped / maxR), y: ny * (clamped / maxR) };
      if (touchStick) {
        touchStick.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
      }
    }
  }

  function getKeyboardInput() {
    let ix = 0, iy = 0;
    if (keys.w || keys.ArrowUp) iy -= 1;
    if (keys.s || keys.ArrowDown) iy += 1;
    if (keys.a || keys.ArrowLeft) ix -= 1;
    if (keys.d || keys.ArrowRight) ix += 1;
    return { x: ix, y: iy };
  }

  function startNewRun(startWeapon) {
    const save = Save.load();
    game = new Game(save, {
      startWeapon,
      callbacks: {
        sfx: name => Audio.play(name),
        toast: msg => ui.toast(msg),
        levelup: (choices, kind) => ui.showLevelUp(choices, kind),
        death: res => ui.showDeathScreen(res),
        boss: info => {
          Audio.play('boss');
          ui.toast(`⚠️ ${info.name.toUpperCase()} ERSCHEINT!`);
        },
        stage: info => {
          Audio.play('bossdead');
          ui.toast(`🎉 Stage ${info.stage}: ${info.name}!`);
        },
      },
    });

    ui.setGame(game);
    if (save.settings.music !== false) {
      Audio.startMusic();
    }
  }

  function gameLoop(time) {
    requestAnimationFrame(gameLoop);
    if (!lastTime) lastTime = time;
    let dt = (time - lastTime) / 1000;
    lastTime = time;

    // Delta-Time begrenzen (z. B. wenn Tab im Hintergrund war)
    if (dt > 0.1) dt = 0.1;

    if (game && game.state !== 'dead') {
      // Eingabe übertragen
      const k = getKeyboardInput();
      if (touchActive) {
        game.input.x = touchVector.x;
        game.input.y = touchVector.y;
      } else {
        game.input.x = k.x;
        game.input.y = k.y;
      }

      game.update(dt);
      ui.updateHUD(game);
    }

    if (game && renderer) {
      renderer.render(game);
    }
  }

  function preloadPhotos() {
    return new Promise(resolve => {
      const photos = { egge: new Image(), hero: new Image() };
      let loaded = 0;
      const check = () => {
        loaded++;
        if (loaded === 2) resolve(photos);
      };
      photos.egge.onload = check;
      photos.egge.onerror = () => { console.warn('Foto Egge nicht geladen'); check(); };
      photos.hero.onload = check;
      photos.hero.onerror = () => { console.warn('Foto Kämpfer nicht geladen'); check(); };

      photos.egge.src = 'assets/egge.png';
      photos.hero.src = 'assets/kaempfer.jpg';
    });
  }

  window.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    renderer = new Renderer(canvas);
    window.addEventListener('resize', () => renderer.resize());

    initInput();
    const save = Save.load();

    // Fotos laden & Pixel-Sprites bauen
    const photos = await preloadPhotos();
    Sprites.init(photos, save.settings.photo === true);

    ui = new UI();
    HDE.ui = ui;
    ui.onStartGame = (weapon) => {
      startNewRun(weapon);
      HDE.game = game;
    };
    ui.openStartScreen();

    requestAnimationFrame(gameLoop);
  });
})();
