# Pokémon Party V0.1 progress

## Current phase
V0.1 implementation and verification complete. Existing implementation retained; the pasted user brief in SPEC.md supersedes the older specification.

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
