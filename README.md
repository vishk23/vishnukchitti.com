# vishk-site

Personal site for Vishnu Kchittibhooma. Astro 5+ (currently pinned to Astro 7),
static output, TypeScript strict. Vanilla-TS islands — no React/Vue/Tailwind.

> **Status: scaffold.** The visual design is intentionally absent. Styling is
> minimal neutral placeholder CSS (`src/styles/global.css`) that a later design
> pass replaces wholesale. All copy is stubbed with `[[COPY: <key>]]` markers.

## Commands

```sh
npm install        # install deps
npm run dev        # dev server at http://localhost:4321
npm run build      # static build -> dist/
npm run preview    # serve the built dist/
npm run check      # astro check (TS strict type check)
npm run deploy     # build + wrangler deploy (needs Cloudflare auth)
```

## Project structure

```
src/
  content.config.ts     # zod-schema collections (site, sections, projects, now)
  content/              # ALL COPY lives here — nothing hardcoded in components
    site.json           #   global meta + nav/route list (feeds ⌘K palette)
    sections/*.md       #   homepage flow: hero, selected-work, experience, contact
    projects/*.md       #   /projects/<slug> deep dives
    now/now.md          #   /now page
  data/                 # sensor JSON (build-time only) + shape docs
  lib/
    sensor.ts           # typed build-time loader (JSON -> Float32Array channels)
    downsample.ts       # min-max bucket downsampler + clip normalizer
    synthetic.ts        # synthetic placeholder signals (proof-of-plumbing only)
  layouts/Layout.astro  # shared shell, head/meta slots, nav, footer
  components/
    WaveformScrub.astro # PROOF 1: webgl-plot line + GSAP ScrollTrigger scrub
    ChannelToggle.astro # PROOF 2: 6 stacked lines w/ checkbox visibility
    CommandPalette.astro# dependency-free ⌘K palette
  pages/
    index.astro         # single-page flow (hero -> work -> experience -> contact)
    projects/[slug].astro
    now.astro
    resume.astro        # placeholder link route
  styles/global.css     # placeholder CSS (replaced by design pass)
```

## Where copy goes

Every string on the site is a content-collection field, never hardcoded in a
component. To fill copy, replace the `[[COPY: <key>]]` stubs in `src/content/`:

- Global title/tagline/email + the nav list → `src/content/site.json`
- Homepage sections → `src/content/sections/*.md` (frontmatter + markdown body)
- Project pages → `src/content/projects/*.md`
- `/now` → `src/content/now/now.md`

Schemas live in `src/content.config.ts`; adding a field means updating the zod
schema and the component that reads it.

## Where sensor data goes

Raw recordings are JSON files in `src/data/` (see `src/data/README.md` for the
exact shape and expected filenames). They are consumed **at build time** and
downsampled before any bytes reach the browser.

Currently only `src/data/ppg-hero.json` exists and it is a **placeholder**
(`"placeholder": true`). Drop real files in with the same shape and the loader
picks them up by key (filename without `.json`).

## How the waveform components consume the loaders

`WaveformScrub` and `ChannelToggle` do all heavy lifting in Astro frontmatter
(build time), then hand the client a small plain-number array via an inline
`<script type="application/json">` tag:

```
loadSensor(key)                      # src/lib/sensor.ts -> SensorSeries | null
  -> minMaxDownsample(channel, N)    # src/lib/downsample.ts -> envelope
  -> normalizeToClip(envelope)       # -> Float32Array in webgl-plot's [-1,1]
  -> Array.from(...)                 # JSON-transported to the client island
```

The client `<script>` module then renders with `webgl-plot` and (for the scrub)
animates with `gsap`/`ScrollTrigger`. If `loadSensor` returns `null` (file not
yet present) the component falls back to `src/lib/synthetic.ts` and shows a
`placeholder data` badge. Both components:

- **respect `prefers-reduced-motion`** — no pin/scrub, static figure; and
- **lazy-init via `IntersectionObserver`** — WebGL contexts spin up only when
  the figure nears the viewport.

To wire a component to real data, ensure the JSON file exists in `src/data/` and
pass its key: `<WaveformScrub dataKey="ppg-hero" />`.

## ⌘K command palette

`CommandPalette.astro` is a dependency-free `<dialog>` opened with ⌘K / Ctrl+K
(or the nav button). It subsequence-fuzzy-filters the route list from
`site.json` — add a route to that `nav` array and it appears in the palette.

## Deployment

Static build deployed to **Cloudflare Workers static assets** (see
`wrangler.toml`). Workers Static Assets is chosen over Cloudflare Pages because
it is Cloudflare's unified, forward-looking deploy surface: the same
`wrangler deploy` path works if the site later grows an SSR/API route, with no
separate Pages project to maintain. Since the site is pure-static there is no
Worker script — `dist/` is uploaded and served from the edge.

CI (`.github/workflows/ci.yml`) type-checks and builds on every push/PR and
uploads `dist/` as an artifact. It is **build-only** — no deploy secrets are
configured yet. Add a Cloudflare API token to repo secrets and a deploy job to
enable automatic deploys.
