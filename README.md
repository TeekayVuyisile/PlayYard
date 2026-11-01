# Game Hub

An invite-only, mobile-friendly party game beta. The working title is temporary.

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
```

## Deploy to your Cloudflare account

GitHub is optional. Authenticate using Cloudflare's CLI, then deploy directly:

```powershell
npx wrangler login
npm run deploy
```

The configuration creates SQLite-backed Durable Objects compatible with Workers Free. The deployment prints the free `workers.dev` address. Keep the Workers plan on Free. D1 is intentionally deferred until persistent profiles are introduced.

Set production LiveKit configuration using interactive secret prompts (enter each value privately):

```powershell
npx wrangler secret put LIVEKIT_URL
npx wrangler secret put LIVEKIT_API_KEY
npx wrangler secret put LIVEKIT_API_SECRET
```

## Implemented

- Two-player private rooms with eight-character invitation codes.
- Configurable integer ranges from 0 to 1,000,000.
- Server-held secret numbers, alternating guesses, and exact-hit wins.
- Server-generated higher/lower hints, guess history, and rematches.
- Room text chat, reconnecting WebSockets, and optional LiveKit voice with mute.
- Room state survives Worker hibernation; inactive rooms expire after 24 hours.

The first exact guess wins, following the requested rules. The starting player switches on rematches. Stop the Clock and Same Answer are visibly marked as future games. No public matchmaking, accounts, XP, or deployed production service is represented as complete.
