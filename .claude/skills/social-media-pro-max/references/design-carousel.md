# Viral Carousel Design (Instagram + LinkedIn)

Carousels are the #1 format for **saves and authority**. Goal: maximize swipe-through (each slide must earn the next) and saves.

## Specs
| Platform | Aspect ratio | Pixel size | Slides | Format |
|----------|--------------|------------|--------|--------|
| Instagram | 4:5 (portrait, best reach) or 1:1 | 1080×1350 / 1080×1080 | 6–10 | images (up to 20) |
| LinkedIn | 4:5 portrait or 1:1 | 1080×1350 / 1080×1080 | 6–12 | **PDF document upload** |

Use portrait 4:5 — it occupies more screen and lifts dwell time. Keep all slides the same dimensions.

## Slide-by-slide architecture
1. **Slide 1 — the cover/hook (80% of the work).** A bold headline (the hook from `hooks-and-frameworks.md`), large type, high contrast, and a visible swipe cue (arrow / "→" / "swipe"). It must read like a thumbnail and promise a payoff. No body copy here.
2. **Slide 2 — context/promise.** Frame the problem or what they'll learn. Re-hook the people who swiped.
3. **Slides 3 to N-1 — one idea per slide.** A short headline + 1–2 supporting lines or a visual. Number them ("1/5"). Never crowd. Each slide ends with a reason to keep swiping (open loop, "but here's the catch →").
4. **Last slide — recap + single CTA.** Summarize the value, then ONE ask: "Save this", "Follow @handle", "Share with a friend", or "Comment X". Optional: your photo + name for brand recall.

## Design system rules
- **One idea, ~6–12 words of headline per slide.** White space is your friend.
- **Visual hierarchy**: headline (largest) → subtext → accent. The eye should land in <1s.
- **2 fonts max**: one bold display/sans for headlines (e.g., Inter/Poppins/Archivo Bold), one readable for body. Big sizes — headline 60–110px on a 1080px canvas; body ≥32px.
- **Color**: 1 brand color + 1 accent + neutral background. High text-to-background contrast (≥4.5:1). Pick a palette and keep it identical across the set and across all your carousels (brand recognition).
- **Consistent grid & margins**: safe margin ~80–100px; nothing important near edges (platform UI overlaps corners). Keep page numbers, logo, and swipe cue in fixed positions on every slide.
- **Contrast & legibility**: dark text on light, or light text on a solid/overlay-darkened background. Add a scrim behind text over photos.
- **Accent devices**: highlighter blocks, underlines, arrows, simple icons, numbers in circles. Avoid clutter and stock-cheesy imagery.
- **Branding strip**: small handle/logo bottom-corner on every slide so screenshots/saves stay attributed.

## Layout patterns that perform
- **Big-number list** (1 number per slide, huge).
- **Quote/stat slides** with one bold statement.
- **Before vs. after** split layout.
- **Step-by-step** with progress indicator.
- **Mistake → fix** two-column.

## Retention micro-tactics
- End slides on cliffhangers ("the next one changed everything →").
- Front-load the most surprising point on slide 3 to stop early drop-off, save a strong one for the end too.
- Visible, consistent swipe arrow trains the gesture.

## Output spec template (hand to designer / AI image gen / Canva)
```
Format: Instagram carousel, 4:5, 1080×1350, [N] slides
Palette: bg #__, headline #__, accent #__
Fonts: Headline = [font] Bold; Body = [font] Regular
Slide 1 (cover): "<hook headline>"  + swipe arrow, no body
Slide 2: "<promise/context>"
Slide 3–N-1: one point each — give headline + 1 line per slide
Slide N (CTA): recap + "<single CTA>" + handle
Fixed elements: @handle bottom-left all slides; page number bottom-right; swipe arrow slides 1..N-1
Style notes: high contrast, lots of white space, [brand] look
```

## Anti-patterns
- Paragraphs on a slide; tiny text.
- More than 2 fonts or a rainbow palette.
- No swipe cue / no CTA.
- Inconsistent layouts between slides.
- Important text in the corners (cropped by UI).
