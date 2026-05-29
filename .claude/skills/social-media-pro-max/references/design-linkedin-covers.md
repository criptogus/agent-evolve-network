# LinkedIn Cover & Banner Design

Covers the three LinkedIn image assets: **profile banner**, **post cover image** (single-image posts), and **article cover/banner**.

## Specs & safe zones
| Asset | Recommended size | Aspect | Notes |
|-------|------------------|--------|-------|
| Profile banner (personal) | 1584×396 | 4:1 | Left + bottom-left covered by avatar & name on desktop; **right 60% is the safe zone**. Mobile crops sides — keep key content centered. |
| Company page banner | 1128×191 | ~6:1 | Wide; center safe. |
| Single-image post | 1200×1200 (1:1) or 1080×1350 (4:5) | 1:1 / 4:5 | 4:5 takes more feed space → more dwell. |
| Article cover/banner | 1200×627 (1.91:1) | 1.91:1 | Shows in feed shares and at top of article; also used as link-preview image. |

## Profile banner (your billboard)
The banner sells *what you do and who for* in one glance.
- **One clear value proposition / tagline** (e.g., "I help B2B founders turn LinkedIn into pipeline").
- Optional: 3 quick proof points / services, a subtle CTA ("DM 'GROWTH'"), and brand colors.
- Keep text in the **right ~60%** (avatar overlaps lower-left). Big enough to read on mobile.
- Clean, on-brand, not cluttered. Headshot or product visual fine if it doesn't fight the text.
- Match your brand palette/fonts for cohesion with your content.

## Post cover image (single-image posts)
Functions like a mini-poster / thumbnail in the feed.
- **One bold headline** (the hook), 4–8 words, huge type, high contrast.
- Strong focal point; minimal supporting text. Think "billboard at scrolling speed."
- 4:5 portrait recommended for reach. Safe margins ~80px; avoid bottom-right (UI/like overlay).
- Brand strip: small handle/logo, consistent placement.

## Article cover / banner
- **Headline-driven**: the article title or a punchier hook, legible at the small feed-preview size.
- 1.91:1 — design for the crop; keep text centered, away from edges.
- High contrast, 1–2 fonts, brand colors. A relevant abstract/graphic visual beats generic stock.
- This image is also the link-preview thumbnail when shared elsewhere — make it stand alone.

## Design system (all LinkedIn covers)
- **Fonts**: max 2. Bold geometric sans for headlines (Inter, Poppins, Archivo, Montserrat). Body ≥ readable size at mobile scale.
- **Color**: brand color + neutral + 1 accent; ≥4.5:1 text contrast. Consider both light and dark feed backgrounds.
- **Hierarchy**: one dominant element; everything else supports it.
- **Consistency**: same palette/type/logo placement across banner, post covers, and articles = instant brand recognition in-feed.
- **Squint test**: legible at thumbnail size on a phone.

## Output spec template
```
Asset: LinkedIn [banner | post cover | article cover]
Size: [from table] | Safe zone: [from table]
Headline: "<hook / value prop>"
Subtext (optional): "<proof / CTA>"
Palette: bg #__, headline #__, accent #__
Fonts: Headline [font] Bold; Body [font]
Logo/handle: [placement]
Style: high-contrast, minimal, on-brand, mobile-legible
```

## Anti-patterns
- Important text under the avatar / in cropped zones.
- Tiny text unreadable on mobile.
- Cluttered banner with 5 messages — pick one.
- Generic stock photo with no headline.
- Inconsistent look vs. the rest of your brand.
