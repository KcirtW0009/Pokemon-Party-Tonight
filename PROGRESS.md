# Pokémon Party V0.1 progress

## Current phase
V0.1 retained. Second batch adds seven authoritative multiplayer games (11 total), following second-patch-games.md and the user's scoring/round/timeout clarifications. Development remains on port 3100.

## Second batch verification (2026-10-04)
- Seven games support room start, play, result, and return to lobby. Competitive raw totals convert to 100/50/25 podium points; driving is cooperative and awards zero room points.
- Gender library expanded from 12 to all 103 species/form pairs located in the 52poke list; downloaded, contact-sheet reviewed, and manifest hashes checked. 239 used PNG assets are local.
- Existing logic: 72 + 5,299 checks and retained-choice view test passed. New rules: 68,989 checks passed before additional deadline/frame/award regression checks.
- Existing four games: 819 real multiplayer checks (2/3/8 clients) passed. Seven new games: 1,716 actual Socket.IO checks passed with three clients, spectator joins, duplicate/stale actions, host migration and token reconnection.
- Driving acknowledgment measured locally: 135 accepted samples, median 3ms, max 7ms. This does not establish public network latency or frame rate.
- Browser checked all seven games at 390px, plus desktop lobby. Exercised flip actions, Chinese search/guess, delivery cost/risk, and driving persistent input. No console errors in that session.
- Real mobile touch cancellation, public weak-network load, and long-running stress remain untested. The room is still in memory and server restarts clear rooms.
- Protocol, asset attribution, settings and commands: SECOND_GAMES.md. Browser evidence: qa/eleven-game-lobby.png (local, ignored).

## Completed
- Audited existing source, documentation, and tests.
- Removed Gen-1 caps from all game random pools and action validation.
- Imported #001–#1025, Chinese/English names, pinyin, stats, dimensions, and 1,025 local official artwork files.
- Reproducible cached importer; failed imports cannot silently generate partial data or remote artwork fallbacks.
- Trainer Match supports 2–8 players, default eight questions, 50 local questions.
- Private reconnection tokens replace insecure public-ID/nickname seat claiming.
- Match/Battle server countdown added; answers stay private until reveal.
- Default score resets at each new game; optional target-score races accumulate across games.
- Shared selector keyboard control and pool configuration; readable Battle stats.

## Decisions
- This is the Codex/C implementation. Port 3100 is reserved for development and tests; port 3000 belongs to an independent implementation and must not be used.
- Single Node/Next.js/Socket.IO process, in-memory rooms; restarting clears rooms.
- Duplicate nicknames rejected, including temporarily disconnected seats. Hosts can remove a disconnected seat in the Lobby.
- New players join in Lobby only; authenticated existing players can reconnect during a game.
- Session token stored in sessionStorage so independent browser tabs have separate identities.
- Pixel: 90 seconds per round. Match: ten shared, type-filtered candidates. Battle: fixed five comparisons, 60-second picks.
- Ditto: one 1–12-character phrase per alive player, unlimited host-ended discussion, public reminders, 45-second secret voting, abstentions, eliminations, repeated discussion, comeback and two-survivor victory.
- Pixel/Match/Ditto round counts are custom 1–20; target scores are off / 500 / 1000 / 2000 / 5000.
- Ditto disconnections retain living identities; voting timeouts abstain, all survivors offline pauses until reconnect. Eliminated trainers receive team-win points.
- Weight clues use Grass Knot tiers; height and base-stat tiers are game-defined. All clue candidates match at least 30 species; all 1,025 species covered.
- Pixel answer uses an opaque random image token. Original artwork is client-rendered into pixels; competitive image matching is out of scope.

## Test status
- Data validation passes: 1,025 continuous IDs, Chinese names, stats and local PNG artwork.
- Typecheck and production build pass. Production build also validates the dataset.
- 72 existing rule/search assertions, 2,140 revision/clue checks and 819 real Socket.IO multiplayer assertions pass.
- Focused room checks pass, including malformed packets, authorization, readiness, kicking and reusable rooms.
- Normal production timing checks pass on port 3100: six 15-second Pixel stages, 60-second Battle picks, unlimited Ditto discussion and 45-second votes; real clients verify public words, reminders and abstention continuation.
- Original V0.1 browser QA completed a two-player Trainer Match and a three-player Ditto game; Battle and Pixel interfaces verified. Revised UI has passed typecheck/build but has not had a fresh visual review: browser automation transport is closed in this session.
- Original desktop, 390px mobile and eight-player 320px Lobby layouts verified without horizontal overflow. Earlier screenshots saved in qa/; multiplayer-revision.log records the new 819-check run.

## Blockers / known bugs
No known blocking bugs. Rooms are in-memory and single-instance; restart clears them. Pixel artwork is rendered locally in the browser, so advanced image matching is outside V0.1's scope.

## Tencent Cloud deployment — 2026-10-03
- Guangzhou Ubuntu server: Node.js 24.21.0, production service on **3100**, systemd startup and restart on failure configured.
- Next.js updated to 14.2.35 for the published security fix before public deployment.
- Production build, 2,212 logic assertions and normal production room/timing tests passed on the server.
- Local and public HTTP 200 verified after the Lighthouse TCP 3100 rule was applied. Public Socket.IO room and normal timing tests passed from the development computer to the server's public IP.
- See TENCENT_DEPLOYMENT.md and scripts/pokemon-party-tonight.service for operation details. Deployment keys are excluded by .gitignore.

## Play-session improvements — 2026-10-04
- All 1,025 species now have offline PokéAPI category tags. One private Ditto clue uses type, shape/color, egg group, evolution or forms, matching 30–350 species. Three/four-player clues use type/shape/color; numerical tiers removed. Free-name reversal remains.
- Match keeps ten candidates and highlights the submitted choice through countdown; actual room nicknames replace seating references.
- Pixel server enforces one valid attempt per clarity stage, with no three-second retry loophole.
- Battle guarantees high/low rounds and awards 100/50/25 by competition ranking, including ties.
- Production build and 72 base + 5,299 revision checks pass. Actual Match component output verifies ten retained candidates, one highlight and submission locking. Browser visual QA remains unavailable because its automation transport is closed.
- 819 complete multiplayer checks pass for 2/3/8 clients. The new version was built separately on Tencent Cloud, then the service switched to it, preserving the original directory as a rollback backup.
- Public HTTP 200 and production room/timing checks pass. Dedicated public tests verify shared prompts/candidates, private selection retained through countdown, pixel attempts persisting across reconnect and longer than the old three-second cooldown, and unlock at the next clarity stage.

## Third batch — 2026-10-04
- All 16 games registered; lobby game grid scrolls while keeping original layout.
- Rocket discussions have no timer; host advances each question and ends the final discussion.
- Third rules: 3,044 checks pass, plus existing 72 / 5,299 / 68,993 and view checks.
- Five third games completed with three real Socket.IO clients, 356 checks; private payloads and identical final scores verified.
- 10,000 auction boxes and 15,000 heuristic strategy matches simulated; results in data/auction-simulation.json. Values remain experimental; three-person human balance trial pending.
- 103 verified gender pairs and 254 locally sourced batch PNGs validate.
- This is local development work; public deployment status will be recorded after verification.

- Browser QA: five third game interfaces reviewed at 390px, Rocket draft and Auction tool purchases, dice call and Meloetta local preview/confirmed obstacle exercised. Fixed long-button overflow. Lobby contains 16 buttons in a 360px scroll region; 768px tablet uses 420px region without horizontal overflow. Screenshots in qa/.
- Latest second-batch real Socket.IO regression: 1,692 assertions; drive acknowledgments median 2ms / max 4ms locally (not public latency).

