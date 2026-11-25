# Palworld TCG Helper

A deck simulator for the **Palworld OFFICIAL CARD GAME** (English edition). Build decks, then let two AIs play them against each other for hundreds of games to see which deck wins more often and which cards pull their weight.

**Try it:** https://raxp122.github.io/PalworldTCGHelper/

## Features

- **Every card with a unique effect**: all 253, from Trial Deck Red・Blue, Trial Deck Green・Purple, Dawn of Palpagos, Legends Awaken and Sleeve & Card Set Vol.1, using the official English card text.
- **Rules engine** based on the Comprehensive Rules ver. 1.01: turn phases, souls, assigning Pals to structures, blocking, the Quick step with Interrupt and Quick events, player damage cancelled by Lucky cards, the 5-Pal limit, Legendaries, night and every keyword (Brave, Serious, Taunt, Stealth, Assault, Vigilance, Nocturnal, Retaliate, Breakthrough...).
- **Deck builder** with deck legality checks (50 cards, max 4 copies per full card name, max 8 Lucky-icon cards, max 2 colors + Colorless), a cost curve, card search and filters, text import/export and a "Fill to 50" helper.
- **Two AIs**:
  - *Heuristic AI*: fast, a few milliseconds per game. It spots lethal attacks (accounting for blockers, likely Interrupts and the Lucky cards left in the opponent's deck) and avoids attacks that expose it to a lethal counter-attack.
  - *Search AI*: short-horizon Monte Carlo search for its main moves, blocks and Quick-step responses (Interrupt and Quick events). It reshuffles hidden information in every rollout, so it never sees your hand or deck order.
- **Match statistics**: win rates with a 95% margin of error, first-player advantage, how games end, and a per-card "impact" table (win rate when the card was played minus the deck's overall win rate).
- **Single game viewer**: read a full game move by move.
- **Tournament mode**: up to 10 decks, each with its own AI, round robin or Swiss, best of 1 or best of 3. It simulates N tournaments and shows the average standings, how often each deck wins or makes the top half, the distribution of placements and a head-to-head matrix.
- **Sample decks**: the two Trial Decks plus the top 8 decklists from a recent tournament, ready to simulate or copy and edit.

## Usage

Open the page and use the three tabs:

1. **Simulate**: pick deck A and deck B and the AI for each side, choose the number of games and press *Simulate*. Simulations run in Web Workers on several CPU cores.
2. **Decks & cards**: create, duplicate and edit decks. Your decks are saved in your browser's `localStorage`. To share a list, use *Import / export text*, one card per line: `4 EBP01-006` or `4 Foxparks – Light of Courage`.
3. **Single game**: play one game with a given random seed and read the log.
4. **Tournament**: pick the participants and their AI, choose the format and the number of tournaments, then press *Run tournaments*. You can stop early and keep the results so far.

The whole app is a single static file, `index.html`, with no dependencies and no build step. You can also download it and open it locally with a double click.

## Rules and tests

- `rules/`: the official Comprehensive Rules (PDF and extracted text, ver. 1.01 updated 2 Nov 2026) and the Play Guide.
- `node tests/scenarios.js`: rule scenarios. Each one sets up a precise position, performs one action and checks the result against a section of the Comprehensive Rules (setup, mulligan, phases, souls, attack targets, blocks, battle damage, player damage and Lucky cards, Interrupt, every keyword, the 5-Pal limit, Legendary, deck construction).
- `node tests/usage.js [games]`: does the AI use each mechanic? Plays heuristic games and reports how often each mechanic happens and which activated abilities the AI never or rarely uses.

## Known simplifications

- **Alarm Bell**: the obligation to attack is not enforced.
- **Antique Dresser**: the first ability (declaring a card name) is not simulated.
- **Aurora Guide**: the AI only uses it as a simple draw.
- **Shadowbeak**: the opponent always sends their weakest Pal to the graveyard.
- Choices inside effects (targets, discards) and the mulligan are always made by a heuristic, even for the Search AI.
- Games are declared a draw after 40 total turns.
- The Trial Deck presets use **approximate** copy counts, because the official lists have not been published.

The simulator is a tool for comparing decks, not a perfect model of human play. Use at least 300 games before drawing conclusions from the card impact table.

Planned AI improvements are listed in [TODO.md](TODO.md).

## Feedback

Found a rule applied wrong, a card that does not match its text or an AI mistake? Use **Report a bug** in the site footer, or open an [issue](https://github.com/raxp122/PalworldTCGHelper/issues/new/choose) (a GitHub account is needed). Quoting the card text or the Comprehensive Rules article helps a lot.

## Support

If you find it useful, you can [buy me a coffee on Ko-fi](https://ko-fi.com/raxp122) ☕

## Disclaimer

Unofficial fan project, not affiliated with or endorsed by Pocketpair or Bushiroad. Palworld and all card names and texts belong to their respective owners.
