"""QA verifier (lands in v0.2).

Runs the 10-point acceptance list from the contractor brief against a
built world. Each check reads from the masterplan and the world, then
emits pass/fail with evidence.
"""

from mcwb.verify.qa import CheckResult, VerificationReport, run_verification

__all__ = ["CheckResult", "VerificationReport", "run_verification"]
