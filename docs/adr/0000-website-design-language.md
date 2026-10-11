# ADR 0000 — Design language: the site is a flow battery

**Date:** 2026-10-10 · **Status:** accepted

## Context

This record is numbered 0000 because it is the parent of the others. ADR 0001–0004 govern *how* the site is built — the builder, the URLs, content-as-data, the PDFs. This one governs *what it looks like, and why*: the decision every future visual choice is checked against.

The Flow Battery Commons lives on **two platforms** where its knowledge is stored and exchanged: a Discord server, where members talk, and a GitHub organisation, where they store and share datasets, tools and other digital resources. That duality *is* the flow battery's own identity — a flow battery stores its energy not in a single block but in **two liquid electrolytes in two external tanks**, circulated through a central cell. Knowledge works the same way here: stored in two tanks, exchanged through the community in the middle. And where a battery is powered by its stack and its current, the commons is powered by its community members — **the scientists**. The constraint: the metaphor must carry a real interface — nav, cards, bands, page themes, interaction states. The site should read as a flow battery to a flow battery researcher, and as a clean, calm, serious information source to everyone else.

The color palette was not free to choose. The **Flow Battery Commons logo** predates
the website: it was created by the community founders of the QUB and MIT, and it shows a globe wired to two small tanks marked "+" and "−", filled with yellow and red. It had to be decided, whether the design language of this website serves that artwork or contradicts it.

## Decision

**One metaphor, expressed consistently: the site is a flow battery, and everything the reader does is fluid moving through it.** Four correspondences
carry the load, and each one is a working component, not an illustration:

| Physical thing | The commons equivalent | Where it lives |
| --- | --- | --- |
| **Two electrolyte tanks** (+ / −) | The two platforms: **Discord is the + tank, GitHub the − one**, at equal level — neither platform sits above the other | hero card (`06-hero-card.css`), the "Two platforms" rows (`10a-platforms.css`), the join buttons |
| **The stack** — where the cell does its work | The community: the central cell is a crowd of researcher avatars, and what the circuit produces at the top is a lightbulb — knowledge | `components/hero-card.html` |
| **The electrolyte** — stored knowledge in motion | Reading: the scroll-linked **stream** is a tube of liquid that fills as you read and drains into the footer's tank; the scroll cue says *keep it flowing* | `{{> stream}}` + `01-stream.js`, the footer wave |
| **The pumps** | The members who circulate it — two counter-rotating impellers, one per platform, wearing its colour | hero card |

The hero diagram is deliberately text-free: a **pictogram, not a schematic**.

**The colours are inspired from the logo, not the other way round.** 
However, the original colors were slightly too intense to serve as brand colors. The brand pair inspired by the logo's tank fills is tokenised in `01-tokens.css`:

- `--pos` **#F2D024** — the "+" tank's yellow → **Discord** (communication)
- `--neg` **#EE5C5C** — the "−" tank's red → **GitHub** (data & resources)
- `--pos-deep` / `--neg-deep` exist only where the bright pair would not
  carry on light ground (the headline ramp, hairlines, small labels).

The logo's takns were recoloured to exactly those two tokens — the only edit made to the artwork. **Green is the commons' own neutral colour**, which derives from the logo's globe: the default page theme, the ink, the mint grounds.The rationale for serving the logo instead of designing around it: the logo is the community's prior art, made by its founders. Aligning with it costs nothing and buys recognition. 

**Colour is semantics, never decoration.** The rules that keep the metaphor
legible:

- Discord is always yellow, GitHub always red. These are the site's own tank colours, 
  the marks wear the palette, never the reverse.
- Brand colour appears only as a **mark or an interaction accent** (hover,
  CTA), never as resting decoration. A page that is yellow or red everywhere
  is a page *about a platform*, not a general information.
- **Page themes** (`01a-theme.css`): a page declares `theme: yellow|red` in
  its front matter — the committees page (the Discord side) is yellow, the
  resources page (the GitHub side) is red, home is green — and the theme
  repaints the stream, the footer tank, the dark bands, the accents and the
  join card. What is *never* themed: the mint grounds, the yellow·green·red
  hairline ramps, the nav chrome, and the two platform marks. The platforms
  are the one fixed truth against which the themes are read.
- The empty tubing (`--stream-track`) stays neutral grey on every theme:
  the tube is infrastructure, the liquid is content.

**Surfaces: glass and liquid.** Most UI elements the reader touches resemble glass and liquids — translucent light sections with hairline rules (`--line`), 16 px radii, soft low shadows, one typeface pair (Sora for display, Inter for body). Dark bands are the liquid: they wear the tank colour and join by two-tone wave caps (`07-waves.css`, `11-band.css`), so band, footer and stream read as *one body of electrolyte* behind the page; light sections are glass the stream shows through. Motion obeys the same law: reveals rise like a filling level, counters charge up, and all of it yields to `prefers-reduced-motion`.

## Consequences

+ Every design question now has a test: *what does the flow battery do here?* A new section decides whether it wears the theme's liquid or stays neutral; a new accent must mean something before it is allowed to look good.
+ The metaphor is self-explaining to exactly the audience the site is for — people who study these tanks read the hero without a caption — and stays quiet for everyone else.
+ The palette is closed and auditable: two brand tokens, one neutral ramp, one set of theme variables, with the invariants written into the CSS files that own them, so a contributor can check a change against the prose.
− The metaphor **constrains**: yellow and red are reserved for the platforms, so neither is available as a generic warning/success/decoration colour. The logo's globe blue stays inside the logo — the site's green is deliberately *not* the globe's. And a third platform would not be a colour choice: two tanks is the identity, three is a redesign.
− The stream is the most fragile element on the site (runtime geometry, gradient edge cases, per-breakpoint rules — `docs/authoring.md` §4). 
− Tokens and logo are one fact in two files: changing a tank colour in `01-tokens.css` without editing `src/assets/img/logo.svg` (or the reverse) silently breaks the identity. The logo's header comment names the tokens its tanks wear; keep it that way.
