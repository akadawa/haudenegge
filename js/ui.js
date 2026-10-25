/* Hau den Egge - UI & Menüs (HUD, Level-Up, Skilltree, Perks, Game Over, Settings) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});
  const { data: D, Meta, Save, Audio, Sprites, util } = HDE;

  class UI {
    constructor() {
      this.game = null;
      this.save = Save.data || Save.load();
      this.selectedStartWeapon = this.save.lastWeapon || 'hammer';

      // DOM Referenzen
      this.dom = {
        hud: document.getElementById('hud'),
        xpFill: document.getElementById('xp-fill'),
        xpLabel: document.getElementById('xp-label'),
        timer: document.getElementById('timer-box'),
        stageBadge: document.getElementById('stage-badge'),
        killCount: document.getElementById('kill-count'),
        shellCount: document.getElementById('shell-count'),
        hpFill: document.getElementById('hp-fill'),
        hpLabel: document.getElementById('hp-label'),
        weaponSlots: document.getElementById('weapon-slots'),
        passiveSlots: document.getElementById('passive-slots'),
        bossHud: document.getElementById('boss-hud'),
        bossTitle: document.getElementById('boss-title'),
        bossFill: document.getElementById('boss-fill'),
        toast: document.getElementById('toast'),

        // Screens
        startScreen: document.getElementById('start-screen'),
        levelUpScreen: document.getElementById('levelup-screen'),
        deathScreen: document.getElementById('death-screen'),
        skilltreeScreen: document.getElementById('skilltree-screen'),
        perksScreen: document.getElementById('perks-screen'),
        settingsScreen: document.getElementById('settings-screen'),

        // Level Up Cards
        levelCards: document.getElementById('level-cards'),
        levelTitle: document.getElementById('level-title'),
        levelSubtitle: document.getElementById('level-subtitle'),
        rerollBtn: document.getElementById('btn-reroll'),
        skipBtn: document.getElementById('btn-skip'),

        // Death Screen
        deathStats: document.getElementById('death-stats'),
        deathUnlocks: document.getElementById('death-unlocks'),

        // Skilltree
        treeBranches: document.getElementById('tree-branches'),
        treeShells: document.getElementById('tree-shells'),

        // Perks Screen
        perksList: document.getElementById('perks-list'),
        perkChoicesArea: document.getElementById('perk-choices-area'),
        perkShells: document.getElementById('perk-shells'),

        // Settings
        sfxToggle: document.getElementById('setting-sfx'),
        musicToggle: document.getElementById('setting-music'),
        photoToggle: document.getElementById('setting-photo'),
        saveExportBox: document.getElementById('save-export-box'),
      };

      this.toastTimer = null;
      this.bindEvents();
    }

    setGame(game) {
      this.game = game;
    }

    toast(msg) {
      const el = this.dom.toast;
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        el.classList.remove('show');
      }, 2200);
    }

    /* ------------------------------------------------------------ HUD Update */
    updateHUD(game) {
      if (!game) return;
      const p = game.player;

      // XP & Level
      const need = game.xpNeed(game.level);
      const frac = Math.min(1, Math.max(0, game.xp / need));
      this.dom.xpFill.style.width = (frac * 100).toFixed(1) + '%';
      this.dom.xpLabel.textContent = `LV ${game.level} (${Math.floor(game.xp)} / ${need})`;

      // Timer & Stage
      this.dom.timer.textContent = util.fmtTime(game.time);
      const biome = game.biome;
      this.dom.stageBadge.textContent = `Stage ${game.stage} • ${biome.name}`;

      // Kills & Eierschalen
      this.dom.killCount.textContent = game.kills;
      this.dom.shellCount.textContent = game.collectedShells;

      // HP
      const hpFrac = Math.max(0, Math.min(1, p.hp / p.maxHp));
      this.dom.hpFill.style.width = (hpFrac * 100).toFixed(1) + '%';
      this.dom.hpLabel.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;

      // Boss Bar
      if (game.boss && !game.boss.dead) {
        this.dom.bossHud.style.display = 'block';
        this.dom.bossTitle.textContent = (game.boss.bossName || 'BOSS-EGGE').toUpperCase();
        const bFrac = Math.max(0, game.boss.hp / game.boss.maxHp);
        this.dom.bossFill.style.width = (bFrac * 100).toFixed(1) + '%';
      } else {
        this.dom.bossHud.style.display = 'none';
      }

      // Waffen-Slots
      this.dom.weaponSlots.innerHTML = '';
      for (let i = 0; i < D.CONST.MAX_WEAPONS; i++) {
        const w = game.weapons[i];
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        if (w) {
          const def = D.WEAPONS[w.id];
          slot.textContent = def.icon;
          const badge = document.createElement('span');
          badge.className = 'inv-slot-lvl';
          badge.textContent = w.evo ? '★' : w.level;
          slot.appendChild(badge);
        }
        this.dom.weaponSlots.appendChild(slot);
      }

      // Passive Slots
      this.dom.passiveSlots.innerHTML = '';
      const passKeys = Object.keys(game.passives);
      for (let i = 0; i < D.CONST.MAX_PASSIVES; i++) {
        const id = passKeys[i];
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        if (id) {
          const def = D.PASSIVES[id];
          const lvl = game.passives[id];
          slot.textContent = def.icon;
          const badge = document.createElement('span');
          badge.className = 'inv-slot-lvl';
          badge.textContent = lvl;
          slot.appendChild(badge);
        }
        this.dom.passiveSlots.appendChild(slot);
      }
    }

    /* ------------------------------------------------------------ Level-Up Modal */
    showLevelUp(choices, kind) {
      this.dom.levelUpScreen.classList.add('active');
      this.dom.levelTitle.textContent = kind === 'chest' ? '🎁 SCHATZTRUHE!' : '⭐ LEVEL-UP!';
      this.dom.levelSubtitle.textContent = kind === 'chest' ? 'Wähle deinen Bonus!' : 'Wähle eine Verbesserung für diesen Run:';
      this.dom.rerollBtn.textContent = `Würfeln (${this.game.rerollsLeft})`;
      this.dom.rerollBtn.disabled = this.game.rerollsLeft <= 0;

      this.dom.levelCards.innerHTML = '';
      choices.forEach((c, idx) => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.innerHTML = `
          <div class="card-key-hint">[${idx + 1}]</div>
          <div class="card-top">
            <div class="card-icon">${c.icon}</div>
            <div class="card-title-group">
              <span class="card-tag">${c.tag || 'UPGRADE'}</span>
              <strong class="card-title">${c.title}</strong>
            </div>
          </div>
          <p class="card-desc">${c.desc}</p>
        `;
        card.onclick = () => {
          this.game.pickChoice(idx);
          this.hideLevelUp();
        };
        this.dom.levelCards.appendChild(card);
      });
    }

    hideLevelUp() {
      this.dom.levelUpScreen.classList.remove('active');
    }

    /* ------------------------------------------------------------ Game Over */
    showDeathScreen(res) {
      Audio.stopMusic();
      const info = Meta.applyRunResult(this.save, res);
      Save.save();

      this.dom.deathScreen.classList.add('active');
      this.dom.deathStats.innerHTML = `
        <div class="death-stat-item">
          <span class="death-stat-label">Erreichte Stage</span>
          <span class="death-stat-val">${res.stage}</span>
        </div>
        <div class="death-stat-item">
          <span class="death-stat-label">Überlebte Zeit</span>
          <span class="death-stat-val">${util.fmtTime(res.time)}</span>
        </div>
        <div class="death-stat-item">
          <span class="death-stat-label">Level erreicht</span>
          <span class="death-stat-val">Lv. ${res.level}</span>
        </div>
        <div class="death-stat-item">
          <span class="death-stat-label">Egges gehauen</span>
          <span class="death-stat-val">${res.kills} Kills</span>
        </div>
        <div class="death-stat-item">
          <span class="death-stat-label">Bosse besiegt</span>
          <span class="death-stat-val">${res.bossKills}</span>
        </div>
        <div class="death-stat-item">
          <span class="death-stat-label">Eierschalen verdient</span>
          <span class="death-stat-val">🥚 +${res.shells}</span>
        </div>
      `;

      this.dom.deathUnlocks.innerHTML = '';
      if (info.newBest) {
        this.dom.deathUnlocks.innerHTML += `<div class="new-best-badge">🏆 NEUER STAGE-REKORD: ${this.save.bestStage}!</div>`;
      }
      if (info.newSlots > 0) {
        this.dom.deathUnlocks.innerHTML += `<div class="new-best-badge" style="background:#2a507a; border-color:#4fe8ff;">🌟 NEUER PERK-SLOT FREIGESCHALTET!</div>`;
      }
      if (info.newWeapons.length > 0) {
        const names = info.newWeapons.map(w => D.WEAPONS[w].name).join(', ');
        this.dom.deathUnlocks.innerHTML += `<div class="new-best-badge" style="background:#5a2a7a; border-color:#c058f8;">🔓 NEUE WAFFE: ${names}!</div>`;
      }
    }

    hideDeathScreen() {
      this.dom.deathScreen.classList.remove('active');
    }

    /* ------------------------------------------------------------ Meta Skilltree */
    openSkilltree() {
      this.dom.skilltreeScreen.classList.add('active');
      this.renderSkilltree();
    }

    renderSkilltree() {
      this.dom.treeShells.textContent = `🥚 ${this.save.shells} Eierschalen`;
      this.dom.treeBranches.innerHTML = '';

      for (const bKey in D.BRANCHES) {
        const branch = D.BRANCHES[bKey];
        const col = document.createElement('div');
        col.className = 'tree-branch-col';
        col.innerHTML = `<h3 class="branch-title" style="color:${branch.color}">${branch.icon} ${branch.name}</h3>`;

        const nodes = D.NODES.filter(n => n.br === bKey);
        nodes.forEach(n => {
          const st = Meta.nodeState(this.save, n.id);
          const card = document.createElement('div');
          card.className = `tree-node-card ${!st.unlocked ? 'locked' : ''} ${st.maxed ? 'maxed' : ''}`;

          let btnHtml = '';
          if (st.maxed) {
            btnHtml = `<span style="color:var(--accent-gold); font-size:8px;">★ MAXIMIERT</span>`;
          } else if (!st.unlocked) {
            btnHtml = `<span style="color:#777; font-size:8px;">🔒 Gesperrt</span>`;
          } else {
            btnHtml = `
              <button class="game-btn tree-node-btn ${st.affordable ? 'primary' : ''}" ${!st.affordable ? 'disabled' : ''}>
                Kaufen: 🥚 ${st.cost}
              </button>
            `;
          }

          card.innerHTML = `
            <div class="tree-node-top">
              <span class="tree-node-name">${n.icon} ${n.name}</span>
              <span class="tree-node-lvl">${n.eternal ? 'Lv.' + st.level : st.level + '/' + n.max}</span>
            </div>
            <div class="tree-node-desc">${n.fmt(Math.max(1, st.level))}</div>
            ${btnHtml}
          `;

          const buyBtn = card.querySelector('button');
          if (buyBtn && st.affordable) {
            buyBtn.onclick = () => {
              if (Meta.buyNode(this.save, n.id)) {
                Save.save();
                Audio.play('shell');
                this.renderSkilltree();
              }
            };
          }

          col.appendChild(card);
        });

        this.dom.treeBranches.appendChild(col);
      }
    }

    /* ------------------------------------------------------------ Perk-Auswahl Screen */
    openPerks() {
      this.dom.perksScreen.classList.add('active');
      this.renderPerks();
    }

    renderPerks() {
      this.dom.perkShells.textContent = `🥚 ${this.save.shells} Eierschalen`;
      const maxSlots = Meta.slotsForStage(this.save.bestStage);
      this.dom.perksList.innerHTML = '';

      if (maxSlots === 0) {
        this.dom.perksList.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); font-size: 10px; padding: 24px;">
            Erreiche Stage 3 im Spiel, um deinen ersten permanenten Perk-Slot freizuschalten!
          </div>
        `;
      } else {
        for (let i = 0; i < maxSlots; i++) {
          const perkId = this.save.perks[i];
          const perk = perkId ? D.perkById[perkId] : null;
          const box = document.createElement('div');
          box.className = `perk-slot-box ${perk ? 'filled' : ''}`;

          if (perk) {
            box.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--accent-gold); font-size:10px;">${perk.icon} ${perk.name}</span>
                <span style="font-size:8px; color:var(--text-dim);">Slot ${i + 1}</span>
              </div>
              <p class="perk-pro">✔ ${perk.pro}</p>
              <p class="perk-con">✖ ${perk.con}</p>
              <button class="game-btn" style="margin-top:auto; font-size:7.5px; padding:6px;">
                Tauschen (🥚 ${Meta.swapCost(i)})
              </button>
            `;
            const swapBtn = box.querySelector('button');
            swapBtn.onclick = () => this.showSwapPerkDialog(i);
          } else {
            box.innerHTML = `
              <div style="text-align:center; margin:auto; display:flex; flex-direction:column; gap:6px;">
                <span style="font-size:16px;">✨</span>
                <span style="color:var(--accent-blue); font-size:9px;">Freier Slot ${i + 1}</span>
                <button class="game-btn primary" style="font-size:8px; padding:6px 10px;">Perk wählen</button>
              </div>
            `;
            const pickBtn = box.querySelector('button');
            pickBtn.onclick = () => this.showPickNewPerkDialog();
          }
          this.dom.perksList.appendChild(box);
        }
      }

      // Perk-Wahlbereich
      if (Meta.pendingPicks(this.save) > 0) {
        this.showPickNewPerkDialog();
      } else {
        this.dom.perkChoicesArea.innerHTML = '';
      }
    }

    showPickNewPerkDialog() {
      const choices = Meta.perkChoices(this.save);
      const rerollCost = Meta.rerollCost(this.save);

      this.dom.perkChoicesArea.innerHTML = `
        <div style="background: rgba(30, 24, 44, 0.9); border: 2px solid var(--accent-gold); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="color:var(--accent-gold); font-size:11px;">🌟 WÄHLE 1 VON 3 PERKS:</h3>
            <button id="btn-perk-reroll" class="game-btn" ${this.save.shells < rerollCost ? 'disabled' : ''}>
              🎲 Neu würfeln (🥚 ${rerollCost})
            </button>
          </div>
          <div class="cards-grid" id="perk-choice-cards"></div>
        </div>
      `;

      const cardsContainer = document.getElementById('perk-choice-cards');
      choices.forEach(p => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.innerHTML = `
          <div class="card-top">
            <div class="card-icon">${p.icon}</div>
            <strong class="card-title">${p.name}</strong>
          </div>
          <p class="perk-pro">✔ ${p.pro}</p>
          <p class="perk-con">✖ ${p.con}</p>
          <button class="game-btn primary" style="margin-top:auto; font-size:8px; width:100%; justify-content:center;">
            Ausrüsten
          </button>
        `;
        card.querySelector('button').onclick = () => {
          if (Meta.pickPerk(this.save, p.id)) {
            Save.save();
            Audio.play('shell');
            this.renderPerks();
          }
        };
        cardsContainer.appendChild(card);
      });

      const rerollBtn = document.getElementById('btn-perk-reroll');
      if (rerollBtn) {
        rerollBtn.onclick = () => {
          if (Meta.rerollPerks(this.save)) {
            Save.save();
            Audio.play('shell');
            this.renderPerks();
          }
        };
      }
    }

    showSwapPerkDialog(slotIndex) {
      const choices = Meta.perkChoices(this.save, slotIndex);
      const cost = Meta.swapCost(slotIndex);

      this.dom.perkChoicesArea.innerHTML = `
        <div style="background: rgba(30, 24, 44, 0.9); border: 2px solid var(--accent-purple); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <h3 style="color:var(--accent-purple); font-size:11px;">🔄 PERK IN SLOT ${slotIndex + 1} TAUSCHEN (🥚 ${cost}):</h3>
          <div class="cards-grid" id="swap-choice-cards"></div>
        </div>
      `;

      const container = document.getElementById('swap-choice-cards');
      choices.forEach(p => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.innerHTML = `
          <div class="card-top">
            <div class="card-icon">${p.icon}</div>
            <strong class="card-title">${p.name}</strong>
          </div>
          <p class="perk-pro">✔ ${p.pro}</p>
          <p class="perk-con">✖ ${p.con}</p>
          <button class="game-btn primary" ${this.save.shells < cost ? 'disabled' : ''} style="margin-top:auto; font-size:8px; width:100%; justify-content:center;">
            Tauschen
          </button>
        `;
        const btn = card.querySelector('button');
        if (btn) {
          btn.onclick = () => {
            if (Meta.swapPerk(this.save, slotIndex, p.id)) {
              Save.save();
              Audio.play('shell');
              this.renderPerks();
            }
          };
        }
        container.appendChild(card);
      });
    }

    /* ------------------------------------------------------------ Start Screen */
    openStartScreen() {
      this.dom.startScreen.classList.add('active');
      this.renderStartScreenWeapons();
    }

    renderStartScreenWeapons() {
      const unlocked = Meta.unlockedWeapons(this.save.bestStage);
      const container = document.getElementById('start-weapon-picker');
      if (!container) return;
      container.innerHTML = '';

      unlocked.forEach(wid => {
        const w = D.WEAPONS[wid];
        const btn = document.createElement('button');
        btn.className = `weapon-pick-btn ${this.selectedStartWeapon === wid ? 'active' : ''}`;
        btn.textContent = `${w.icon} ${w.name}`;
        btn.onclick = () => {
          this.selectedStartWeapon = wid;
          this.save.lastWeapon = wid;
          Save.save();
          this.renderStartScreenWeapons();
        };
        container.appendChild(btn);
      });
    }

    /* ------------------------------------------------------------ Events */
    bindEvents() {
      // Start-Button
      document.getElementById('btn-play').onclick = () => {
        this.dom.startScreen.classList.remove('active');
        if (this.onStartGame) this.onStartGame(this.selectedStartWeapon);
      };

      // Skilltree-Button im Start- und Todesbildschirm
      const openTree = () => this.openSkilltree();
      document.getElementById('btn-skilltree').onclick = openTree;
      document.getElementById('btn-death-tree').onclick = () => {
        this.hideDeathScreen();
        openTree();
      };
      document.getElementById('btn-tree-back').onclick = () => {
        this.dom.skilltreeScreen.classList.remove('active');
      };

      // Perks-Button
      const openPerks = () => this.openPerks();
      document.getElementById('btn-perks').onclick = openPerks;
      document.getElementById('btn-death-perks').onclick = () => {
        this.hideDeathScreen();
        openPerks();
      };
      document.getElementById('btn-perks-back').onclick = () => {
        this.dom.perksScreen.classList.remove('active');
      };

      // Nochmal spielen
      document.getElementById('btn-death-restart').onclick = () => {
        this.hideDeathScreen();
        if (this.onStartGame) this.onStartGame(this.selectedStartWeapon);
      };

      // Level-Up Buttons (Reroll, Skip)
      this.dom.rerollBtn.onclick = () => {
        if (this.game && this.game.reroll()) {
          this.showLevelUp(this.game.choices, this.game.choiceKind);
        }
      };

      this.dom.skipBtn.onclick = () => {
        if (this.game) {
          this.game.skipChoice();
          this.hideLevelUp();
        }
      };

      // Tastatur-Kürzel für Level-Up (1..4)
      window.addEventListener('keydown', e => {
        if (this.game && this.game.state === 'levelup') {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= this.game.choices.length) {
            this.game.pickChoice(num - 1);
            this.hideLevelUp();
          } else if (e.key === 'r' || e.key === 'R') {
            this.dom.rerollBtn.click();
          } else if (e.key === 's' || e.key === 'S') {
            this.dom.skipBtn.click();
          }
        }
      });

      // Settings
      document.getElementById('btn-settings').onclick = () => {
        this.dom.settingsScreen.classList.add('active');
        this.dom.sfxToggle.checked = this.save.settings.sound !== false;
        this.dom.musicToggle.checked = this.save.settings.music !== false;
        this.dom.photoToggle.checked = this.save.settings.photo === true;
        this.dom.saveExportBox.value = Save.exportCode();
      };

      document.getElementById('btn-settings-back').onclick = () => {
        this.dom.settingsScreen.classList.remove('active');
      };

      this.dom.sfxToggle.onchange = e => {
        this.save.settings.sound = e.target.checked;
        Save.save();
        Audio.setMuted(!e.target.checked);
      };

      this.dom.musicToggle.onchange = e => {
        this.save.settings.music = e.target.checked;
        Save.save();
        Audio.setMusic(e.target.checked);
      };

      this.dom.photoToggle.onchange = e => {
        this.save.settings.photo = e.target.checked;
        Save.save();
        Sprites.init(Sprites.photos, e.target.checked);
      };

      document.getElementById('btn-copy-save').onclick = () => {
        navigator.clipboard.writeText(this.dom.saveExportBox.value).then(() => {
          this.toast('Spielstand kopiert!');
        });
      };

      document.getElementById('btn-import-save').onclick = () => {
        const code = prompt('Füge deinen Spielstand-Code hier ein (HDE1:...):');
        if (code) {
          const res = Save.importCode(code);
          if (res.ok) {
            this.save = Save.data;
            this.toast('Spielstand erfolgreich geladen!');
            this.renderStartScreenWeapons();
          } else {
            alert('Fehler: ' + res.error);
          }
        }
      };

      document.getElementById('btn-reset-save').onclick = () => {
        if (confirm('Bist du sicher? Dein gesamter Fortschritt wird gelöscht!')) {
          this.save = Save.reset();
          this.toast('Spielstand zurückgesetzt.');
          this.renderStartScreenWeapons();
        }
      };
    }
  }

  HDE.UI = UI;
})();
