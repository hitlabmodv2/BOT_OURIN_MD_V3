---
name: Wikipedia image URL strategy for Ourin AI bot
description: How to get working Wikipedia image URLs for the WhatsApp bot game plugins
---

# Wikipedia Image URL Strategy

## The Rule
Use `originalimage.source` from the Wikipedia REST API — NOT `thumbnail.source`.

API endpoint: `https://en.wikipedia.org/api/rest_v1/page/summary/<PageName>`

- `originalimage.source` → direct file URL (no `/thumb/` segment) → **works in production**
- `thumbnail.source` → may contain `/thumb/` path → gets 429 rate-limited during bulk testing

## Direct URL Patterns That Work
- `https://upload.wikimedia.org/wikipedia/en/[hash1]/[hash2]/filename.ext` — EN Wikipedia files (drama posters, etc.)
- `https://upload.wikimedia.org/wikipedia/commons/[hash1]/[hash2]/filename.ext` — Commons files (food photos)

## 429 Rate Limiting
Wikipedia rate-limits Replit's IP when many HEAD/GET requests fire in quick succession (testing).
In production (one image per user trigger), 429 never occurs — single requests are fine.
Do NOT panic about 429 during batch URL testing; confirm with the API that the file path is correct instead.

**Why:** Learned through extensive testing; batch testing reliably produces 429 even for valid URLs.

**How to apply:** When adding new image-based game data, query the Wikipedia API for each item to get `originalimage.source`, then use that URL directly. For EN Wikipedia poster pages, the path is typically `wikipedia/en/[hash]/filename`.
