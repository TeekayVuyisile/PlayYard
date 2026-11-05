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

- Prism Code: prism vault in the observatory, faceted SVG crystals in four colours with B/G/R/Y labels; choose two positions to swap.
- Avoid the Poison: midnight snack table in the cafe, crescent-shaped SVG tokens, numbered trays, explicit safe/poison labels and three-heart life counters.

- Memory Duo: memory archive in the observatory; numbered, letter-labelled crystals, a bounded viewing progress bar and private recall controls.
- Fuse Rush: night circuit; a dimensional metal bomb instrument, a tabular countdown, large recipient buttons and explicit life/elimination labels. No flashing or auto-playing audio.

## Motion and access

CSS geometry supplies a rotating 3D artifact, dimensional timing prop and floating notes. Hover tilt, scene arrival and answer reveals are restrained. There is no WebGL dependency. Respect prefers-reduced-motion and the persisted manual motion toggle; never animate the gameplay clock for decoration. Keep interactive content opaque enough to read. Inputs stay at least 16px on phones. Primary controls and the motion toggle have at least 44px touch targets.

## Asset delivery

Use only the original scene images in public/art, never rasterized mockup UI. Main art uses 1680px WebP images; phone backgrounds and tiles use 800px variants. Portraits in the environment are decorative, while actual player identity uses nicknames and initials. Exact generation prompts are in ASSETS.md.

## Content

No invented activity, reviews, scores, rankings, currency or profile capabilities. Private rooms support 3–8 players for Imposter, 2–8 for Fuse Rush and two players for other games. Real HTML and React controls render all game state, text, invites and chat.

## Catalogue and practice refinement

Each card layers an original vector game object over the cinematic scene: number tumblers, a stopwatch, matching speech panels, secret identity cards, chess pieces, four prisms, a crescent-snack tray, memory tiles and a metal fuse bomb. These are decorative SVG illustrations rather than interface screenshots or new remote assets. Keep Create room and Join room as separate 44px controls inside an article, and never nest buttons. Stop the Clock also offers Practice solo.

Room forms confirm the chosen game without a selector. Practice uses the circuit setting, a large local clock, labelled settings and recent-attempt feedback. Space controls only the active clock and must preserve text-entry and native form behaviour. Same Answer gives the last reveal its own deliberate continuation to the final score.

## Computer tables

Chess, Guess My Number and Prism Code add a Bot icon and Play with computer action below their card actions. Use the existing scene and lime action palette. Solo settings explain difficulty and session lifetime, then give way to a centred game panel and a compact thinking/settings toolbar. Keep chess content at a readable maximum width with equal side space at desktop widths. On phones use the available panel width for the chess board rather than adding a second set of outer gutters. Do not imply rated chess strength or saved solo progress.

## Game instructions

How to play opens a centred popup tutorial from cards, rooms, computer games and clock practice. Show one visual demonstration and a short caption per step, with replay and clear navigation. Put complete text rules in an All rules view. Use real game pieces and labelled colours, restrained looping demonstrations, 44px controls and a scrollable middle with fixed header/footer. Native dialog supplies focus containment and blocks the background. Escape closes and returns focus to the launcher. Respect reduced motion and manual pause; show static demonstrations when motion is off. Tutorials do not pause gameplay clocks.
