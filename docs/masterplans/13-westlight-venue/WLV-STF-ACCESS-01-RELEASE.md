# WLV-STF-ACCESS-01 · Westlight backstage-to-service-tower staff connector

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE; **staff-spine
acceptance remains open**

## Purpose and scope

The 26 August current-source survey proved that the lower backstage component
and the existing west service tower were physically disconnected by a five-block
diagonal hard-shell gap. The former catalog assertion that the tower gave a
usable staff return was therefore not sufficient.

This package clears a three-wide, three-high dogleg through only that hard shell:

- source-side staff component: `(-416, 19, -546)`;
- west-service-base component: `(-421, 19, -541)`;
- exact envelope: X `-422..-416`, Y `17..20`, Z `-547..-541`;
- 85 exact target cells cleared to air; all source floor cells at Y 17 retained.

It is a **staff-only access repair**. It does not create public access, alter
the bowl, club, screen, seats, theatre public stairs, Gatehead route, or venue
egress. It does not yet permit the proposed public/backstage separation
partition.

## Guarded-release evidence

| Gate | Result |
| --- | --- |
| Fresh source | `data/worldsnap-westlight-arrival-survey-20260826T031251Z/region`, SHA-256 `c8cd0a688ff17cf21bfa328380f227e14cbfef5668cc5c68c086900ba9135b07` |
| Compiler | `scripts/compile_wlv_staff_access_spine.mjs` |
| Forward/inverse | `data/buildops/wlv-staff-access-spine.forward.txt` / `.rollback.txt` |
| Source preflight | 85/85 pass |
| Strict forward + rollback parsers | pass |
| Block-entity clearance | 0 blockers |
| Live entity clearance | 0 blockers |
| Execution | 85 changed, 0 failed, 0 no-op (`--strict-noop`) |
| Immutable post source | `data/worldsnap-wlv-staff-access-post-20260826T032433Z/region`, SHA-256 `c71c71c5c7c09c65ba1a27a43e17915158bd52ee147fe5e578ec8d3778841e8e` |
| Actual rollback-poststate preflight | 85/85 pass |
| Independent target/halo QA | pass: 85 targets, 405-cell halo, Y17 floor support preserved, no post fluid |

The independent verifier is
`scripts/qa_wlv_staff_access_post_release.mjs`; its report is
`data/world-review/wlv-staff-access-post-state-qa-20260826T032433Z.json`.

## Functional result and remaining hold

The post snapshot’s offline graph now connects backstage to the west-service
base and tower. The no-dig, no-sprint live waypoint walk reaches every segment
in both directions, but it records jumps at the remaining terraced lower-staff
grade transitions. It therefore fails the no-jump acceptance requirement:

- `(-395, 18, -540)` / adjacent lower-west terrace;
- `(-335, 18, -546)` / adjacent lower-east terrace.

The first 3×3 replacement analysis found no three-wide supported single-rise
stair row at either location: the existing floor is diagonally terraced. The
next scope is **WLV-STF-ACCESS-02**, a fresh-source three-wide ramp/landing
redesign that must preserve the public/staff boundary and pass live
bidirectional no-jump QA. Until that acceptance exists, no public/backstage
separation partition may be released.
