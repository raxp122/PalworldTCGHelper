// Does the AI use each mechanic? Plays heuristic games (the top-8 decks plus random legal decks that cover the
// whole card pool) and counts how often every mechanic and every activated ability happens.
// Run: node tests/usage.js [games=600]
'use strict';
const {load, expand} = require('./load');
const {PE, AI, cards} = load();
const top8 = require('./top8.json').map(d => expand(d.cards));
const N = +process.argv[2] || 600;
const DB = PE.DB, byName = {};
for (const c of cards) byName[c.name] = c.id;

// random legal 2-color decks, so that every card shows up
let seed = 12345;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const pool = cards.filter(c => c.kind !== 'Soul'), colors = ['Red', 'Blue', 'Green', 'Purple'];
function randomDeck() {
  const c1 = colors[Math.floor(rnd() * 4)]; let c2; do c2 = colors[Math.floor(rnd() * 4)]; while (c2 === c1);
  const P = pool.filter(c => [c1, c2, 'Colorless'].includes(c.color)), m = {}; let t = 0, l = 0;
  while (t < 50) {
    const c = P[Math.floor(rnd() * P.length)];
    if ((m[c.id] || 0) >= Math.min(PE.deckLimit(c.id), 4) || (c.lucky && l >= 8)) continue;
    m[c.id] = (m[c.id] || 0) + 1; t++; if (c.lucky) l++;
  }
  return expand(m);
}

const MECH = [
  ['attack on the player', /attacks the player$/], ['attack on a Pal or structure', /\) attacks (?!the player)/],
  ['block', /^ {2}.* blocks$/], ['Interrupt', /uses Interrupt/], ['Quick event in response', /plays .* in response/],
  ['player damage taken', /loses \d+ life/], ['damage cancelled by a Lucky card', /reveals a Lucky/],
  ['mulligan', /mulligans/], ['pay 3 souls to draw', /Pays 3 souls and draws/], ['assign to a structure', /^ {2}assigns /],
  ['night falls', /Night falls/], ['Retaliate', /Retaliate from/], ['Breakthrough', /Breakthrough:/],
  ['butcher', /^ {2}butchers /], ['return to hand', /returns to hand/], ['exile', / exiled$/],
  ['destroyed by damage', /graveyard \(lethal damage\)/], ['more than 5 Pals', /\(too many Pals\)/],
  ['duplicate Legendary', /\(duplicate Legendary\)/]
];
const mech = {}, ends = {}, played = {}, acts = {};
let games = 0;
for (let k = 0; k < N; k++) {
  const a = k % 3 === 2 ? randomDeck() : top8[k % 8], b = k % 3 === 0 ? randomDeck() : top8[(k * 3 + 1) % 8];
  const logs = [];
  const g = PE.Game.create(a, b, k * 7919, [AI.Greedy, AI.Greedy], {firstPlayer: k % 2, log: true, logs});
  g.run(); games++;
  ends[g.st.why || 'other'] = (ends[g.st.why || 'other'] || 0) + 1;
  for (const l of logs) {
    const t = l.replace(/^\[T\d+ [AB]\] /, '');
    for (const [name, re] of MECH) if (re.test(t)) mech[name] = (mech[name] || 0) + 1;
    let m = t.match(/^Plays (.*) \(cost \d+\)$/); if (m && byName[m[1]]) played[byName[m[1]]] = (played[byName[m[1]]] || 0) + 1;
    m = t.match(/^Activates (.*?)(?: — (.*))?$/);
    if (m && byName[m[1]]) { const key = byName[m[1]] + ' — ' + (m[2] || ''); acts[key] = (acts[key] || 0) + 1; }
  }
}

console.log(`${games} heuristic games (top-8 decks and random decks)\n`);
console.log('Mechanic'.padEnd(36) + 'per game');
for (const [name] of MECH) console.log('  ' + name.padEnd(34) + ((mech[name] || 0) / games).toFixed(3));
console.log('\nHow games end');
for (const [w, n] of Object.entries(ends)) console.log('  ' + w.padEnd(34) + (100 * n / games).toFixed(1) + '%');

// cards with an activated ability (other than Interrupt) that the AI plays but never activates
const hasAct = c => (c.text || '').split('\n').some(l => /^【ACT】/.test(l.trim()) && !/^【ACT】Interrupt/.test(l.trim()));
const actByCard = {};
for (const [k, n] of Object.entries(acts)) { const id = k.split(' — ')[0]; actByCard[id] = (actByCard[id] || 0) + n; }
const never = pool.filter(c => hasAct(c) && (played[c.id] || 0) >= 5 && !actByCard[c.id]);
console.log(`\nCards with an activated ability: ${pool.filter(hasAct).length}; played at least 5 times but never activated: ${never.length}`);
for (const c of never) console.log(`  ${c.id} ${c.name} (played ${played[c.id]}×)`);
const rare = pool.filter(c => hasAct(c) && (played[c.id] || 0) >= 5 && actByCard[c.id] && actByCard[c.id] / played[c.id] < 0.2);
console.log(`Activated in less than 1 game out of 5 where played: ${rare.length}`);
for (const c of rare) console.log(`  ${c.id} ${c.name} (played ${played[c.id]}×, activated ${actByCard[c.id]}×)`);
const unplayed = pool.filter(c => !played[c.id] && c.kind !== 'Soul');
console.log(`\nCards never played from hand in these games: ${unplayed.length}`);
for (const c of unplayed) console.log(`  ${c.id} ${c.name}`);
