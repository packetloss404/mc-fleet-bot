'use client';

import { useMemo, useState } from 'react';

export interface CoordinateRecord {
  id: string;
  externalId: string;
  parentName: string | null;
  name: string;
  projectId: string;
  project: string;
  kind: string;
  status: string;
  categoryId: string;
  category: string;
  reference: {
    x: number;
    y: number | null;
    z: number;
    type: string;
    derived: boolean;
    display: string;
    tp: string;
    note: string;
  };
  geometry: {
    type: string;
    display: string;
  };
}

export interface CoordinateCategory {
  id: string;
  label: string;
  short: string;
  description: string;
  count: number;
}

interface CoordinateDirectoryProps {
  records: CoordinateRecord[];
  categories: CoordinateCategory[];
}

export function CoordinateDirectory({
  records,
  categories,
}: CoordinateDirectoryProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [project, setProject] = useState('');
  const [kind, setKind] = useState('');
  const [copied, setCopied] = useState('');

  const projects = useMemo(() => (
    [...new Set(records.map((record) => record.project))]
      .sort((left, right) => left.localeCompare(right))
  ), [records]);
  const kinds = useMemo(() => (
    [...new Set(records.map((record) => record.kind))]
      .sort((left, right) => left.localeCompare(right))
  ), [records]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => {
      if (category && record.categoryId !== category) return false;
      if (project && record.project !== project) return false;
      if (kind && record.kind !== kind) return false;
      if (!normalized) return true;
      return [
        record.name,
        record.externalId,
        record.parentName,
        record.project,
        record.kind,
        record.category,
        record.reference.display,
        record.reference.tp,
        record.geometry.display,
      ].join(' ').toLowerCase().includes(normalized);
    });
  }, [category, kind, project, query, records]);

  const copy = async (record: CoordinateRecord) => {
    try {
      await navigator.clipboard.writeText(record.reference.tp);
      setCopied(record.id);
      window.setTimeout(() => setCopied(''), 1200);
    } catch {
      setCopied('');
    }
  };

  return (
    <section className="coordinate-directory" id="directory">
      <div className="coordinate-filter-shell">
        <label className="coordinate-search">
          <span>Search all places</span>
          <input
            value={query}
            type="search"
            placeholder="Name, ID, coordinates, project, /tp…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>Project</span>
          <select value={project} onChange={(event) => setProject(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Kind</span>
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="">All kinds</option>
            {kinds.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>
        <div className="coordinate-result-count">
          <strong>{filtered.length.toLocaleString()}</strong>
          <span>of {records.length.toLocaleString()} shown</span>
        </div>
      </div>

      <div className="coordinate-category-tabs" aria-label="Coordinate groups">
        <button
          className={category === '' ? 'active' : ''}
          type="button"
          onClick={() => setCategory('')}
        >
          <strong>{records.length.toLocaleString()}</strong>
          <span>All places</span>
        </button>
        {categories.map((entry) => (
          <button
            className={category === entry.id ? 'active' : ''}
            type="button"
            key={entry.id}
            onClick={() => setCategory(category === entry.id ? '' : entry.id)}
          >
            <strong>{entry.count.toLocaleString()}</strong>
            <span>{entry.short}</span>
          </button>
        ))}
      </div>

      <div className="coordinate-groups">
        {categories.map((entry, categoryIndex) => {
          const group = filtered.filter((record) => record.categoryId === entry.id);
          if (group.length === 0) return null;
          return (
            <section className="coordinate-group" key={entry.id}>
              <div className="coordinate-group-heading">
                <div>
                  <span>{String(categoryIndex + 1).padStart(2, '0')}</span>
                  <h2>{entry.label}</h2>
                </div>
                <p>{entry.description}</p>
              </div>
              <div className="coordinate-rows">
                {group.map((record) => (
                  <article className="coordinate-row" key={record.id}>
                    <div className="coordinate-identity">
                      <span>
                        {record.project} · {record.kind} · {record.status}
                      </span>
                      <h3>{record.name}</h3>
                      <code>{record.externalId}</code>
                      {record.parentName && <small>Inside {record.parentName}</small>}
                    </div>
                    <div className="coordinate-command">
                      <span>{record.reference.type}</span>
                      <strong>{record.reference.display}</strong>
                      <button type="button" onClick={() => void copy(record)}>
                        {copied === record.id ? 'Copied ✓' : record.reference.tp}
                      </button>
                    </div>
                    <div className="coordinate-extent">
                      <span>{record.geometry.type} geometry</span>
                      <code>{record.geometry.display}</code>
                      <small>{record.reference.note}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
