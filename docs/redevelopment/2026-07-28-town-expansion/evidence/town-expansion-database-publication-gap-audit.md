# Town-expansion database and publication gap audit

**Decision:** `BASELINE_DATABASE_PRESENT_TOWN_EXPANSION_NOT_IMPORTED`  
**Machine census:** [`town-expansion-database-publication-gap-audit.json`](town-expansion-database-publication-gap-audit.json)

There are two different SQLite databases:

- `data/world-map.db` is the world-feature source used by maps, catalogs,
  observations, geometry, and media/evidence linkage. It currently contains
  875 features, 1,881 observations, and 23 scans.
- `data/town.db` is operational Town Builder state. It contains one town, one
  district, 12 Town Builder buildings, five residents, 6,288 events, and 190
  chronicle entries. It is not the full world-object catalog.

The world database correctly reflects accepted prior work, including the R1
and Wave 2 imports. It has **zero** `TE-*` or town-expansion-project features.
That is the honest current state: the new expansion compiler is still blocked,
there is no accepted post-release snapshot, and no matched after-media exists.
Importing its planned objects as `complete` now would turn design intent into a
false as-built claim.

The current compiler's global publication registry contains only 13 Gilded
Raven records with 26 first/second-pass camera candidates. It does not register
the other release scopes, the twenty new Iowa campus halls, the shared
commons, or the Concord Broadcast Exchange. There is also no dedicated
town-expansion database importer.

The database should be updated after each accepted physical release, not after
each design edit. The required closeout is: complete object registry, guarded
transaction, immutable post snapshot, route/interior QA, matched first and
second camera passes, guarded database import, then catalog/maps/dossier/Sites
regeneration.

