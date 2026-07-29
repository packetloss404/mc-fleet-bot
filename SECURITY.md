# Security

MC Fleet Devtools v0.1 is a local, read-only operator tool.

- The API binds to `127.0.0.1` by default and has no native authentication.
- Do not expose it directly to a public or untrusted network.
- Registry connector roots are trusted operator configuration.
- Resource paths cannot lexically escape their configured server root.
- SQLite inputs are opened read-only and set to query-only.
- Report recipes are allow-listed operations, never shell commands.
- Artifact output is fresh, job-scoped, and constrained to the artifact root.
- Secrets belong in environment variables or a future secret provider, never in
  recipes or committed registries.

Please treat any future RCON, WorldEdit, SSH upload, or server-control connector
as a separate privileged subsystem requiring threat modeling and explicit
approval controls.
