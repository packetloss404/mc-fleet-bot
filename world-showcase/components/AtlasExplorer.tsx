'use client';

import { useMemo, useState } from 'react';

export interface CatalogItem {
  id: string;
  featureId?: string;
  externalId?: string | null;
  name: string;
  area: string;
  kind: string;
  image: string;
  floorplan?: string | null;
  screenshot?: string | null;
  status: string;
  coordinates: string;
  note: string;
  sourceSnapshot?: string | null;
}

interface AtlasExplorerProps {
  items: CatalogItem[];
}

export function AtlasExplorer({ items }: AtlasExplorerProps) {
  const [area, setArea] = useState('All areas');
  const [query, setQuery] = useState('');
  const areas = useMemo(
    () => ['All areas', ...Array.from(new Set(items.map((item) => item.area))).sort()],
    [items],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => (
      (area === 'All areas' || item.area === area)
      && (!needle || `${item.name} ${item.id} ${item.kind} ${item.note}`.toLowerCase().includes(needle))
    ));
  }, [area, items, query]);

  return (
    <section className="catalog-section" id="catalog">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Database ↔ visual evidence</p>
          <h2>Object catalog</h2>
        </div>
        <p className="section-lede">
          Each card keeps the database identifier, footprint context, and matching
          saved-world view together.
        </p>
      </div>
      <div className="filters" aria-label="Catalog filters">
        <label>
          <span>Area</span>
          <select value={area} onChange={(event) => setArea(event.target.value)}>
            {areas.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="search-field">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Building, room, route…"
          />
        </label>
        <p className="result-count">{filtered.length} matched objects</p>
      </div>
      <div className="catalog-grid">
        {filtered.map((item) => (
          <article className="catalog-card" key={item.id}>
            <div className="card-image-wrap">
              {/* Native img keeps large generated evidence files outside Next's image pipeline. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={`Saved-world view of ${item.name}`} loading="lazy" />
              <span className="status-chip">{item.status}</span>
            </div>
            <div className="card-body">
              <div className="card-kicker">
                <span>{item.area}</span>
                <span>{item.kind}</span>
              </div>
              <h3>{item.name}</h3>
              <code>{item.id}</code>
              <p>{item.note}</p>
              <p className="coordinates">{item.coordinates}</p>
              <div className="evidence-links">
                {item.floorplan && <a href={item.floorplan}>Floor plan ↗</a>}
                {item.screenshot && <a href={item.screenshot}>Perspective ↗</a>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
