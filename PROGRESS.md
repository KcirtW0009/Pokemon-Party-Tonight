# Pokémon Party V0.1 progress

## Current phase
V0.1 retained. Second and third batches add twelve authoritative multiplayer games (16 total), following second-patch-games.md and the user's scoring/round/timeout clarifications. Development remains on port 3100.

## Second batch verification (2026-10-04)
- Seven games support room start, play, result, and return to lobby. Competitive raw totals convert to 100/50/25 podium points; driving is cooperative and awards zero room points.
- Gender library expanded from 12 to all 103 species/form pairs located in the 52poke list; downloaded, contact-sheet reviewed, and manifest hashes checked. 254 batch PNG assets are local after third-batch character additions.
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
- Public deployment is verified in the release section below.

- Browser QA: five third game interfaces reviewed at 390px, Rocket draft and Auction tool purchases, dice call and Meloetta local preview/confirmed obstacle exercised. Fixed long-button overflow. Lobby contains 16 buttons in a 360px scroll region; 768px tablet uses 420px region without horizontal overflow. Screenshots in qa/.
- Latest second-batch real Socket.IO regression: 1,692 assertions; drive acknowledgments median 2ms / max 4ms locally (not public latency).


## Sixteen-game public deployment — 2026-10-04
- Release 3a8b2d6 built in a separate Tencent Cloud directory, with full data validation and 72 / 5,299 / 68,993 / 3,044 rule checks passing before switch.
- Stable symlink switched to /home/ubuntu/ppt-release-3a8b2d6; systemd service active on 3100. Previous release retained for rollback.
- Public HTTP 200, browser home shows all sixteen games, and desktop 1280px lobby has sixteen buttons in a 420px scroll region without horizontal overflow.
- Five third games completed over the public network with three actual clients: 1,605 assertions, identical scores and results. Ordinary production timing used.
- GitHub main contains the source and assets. Screenshots: qa/public-sixteen-game-lobby.png.

- Seven second-batch public start/view checks pass; anonymous gender images load as valid PNGs, each player has one odd tile, readiness starts the timed question, and all three clients solve to final with positive scores.

## Playtest revision — 2026-10-04
- Second/third operation timers are 120 seconds; intrinsic relay fuse and driving map settings remain independent. Each timeout now has explicit settlement/automatic-action behavior, documented in PLAYTEST_REVISION.md.
- Memory matches continue the player's turn. Berries use 12 fixed plates, hidden bombs, selected positions and confirmations, delivery bell, and genuine automatic first-fruit timeout outcomes.
- Gender difference compares two images with synchronized zoom/pan and foreground-only, manually reviewed hotspots for all 103 pairs. Difference regions stay private until reveal.
- Auction tools enter a private backpack, carry to the next box, select scope at use, and consume at most one per bidding round. All players finish intelligence before sealed bids. Rounds one and three generate shared random tool-equivalent intelligence.
- Meloetta supports 2–8 players, retains dance until breaking an obstacle, and automatically blocks the next escape step on timeout. Driving introduces Spinda's confused directions in its description.
- Explosion visuals and optional synthesized audio added; audio defaults off. No external audio samples.
- Local data/hotspot validation, production build, and 72 / 5,299 / 69,823 / 3,466 logic checks pass. Twelve new games completed over three real sockets: 1,720 second and 348 third checks.
- Browser QA at 390px exercised delivery confirmation, two-image zoom and real difference clicks, auction purchase/backpack/scope/use, and audio toggle. No horizontal overflow or console errors in inspected interfaces. Screenshots: qa/berries-revision.png, qa/gender-revision.png, qa/auction-revision.png.
- Actual audio listening quality and new rules' human balance require another play session. Public rollout verification follows after deployment.

## Playtest revision public rollout — 2026-10-04
- Runtime release 854c9cb built separately on Tencent Cloud with all asset/hotspot checks and 72 / 5,299 / 69,823 / 3,466 logic checks passing.
- Stable symlink now points to /home/ubuntu/ppt-release-854c9cb; systemd active on port3100. Prior 3a8b2d6 release retained for rollback.
- 102 live public checks passed with ordinary timing: 120-second operations, eight-player starts including Meloetta, real anonymous-image loading and difference clicks, fixed berry plates/delivery/take, and all three auction intelligence/bid rounds with shared hints in rounds one/three.
- Public browser driving view shows the Spinda story and existing map controls. Screenshot: qa/public-spinda-driving.png.


## 2026-10-05 — precise differences, clipboard and scroll follow-up

- Curated 82 playable pairs from 103 unchanged source pairs; excluded 21 invisible, tiny or broad changes including Pyroar. Retained pairs contain 125 independent targets.
- Pixel silhouettes define each difference; a separate small dilation handles click tolerance. Each target counts once across both pictures, all targets required to score, partial timeout scores zero. Masks and unfound answers remain server private. Optional detail zoom is collapsed by default.
- HTTP public-site clipboard failure came from a secure-context-only API and swallowed errors. Added synchronous compatible copying, success feedback and manual selection fallback.
- Removed scroll containment from game list and image panes so wheel/touch scrolling naturally reaches the page at the content boundaries.
- Type checking, data validation, production build and logic suites passed: 72 / 5,299 / 70,666 / 3,466 checks plus room-view assertions. Three-player second-batch games passed 1,721 live checks. Browser wheel test confirmed list scrolls first (page 0), then page moves (606px) at list boundary.

- Refined shared palette, borders and button hierarchy; homepage removes the game list and keeps nickname/create/join in one entry card. Desktop and mobile lobby actions are fixed at the bottom with measured content padding; home navigation remains sticky.
- Added own-seat rename with unique-name validation and full-room broadcast. Rejoining with a private session token now updates the nickname without replacing the seat. Live 14-check regression covers rename, invalid/duplicate names, outsiders, token seat theft protection, rejoining and ongoing-game identity.
- Browser QA confirmed desktop home and 390px mobile home show all entry controls, and room rename updates header/roster. Screenshot: qa/home-upgrade.png, qa/lobby-upgrade.png.


## 2026-10-05 — game presentation and optional sound
- Extended the shared game hierarchy: compact timers, turn status, scores, precise selection styling and collapsible rules. Match candidates use a desktop 5×2 grid; battle play confirmation remains at the bottom on desktop and mobile.
- Added an original synthesized background loop and game-specific short feedback across 16 games. Global header controls expose independent music/effects toggles and volumes. First use is silent; music starts only after a player gesture, continues across internal navigation and pauses when hidden.
- No server/game rules changed in this presentation follow-up. Audio observes only existing player-visible snapshots, never sends actions or exposes hidden state; reconnect and duplicate snapshots do not replay cues.
- Audio lifecycle/event regression: 64 checks passed. Type checking and existing logic checks pass. Full design and event mapping: AUDIO_DESIGN.md. Browser and final rollout checks follow.

- Final runtime 7771a14 is deployed to the public port-3100 service; previous 1ac88ae remains available for rollback. Server production build, 64 audio checks and all rule regressions passed.
- Public multiplayer: 102 ordinary-timing checks passed; nickname regression: 14 passed. Public browser verified both sound toggles, successful HTTP copy feedback and no console errors. Local game presentation, navigation audio continuity and 320px responsive checks passed. Screenshots: qa/public-home-upgrade.png and qa/battle-ui-audio.png.


## 2026-10-06 — second playtest feedback
- Auction separates purchases from use/bids, publishes scoped tool use and completed round prices, adds five card tiers/three tools and a conservative disclosed-information value floor.
- Adventure uses 42 cards, temporary passes, consecutive-pass settlement and ordered forced-effect queues; Delibird includes stopped players, Liepard discards opponents' numbers, Annihilape grants 4 then 7 with normal duplicate consequences.
- Meloetta proactively breaks only adjacent obstacles when this shortens escape, resets form and re-arms later transformations; preview and server share the algorithm.
- Dice randomizes match opener, binds a challenge to the displayed hand/call, snapshots results immutably and keeps a public before/after-life ledger. Original reversed-life report has not been reproduced; old unbound action/latest transport metadata race is now explicitly rejected. Do not claim the reported incident's root cause was confirmed.
- Local production build, rule regressions and audio tests passed; 6,927 targeted checks include every dice face/equality/seat, stale challenge rejection, all card price ranges, seven tools/privacy, forced special chains, temporary passes and repeat dance eligibility. Live dice test passed 89 checks (4 successful, 3 failed challenges); third-game multiplayer passed 393 checks. Browser verified independent purchase/use, tier selection, shared usage versus private results, price floor and no console errors. Screenshot: qa/oct6-auction.png.

- Public release 3a8eed4 is active on port3100, previous 7771a14 retained. Remote build, full rules and audio checks passed. Public ordinary-timing suite passed 106 checks. Public dice passed 103 checks with 4 successful/3 failed challenges, correct losses on all seats, idempotent retry and fresh-envelope/old-call rejection without damage. Timing QA now reads first observed stage duration rather than time remaining after image downloads.
- Added 200 combined-information auction scenarios: lower bounds never exceed actual box values and opponents receive only public-information bounds. Latest local targeted suite: 6,927 checks. Extra test/doc changes do not change deployed application code.


## 2026-10-06 — Rocket review and shareable reports
- Archive each completed question's clues, guesses by attempt, answer and gains; snapshots reveal other guesses only after judging, preserve all questions for final review, and do not repeat old archives during active play.
- Each clue gains a default-collapsed all-player review, with correct-position counts and missing submissions. Removed the always-visible final guess list. Per-question and whole-match text reports include chronological clues/choices/roles/answers/gains; copy uses existing HTTP-compatible helper with feedback/manual text fallback.
- Added 27 report/privacy/archive/render checks. Full rule suites, typecheck and local production build passed. Real browser verified initially collapsed guesses, wrong-to-correct progression, question report copy, final three-question archives and whole-match copy. Screenshots: qa/rocket-review.png, qa/rocket-match-report.png.

- Runtime f1699b6 deployed on Tencent port3100 after remote build, full rule suites and 64 audio checks passed. Public three-client fixture completed three questions with two attempts each; browser verified default-collapsed final archives, per-attempt guesses and successful HTTP-compatible whole-match copy. Screenshot: qa/public-rocket-report.png. Previous 3a8eed4 release retained for rollback.

## 2026-10-06 — Sender exclusion labels
- Sender and contact now share the existing excluded marker below each candidate Pokemon name; removed the sender's small private exclusion list. Game rules and exclusion visibility permissions are unchanged.
- Typecheck and remote production build/data validation passed. Runtime 62ec809 deployed on port3100; public browser verified both excluded candidates show their labels. Screenshot: qa/rocket-sender-excluded.png.
