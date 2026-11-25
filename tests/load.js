// Loads the engine, card effects, AI and tournament code from index.html into Node,
// exactly as the page and the Web Workers run them.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

function load(file) {
  const html = fs.readFileSync(file || process.env.PW_HTML || path.join(__dirname, '..', 'index.html'), 'utf8');
  const block = id => html.split(`<script id="${id}">`)[1].split('</script>')[0];
  const ctx = {console, Math, JSON, Date, structuredClone};
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  for (const id of ['js-engine', 'js-fx', 'js-ai', 'js-tour']) vm.runInContext(block(id), ctx);
  const cards = JSON.parse(html.split('<script type="application/json" id="cards-data">')[1].split('</script>')[0]);
  ctx.PalEngine.setCards(cards, ctx.PalFX.FX);
  return {PE: ctx.PalEngine, AI: ctx.PalAI, T: ctx.PalTour, FX: ctx.PalFX.FX, cards};
}

// decklist {id: copies} -> array of 50 ids
const expand = cards => Object.entries(cards).flatMap(([id, n]) => Array(n).fill(id));

module.exports = {load, expand};
