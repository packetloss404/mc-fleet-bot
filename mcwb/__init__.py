"""mcwb — Minecraft world builder from versioned masterplans.

mcwb consumes a masterplan directory (typically produced by an upstream
planner like ``mc-fleet-bot``) and applies it to a live Minecraft world.
Masterplans are versioned and diff-friendly: re-running mcwb on the same
masterplan is a no-op; running it on a newer masterplan applies only the
phases that changed.

See ``docs/spec.md`` for the spec format and ``README.md`` for usage.
"""

__version__ = "0.0.1"
__spec_version__ = "0.1"
