# TODO

## AI improvements for more accurate simulations

The current AIs live in the `js-ai` block of `index.html`:
- **Greedy** scores each legal action with hand-tuned heuristics and plays the best one.
- **Search** (`makeSearch`) tries the top 7 Greedy candidates for each main action. For each candidate it plays R rollouts: the rest of the turn plus one opponent turn, both played by Greedy, with hidden cards reshuffled. It then scores the resulting position with `evaluate`.

Simulated results are only as good as these players. Known weaknesses, roughly by expected impact:

### 1. Decision coverage
- [x] **Search decides blocks and Quick-step responses.** The battle is split into resumable steps (`battleBlock`, `battleQuick`, `battleDamage`); the Search AI plays out no block and its best blockers, and passing versus each Interrupt (paid with a soul or a discard) or defensive Quick event. Benchmark: search with these defensive decisions beats the previous search 54.2% ±3.1 (1,024 games, every top-8 pairing, alternating seats, 6 rollouts), at about the same speed.
- [ ] Choices inside effects (`g.pick`: targets, discards, modes) are still made by the Greedy heuristics, even for the Search AI.
- [x] **Lethal detection** (`lethalNow`, `threatNext` in `js-ai`). The heuristic estimates the damage its attackers can push through the opponent's blockers and likely Interrupts. When that reaches the opponent's life, every Pal that can hit the player attacks the player. It also penalises attacks that would leave it open to a lethal counter-attack. Hidden cards are estimated from public counts only, and Lucky cards left in the deck lower the chance that each hit lands. Benchmarks:
  - heuristic with it vs without: **51.5% ±0.8** (15,360 games); the attack part gives the gain, the defensive part is neutral (with a stronger penalty it hurt: 47.8%);
  - search with it vs without: **49.6% ±3.1** (1,024 games), no measurable change;
  - cost: about 3.7 ms per heuristic game instead of 3 ms (estimates are cached per decision).
- [ ] Lethal follow-ups: count buffs that add Strike or Power on attack (Ragnahawk, gear, events in hand), consider killing a Taunt Pal to open the way to the player, and estimate the opponent's new attackers from their hand instead of ignoring them.
- [ ] **Mulligan rule is trivial**: the AI redraws when the hand has no non-event card costing 3 or less (about 30% of hands). With the heuristic AI the rule makes no measurable difference: 'never mulligan', the current rule and two curve-based rules all score 50% ±1.7 against each other over 3,360 games each. Revisit once the search AI is stronger, scoring hands by curve, colors and key cards or with a few rollouts.

### 2. Evaluation function
- [ ] **`evaluate` uses hand-picked weights** (life ×75, hand ×22, souls ×10, Material/Ingredient ×3...). Learn the weights from self-play: log positions with the final result and fit a logistic regression, then iterate.
- [ ] **Lucky cards in the deck are ignored by `evaluate`** (the lethal detection already accounts for them). Player damage is cancelled when a Lucky card is revealed, so effective life depends on the Lucky cards left in the deck. Use expected life instead of raw life.
- [ ] **Engines are undervalued.** Structures, Material and Ingredient are scored by their immediate value only. That explains why structure and resource decks (for example the Red・Purple Furnace deck from the top 8) lose about 90% of their games in simulation despite a 3-2 tournament record. Give resources and engine structures a value based on their future output.
- [ ] Add tempo terms: standing versus rested Pals, untapped blockers for the opponent's next turn, and cards that cannot attack next turn.

### 3. Search algorithm
- [ ] **The horizon is one move**, then Greedy finishes the turn and plays one opponent turn. Plan whole turns instead: a beam search over action sequences, or Information-Set MCTS with UCT, so that sequencing (deploy, then assign, then buff, then attack) is optimised together.
- [ ] **Rollout allocation is uniform** (R rollouts for every candidate). Use successive halving or UCB to spend rollouts on the promising candidates. Rollouts already share seeds across candidates (common random numbers): keep that.
- [ ] **Determinization ignores information.** The opponent's hand is resampled uniformly from hand plus deck. Remember cards that were revealed or searched to hand, and weight hidden cards by what the opponent did not play.
- [ ] **The Interrupt risk is a flat 15%** whenever the opponent holds any card. Estimate it from the Interrupt cards left in the opponent's decklist, their hand size and their standing souls.

### 4. Card-specific behaviour
- [ ] Audit the per-card `ai` and `aiPlay` scores in `js-fx`: many are rough constants. Use the per-card impact statistics and targeted test positions to find cards the AI misplays.
- [ ] Implement the simplified cards: Alarm Bell (forced attacks), Antique Dresser (declaring a card name), Aurora Guide (card selection, not just a draw), and the opponent's choice for Shadowbeak.
- [ ] Apply the 15/10 errata for Swee – Hibernating Together. The official database still has the old text.

### 5. Validation and speed
- [ ] **Benchmark against real results.** Compare simulated matchups between top-8 decks with real tournament records, and build a suite of test positions with a known best move to catch regressions.
- [ ] **Run a Search vs Greedy benchmark** after every AI change, playing both sides and both seats.
- [ ] **Make the search cheaper so it can afford more rollouts.** Cloning the state with `structuredClone` dominates the cost. Use incremental undo or copy-on-write for the zones and the base.
- [ ] Turn limit: games are a draw after 40 total turns. Check how often control mirrors reach it with the stronger AIs.

## Other

- [ ] Re-run the per-color-pair deck optimisation with the corrected Lucky count, validating with the Search AI.
- [ ] Add the "Eternal Ascent" Trial Decks (Red・Green and Blue・Purple, out 18/12/2026) when the card list is public.
- [ ] Replace the approximate Trial Deck copy counts with the official lists if they are published.
- [ ] Tournament mode: optional top cut (top 4 or top 8 single elimination after Swiss).
