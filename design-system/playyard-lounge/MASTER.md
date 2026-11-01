# PlayYard cinematic lounge design system

Approved direction: mature cinematic anime, architectural framing, graphite surfaces and acid-lime actions. This file takes precedence over the helper's generic style recommendations and the older Game Hub design notes.

## Colour and type

- Background: #0c1119. Panels: #111925 and #192332. Borders: #354154 through #61728a.
- Main text: #eef2f5. Secondary text: #a3b0c3. Main action: #c8f36b with #101718 text.
- Manrope for headings; DM Sans for interface copy; system monospace for codes and timing.
- Corner radius: 5px controls, 8px panels. No peach banners or orange buttons.

## Worlds

- Lounge: rooftop after rain, blue-hour skyline, grounded original anime scenery.
- Guess My Number: observatory, smoked-glass artifact, restrained violet details.
- Stop the Clock: urban night circuit, brushed-metal timing instrument.
- Same Answer: listening cafe, dark walnut and muted plum stationery.
- Guess the Imposter: secret-society table, using the existing cafe scene with a shared dark drawing surface and player stroke colours.
- Chess: strategy table, using the observatory scene with a slate/ivory board and lime legal-move markers.

## Motion and access

CSS geometry supplies a rotating 3D artifact, dimensional timing prop and floating notes. Hover tilt, scene arrival and answer reveals are restrained. There is no WebGL dependency. Respect prefers-reduced-motion and the persisted manual motion toggle; never animate the gameplay clock for decoration. Keep interactive content opaque enough to read. Inputs stay at least 16px on phones. Primary controls and the motion toggle have at least 44px touch targets.

## Asset delivery

Use only the original scene images in public/art, never rasterized mockup UI. Main art uses 1680px WebP images; phone backgrounds and tiles use 800px variants. Portraits in the environment are decorative, while actual player identity uses nicknames and initials. Exact generation prompts are in ASSETS.md.

## Content

No invented activity, reviews, scores, rankings, currency or profile capabilities. Private rooms support 3–8 players for Imposter and two players for other games. Real HTML and React controls render all game state, text, invites and chat.
