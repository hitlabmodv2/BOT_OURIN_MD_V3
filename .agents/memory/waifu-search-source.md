---
name: Character search now scrapes MyAnimeList directly, not Jikan
description: Why ourin-waifu.js stopped using the Jikan API and how the MAL scraper works, for anyone touching character search again.
---

`src/lib/ourin-waifu.js`'s `searchCharacter()` used to call the Jikan v4 API (`api.jikan.moe`), a third-party proxy in front of MyAnimeList. Jikan started returning `504 "Jikan failed to connect to MyAnimeList"` even though MyAnimeList itself was reachable directly — the proxy was the failure point, not MAL.

Switched to scraping `myanimelist.net` directly with `cheerio` (already a project dependency): search via `/character.php?q=`, then fetch full detail from `/character/<id>`. `formatCharacter()`/`renderCharacterCard()` were left untouched — the scraper returns an object shaped like Jikan's old character JSON (`mal_id`, `name`, `name_kanji`, `images.jpg.image_url`, `about`, `favorites`), so downstream code didn't need to change.

**Why:** MAL has no public official API for character data (only anime/manga in API v2), so scraping the HTML is the only direct option once Jikan is unreliable.

**How to apply:** MAL returns HTTP 200 with an "Invalid ID provided." page for a nonexistent character ID — never trust status code alone for "not found"; check for the presence of `h2.normal_header` on the detail page instead. Also always send a realistic `User-Agent` header or MAL may block/degrade the request.
