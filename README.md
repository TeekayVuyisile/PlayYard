# PlayYard

An invite-only, mobile-friendly party-game lounge with original cinematic anime scenery and a graphite/lime interface.

## Local development

Requires Node.js 22.22 or newer (or current Node 24 LTS).

```powershell
npm install
npm run dev
```

Open the address printed by Vite. Create a room, then use a different browser or private browsing session to join as the second player. Ordinary tabs share the same player cookie. Reloading an invitation opens the join form; re-enter a nickname to reconnect to your existing seat.

## Voice configuration

Copy `.dev.vars.example` to `.dev.vars` and fill in the three LiveKit values privately. Restart the local server afterward. This file is ignored by Git. Never prefix credentials with `VITE_`: those variables can be exposed to the browser. The server issues short-lived, room-specific voice tokens only to room members.

LiveKit uses its own quota; voice is optional and text/gameplay continue independently. No recording or transcription is configured. This is an invite-only development beta for known friends, not a public service ready for children or stranger matchmaking. Public launch requires age-appropriate access controls, moderation, reporting, privacy review, and capacity/abuse controls.

## Checks

```powershell
npm test
npm run build
# With the local server running in another terminal:
npm run test:multiplayer
```

GitHub Actions runs the same checks on PRs targeting `main` and on pushes to `main`. The `Verify app` job installs locked dependencies with Node 24, runs the rule tests, builds both bundles, and starts a fresh local Worker on port 5174 for the multiplayer tests. It requires no service credentials and does not deploy. Configure `Verify app` as a required status check after its first successful PR run. Cloudflare remains responsible for preview and production deployments.

## Deploy to your Cloudflare account

Production uses Cloudflare Workers Builds connected to GitHub: changes merged into `main` deploy automatically. Use `npm test && npm run build` as the build command and `npx wrangler deploy` as the production deploy command. PR previews use `npx wrangler preview`, with isolated room storage and voice disabled until preview credentials are configured.

For an explicitly chosen manual deployment instead, authenticate using Cloudflare's CLI:

```powershell
npx wrangler login
npm run deploy
```

The configuration creates SQLite-backed Durable Objects compatible with Workers Free. The deployment prints the free `workers.dev` address. Keep the Workers plan on Free. Neon PostgreSQL is planned for persistent profiles and history; it is not connected yet. Active room state remains in Durable Objects.

The public production LiveKit URL is declared in `wrangler.jsonc`. Set the two credentials using interactive secret prompts (enter each value privately):

```powershell
npx wrangler secret put LIVEKIT_API_KEY
npx wrangler secret put LIVEKIT_API_SECRET
```

## Implemented

- Private rooms with eight-character invitation codes: 3–8 players for Imposter, 2–8 for Fuse Rush, two players for other games.
- A prominent, selectable invite code with separate copy-code and copy-link controls.
- Configurable integer ranges from 0 to 1,000,000.
- Server-held secret numbers, alternating guesses, and exact-hit wins.
- Server-generated higher/lower hints, guess history, and rematches.
- Stop the Clock with configurable 1–30 second targets, visible or hidden timing, private submissions, closest-time scoring, draws, and rematches.
- Each player starts independently; results reveal when both players have submitted.
- Same Answer: 120 prompts with five per match, private answers, shared points, reveal history, and both-player confirmation before advancing or rematching. Each room exhausts its shuffled prompt bank across 24 matches before repeating; the queue survives reconnects and saved-state reloads. A new cycle avoids repeating the previous match immediately. Separate rooms have independent queues.
- Answer matching normalizes Unicode width and case, treats punctuation as spaces, and collapses repeated whitespace. A curated English noun list accepts common singular/plural forms (including fox/foxes, knife/knives and mouse/mice), with selected whole-answer equivalents such as bike/bicycle, colour/color and sofa/couch. Multiword answers retain their modifiers; red apples does not match green apple. This is a deterministic list, not AI: unsupported synonyms, typos and other languages still require matching wording. Original submitted answers remain visible in reveals; completed rounds are not rescored when matching rules change.
- Guess the Imposter: word or one-stroke drawing modes, 3–8 players, host-selected 1–5 clue rounds, private roles and a single private voting stage. Correct unique top vote catches the imposter; a wrong choice or tied top vote lets the imposter win.
- Chess: server-validated multiplayer moves, castling, en passant, promotion/underpromotion, checkmate, automatic repetition/fifty-move/insufficient-material draws, draw offers, resignations and mutually confirmed rematches with swapped colours. No clock. Local computer play is available separately from the game card.
- Prism Code: each player seals a four-colour permutation for the other to solve. Alternate guesses receive only a correct-position count; the first exact match wins. Colours also have letter labels, and crystals swap using buttons that work with touch or keyboard.
- Avoid the Poison: two separate trays of ten moon-shaped snack tokens. Each player privately traps three on the other player’s tray, then takes turns picking from their own. The third poison loses the match. Remaining traps reveal only at the end.
- Memory Duo: both players study a shared pattern for three seconds, then answer privately. Five rounds grow from four to eight crystals, colours may repeat, each correct position earns one point, and matching final totals draw. Both confirm readiness and rematches.
- Fuse Rush: 2–8 players, three lives each, random 10–20 second fuses, chosen recipients and a 300 ms minimum hold. The holder at expiry loses a life; eliminated players spectate, and the last survivor wins. New fuses start after four seconds.
- Room text chat, reconnecting WebSockets, and optional LiveKit voice with mute.
- Room state survives Worker hibernation; inactive rooms expire after 24 hours.

The first exact guess wins, following the requested rules. The starting player switches on rematches. Same Answer is cooperative: both players share a score out of five. Submitted answers survive reconnects and cannot be edited; incomplete drafts are local to the current page. Stop the Clock measures elapsed time locally with `performance.now()` and sends only start/stop events; the server validates plausible duration, locks submitted results, and rejects stale round actions. This is casual scoring, not tamper-proof timing. A running timer cannot be resumed accurately after a page reload: reset the unfinished attempt to retry. Transient connection loss preserves a captured stop in the current page and attempts submission on reconnect. Public matchmaking, accounts, and XP are not implemented.

## Visual design

Each game has its own illustrated world: the observatory, night circuit, or listening cafe. Original generated artwork is delivered as responsive WebP assets in `public/art`; no UI is baked into those images. Character portraits in the scenery are decorative, not player identities.

CSS provides restrained 3D geometry, hover depth and reveal motion without a WebGL dependency. The header motion control saves its setting locally, and the UI respects the operating system reduced-motion preference. Real elapsed-time measurement is independent of decorative motion. Design tokens and generation prompts are recorded in `design-system/playyard-lounge`.

## Imposter and chess play notes

Imposter starts in a lobby. The first player is the host and deals once 3–8 players have joined. New players may join only in the lobby or after a reveal. Roles and words remain private until deliberately revealed on your screen; the imposter never receives the word until the match ends. Written clues are submitted in turn, or players may describe their clue in voice and mark it given aloud. The host can skip a stalled clue turn after 60 seconds. Voting requires every player; there is no automatic vote or player removal. The host deals the next match after the reveal. Seats are reserved for the lifetime of the room, including disconnected players.

Drawing uses a shared SVG canvas and pointer events, with one continuous stroke per player per round. Pointer release or cancellation finishes the stroke. Other players see it once the turn is submitted, rather than streaming each pointer movement. There is no erasing or undo. Strokes use normalized coordinates and bounded point samples to keep storage and messages small. If transmission fails, retry the captured stroke; reloading before it is accepted loses the local stroke. The server validates turn ownership and coordinates, but cannot prove physical pen continuity or automatically detect letters or meaningful clues. Playing without naming/writing the word is a social rule.

Chess rules use the locally installed chess.js package, not an external API. Move history is persisted and replayed on the server so repetition detection survives reconnects and Worker hibernation. Board orientation follows your colour; select a piece and then a highlighted destination. Promotion asks which piece to choose. Both players confirm a rematch. The rules engine automatically ends drawn positions rather than requiring formal tournament claims.

These games use existing Workers room storage and optional LiveKit voice. No new environment variables, Neon tables, hosted drawing service or paid chess service are required.

## Hidden-duel play notes

Prism Code and Avoid the Poison both support two players, setup before the second player arrives, server-held private choices, and mutually confirmed rematches. The starter changes each match. Submitted setup cannot be changed. Only your own secret code or the traps you set are included in your private snapshot; the opponent’s setup is revealed when the match finishes. Accepted guesses and picks survive reconnects, while unsubmitted setup and guess arrangements are local drafts. Re-enter the room through its invite code after reloading to reconnect to your seat.

In Prism Code, all four colours appear exactly once. Select two crystal positions to swap them, then seal the secret or submit a guess. Feedback is an exact-position count, without marking particular positions. Both players’ guesses and feedback are public. Repeating your own previous guess is rejected.

In Avoid the Poison, setup selections mark the opponent’s tray, while gameplay selections always pick from your own tray. Slots are independent across the two trays. The server validates turn order, stale turn numbers, picked slots, poison hits and the three-life loss condition. Safe picks do not restore or consume lives.

These additions use the existing room storage, chat and optional voice. They add no packages, APIs, environment variables or database migrations. The existing GitHub multiplayer command includes both new games automatically.

## Timed games

Memory Duo starts when both players confirm readiness. A 1.5-second countdown precedes the shared three-second viewing window. The server sends the pattern when the window opens, then removes it from recall snapshots. Answers are private until both are submitted; correct-position points accumulate to a maximum of 30 over five rounds. Both players confirm the next round and a rematch. Reloading during study does not restart or extend the viewing window; rejoin promptly to see the remaining time. Submitted answers survive reconnects, while incomplete recall drafts stay on the current page.

In Fuse Rush, the host starts the match after 2–8 players join. A random survivor receives each new bomb. The displayed fuse lasts 10–20 seconds, and passes never reset its deadline. The current holder can pass to any other survivor after holding for 300 ms. Deadline and ownership checks run on the server: a pass received at or after expiry is rejected, even if the alarm fires late. Network latency can affect very close passes; the browser countdown is an estimate of server time. No client-reported timer or pass timestamp determines a loss.

An explosion removes one life from the holder, with a four-second break before the next fuse starts automatically. Zero-life players stay as spectators, and disconnected players remain eligible to receive the bomb until eliminated. Matches continue through disconnections and end with one survivor, with at most 23 explosions for eight players. New players join only before a match starts or after it finishes. The original host can restart the finished match, including if they were eliminated.

Room storage persists timing deadlines. One Durable Object alarm schedules the earliest game event or the existing 24-hour inactivity expiry. Repeated alarm delivery cannot deduct another life for an already resolved fuse; chat and passes do not replace the deadline with the room cleanup time. Browser intervals only draw countdowns; they do not run the game. No new bindings, services, secrets or packages are required.

## Game cards, practice and final reveals

Each game card has separate Create room and Join room buttons. Creation is fixed to that card’s game, with only the relevant game settings shown. Card-specific joins include an expected game; the Worker rejects a mismatched room code before adding or reconnecting a seat. The lounge’s generic Join with a code button and invitation links continue to resolve the game from the room itself. Choose a game in the hero focuses the catalogue.

Stop the Clock also has a Practice solo button, available directly at `?practice=timer`. Practice is entirely local: no room, opponent, account or service token is needed. Targets range from 1–30 seconds, with optional hidden timing, early/late feedback and the ten most recent attempts. Practice history lasts only until the page is closed or reloaded. The Play with friends action opens the fixed Stop the Clock creation form.

Space starts or stops both practice and multiplayer stopwatch attempts on keydown. Held-key repeats do not toggle the clock. Inputs, textareas, editable areas, links, unrelated buttons and native form controls retain their normal keyboard behaviour; typing spaces in room chat does not control the timer. Clock action buttons opt into the same shortcut without also firing their native Space click. Existing local monotonic timing, pending-stop submission, server validation and the 60-second limit remain in use.

Same Answer keeps the fifth prompt’s reveal visible before showing the match summary. Each player independently chooses See final score, then both still confirm a rematch. Reconnecting to a finished match starts at the last answer reveal again.

Every card now has its own original SVG game-object illustration over the existing cinematic background. Artwork lives in `src/GameCover.tsx`, while the game catalogue and direct card actions live in `src/game-catalog.ts` and `src/GameCards.tsx`. Illustrations are decorative; real titles and buttons remain accessible HTML. This pass adds no packages, secrets, services or database migrations.

### Playing against the computer

Chess, Guess My Number and Prism Code have a **Play with computer** action on their game cards. Choose Easy, Medium or Hard before starting. Chess also lets you choose white or black; Guess My Number supports a custom inclusive range from 0 to 1,000,000. Solo games run locally in the browser without rooms, accounts, AI APIs or new hosting services. Solo progress is held in memory: changing settings, refreshing or leaving starts over.

- Chess uses the existing chess.js legality and endgame rules. Easy chooses random legal moves. Medium searches up to two plies; Hard searches up to three, with material and simple positional evaluation. A Web Worker keeps the search off the UI thread, with a 1.5-second/45,000-node budget and the last completed search result. These are casual difficulty levels, not rated engine strengths. Draw offers are accepted by the computer; resignations and colour-swapping rematches are supported.
- Guess My Number gives the computer its own random secret. Easy avoids duplicate guesses; Medium narrows the range using its clues and picks randomly inside it; Hard uses midpoint guesses.
- Prism Code uses all 24 distinct arrangements. Easy tries unguessed arrangements; Medium eliminates those inconsistent with its own clues; Hard also minimises the largest remaining feedback group. The computer generates its own code and never reads the human code to make guesses.

Number and Prism strategies receive only the computer player's filtered view. Chess receives only the public move history. This prevents strategy code from using hidden choices, although local solo play is not an anti-cheat boundary against someone inspecting their own browser. Multiplayer rules and room storage are unchanged.

Desktop chess content, including the board, status and actions, is centred within its panel. Prism content also has a centred readable width. The solo module loads only when a solo game is opened.

## How-to-play guides

Every game card opens a How to play popup. The same popup is available in multiplayer rooms, computer games and stopwatch practice. Show me how presents five illustrated steps with Back, Next, direct step selection and replay. All rules retains complete rules, including both Imposter modes and special chess moves.

Tutorials use a native modal dialog rendered outside the app layout, with background interaction blocked, contained keyboard focus, Escape closing and focus return. Game-specific illustrations reuse the real crystals and chess pieces; CSS animations demonstrate counting, remembering, drawing and passing. Reduced-motion and manual pause preferences show static examples. Opening a guide does not pause running games. Rule text is centralised in src/game-rules.ts; illustrations are in src/RuleDemo.tsx.
