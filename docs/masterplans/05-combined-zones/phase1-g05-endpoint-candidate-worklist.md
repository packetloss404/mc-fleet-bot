# Combined Zones Phase 1 G05 endpoint candidate worklist

**Status:** READ_ONLY_CANDIDATE_ENDPOINTS_DERIVED_COUNTERPARTS_REMAIN_UNRESOLVED
**Generated:** 2026-08-06T00:00:00Z
**Report identity:** `fe42a456580b1e0cdbbc5e6f5d764985c607f6b7f83df51eeb0c6f91f529f1e9`

This read-only pass covers all 13 undefined endpoint rows. It derives 7 source-side candidates and leaves every counterpart/receiver/owner assignment null. No row is accepted or executable.

| Endpoint | Source-side candidate | Exact source datum | Required next input |
|---|---|---|---|
| IF-D02-MAINTENANCE-ACCESS | NO_EXACT_SOURCE_SIDE_DATUM | none in reviewed plans | exact source geometry + named counterpart/receiver + states + acceptance |
| IF-D02-PUMP-POWER-CONTROL | NO_EXACT_SOURCE_SIDE_DATUM | none in reviewed plans | exact source geometry + named counterpart/receiver + states + acceptance |
| IF-D02-OVERFLOW-RECEIVER | NO_EXACT_SOURCE_SIDE_DATUM | none in reviewed plans | exact source geometry + named counterpart/receiver + states + acceptance |
| IF-D05-HYDROLOGY-TO-RECEIVER | NO_EXACT_SOURCE_SIDE_DATUM | none in reviewed plans | exact source geometry + named counterpart/receiver + states + acceptance |
| IF-D06-CIRCUIT-NORMAL-TO-POWER-SOURCE | SOURCE_SIDE_CANDIDATE_ONLY_COUNTERPART_UNASSIGNED | RESERVATION_FACE_CANDIDATE; 9 cells; cfc0dbb63e4f… | named counterpart + exact counterpart face + states + acceptance |
| IF-D06-CIRCUIT-EMERGENCY-A-TO-POWER-SOURCE | SOURCE_SIDE_CANDIDATE_ONLY_COUNTERPART_UNASSIGNED | RESERVATION_FACE_CANDIDATE; 9 cells; dd38ac967065… | named counterpart + exact counterpart face + states + acceptance |
| IF-D06-CIRCUIT-EMERGENCY-B-TO-POWER-SOURCE | SOURCE_SIDE_CANDIDATE_ONLY_COUNTERPART_UNASSIGNED | RESERVATION_FACE_CANDIDATE; 9 cells; 2f1f2e0a7845… | named counterpart + exact counterpart face + states + acceptance |
| IF-D06-B07-TO-SURFACE | SOURCE_SIDE_CANDIDATE_ONLY_COUNTERPART_UNASSIGNED | SURFACE_TOP_FACE_CANDIDATE; 49 cells; 322daec135c2… | named counterpart + exact counterpart face + states + acceptance |
| IF-D06-B07-TO-LOWER-LOBBY | NO_EXACT_SOURCE_SIDE_DATUM | none in reviewed plans | exact source geometry + named counterpart/receiver + states + acceptance |
| IF-D06-B07-TO-WATER-RECEIVER | NO_EXACT_SOURCE_SIDE_DATUM | none in reviewed plans | exact source geometry + named counterpart/receiver + states + acceptance |
| IF-P1-B11-DRAINAGE-TO-RECEIVER | SOURCE_SIDE_CANDIDATE_ONLY_COUNTERPART_UNASSIGNED | TERMINUS_CANDIDATE; 4 cells; d957c2ddaff4… | named counterpart + exact counterpart face + states + acceptance |
| IF-P1-B11-DRY-UTILITY-TO-SERVICE | SOURCE_SIDE_CANDIDATE_ONLY_COUNTERPART_UNASSIGNED | TERMINUS_CANDIDATE; 2 cells; ed86568f3886… | named counterpart + exact counterpart face + states + acceptance |
| IF-P1-B11-WET-UTILITY-TO-SERVICE | SOURCE_SIDE_CANDIDATE_ONLY_COUNTERPART_UNASSIGNED | TERMINUS_CANDIDATE; 2 cells; ecc852023b8b… | named counterpart + exact counterpart face + states + acceptance |

## Conclusion

- 0/13 endpoints can be promoted to an exact accepted interface from current evidence.
- The remote read-only probes did not add geometry because the tested chunks were not loaded; no live fact was guessed.
- The canonical registry and world remain unchanged. G05/R00 stay HOLD.
