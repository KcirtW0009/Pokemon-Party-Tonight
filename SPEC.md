You are the lead engineer responsible for building a complete playable V0.1 of a Chinese multiplayer browser party game:

Pokémon Party / 宝可梦派对

This is NOT a throwaway prototype and NOT a Gen-1 demo.

The goal is to deliver a small but genuinely playable V0.1 that 2–8 friends can open in their browsers and play together.

You are responsible for:
- inspecting the repository
- designing the minimum necessary architecture
- implementing the application
- importing Pokémon data/assets
- implementing multiplayer synchronization
- implementing all four games
- testing with multiple clients
- fixing bugs
- documenting the project

Do not stop after scaffolding.
Do not stop after producing mock UI.
Do not replace real multiplayer behavior with fake/demo data.

Work autonomously until the V0.1 Definition of Done is satisfied.

============================================================
0. MOST IMPORTANT PRODUCT PRINCIPLE
============================================================

V0.1 means:

REDUCE SYSTEM COMPLEXITY.

It does NOT mean:

REDUCE CORE PLAYABLE CONTENT.

We intentionally simplify:
- accounts
- persistence
- social systems
- advanced animations
- alternate Pokémon forms
- matchmaking
- production scaling

We DO NOT simplify away:
- National Pokédex coverage
- 2–8 player support
- real multiplayer synchronization
- complete game loops
- proper scoring
- mobile usability
- all four required games

Do not silently reduce scope to make implementation easier.

If something is temporarily limited during development, clearly mark it as temporary and remove that limitation before V0.1 completion.

============================================================
1. PRODUCT
============================================================

Pokémon Party is a Chinese online multiplayer party-game website.

Players should be able to:

1. Open the website
2. Enter a nickname
3. Create a room OR join with a room code
4. Enter a shared Lobby
5. See all connected players
6. Select one of four games
7. Start the game
8. Play multiple rounds together
9. Receive scores
10. See final rankings
11. Return to the same Lobby
12. Select another game and continue playing

No account is required.

Target devices:
- desktop browsers
- mobile browsers

Primary language:
- Simplified Chinese

============================================================
2. REQUIRED GAMES
============================================================

V0.1 contains exactly these four games:

1. 谁是百变怪
   Who's Ditto
   Social deduction

2. 像素猜宝可梦
   Pixel Guess
   Visual recognition / risk / speed

3. 训练家默契挑战
   Trainer Match
   Social matching / friend knowledge

4. 宝可梦猜拳
   Pokémon Battle / Pokémon RPS
   Limited-hand strategic stat comparison

Do NOT add additional games before V0.1 is complete.

============================================================
3. PLAYER COUNTS
============================================================

The room system supports:

2–8 simultaneous players.

Games dynamically use the actual players currently in the room.

NEVER hardcode exactly 3, 4, or another fixed player count.

Required ranges:

像素猜宝可梦:
2–8

训练家默契挑战:
2–8

宝可梦猜拳:
2–8

谁是百变怪:
3–8

谁是百变怪 is the only game requiring 3 players.

If there are only 2 players and it is selected, the Lobby should clearly show:

“谁是百变怪需要至少 3 名玩家”

and disable Start.

Do not block the other three games.

============================================================
4. NATIONAL POKÉDEX COVERAGE
============================================================

This requirement is mandatory.

V0.1 MUST contain all standard National Pokédex species:

#001 – #1025

Total:
1025 Pokémon species.

This is NOT a 151-Pokémon Gen-1 demo.

All 1025 must be available to relevant systems including:

- Pokémon Selector
- Pixel Guess random pool
- Who's Ditto random pool
- Trainer Match selection
- Pokémon Battle hand generation

For V0.1, use standard/base National Pokédex species.

Do NOT spend time supporting every alternate form.

Exclude unnecessary alternate forms such as:

- Mega Evolutions
- Gigantamax
- regional variants
- costumes
- cosmetic forms
- battle-only transformations
- shiny variants
- special-event forms

These can be added later.

============================================================
5. POKÉMON DATA
============================================================

Do NOT manually type 1025 Pokémon.

Create a reproducible import/build pipeline.

The application should ultimately use a local generated dataset.

Required conceptual schema:

interface Pokemon {
    id: number;

    nameZh: string;
    nameEn: string;
    pinyin: string;
    searchAliases?: string[];

    image: string;

    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;

    height: number;
    weight: number;
}

Required final coverage:

001–1025.

Runtime gameplay should NOT depend on repeatedly querying a remote Pokémon API.

Prefer:

external structured source
        ↓
import/build script
        ↓
generated local pokemon.json
        ↓
application

Validate after generation:

- exactly 1025 expected National Dex entries
- no missing Chinese names
- no duplicate IDs
- required stats exist
- images resolve
- #001 works
- #025 works
- #260 works
- #1025 works

============================================================
6. CHINESE NAMES
============================================================

Chinese names are a core requirement.

The game UI is Chinese-first.

Pokémon search must support at minimum:

- Simplified Chinese name
- English name

Also support pinyin where practical.

Example:

“巨”
→ 巨沼怪
→ 巨钳螳螂
→ 巨石丁
...

“juzhaoguai”
→ 巨沼怪

“swampert”
→ 巨沼怪

Search should be case-insensitive for Latin text.

Do not require exact full-name input.

============================================================
7. POKÉMON IMAGE ASSETS
============================================================

Use a consistent deterministic image source.

Preferred source:

PokeAPI sprites repository:
https://github.com/PokeAPI/sprites

Preferred image set:

sprites/pokemon/other/official-artwork/

Use National Dex ID as the mapping key.

Example:

#260
→ official-artwork/260.png

Do NOT:
- scrape Google Images
- scrape Bing Images
- scrape random Pokémon websites
- mix unrelated image providers

Prefer local assets for gameplay.

Desired structure:

public/
  pokemon/
    official-artwork/
      1.png
      2.png
      ...
      1025.png

If downloading all required artwork locally is practical, do it through a reproducible script rather than manually.

Do not download every historical sprite collection.

Only obtain what V0.1 requires.

Document the source and attribution.

IMPORTANT:

The presence of Pokémon images in an open repository does not mean the underlying Pokémon artwork becomes freely owned by this project.

This is an unofficial fan project.

Do not claim affiliation with:
- Nintendo
- Game Freak
- Creatures
- The Pokémon Company

Add appropriate attribution/disclaimer documentation.

============================================================
8. SHARED POKÉMON SELECTOR
============================================================

Implement ONE reusable PokémonSelector.

It is a major shared component.

Requirements:

- search Chinese name
- search English name
- preferably pinyin
- fuzzy/prefix-friendly enough for normal use
- show approximately the first 5 best results
- keyboard usable on desktop
- touch friendly on mobile
- fast across all 1025 Pokémon

Configuration should support:

showImage
showDexNumber
disabledPokemon
allowedPokemon

Example behavior:

User types:

巨

Dropdown:

巨沼怪        #260
巨钳螳螂      #212
巨石丁        #874
巨炭山        #839
巨锻匠        #959

IMPORTANT:

In Pixel Guess:

showImage = false

The dropdown MUST NOT reveal Pokémon images.

In Trainer Match:

showImage may be true.

============================================================
9. CORE MULTIPLAYER FLOW
============================================================

Main flow:

HOME
  ↓
nickname
  ↓
CREATE ROOM / JOIN ROOM
  ↓
LOBBY
  ↓
SELECT GAME
  ↓
READY / START
  ↓
GAME
  ↓
ROUND RESULTS
  ↓
NEXT ROUND
  ↓
FINAL RESULTS
  ↓
RETURN TO LOBBY

Room codes should be short and easy to share.

Example:

A7K2

The room must support:
- 2–8 players
- host
- player list
- ready state
- selected game
- scores
- game state

============================================================
10. HOST BEHAVIOR
============================================================

Host can:

- select game
- modify required simple game settings
- start game
- optionally remove a player if easy to implement

If host disconnects:

automatically migrate host status to another connected player.

Do not destroy the room solely because the host left if other players remain.

============================================================
11. DISCONNECT / RECONNECT
============================================================

Implement reasonable V0.1 behavior.

At minimum:

- disconnected players are recognized
- other clients update
- host migration works
- server does not crash
- active game does not corrupt itself

If stable reconnection using a temporary player/session token is reasonably simple, implement it.

Do NOT build account-based persistence.

============================================================
12. SERVER AUTHORITY
============================================================

The server is authoritative.

NEVER trust the client for:

- scores
- answers
- random Pokémon
- Ditto identity
- secret Pokémon
- player hands
- voting counts
- game phase
- round winner
- stat comparison

Validate actions server-side.

A client must not be able to:

- submit for another player
- modify their score
- vote repeatedly
- use a card twice
- submit during the wrong phase
- see hidden information early

============================================================
13. PRIVATE INFORMATION
============================================================

This is critical.

Do NOT broadcast all game state and hide secrets with CSS.

Private information must only be sent to the player who is allowed to know it.

Examples:

Who's Ditto:

Trainer receives:
secret Pokémon

Ditto receives:
NO secret Pokémon

Pokémon Battle:

Each player receives:
their own hand

They do NOT receive:
other players' unplayed hands

Trainer Match:

Before Reveal:
do not send other players' selections

Pixel Guess:

do not send the answer in obvious client-visible state before it is permitted.

============================================================
14. GAME 1 — 谁是百变怪
============================================================

Players:
3–8

Roles:

Exactly 1 Ditto in V0.1.

All other players are Trainers.

Setup:

Server randomly chooses:
- one Pokémon from the full V0.1 pool
- one player as Ditto

Trainer private screen:

“你的宝可梦是”

[Pokémon image]

巨沼怪

“记住它，但不要直接说出名字。”

Ditto private screen:

“你是百变怪”

“你不知道本轮宝可梦。”

“根据其他训练家的描述隐藏自己。”

FLOW:

ROLE_REVEAL
    ↓
SPEAKING
    ↓
VOTING
    ↓
VOTE_RESULT
    ↓
DITTO_FINAL_GUESS if caught
    ↓
RESULT

Speaking:

Generate a random speaking order.

Website does NOT need voice chat.

Players talk in person / Discord / external voice.

Website only needs to display:
- current speaker
- order
- timer
- “描述完成” button

Do not make the website responsible for speech recognition.

Voting:

Every player secretly votes for one other player.

Do not show votes before all required votes are submitted.

Highest-voted player is accused.

Tie behavior:

First tie:
run a runoff vote among tied players.

Second tie:
Ditto escapes and wins.

If Ditto is not accused:
Ditto wins.

If Ditto is correctly accused:
Ditto gets one final chance to identify the secret Pokémon using PokémonSelector.

If correct:
Ditto performs a comeback win.

If incorrect:
Trainers win.

Scoring:

Trainer victory:
each Trainer +100

Ditto escapes:
Ditto +200

Ditto caught but final guess correct:
Ditto +150

Keep V0.1 scoring simple.

============================================================
15. GAME 2 — 像素猜宝可梦
============================================================

Players:
2–8

Default:
10 rounds

Each round:

Server selects one Pokémon.

Players see the same Pokémon image progressively become clearer.

Stages:

8×8
12×12
20×20
32×32
64×64
Original

Recommended score:

8×8      1000
12×12      800
20×20      600
32×32      400
64×64      250
Original    100

Use Canvas or another simple deterministic technique.

A simple implementation:

source image
→ render to tiny offscreen resolution
→ disable smoothing
→ scale up

Do NOT manually pre-generate six versions of 1025 images unless there is a compelling technical reason.

Guessing:

Use PokémonSelector.

Pixel Guess dropdown:
NO Pokémon thumbnails.

Wrong answer:

player gets a 3-second input cooldown.

Correct answer:

that player is finished for the current round.

Other players continue guessing.

Do NOT end the round merely because the first player guessed correctly.

End when:
- all active players have guessed correctly, OR
- final stage/time expires

Then reveal:
- original artwork
- Chinese name
- correct answer
- player scores

IMPORTANT ANTI-TRIVIAL-CHEATING:

Do not send an obvious answer such as:

pokemonId: 260
image: swampert.png
answer: 巨沼怪

to clients at round start and merely blur it with CSS.

Design the implementation so the answer is not trivially visible in normal client state/network metadata before reveal.

V0.1 does not need anti-cheat suitable for competitive esports, but avoid obvious leakage.

============================================================
16. GAME 3 — 训练家默契挑战
============================================================

Players:
2–8

This game DOES support two players.

Do not restrict it to 3+.

Default:
approximately 8–10 questions per match.

Each round:

System selects a Chinese prompt.

Example:

“如果现实中只能养一只宝可梦，你最想养哪只？”

Every player secretly selects one Pokémon using PokémonSelector.

Before everyone submits:
players cannot see other answers.

After all submissions:

3
2
1
REVEAL

Show all players and selections simultaneously.

Example:

A → 伊布
B → 伊布
C → 巨沼怪
D → 伊布

Scoring:

If N players selected the same Pokémon:

score for each of those players:

(N - 1) × 100

Examples:

unique answer:
0

2 matching:
100 each

3 matching:
200 each

4 matching:
300 each

etc.

Question bank:

Create a local JSON question bank.

V0.1 target:
at least approximately 50 usable Chinese questions.

Categories may include:

- 生活
- 冒险
- 搞笑
- 宝可梦世界
- 损友

Examples:

- 最想养哪只宝可梦？
- 最适合当室友的是？
- 最适合当坐骑的是？
- 最适合一起旅行的是？
- 世界末日最想带谁？
- 最适合当老师的是？
- 最可能半夜偷吃冰箱的是？
- 最适合帮你搬家的是？
- 最适合陪你熬夜的是？
- 最不想半夜在床边看到谁？

Do not require a remote AI service to generate questions during gameplay.

============================================================
17. GAME 4 — 宝可梦猜拳
============================================================

Players:
2–8

This is NOT literal Rock/Paper/Scissors.

It is a limited-hand Pokémon stat-comparison strategy game.

Default:

Each player receives:
5 random Pokémon

Match:
5 rounds

Each Pokémon card may be used only once.

At each round, the server reveals a comparison category.

Examples:

- SPEED 最高
- ATTACK 最高
- HP 最高
- WEIGHT 最重
- HEIGHT 最高

You may include other fields already reliably present in the local dataset if they remain easy to understand.

All players secretly select one unused Pokémon from their own hand.

Before reveal:
do not expose choices.

When everyone submits:

3
2
1
REVEAL

Show:
- player
- selected Pokémon
- artwork
- relevant stat/value

Determine winner server-side.

Winner:
+100

Exact tie:
all tied winners receive +100.

Selected card becomes USED and cannot be selected again.

Core strategy:

“Should I spend my best card now, or save it for a later category?”

Do NOT implement in V0.1:

- type effectiveness
- moves
- abilities
- held items
- weather
- Mega
- Terastal
- battle simulation

This is intentional scope control.

============================================================
18. SHARED SCORE SYSTEM
============================================================

Room/session score should survive between rounds of the same game.

At the end of a game:

show ranking.

Example:

1. Lucong       2200
2. Pikachu      1800
3. TrainerC     1500

Then allow:

“返回大厅”

When returning to Lobby, game-specific state resets cleanly.

Decide explicitly whether the next selected game begins with a fresh game score.

Prefer fresh score per game session for V0.1 unless existing architecture strongly suggests another simple model.

Do not accidentally carry game-specific state into another game.

============================================================
19. SHARED COMPONENTS
============================================================

Reuse components instead of building four separate applications.

Expected shared concepts:

- Home
- Room
- Lobby
- PlayerList
- Scoreboard
- Timer
- Countdown
- PokemonCard
- PokemonSelector
- Reveal
- RoundResult
- FinalRanking
- GameRules
- Modal
- Button
- PlayerBadge

Do not over-abstract trivial components.

============================================================
20. GAME ARCHITECTURE
============================================================

Keep game logic separated.

Suggested concept:

games/
  ditto/
  pixel/
  match/
  battle/

Each game should have clearly separated:
- server logic/state
- client UI
- types
- rules/config

A conceptual interface may include:

start()
handlePlayerAction()
getPublicState()
getPrivateState(playerId)
nextRound()
finish()

Do not force this exact interface if another clean design works better.

The important requirement is:

shared multiplayer core
+
isolated game-specific state machines

============================================================
21. RECOMMENDED STACK
============================================================

Preferred:

- Next.js
- React
- TypeScript
- Socket.IO
- local JSON data
- simple CSS or Tailwind

If the repository already has a compatible working stack:
reuse it.

Do not rebuild everything merely to follow a preference.

Avoid unnecessary dependencies.

============================================================
22. NO DATABASE REQUIRED
============================================================

V0.1 does not require persistent storage.

In-memory rooms are acceptable.

Conceptually:

Map<roomCode, Room>

Server restart deleting rooms is acceptable.

This is intentional.

Do NOT add:
- PostgreSQL
- MongoDB
- Redis

unless a concrete blocker requires them.

For V0.1 deployment, assume one server instance.

Do not design premature multi-instance scaling.

============================================================
23. UI / VISUAL DIRECTION
============================================================

Visual goal:

modern Pokémon-inspired
+
handheld-game feeling
+
party-game clarity

Do NOT clone:
- Chiby.io
- PokeVS
- official Pokémon website UI
- another party website

You may learn from their information architecture, but create an original interface.

Desired characteristics:

- Chinese-first
- cheerful
- clean
- high readability
- large rounded cards
- clear dark outlines where useful
- subtle shadows
- strong but controlled accent colors
- touch-friendly buttons
- obvious selected/ready states
- playful transitions
- restrained animation

Avoid:
- entire screen filled with purple
- tiny desktop-only controls
- generic enterprise dashboard appearance
- excessive official Pokémon artwork as decoration

Suggested visual palette direction:

- warm off-white / very light neutral background
- Pokémon-inspired red as one accent
- electric yellow as another accent
- deep navy/dark ink for text/outlines
- secondary colors per game

Do not need to follow exact color values unless a design system is established.

============================================================
24. HOME PAGE
============================================================

Home should be extremely simple.

Concept:

POKÉMON PARTY
宝可梦派对

“和朋友一起，看看谁才是真正的宝可梦大师。”

Nickname input

[创建房间]

Room-code input
[加入房间]

Additional small text:

2–8 人
浏览器即玩
无需注册

Do not overload the homepage.

============================================================
25. LOBBY
============================================================

Desktop conceptual layout:

┌──────────────┬──────────────────────────┬─────────────────┐
│ 玩家          │ 游戏选择                  │ 游戏介绍/设置    │
│              │                          │                 │
│ A 👑         │ 🎭 谁是百变怪             │ 当前游戏         │
│ B            │ 👾 像素猜宝可梦           │ 人数             │
│ C            │ 🤝 训练家默契挑战         │ 规则             │
│              │ ⚔️ 宝可梦猜拳             │ 设置             │
├──────────────┴──────────────────────────┴─────────────────┤
│ 房间码 A7K2          邀请/复制           [开始游戏]        │
└───────────────────────────────────────────────────────────┘

Mobile:
stack sections vertically.

Do not attempt to preserve desktop columns on a narrow phone.

============================================================
26. MOBILE FIRST
============================================================

This is important.

The intended real-world scenario is multiple friends each holding a phone.

Requirements:

- touch targets large enough
- no hover-only actions
- no horizontal overflow
- selectors easy to use with mobile keyboard
- primary action visible without hunting
- cards readable
- Lobby understandable
- voting easy
- Pokémon hand selection easy
- answer dropdown not hidden behind keyboard where practical

Test actual narrow viewports.

============================================================
27. RESPONSIVE DESKTOP
============================================================

Desktop should also feel intentional.

Do not simply stretch the mobile interface across 1920px.

Use sensible max-width containers and panels.

============================================================
28. GAME STATE MACHINES
============================================================

Use explicit phases.

Do not manage complex game flow using scattered booleans.

Example Ditto:

ROLE_REVEAL
SPEAKING
VOTING
RUNOFF_VOTING
DITTO_GUESS
RESULT

Pixel:

PREPARE
PIXEL_1
PIXEL_2
PIXEL_3
PIXEL_4
PIXEL_5
FINAL
RESULT

Trainer Match:

QUESTION
SELECTING
REVEAL
RESULT

Battle:

DEAL
CATEGORY
SELECTING
REVEAL
ROUND_RESULT
FINAL_RESULT

Exact names may differ.

The requirement is explicit predictable state transitions.

============================================================
29. TIMERS
============================================================

Server should be authoritative for important phase timing.

Clients may display countdowns based on synchronized deadlines.

Do not allow each client to independently decide when the game advances.

Avoid timer drift causing different players to see different rounds.

============================================================
30. RANDOMNESS
============================================================

Random selection occurs server-side.

This includes:

- random Pokémon
- Ditto player
- speaking order
- battle hands
- battle category
- Trainer Match questions

Avoid obvious immediate repetition where easy.

Example:
Pixel Guess should not choose the same Pokémon twice in one 10-round match unless the pool is intentionally constrained.

============================================================
31. DUPLICATES
============================================================

Battle:

Within one player's initial five-card hand:
avoid duplicate Pokémon.

Prefer avoiding identical hands where trivial, but do not build complex global draft logic.

Trainer Match:
multiple players intentionally may select the same Pokémon.

Ditto:
one shared answer.

============================================================
32. ROOM VALIDATION
============================================================

Handle cleanly:

- invalid room code
- room full
- duplicate join request
- empty nickname
- nickname too long
- game minimum player count
- host disconnect
- player disconnect during Lobby
- player disconnect during game

Do not crash or leave unusable UI.

============================================================
33. NICKNAMES
============================================================

Keep simple.

Example:
1–16 visible characters.

Trim whitespace.

Do not require global uniqueness across the entire service.

Within a room:
either reject duplicate nickname OR disambiguate clearly.

Choose the simplest clear behavior and document it.

============================================================
34. DEVELOPMENT ORDER
============================================================

Follow this order unless existing code already completed a phase correctly.

PHASE 0 — AUDIT

- inspect repository
- inspect package.json
- inspect current source
- inspect current SPEC/README/PROGRESS
- identify reusable work
- identify incorrect hardcoded assumptions
- do NOT rewrite working code without reason

Search specifically for accidental scope restrictions:

151
Gen 1
exactly 3 players
exactly 4 players
fixed-size player arrays
hardcoded Pokémon subsets
mock multiplayer data

PHASE 1 — DATA

- complete #001–#1025 local dataset
- Chinese names
- English names
- search aliases/pinyin where practical
- required stats
- height/weight
- image mapping
- validation script
- attribution

PHASE 2 — SHARED UI

- Home
- PokemonCard
- PokemonSelector
- basic responsive layout
- Lobby shell

PHASE 3 — MULTIPLAYER CORE

- Socket.IO
- create room
- join room
- room code
- 2–8 players
- host
- ready state
- selected game
- scores
- disconnect
- host migration
- minimum-player validation

PHASE 4 — TRAINER MATCH

Implement first because it is the simplest full multiplayer game.

Use it to validate:
- secret submission
- simultaneous reveal
- scoring
- round progression
- final ranking
- return to Lobby

PHASE 5 — POKÉMON BATTLE

Validate:
- private player hands
- one-use cards
- secret simultaneous selection
- server stat comparison

PHASE 6 — PIXEL GUESS

Validate:
- progressive pixel rendering
- shared server timing
- selector
- wrong-answer cooldown
- independent player completion
- stage scoring
- no obvious answer leakage

PHASE 7 — WHO'S DITTO

Validate:
- private roles
- private answer delivery
- speaking order
- voting
- runoff
- Ditto final guess
- scoring

PHASE 8 — INTEGRATION / RESPONSIVE / POLISH

- switch games repeatedly
- reset state correctly
- mobile layout
- desktop layout
- loading/error states
- basic transitions
- bug fixing

PHASE 9 — FINAL MULTIPLAYER QA

Run full multi-client tests.

============================================================
35. TESTING REQUIREMENTS
============================================================

After each phase:

- run type checking
- run build
- run lint if configured
- run tests if present
- manually exercise relevant functionality
- fix errors before proceeding

Do NOT treat “TypeScript compiles” as sufficient.

============================================================
36. MULTI-CLIENT TEST MATRIX
============================================================

Before V0.1 completion test:

2 players:
- Pixel Guess
- Trainer Match
- Pokémon Battle
- Ditto correctly blocked

3 players:
- all four games

8 players:
- room accepts all
- ninth player rejected
- games render without layout/state assumptions

Also test:

- host disconnect
- non-host disconnect
- invalid room
- room full
- duplicate nickname behavior
- player trying to act twice
- player trying action in wrong phase
- return to Lobby
- start another game
- replay same game

============================================================
37. PIXEL GUESS TESTS
============================================================

Verify:

- all clients see same round
- stages change at same logical time
- scores match stage
- wrong answer cooldown works
- correct player cannot repeatedly score
- one player's correct guess does not end round for others
- answer eventually reveals
- dropdown does not show Pokémon artwork
- later-generation Pokémon can appear
- #1025 can theoretically appear
- no Gen-1-only restriction

============================================================
38. TRAINER MATCH TESTS
============================================================

Verify:

- works with 2 players
- works with 3+
- selections private before Reveal
- same selections grouped correctly
- scoring formula correct
- unique answer = 0
- 2 same = 100 each
- 3 same = 200 each
- next question works

============================================================
39. BATTLE TESTS
============================================================

Verify:

- each player gets 5 cards
- cards private
- no duplicate within a hand
- used card disabled
- exactly 5 rounds
- correct stat used
- server determines winner
- ties handled
- all 2–8 player counts work

============================================================
40. DITTO TESTS
============================================================

Verify:

- minimum 3 players
- exactly one Ditto
- Trainers receive same secret Pokémon
- Ditto does NOT receive answer
- speaking order contains every active player once
- voting private
- runoff works
- second tie means Ditto escapes
- Ditto final guess only appears when appropriate
- scoring correct

============================================================
41. DEPLOYMENT ASSUMPTION
============================================================

V0.1 should be deployable as a single Node application supporting WebSockets.

Do not split frontend/backend unnecessarily if one deployable application works.

Assume:

single server instance

because rooms are stored in memory.

Do not introduce multi-instance complexity.

The application should be easy to deploy later to a WebSocket-capable Node host.

============================================================
42. DOCUMENTATION
============================================================

Maintain:

README.md

Include:
- what the project is
- requirements
- install
- development
- build
- production start
- architecture summary
- multiplayer notes
- Pokémon data generation
- asset source
- attribution
- fan-project disclaimer

Maintain:

PROGRESS.md

Include:
- current phase
- completed phases
- current blockers
- known bugs
- important implementation decisions
- test status

Maintain:

FUTURE.md

Put non-V0.1 ideas there.

Examples:
- Mega
- regional forms
- more games
- accounts
- custom question packs
- achievements
- cosmetics
- persistent stats

Do NOT implement FUTURE.md features during V0.1.

============================================================
43. SCOPE — EXPLICITLY OUT OF V0.1
============================================================

Do NOT implement unless required to fix a core blocker:

- accounts
- login
- database persistence
- friend system
- matchmaking
- public room browser
- text chat
- voice chat
- ranking ladder
- achievements
- shop
- cosmetics
- custom avatar upload
- spectator mode
- AI players
- custom question editor
- admin dashboard
- microservices
- Kubernetes
- Redis scaling
- multi-region architecture
- advanced anti-cheat
- Mega
- regional forms
- Gigantamax
- every historical Pokémon form

============================================================
44. THINGS YOU MUST NOT DO
============================================================

Do NOT:

- decide that 151 Pokémon is “enough for MVP”
- decide that exactly 3 players is “enough for demo”
- replace multiplayer with local mock players
- expose private answers to all clients
- use CSS alone to hide secrets
- build four unrelated mini-apps
- add a database without necessity
- spend large amounts of time on animations before games work
- scrape random copyrighted image sites
- silently modify game rules
- stop after scaffolding
- declare completion without multi-client testing

============================================================
45. DECISION POLICY
============================================================

When you encounter ambiguity:

Ask:

1. Is the behavior explicitly specified here?
   → follow it.

2. Can the ambiguity be resolved with the simplest implementation without changing player experience?
   → make that decision, document it, continue.

3. Would the decision materially alter game rules, player count, Pokémon coverage, privacy, or scoring?
   → ask the user before changing it.

Do not ask for approval for ordinary engineering choices.

============================================================
46. PROGRESS REPORTING
============================================================

Do not produce huge essays after every action.

After a meaningful phase, report briefly:

- what was implemented
- what was tested
- result
- next phase
- blockers if any

Example:

Phase 3 complete:
- room creation/join working
- 2–8 players tested
- host migration working
- mobile Lobby renders correctly
- build/typecheck pass

Next: Phase 4 Trainer Match.

============================================================
47. DEFINITION OF DONE
============================================================

V0.1 is complete ONLY when:

A real user can open the site on a desktop or phone.

Another real user can open it on another browser/device.

They can join the same room.

The room supports 2–8 players.

The local Pokémon dataset contains National Dex #001–#1025.

All four games work:

1. 谁是百变怪
2. 像素猜宝可梦
3. 训练家默契挑战
4. 宝可梦猜拳

The following complete loop works for every supported game:

Lobby
→ Start
→ Play
→ Multiple rounds / game flow
→ Scoring
→ Final ranking
→ Return to Lobby

Then another game can be selected and played without recreating the room.

Desktop works.

Mobile works.

No game is artificially restricted to Gen 1.

No game is artificially restricted to a fixed test player count.

Hidden information is not trivially exposed to unauthorized clients.

Production build succeeds.

README explains how to run it.

============================================================
48. STARTING INSTRUCTIONS
============================================================

Start now.

First:

1. Inspect the repository.
2. Read all existing project documentation.
3. Inspect package.json.
4. Inspect existing source code.
5. Determine which existing work is correct and reusable.
6. Search for accidental hardcoded demo restrictions:
   - 151
   - Gen 1
   - fixed player counts
   - fake player arrays
   - mock-only Pokémon data
7. Create or update PROGRESS.md.
8. Give a SHORT implementation/audit summary.
9. Begin implementing the earliest incomplete phase immediately.

Do not spend the first response writing another giant architecture proposal.

Do not ask me to approve every phase.

Do not discard correct existing work simply because you would have implemented it differently.

Implement, run, test, fix, and continue.

The objective is a complete, genuinely playable Pokémon Party V0.1.
## Confirmed gameplay revision — 2026-10-03 (supersedes earlier conflicting rules)

- Codex/C runs development, production and tests on port 3100.
- Pixel: 90 seconds per round, six 15-second clarity stages. Match: ten shared candidates per question, with explicit type restrictions where appropriate. Battle: one fixed five-comparison game with five consumable cards and 60-second picks.
- Pixel / Match / Ditto allow custom 1–20 rounds (Ditto round means a complete identity game). Optional room targets: 500 / 1000 / 2000 / 5000; score accumulates across games until target reached, then resets on the next start. Battle always completes five comparisons.
- Ditto flow for every player count: each living player submits one 1–12-character phrase, public history records it, then unlimited external discussion. Only host ends discussion; living non-hosts can publicly remind once per discussion.
- Secret votes have a 45-second limit, timeout means abstain. Abstentions strictly over half of living players continue words/discussion. Otherwise highest vote is eliminated; ties revote once among tied candidates with abstention allowed, second tie continues words/discussion.
- Eliminated trainers are publicly identified as not Ditto and may spectate only. Host keeps administrative phase controls. Ditto wins when two survive, worth 200. Caught Ditto may guess the Pokémon in 30 seconds to win 150; incorrect/timeout awards all trainers, including eliminated/offline trainers, 100 each.
- Living disconnected identities remain in the game. All living players offline pauses timers, resume remaining time on reconnect. Host migrates automatically.
- Ditto gets one private, persistent clue from one type or fixed height/weight/base-stat tiers. Every eligible clue matches at least 30 of the 1,025 species. Weight uses current Grass Knot tiers; height/stat tier thresholds are game-specific. Details and sources in README.md.
