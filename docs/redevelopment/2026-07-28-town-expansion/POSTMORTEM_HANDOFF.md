# Full fan-out postmortem handoff

Status: **MANDATORY AFTER THE CURRENT RELEASE CLOSEOUT**

When the Town Expansion release reaches a terminal accepted or blocked state,
remind the owner to launch a dedicated multi-team postmortem. Do not let this
request disappear into the build documentation.

The postmortem must independently reconstruct and then debate:

1. Why the program and release took as long as it did.
2. Every rollback, bounded recovery, failed QA invocation, media rerender,
   route rework, database correction, Sites runtime error, and external
   publication delay.
3. Which failures were unavoidable world-state discoveries and which were
   planning, implementation, testing, evidence-retention, or coordination
   failures.
4. Where agents duplicated work, overwrote evidence, used stale inputs, or
   waited on avoidable sequential bottlenecks.
5. Which existing tools need repair and which purpose-built tools should be
   written for atomic release orchestration, snapshot diffs, route proving,
   camera preflight, resumable rendering, KB ingestion, PDF generation, Box
   synchronization, Sites packaging, and terminal acceptance.
6. Concrete code changes, ownership, priorities, effort estimates, acceptance
   tests, and a staged implementation roadmap.
7. A counterfactual release plan showing how the same scope should be executed
   next time, with measured time savings and fewer manual interventions.
8. Why the accessibility repair's offline preflight accepted a semantically
   identical stair source/target whose properties were merely reordered, why
   that defect reached live execution, and how the new canonical-state and
   journal-prefix tooling should become a reusable release primitive.

Specific in-house tooling candidates now supported by direct evidence:

- a canonical block-state parser shared by generators, preflight, rollback,
  and the live runner;
- an atomic single-package wrapper that automatically produces and validates
  a journal-proven successful-prefix recovery instead of attempting an
  unbounded generic rollback;
- a resumable renderer with per-camera immutable failure archives and
  manifest/snapshot invalidation;
- one terminal orchestrator that binds source snapshot, entity gate, exact
  preflight, live execution, post snapshot, rollback readiness, route QA,
  media QA, database import, PDF, Box, and Sites into a single state machine.

Suggested owner prompt:

> Fan out independent PM, release-engineering, world-build, QA, media,
> database/KB, citizen-runtime, Box, and Sites teams. Perform a complete
> evidence-based postmortem of the July 27–28 redevelopment and Town Expansion
> program. Debate root causes, distinguish discovery from preventable rework,
> identify why it took so long, audit our current tooling, and propose the
> purpose-built automation we should write. Deliver one reconciled report with
> chronology, metrics, five-whys, contributing factors, what went well, what
> failed, corrective actions, code-level recommendations, owners, priorities,
> tests, and a faster reference workflow. Cite the incident KB and immutable
> artifacts; do not rely on memory alone.
