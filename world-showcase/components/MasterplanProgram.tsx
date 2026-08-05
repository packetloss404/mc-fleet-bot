'use client';

import { useMemo, useState } from 'react';

import type { Masterplan, PlanTrack } from '../lib/masterplans';

const TRACKS: Array<{ value: PlanTrack | 'all'; label: string; hint: string }> = [
  { value: 'all', label: 'All plans', hint: 'Every masterplan in the library' },
  { value: 'authority', label: 'Authority chain', hint: '01–05 · controls the Combined Zones program' },
  { value: 'area', label: 'Area library', hint: '06–13 · retroactive, evidence-indexed baselines' },
];

interface MasterplanProgramProps {
  plans: Masterplan[];
}

export function MasterplanProgram({ plans }: MasterplanProgramProps) {
  const [track, setTrack] = useState<PlanTrack | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return plans.filter((plan) => (
      (track === 'all' || plan.track === track)
      && (
        !needle
        || `${plan.number} ${plan.name} ${plan.role} ${plan.status} ${plan.summary}`
          .toLowerCase()
          .includes(needle)
      )
    ));
  }, [plans, query, track]);

  return (
    <section className="plan-library" id="plans">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Thirteen plans · one library</p>
          <h2>The masterplans</h2>
        </div>
        <p className="section-lede">
          The 01–05 chain composes three internal programs into a normalized
          complex and places it in the live world. The 06–13 plans are a parallel
          area library keyed to durable catalog projects; they do not supersede
          that chain.
        </p>
      </div>

      <div className="plan-filters" aria-label="Masterplan filters">
        <div className="track-switch" role="group" aria-label="Plan track">
          {TRACKS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={track === option.value ? 'active' : undefined}
              aria-pressed={track === option.value}
              title={option.hint}
              onClick={() => setTrack(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Plan, district, status…"
          />
        </label>
        <p className="result-count">
          {filtered.length} of {plans.length} plans
        </p>
      </div>

      <div className="plan-grid">
        {filtered.map((plan) => (
          <article className={`plan-card tone-${plan.tone}`} key={plan.id}>
            <div className="plan-cover">
              {/* Native img keeps the large generated map and rendering files
                  outside Next's image pipeline, matching the atlas reports. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={plan.cover} alt={`${plan.name} masterplan view`} loading="lazy" />
              <span className="plan-number">{plan.number}</span>
              <span className="plan-status"><i /> {plan.status}</span>
            </div>
            <div className="plan-body">
              <p className="plan-role">{plan.role}</p>
              <h3>{plan.name}</h3>
              <p className="plan-summary">{plan.summary}</p>
              <dl className="plan-facts">
                {plan.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <code className="plan-id">docs/masterplans/{plan.id}</code>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="plan-empty">No plan matches that filter.</p>
      )}
    </section>
  );
}
