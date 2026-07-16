---
name: RPG item-granting plugins must stay in sync with item catalogs
description: The recurring "ghost item" bug class in the WhatsApp bot's RPG plugins — items granted to user.inventory that aren't registered in shop.js/inventory.js/sellall.js, making them invisible in .inv and unsellable.
---

## The pattern
Many `plugins/rpg/*.js` files grant items via `user.inventory[key] = (user.inventory[key] || 0) + qty`. There is no shared item registry — `shop.js` (buy/sell catalog), `inventory.js` (display catalog + category grouping), and `sellall.js` (bulk-sell prices) each hardcode their own `ITEMS`/`SELL_PRICES` maps independently. If a plugin's drop table introduces a new key that isn't added to all three, the item becomes a "ghost": earned but invisible in `.inv` and rejected by `.shop sell` with "barang nggak ada di daftar" (this was the original reported bug, in `berburu.js`/hunting).

**Why:** confirmed multiple times this bug repeats across unrelated plugins (hunting, woodcut, farming, expedition, lottery, boss, treasure, steal, alchemy, blacksmith/craft) because each was written independently without a shared catalog.

**How to apply:** whenever a plugin is added/changed that grants `user.inventory[...]`, grep all three catalog files for that exact key and add it to whichever is missing (also add to `use.js`'s `switch` if it's meant to be consumable, or it'll hit the "tidak bisa digunakan langsung" default case). Also check `plugins/rpg/use.js` when adding consumables — it has its own hardcoded per-key switch statement, separate again from the other three files.

## Alias collision pattern
`src/lib/ourin-plugins.js` registers plugins alphabetically by category then filename; `registerPlugin()` does a plain `Map.set()` for aliases, so when two plugins share an alias string, whichever loads later silently wins — the earlier plugin's alias becomes permanently dead (its primary command name still works). Cross-category collisions (e.g. `game` vs `rpg`) are especially easy to miss since the two files aren't near each other. Worth grepping `alias:` across `plugins/rpg` and `plugins/game` after adding any new plugin/alias.
