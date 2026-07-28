# Worker Town Steward Mini-Mansions

**Inventory result:** one current steward cottage. `world-map.db` and `town.db` both identify the same object, `RRCH-STEWARD` / `bld_handbuilt_3`, at `x-118..-106, y67..77, z-350..-340`. No second current steward cottage was found.  
**Decision:** expand it west and south into a two-story mid-management mini-mansion while preserving the town's material palette, setbacks and five-column lane to Moot Hall.  
**Release status:** planning only; no live mutation.

## Site judgment

The existing 13-by-11 cottage is too small for a steward who works from home and receives residents. Its living room and office should remain recognizable, but become the public/service east wing of a larger house.

The selected reservation is `x-140..-106, y65..88, z-356..-324`. The new principal hall grows west, where it does not crowd Moot Hall. A covered patio and garden extend south. The survey found one wet surface column at `(-115,-336)`; instead of filling it blindly, the plan makes it the center of a tiny lined rain/water court.

The five clear columns `x-105..-101` remain the pedestrian lane between Steward House and Moot Hall. The north edge retains 13 clear columns to the Architect cottage. The patio may meet but cannot cross the recorded Ravensreach south boundary at `z=-324`.

## Architecture and program

Use the established Ravensreach language: stepped local-stone plinth, dark timber frame, restrained plaster panels, steep deepslate roof, small copper details and warm lanterns. The west hall is two occupied stories with a modest roof/attic silhouette; it should read as a senior cottage, not a palace competing with the Guild Hall or Moot Hall.

Ground floor:

- public steward office and records counter in the retained cottage;
- separate household sitting room;
- entry hall, cloak and main stair;
- great room and hearth;
- formal dining;
- family kitchen, pantry and scullery;
- garden gallery around the water court;
- covered outdoor dining/hearth patio;
- remote west exit and service yard.

Upper floor:

- primary bedroom/dressing/bath;
- two guest/family bedrooms;
- manager library and budget desk;
- laundry/linen;
- separated private red room and privacy vestibule.

An attached automotive garage is not appropriate here. The adjacent route is a pedestrian historic-town lane, not a proven vehicle street. A screened maintenance/wood-storage bay supplies the practical function without sacrificing the lane or period character.

## Private red-room standard

The private adult suite is tasteful, non-graphic and separated from the public office, kitchen and family bedrooms. Its dark-red/oxblood, dark-wood and blackened-metal palette supports privacy without explicit imagery.

Program:

- bed and lounge;
- concealed toy/storage cabinetry;
- decorative swing/hammock frame;
- private wash/cleanup;
- acoustic separation;
- lockable privacy vestibule.

The suspended frame remains visibly decorative/non-load-bearing until independently engineered. The privacy lock must always open from inside without a key, tool or special knowledge, and no required exit route may pass through the suite. OSHA's exit-route rule is a workplace standard rather than a residential design claim, but its core principles are prudent here: two remote routes where required, clear permanent paths, adequate headroom and doors that occupants can open from inside. [OSHA 29 CFR 1910.36](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.36)

The U.S. Access Board's lodging guidance emphasizes accessible routes and clear door openings within guest suites, as well as bathing, storage and communication features. Those ideas inform the Minecraft clearances and equal-quality guest rooms; this plan does not claim ADA compliance. [U.S. Access Board, ADA Standards §224](https://www.access-board.gov/ada/), [Accessible Transient Lodging webinar](https://www.access-board.gov/webinars/2023/07/06/accessible-transient-lodging/)

CDC public cleaning guidance supports appropriate soap/detergent cleaning and attention to high-touch surfaces. The suite therefore uses cleanable finishes, closed storage, a private wash area and a documented housekeeping reset, without pretending the room is a healthcare environment. [CDC, When and How to Clean and Disinfect a Facility](https://www.cdc.gov/hygiene/about/when-and-how-to-clean-and-disinfect-a-facility.html)

## Existing objects and construction controls

Nine block entities occupy the current cottage: two chests, three barrels, two beds, one furnace, one lectern and one chiseled bookshelf. They and their NBT contents remain protected until a per-object move/preserve ledger assigns final rooms.

The terrain reservation has one water column and a raw `y65..83` height range; the high values are primarily the existing roof. New occupied floors target `y67/68`, with stepped stone plinths toward the west. No release may flatten the full reservation.

## Acceptance

The upgrade passes only if:

- both databases still agree on the complete steward-cottage inventory;
- the five-column east lane and 13-column north setback remain clear;
- all nine NBT objects are accounted for;
- office, household and private circulation do not conflict;
- the private suite is non-graphic, acoustically separated, privately washable and never part of egress;
- the patio and water court have safe continuous routes;
- exact-state rollback and matched evidence are complete.
