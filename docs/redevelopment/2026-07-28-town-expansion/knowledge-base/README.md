# Redevelopment release knowledge base

This knowledge base records release failures, rollback incidents, compensating
executions, root causes, fixes, prevention rules, and byte-level evidence links.
It deliberately separates an atomic incident from each rollback command
execution so counts cannot be inflated or hidden.

The canonical source is
`data/knowledge-base/redevelopment-release-incidents.json`. The searchable
SQLite database is `data/knowledge-base/redevelopment-kb.sqlite`; its integrity,
row counts, source hash, database hash, and missing-artifact audit are recorded
in `data/knowledge-base/redevelopment-kb.report.json`.

Rebuild and validate it with:

```bash
node scripts/build_redevelopment_kb.mjs
```

Useful read-only queries:

```sql
SELECT id, scope, status, root_cause FROM incidents ORDER BY started_at_utc;

SELECT incident_id, id, kind, status, successful_groups, failed_groups
FROM recovery_executions
ORDER BY incident_id, id;

SELECT stable_id, knowledge_entries.title,
       snippet(knowledge_search, 1, '[', ']', ' … ', 20)
FROM knowledge_search
JOIN knowledge_entries ON knowledge_entries.id = knowledge_search.rowid
WHERE knowledge_search MATCH 'neighbor update OR reactive';
```

The current ledger contains five rollback incidents and ten rollback/recovery
executions: seven complete, three failed, and none in progress. It also tracks
six post-QA defects independently, including both resolved tooling defects and
open release gates. The later successful Town Expansion commit is a separate
commission event; it does not erase or renumber this failure history.
