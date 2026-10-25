# 🥚 Hau den Egge

Ein endloses Browser-Roguelite im Stil von **Vampire Survivors**.

Du bist der **Kämpfer** (Hoodie, Bart), die Gegner sind **Egges** (Brille, grauer Pulli). 
Jeder Egge spawnt mit einem anderen Kiff-Gegenstand (Joint, Bong, Grinder, Feuerzeug, Blättchen, Pfeife, Vape, Space-Cake, Vorratsdose, Hanfblatt). Sie lieben Grasflecken, in denen sie entspannt chillen – dort nehmen sie aber auch extra Schaden!

---

## 🎮 Features

- **Endlose Stages:** Jede Stage dauert 2 Minuten und endet mit einem Boss-Egge. Alle 5 Stages erscheint ein gigantischer **Mega-Boss** mit Spezialmechaniken.
- **Seltsame Waffen & Evolutionen:**
  - 🔨 **Riesenhammer** (kreisender Nahkampf-Wumms) → Weltenhammer
  - 🍳 **Fliegende Bratpfanne** (prallt von Egge zu Egge) → Riesenpfanne
  - 🐔 **Gummihuhn-Peitsche** (quietschender Betäubungshieb) → Gummi-Gewitter
  - 🍞 **Toaster-Rakete** (explodierende Toast-Geschosse) → Toast Deluxe
  - 🍌 **Bananen-Bumerang** (rutschig & kehrt um) → Bananen-Orbit
  - 🚜 **Rasenmäher** (mäht Gras & doppelt stark gegen bekiffte Egges) → Mähdrescher
  - 🐟 **Fischfächer** (stinkende Fisch-Salven) → Fischsturm
  - 🧼 **Seifenblasen-Kanone** (fängt Egges ein) → Riesenblase
  - 🕺 **Disco-Kugel** (betäubendes Lichtspiel) → Stinkdisco
  - 🧲 **Kühlschrank-Magnet** (zieht Egges zusammen) → Schwarzes Loch
- **Meta-Skilltree:**
  - 4 Äste: **Muskeln**, **Speck**, **Glück & Kram**, **Chaos**
  - Unendliche "Ewige Knoten" am Ende jedes Astes mit unbegrenztem Skalierungspotenzial.
  - Gekauft mit im Spiel gesammelten **Eierschalen 🥚**.
- **Perk-Slots nach Rekord:**
  - Freigeschaltet bei Stage 3, 9, 18, 30, 45, 63...
  - Jeder Perk hat eine starke positive Wirkung und einen spürbaren Nachteil.
  - Tauschen und Neu-Würfeln mit Eierschalen.
- **Speichern im Browser:**
  - Automatisches Speichern im `localStorage`.
  - Export & Import als portabler Code-String.
- **100% Autark:**
  - Alle Sounds & Musik über Web Audio API synthetisiert.
  - Sprites per Code & Canvas generiert, optional umschaltbar auf Fotoköpfe.

---

## 🕹️ Steuerung

- **WASD** oder **Pfeiltasten**: Bewegen
- **Zahlen 1 bis 4**: Level-Up Karte auswählen
- **R**: Level-Up Neu würfeln
- **S**: Level-Up Überspringen
- **Touch**: Virtueller Analog-Stick für Smartphones & Tablets

---

## 🧪 Tests

```bash
# Alle 67 Unit- & Balance-Tests ausführen:
node tests/test.js

# Balance-Simulation für verschiedene Meta-Fortschritte:
node tests/sim.js
```

---

## 🚀 Deployment (Vercel)

Einfach mit Vercel verbinden:
1. Auf GitHub pushen: `git push -u origin main`
2. In Vercel importieren als statisches Projekt (kein Build-Befehl notwendig).
