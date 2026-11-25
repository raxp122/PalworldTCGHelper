// Rule scenarios: each test builds a precise game position, performs one action and checks the result
// against the Comprehensive Rules (rules/Comprehensive-Rules.txt). Run: node tests/scenarios.js
'use strict';
const {load, expand} = require('./load');
const {PE} = load();
const assert = require('assert');

// ---------- cards used by the tests ----------
const VAN = 'EBP01-013';      // Pyrin – Cinder Steed, vanilla 6, 1200/2
const SMALL = 'EBP01-056';    // Lifmunk – Promising Newbie, vanilla 3, 500/1
const BRAVE = 'EBP01-006';    // Foxparks – Light of Courage, 200/1, Brave 300
const SERIOUS = 'EBP01-034';  // Teafant – Fountain of Cheer, 200/1, Serious 400
const TAUNT = 'EBP01-054';    // Warsect – Iron Fortress, 1500/3, Taunt
const STEALTH = 'ETD02-015';  // Cawgnito, 300/2, Stealth
const ASSAULT = 'ETD01-001';  // Grizzbolt – Rumbling Tank, 1600/4, Assault
const VIGIL = 'ETD01-017';    // Suzaku Aqua, 1200/3, Vigilance
const NOCT = 'EBP02-076';     // Prixter, 600/2, Nocturnal
const INTER = 'EBP01-038';    // Cryolinx – Arctic Ordeal, 900/2, Interrupt
const RETAL = 'EBP01-084';    // Menasting – Darkness-Dwelling Scorpion, 700/2, Retaliate
const BREAK = 'EBP02-050';    // Mammorest – Gaia Crusher, 1200/3 (+100 per Ingredient), Breakthrough
const LEGEND = 'EBP02-025';   // Frostallion – Everlasting Rime, Legendary
const PIT = 'ETD01-008';      // Stone Pit, structure, durability 600
const LUCKY = 'EBP01-001';    // Jormuntide Ignis, has the Lucky icon

// ---------- helpers ----------
// scripted policy: ends the turn, never mulligans; block/quick decisions can be scripted per test
const script = (o = {}) => ({
  name: 'script', mulligan: () => !!o.mulligan, mainAction: o.main || (() => ({t: 'end'})),
  block: o.block || (() => null), quick: o.quick || (() => null)
});
// a game in the main phase of player `active`, with zones set exactly as given
function position(o = {}) {
  const logs = [];
  const g = PE.Game.create(Array(40).fill(VAN), Array(40).fill(VAN), 1, [script(o.a), script(o.b)], {log: true, logs});
  const st = g.st; st.turn = o.turn || 3; st.active = o.active || 0; st.first = 0;
  ['a', 'b'].forEach((k, i) => {
    const s = o[k] || {}, pl = st.p[i];
    pl.hand = (s.hand || []).slice(); pl.deck = (s.deck || Array(30).fill(VAN)).slice();
    pl.souls = s.souls == null ? 10 : s.souls; pl.soulsStand = s.soulsStand == null ? pl.souls : s.soulsStand;
    pl.soulDeck = 10 - pl.souls; pl.life = s.life == null ? 10 : s.life; pl.ing = s.ing || 0; pl.mat = s.mat || 0;
  });
  // base cards are placed without On Deploy triggers, as if they had been there before this turn
  const place = (i, id, rested) => { const c = g.deploy(i, id); c.rested = !!rested; c.depT = 0; return c; };
  g.logs = logs;
  return {g, st, place, A: st.p[0], B: st.p[1]};
}
const ids = cards => cards.map(c => c.id);
// engine arrays come from another VM context, so compare them by value
const same = (a, b, msg) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg);

// ---------- tests ----------
const tests = [];
const T = (name, fn) => tests.push({name, fn});

T('6.2.1.5-6 setup: 5-card hands, the player going second starts with 1 soul', () => {
  const g = PE.Game.create(Array(40).fill(VAN), Array(40).fill(VAN), 7, [script(), script()], {firstPlayer: 0});
  g.setup();
  assert.strictEqual(g.P(0).hand.length, 5); assert.strictEqual(g.P(1).hand.length, 5);
  assert.strictEqual(g.P(0).souls, 0); assert.strictEqual(g.P(1).souls, 1);
});
T('6.2.1.7 mulligan: the whole hand goes back, 5 new cards, once', () => {
  const g = PE.Game.create(Array(40).fill(VAN), Array(40).fill(SMALL), 7, [script({mulligan: true}), script()], {firstPlayer: 0});
  g.setup();
  assert.strictEqual(g.P(0).hand.length, 5); assert.strictEqual(g.P(0).deck.length, 35); assert.ok(g.P(0).mull);
  assert.ok(!g.P(1).mull);
});
T('7.3.1 the first player skips the draw of their first turn; the second player draws', () => {
  const g = PE.Game.create(Array(40).fill(VAN), Array(40).fill(VAN), 7, [script(), script()], {firstPlayer: 0});
  g.setup(); g.playTurn(); assert.strictEqual(g.P(0).hand.length, 5);
  g.playTurn(); assert.strictEqual(g.P(1).hand.length, 6);
  g.playTurn(); assert.strictEqual(g.P(0).hand.length, 6);
});
T('7.4 souls: +2 per turn up to 10 (first 2-4-6-8-10, second 3-5-7-9-10)', () => {
  const seen = [[], []];
  const rec = () => script({main: (g, i) => { const t = g.st.turn; if (!seen[i][t]) { seen[i][t] = g.P(i).souls; } return {t: 'end'}; }});
  const g = PE.Game.create(Array(40).fill(VAN), Array(40).fill(VAN), 7, [rec(), rec()], {firstPlayer: 0});
  g.setup(); for (let k = 0; k < 12; k++) g.playTurn();
  same(seen[0].filter(x => x != null), [2, 4, 6, 8, 10, 10]);
  same(seen[1].filter(x => x != null), [3, 5, 7, 9, 10, 10]);
});
T('7.2.1 stand phase stands the cards in the base and the souls', () => {
  let seen = null;
  const {g, place} = position({active: 1, a: {soulsStand: 2, main: null}});
  const p = place(0, VAN, true);
  g.pol[0] = script({main: (g2, i) => { seen = seen || {rested: p.rested, stand: g2.P(i).soulsStand, souls: g2.P(i).souls}; return {t: 'end'}; }});
  g.endPhase(); g.playTurn();  // B's turn ends, A's turn is played: check A's main phase
  assert.ok(seen, 'A had a main phase'); assert.ok(!seen.rested); assert.strictEqual(seen.stand, seen.souls);
});
T('8.5 paying 3 souls to draw is allowed once per turn', () => {
  const {g, A} = position();
  assert.ok(g.legalActions(0).some(a => a.t === 'souldraw'));
  const h = A.hand.length; g.doAction(0, {t: 'souldraw'});
  assert.strictEqual(A.hand.length, h + 1); assert.strictEqual(A.soulsStand, 7);
  assert.ok(!g.legalActions(0).some(a => a.t === 'souldraw'));
});
T('9.2.2.3 a Pal deployed this turn can attack', () => {
  const {g} = position();
  const p = g.deploy(0, VAN);
  assert.ok(g.canAttack(p)); assert.ok(g.attackTargets(p).includes('player'));
});
T('9.2.3 targets: the player, rested Pals and structures; not standing Pals', () => {
  const {g, place} = position();
  const a = place(0, VAN), up = place(1, SMALL), down = place(1, SMALL, true), pit = place(1, PIT);
  const t = g.attackTargets(a);
  assert.ok(t.includes('player')); assert.ok(t.includes(down)); assert.ok(t.includes(pit)); assert.ok(!t.includes(up));
});
T('12.15 Assault can target a standing Pal', () => {
  const {g, place} = position();
  const a = place(0, ASSAULT), up = place(1, SMALL);
  assert.ok(g.attackTargets(a).includes(up));
});
T('12.10 Taunt: a targetable Taunt card must be the target; a standing Taunt Pal does not restrict', () => {
  const s1 = position(); const a1 = s1.place(0, VAN), w1 = s1.place(1, TAUNT, true); s1.place(1, SMALL, true);
  same(s1.g.attackTargets(a1).map(x => x.uid || x), [w1.uid]);
  const s2 = position(); const a2 = s2.place(0, VAN); s2.place(1, TAUNT); const d2 = s2.place(1, SMALL, true);
  const t2 = s2.g.attackTargets(a2); assert.ok(t2.includes('player')); assert.ok(t2.includes(d2));
});
T('9.4 a blocker is rested and becomes the attack target', () => {
  const {g, place, A, B} = position({b: {}});
  const a = place(0, SMALL), b = place(1, VAN);
  g.pol[1] = script({block: (g2, o, at, t, bl) => bl[0]});
  g.attack(a, 'player');
  assert.ok(b.rested); assert.ok(!g.inBase(a), 'the 500 attacker dies to the 1200 blocker'); assert.strictEqual(B.life, 10);
});
T('12.11 Stealth: the attack cannot be blocked', () => {
  const {g, place, B} = position();
  const a = place(0, STEALTH); place(1, VAN);
  let asked = false; g.pol[1] = script({block: () => { asked = true; return null; }});
  g.attack(a, 'player');
  assert.ok(!asked); assert.strictEqual(B.life, 8);
});
T('9.6.3.1 + 11.4 Pals deal their power to each other; damage >= power destroys', () => {
  const {g, place} = position();
  const a = place(0, VAN), t = place(1, SMALL, true);
  g.attack(a, t.uid);
  assert.ok(!g.inBase(t)); assert.ok(g.inBase(a)); assert.strictEqual(a.dmg, 500);
});
T('9.6.3.2 a structure deals no damage back', () => {
  const {g, place} = position();
  const a = place(0, SMALL), pit = place(1, PIT);
  g.attack(a, pit.uid);
  assert.strictEqual(a.dmg, 0); assert.strictEqual(pit.dmg, 500); assert.ok(g.inBase(pit));
});
T('7.6.3 damage on Pals and structures is removed at the end of the turn', () => {
  const {g, place} = position();
  const a = place(0, VAN), t = place(1, VAN, true);
  g.attack(a, t.uid); assert.ok(!g.inBase(a) && !g.inBase(t), 'equal power: both destroyed');
  const s = position(); const a2 = s.place(0, VAN), t2 = s.place(1, SMALL, true);
  s.g.attack(a2, t2.uid); assert.strictEqual(a2.dmg, 500); s.g.endPhase(); assert.strictEqual(a2.dmg, 0);
});
T('9.6.3.3 + 11.2 player damage equal to strike: mills that many cards, then life is reduced', () => {
  const {g, place, B} = position();
  const a = place(0, VAN);
  g.attack(a, 'player');
  assert.strictEqual(B.life, 8); assert.strictEqual(B.grave.length, 2); assert.strictEqual(B.deck.length, 28);
});
T('11.2.2.2 a Lucky card revealed cancels the damage and stops milling', () => {
  const {g, place, B} = position({b: {deck: [SMALL, LUCKY, SMALL, SMALL, SMALL]}});
  const a = place(0, ASSAULT);  // strike 4
  g.attack(a, 'player');
  assert.strictEqual(B.life, 10); same(B.grave, [SMALL, LUCKY]); assert.strictEqual(B.deck.length, 3);
});
T('11.2.2.3 + 11.3.2 if the deck runs out during damage, life still drops by the full damage and the player loses', () => {
  const {g, st, place, B} = position({b: {deck: [SMALL]}});
  const a = place(0, VAN);
  g.attack(a, 'player');
  assert.strictEqual(B.life, 8); assert.ok(st.over); assert.strictEqual(st.winner, 0);
});
T('9.6.3.3.1 a Pal with 0 strike deals no damage to the player', () => {
  const {g, place, B} = position();
  const a = place(0, SMALL); g.mod(a, {st: -1}, 'eot');
  g.attack(a, 'player');
  assert.strictEqual(B.life, 10); assert.strictEqual(B.grave.length, 0);
});
T('12.8 Interrupt paid with 1 soul nullifies the attack', () => {
  const {g, place, B} = position({b: {hand: [INTER], soulsStand: 1}});
  const a = place(0, VAN);
  g.pol[1] = script({quick: (g2, o) => g2.P(o).hand.includes(INTER) ? {id: INTER, kind: 'interrupt', pay: 'soul'} : null});
  g.attack(a, 'player');
  assert.strictEqual(B.life, 10); same(B.grave, [INTER]); assert.strictEqual(B.soulsStand, 0);
});
T('12.8 Interrupt paid by discarding it and 1 other card', () => {
  const {g, place, B} = position({b: {hand: [INTER, SMALL], soulsStand: 0}});
  const a = place(0, VAN);
  g.pol[1] = script({quick: (g2, o) => g2.P(o).hand.includes(INTER) ? {id: INTER, kind: 'interrupt', pay: 'discard'} : null});
  g.attack(a, 'player');
  assert.strictEqual(B.life, 10); assert.strictEqual(B.hand.length, 0); same(B.grave.slice().sort(), [INTER, SMALL].sort());
});
T('12.6 Brave: +N power on attack until end of turn', () => {
  const {g, place} = position();
  const a = place(0, BRAVE), t = place(1, 'EBP02-035', true);  // Kelpsea – Spirited Splash, vanilla 300/1
  g.attack(a, t.uid);
  assert.strictEqual(g.power(a), 500); assert.ok(!g.inBase(t)); assert.ok(g.inBase(a), '500 power survives 300 damage');
  g.endPhase(); assert.strictEqual(g.power(a), 200);
});
T('12.7 Serious: when assigned, a Pal gets +N power until end of turn', () => {
  const {g, place} = position();
  const tea = place(0, SERIOUS), pyr = place(0, VAN), pit = place(0, PIT);
  const before = g.power(tea) + g.power(pyr);
  g.assign(tea, pit);
  assert.ok(tea.rested); assert.strictEqual(g.power(tea) + g.power(pyr), before + 400);
});
T('5.17.1.1 a rested Pal cannot be assigned', () => {
  const {g, place} = position();
  const p = place(0, VAN, true), pit = place(0, PIT);
  assert.ok(!g.assignable(0, pit).includes(p));
});
T('12.9 Vigilance: the card stands at the end of its turn', () => {
  const {g, place} = position();
  const a = place(0, VIGIL);
  g.attack(a, 'player'); assert.ok(a.rested); g.endPhase(); assert.ok(!a.rested);
});
T('12.13 Nocturnal: +300 power while it is night', () => {
  const {g, place} = position();
  const p = place(0, NOCT);
  assert.strictEqual(g.power(p), 600); g.setNight(false); assert.strictEqual(g.power(p), 900);
});
T('12.12 Retaliate: when it dies in battle, the opposing combat Pal goes to the graveyard too', () => {
  const {g, place} = position();
  const a = place(0, VAN), t = place(1, RETAL, true);
  g.attack(a, t.uid);
  assert.ok(!g.inBase(t)); assert.ok(!g.inBase(a), 'the 1200 attacker survived the 700 damage but Retaliate sends it');
});
T('12.14 Breakthrough: killing the opposing combat Pal also deals strike damage to its master', () => {
  const {g, place, B} = position();
  const a = place(0, BREAK), t = place(1, SMALL, true);
  g.attack(a, t.uid);
  assert.ok(!g.inBase(t)); assert.strictEqual(B.life, 10 - g.strike(a));
});
T('11.5 more than 5 Pals: the Pal placed last stays, the weakest older Pal goes', () => {
  const {g, place, B} = position({active: 1});
  const old = [VAN, VAN, VAN, VAN, SMALL].map(id => place(1, id));
  g.check();
  const fresh = g.deploy(1, SMALL); g.check();
  assert.strictEqual(g.pals(1).length, 5); assert.ok(g.inBase(fresh), 'the new Pal must stay');
  assert.ok(!g.inBase(old[4]), 'the old 500 Pal goes'); assert.ok(B.grave.includes(SMALL));
});
T('11.7 duplicate Legendary: only one stays', () => {
  const {g, place} = position();
  place(0, LEGEND); place(0, LEGEND); g.check();
  assert.strictEqual(ids(g.pals(0)).filter(x => x === LEGEND).length, 1);
});
T('1.2.1.2 + 11.3.2 a player whose deck becomes empty loses', () => {
  const {g, st} = position({b: {deck: [SMALL]}});
  g.draw(1, 1);
  assert.ok(st.over); assert.strictEqual(st.winner, 0);
});
T('6.1 deck construction: 50 cards, max 4 per name, max 8 Lucky, max 2 colors + Colorless', () => {
  const deck = require('./top8.json')[0].cards;  // a legal tournament list
  const list = c => Object.entries(c).map(([id, n]) => ({id, n}));
  assert.ok(PE.validateDeck(list(deck)).ok);
  const extra = Object.assign({}, deck); extra['EBP01-086'] = 1;  // 51 cards
  assert.ok(!PE.validateDeck(list(extra)).ok);
  const five = Object.assign({}, deck); five['EBP01-049'] = 5; five['EBP01-052'] -= 1;  // 5 Lyleen
  assert.ok(!PE.validateDeck(list(five)).ok);
  const lucky9 = Object.assign({}, deck); lucky9['EBP01-050'] = 1; lucky9['EBP01-052'] -= 1;  // 9 Lucky
  assert.ok(PE.validateDeck(list(lucky9)).errs.some(e => /Lucky/.test(e)));
  const red = Object.assign({}, deck); red[VAN] = 1; red['EBP01-052'] -= 1;  // a third color
  assert.ok(PE.validateDeck(list(red)).errs.some(e => /color/.test(e)));
  assert.ok(PE.deckLimit('EBP01-061') > 50, 'Beegarde – Knight of the Flower Garden: any number');
  assert.strictEqual(PE.deckLimit('EBP02-034'), 8, 'Swee – Hibernating Together: up to 8');
  assert.strictEqual(PE.deckLimit(VAN), 4);
});

// ---------- run ----------
let fail = 0;
for (const t of tests) {
  try { t.fn(); console.log('  ok    ' + t.name); }
  catch (e) { fail++; console.log('  FAIL  ' + t.name + '\n        ' + (e.message || e).split('\n')[0]); }
}
console.log(`\n${tests.length - fail}/${tests.length} rule scenarios pass`);
process.exitCode = fail ? 1 : 0;
module.exports = {expand};
