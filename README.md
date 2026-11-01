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

- Private rooms with eight-character invitation codes: 3–8 players for Imposter, two players for other games.
- A prominent, selectable invite code with separate copy-code and copy-link controls.
- Configurable integer ranges from 0 to 1,000,000.
- Server-held secret numbers, alternating guesses, and exact-hit wins.
- Server-generated higher/lower hints, guess history, and rematches.
- Stop the Clock with configurable 1–30 second targets, visible or hidden timing, private submissions, closest-time scoring, draws, and rematches.
- Each player starts independently; results reveal when both players have submitted.
- Same Answer: five unique prompts per match, private answers, shared points, reveal history, and both-player confirmation before advancing or rematching.
- Answer matching normalizes Unicode width and case, treats punctuation as spaces, and collapses repeated whitespace. Synonyms and plurals are not fuzzy-matched.
- Guess the Imposter: word or one-stroke drawing modes, 3–8 players, host-selected 1–5 clue rounds, private roles and a single private voting stage. Correct unique top vote catches the imposter; a wrong choice or tied top vote lets the imposter win.
- Chess: server-validated moves, castling, en passant, promotion/underpromotion, checkmate, automatic repetition/fifty-move/insufficient-material draws, draw offers, resignations and mutually confirmed rematches with swapped colours. No clock or computer opponent.
- Prism Code: each player seals a four-colour permutation for the other to solve. Alternate guesses receive only a correct-position count; the first exact match wins. Colours also have letter labels, and crystals swap using buttons that work with touch or keyboard.
- Avoid the Poison: two separate trays of ten moon-shaped snack tokens. Each player privately traps three on the other player’s tray, then takes turns picking from their own. The third poison loses the match. Remaining traps reveal only at the end.
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
