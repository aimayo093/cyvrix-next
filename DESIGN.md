# CYVRIX — DESIGN.md

The design system this site already uses, written down.

Read this before adding or changing anything the public sees. It is descriptive
rather than aspirational: every value below was extracted from the running
codebase, so following it keeps new work consistent with what is already there.

`docs/DECISIONS.md` covers **why** things are the way they are. This covers
**what they look like**.

---

## 1. Visual theme and atmosphere

A dark, technical, calm interface for a UK managed IT and cybersecurity firm.
Nothing here should read as a large enterprise. The site is deliberately quiet:
one accent colour, one display face, generous vertical rhythm, and no
decoration that is not carrying information.

The intent is a competent specialist, not a corporation. Restraint is the
positioning, not a limitation to grow out of.

**Feels like:** an operations console someone senior actually uses.
**Not:** a startup landing page, a consultancy brochure, or a security vendor
selling fear.

---

## 2. Colour palette and roles

Dark-first. There is one accent and it is used sparingly.

| Role | Hex | Where |
| --- | --- | --- |
| Accent | `#2691F0` | Primary buttons, links, icons, focus rings, active states |
| Accent hover | `#1678CC` | Pressed and hover states of solid accent surfaces |
| Accent text | `#7AB8F4` | Accent-coloured text on dark grounds, eyebrows, inline links |
| Page ground | `#020817` | The deepest surface. Body background |
| Brand navy | `#041635` | Hero and banded sections, one step up from the ground |
| Card surface | `#071126` | Cards and panels sitting on the page ground |
| Raised accent surface | `#061A3C` | Panels that need to read as the important one on a page |
| Sunken band | `#050F27` | Alternating section bands |
| Secondary accent | `#06B6D4` | Cyan. Rare, for a second signal only where blue is taken |

**Text on dark:**

| Weight of meaning | Class | Use |
| --- | --- | --- |
| Primary | `text-white` | Headings, key figures |
| Body | `text-slate-300` | Running copy. The default |
| Secondary | `text-slate-400` | Supporting detail, captions |
| Muted | `text-slate-500` | Legal lines, timestamps, disclaimers |
| Emphasis on dark | `text-slate-200` | Body copy that needs slight lift |

**Admin surfaces invert:** white cards on `bg-slate-50`, ink `#041635`, with the
same accent. The public site is dark; the admin is light. Do not mix them.

**Semantic colour is separate from the accent.** Emerald for clear, amber for
attention, rose for failure. These never stand in for the brand blue and the
brand blue never stands in for them.

---

## 3. Typography

Two faces, both self-hosted through `next/font` — never a CDN link, because the
Content-Security-Policy blocks external stylesheets and the fonts fail silently.

| Role | Face | Notes |
| --- | --- | --- |
| Display | **Outfit** (`font-outfit`) | Headings only, almost always `font-black` |
| Body | **Inter** (`font-inter`) | Everything else. The default |
| Data | monospace | Reference numbers, codes, counts |

**Scale.** Stay on the Tailwind steps. No arbitrary `text-[...]` sizes — the
codebase currently has zero and should keep it that way.

| Element | Classes |
| --- | --- |
| Page title | `font-outfit text-4xl font-black md:text-6xl` |
| Section heading | `font-outfit text-3xl font-black md:text-4xl` |
| Card heading | `font-outfit text-xl font-black` or `text-2xl` |
| Lead paragraph | `text-lg font-medium leading-relaxed text-slate-200` |
| Body | `text-base font-medium leading-relaxed text-slate-300` |
| Small print | `text-xs font-semibold leading-relaxed text-slate-500` |

**The eyebrow.** A recurring device above headings, and the reason weight 900
appears so often at small sizes. It is deliberate:

```
text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]
```

**Weight discipline.** `font-black` belongs on display headings and eyebrows.
Body copy is `font-medium` or `font-semibold`. Weight 900 on running text
flattens hierarchy — if everything shouts, nothing is emphasis.

Headings carry `text-wrap: balance` globally, so a two-line title never orphans
a word.

---

## 4. Component styling

**Buttons.** Solid accent for the primary action, outline for the secondary,
and never two solid accent buttons competing in one view.

```
Primary    rounded-xl bg-[#2691F0] px-6 py-3.5 text-sm font-black text-white
           hover:bg-white hover:text-[#041635]
Secondary  rounded-xl border border-white/15 px-6 py-3.5 text-sm font-black text-white
           hover:bg-white/10
```

**Cards.** One border, one background, no card inside a card.

```
rounded-3xl border border-white/10 bg-[#071126] p-7 md:p-8
```

The important panel on a page uses `border-[#2691F0]/25 bg-[#061a3c]` instead —
one per view at most.

**Inputs.** Dark ground, accent focus ring, and a real label with `htmlFor`
matching the input's `id`. A placeholder is not a label: it disappears when
someone types, and assistive technology announces nothing.

**Focus.** Every interactive element shows keyboard focus:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]
focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]
```

---

## 5. Layout

**Container:** `max-w-7xl` for full sections, `max-w-3xl` for prose. Running
text stays near 65 characters.

**Section rhythm:** `py-16` compact, `py-20` standard, `py-24` generous,
`py-28` for a hero. Pick one per section and hold it.

**Horizontal padding:** `px-5` on mobile, `lg:px-8` on desktop, everywhere.

**Grids** use `gap`, not per-element margins. Wide content — tables, code,
diagrams — sits in its own `overflow-x-auto` container so the page body never
scrolls sideways.

---

## 6. Depth and elevation

Depth comes from surface colour, not from heavy shadow. Four steps:

1. Page ground `#020817`
2. Banded section `#050F27` or `#041635`
3. Card `#071126`
4. Raised panel `#061A3C`

Borders are `border-white/10` — visible enough to separate, quiet enough to
disappear. Shadow is reserved for genuinely floating things (dropdowns, sticky
bars), where it is `shadow-2xl shadow-black/50`.

**Radius.** `xl` (1rem) for controls and inputs, `2xl` (1.5rem) for panels,
`3xl` (2rem) for cards, `full` for pills and avatars. **Four values, not eight.**
The codebase currently has strays at `md` and `lg` — bring them onto the scale
rather than adding another step.

---

## 7. Guardrails

**Never:**

- Publish a claim that is not verifiable against a public register or evidenced
  on request. `npm run check:claims` fails the build on this — see
  `docs/DECISIONS.md`.
- Put a `<label>` next to an input without `htmlFor` and a matching `id`.
- Nest a bordered card inside a bordered card.
- Add a fifth corner radius.
- Use emoji as section markers.
- Use `font-black` on running body copy.
- Add a transition without letting `prefers-reduced-motion` reduce it.
- Load a font from a CDN. The CSP blocks it and the failure is silent.

**Always:**

- One accent colour per view, one primary action per view.
- `text-balance` on headings.
- `tabular-nums` wherever digits line up in a column.
- `aria-hidden` on decorative marks.

---

## 8. Responsive behaviour

Mobile first. Breakpoints are Tailwind's defaults; `md` and `lg` do the work.

- Grids: one column, then `md:grid-cols-2`, then `lg:grid-cols-3`.
- Type steps up at `md`, not at `sm`.
- Touch targets are at least 44px — `min-h-13` or `py-3.5` on controls.
- The page body must never scroll horizontally at 375px. Check it.

---

## 9. Motion

Motion is quiet and mostly limited to state changes. There is no scroll-jacking,
no parallax, and no entrance animation on content a reader came to read.

**Curves** — defined in `app/globals.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--ease-entrance` | `cubic-bezier(0.16, 1, 0.3, 1)` | Things arriving. Decelerates in |
| `--ease-move` | `cubic-bezier(0.4, 0, 0.2, 1)` | Moving between two states |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Things leaving |

Interactive elements inherit `--ease-entrance` from the base layer, so a plain
`transition-colors` is already on the right curve.

**Duration:** 150–200ms for colour and small state changes, 300ms for anything
that moves or resizes. Longer than 400ms on a hover reads as sluggish.

**Reduced motion** is handled globally: transitions collapse to a single frame
rather than disappearing, so state still changes but stops moving.

---

## Agent prompt

> Follow `DESIGN.md` in the project root. Dark UI on `#020817`, one accent
> `#2691F0`, Outfit for headings at weight 900 and Inter for everything else.
> Cards are `rounded-3xl border-white/10 bg-[#071126]`. Four corner radii only:
> xl, 2xl, 3xl, full. Every input needs a real label with `htmlFor`. Every
> interactive element needs a visible `focus-visible` ring. No claim goes on the
> page that cannot be evidenced — `npm run check:claims` will fail the build.
