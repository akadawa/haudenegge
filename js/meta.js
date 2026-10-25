/* Hau den Egge - Meta-Progression (Skilltree, Perk-Slots, Freischaltungen) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});

  /** Stage, ab der Slot n (1-basiert) freigeschaltet wird: 3 * n(n+1)/2  ->  3, 9, 18, 30, 45, 63 ... */
  function stageForSlot(n) { return (3 * n * (n + 1)) / 2; }

  /** Anzahl freigeschalteter Perk-Slots bei erreichter Stage */
  function slotsForStage(best) {
    let n = Math.floor((-1 + Math.sqrt(1 + (8 * Math.max(0, best)) / 3)) / 2);
    while (n > 0 && stageForSlot(n) > best) n--;
    while (stageForSlot(n + 1) <= best) n++;
    return Math.max(0, n);
  }

  function nodeLevel(save, id) { return save.nodes[id] || 0; }

  function nodeCost(node, level) {
    return Math.max(1, Math.floor(node.cost[0] * Math.pow(node.cost[1], level)));
  }

  /** Status eines Skilltree-Knotens */
  function nodeState(save, id) {
    const node = HDE.data.nodeById[id];
    const level = nodeLevel(save, id);
    const maxed = level >= node.max;
    const unlocked = !node.req || nodeLevel(save, node.req) > 0;
    const cost = maxed ? 0 : nodeCost(node, level);
    return { node, level, maxed, unlocked, cost, affordable: unlocked && !maxed && save.shells >= cost };
  }

  function buyNode(save, id) {
    if (!HDE.data.nodeById[id]) return false;
    const st = nodeState(save, id);
    if (!st.unlocked || st.maxed || save.shells < st.cost) return false;
    save.shells -= st.cost;
    save.nodes[id] = st.level + 1;
    return true;
  }

  /** Alle permanenten Werte (Skilltree + Perks) */
  function computeStats(save) {
    const s = HDE.data.baseStats();
    for (const n of HDE.data.NODES) {
      const l = nodeLevel(save, n.id);
      if (l > 0) n.apply(s, l);
    }
    for (const pid of save.perks) {
      const p = HDE.data.perkById[pid];
      if (p) p.apply(s);
    }
    return s;
  }

  /** Offene Perk-Wahlen: freigeschaltete Slots - belegte Slots */
  function pendingPicks(save) {
    return Math.max(0, slotsForStage(save.bestStage) - save.perks.length);
  }

  /**
   * 3 Perks zur Auswahl. Deterministisch aus dem Spielstand (Neuladen würfelt nicht neu).
   * forIndex = -1 für einen neuen Slot, sonst Index des zu tauschenden Perks.
   */
  function perkChoices(save, forIndex = -1, count = 3) {
    const rng = new HDE.util.RNG((save.perkSeed + save.perkRerolls * 7919 + (forIndex + 1) * 104729) >>> 0);
    const pool = HDE.data.PERKS.filter(p => !save.perks.includes(p.id));
    rng.shuffle(pool);
    return pool.slice(0, count);
  }

  function rerollCost(save) { return 40 * Math.pow(2, Math.min(save.perkRerolls, 12)); }

  /** Würfelt die angebotenen Perks neu (kostet Eierschalen) */
  function rerollPerks(save) {
    const cost = rerollCost(save);
    if (save.shells < cost) return false;
    save.shells -= cost;
    save.perkRerolls++;
    return true;
  }

  function newPerkRound(save) {
    save.perkSeed = (Math.random() * 4294967296) >>> 0;
    save.perkRerolls = 0;
  }

  function pickPerk(save, perkId) {
    if (!HDE.data.perkById[perkId] || save.perks.includes(perkId)) return false;
    if (pendingPicks(save) <= 0) return false;
    if (!perkChoices(save).some(p => p.id === perkId)) return false;
    save.perks.push(perkId);
    newPerkRound(save);
    return true;
  }

  /** Kosten, einen ausgerüsteten Perk zu tauschen */
  function swapCost(index) { return 60 * (index + 1) * (index + 1); }

  function swapPerk(save, index, perkId) {
    if (index < 0 || index >= save.perks.length) return false;
    if (!HDE.data.perkById[perkId] || save.perks.includes(perkId)) return false;
    if (!perkChoices(save, index).some(p => p.id === perkId)) return false;
    const cost = swapCost(index);
    if (save.shells < cost) return false;
    save.shells -= cost;
    save.perks[index] = perkId;
    newPerkRound(save);
    return true;
  }

  function unlockedWeapons(best) {
    return Object.keys(HDE.data.WEAPONS).filter(id => HDE.data.WEAPONS[id].unlock <= Math.max(best, 1));
  }

  /** Verbucht das Ergebnis eines Runs. Gibt Infos für den Todesbildschirm zurück. */
  function applyRunResult(save, res) {
    const oldBest = save.bestStage;
    const oldSlots = slotsForStage(oldBest);
    save.shells += res.shells;
    save.totalShells += res.shells;
    save.runs += 1;
    save.kills += res.kills;
    save.bossKills += res.bossKills;
    save.bestStage = Math.max(save.bestStage, res.stage);
    save.bestTime = Math.max(save.bestTime, res.time);
    save.bestLevel = Math.max(save.bestLevel, res.level);
    const newSlots = slotsForStage(save.bestStage) - oldSlots;
    const wOld = unlockedWeapons(oldBest), wNew = unlockedWeapons(save.bestStage);
    return {
      newSlots,
      newBest: save.bestStage > oldBest,
      newWeapons: wNew.filter(w => !wOld.includes(w)),
    };
  }

  HDE.Meta = {
    stageForSlot, slotsForStage, nodeLevel, nodeCost, nodeState, buyNode,
    computeStats, pendingPicks, perkChoices, rerollCost, rerollPerks, pickPerk, swapCost, swapPerk,
    unlockedWeapons, applyRunResult,
  };
})();
