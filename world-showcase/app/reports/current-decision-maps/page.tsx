import type { Metadata } from 'next';
import { SiteHeader } from '../../../components/SiteHeader';
import volume from '../../../public/current-26-aug-decision-maps/publication-manifest.json';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Current 26 August decision maps · Held interfaces',
  description: 'Current-source evidence maps for MP01, MP02–MP05, MP08, MP13, and SYS03, explicitly separated from construction completion claims.',
};

export default async function CurrentDecisionMapsPage() {
  return (
    <main className={styles.report}>
      <SiteHeader current="master-plan" />
      <header className={styles.hero} id="top">
        <p className={styles.eyebrow}>Current-source volume · 26 August 2026</p>
        <h1>Decision maps,<br /><em>not completion maps.</em></h1>
        <p>
          This is an additive, read-only map volume for the interfaces currently
          holding work. It records what a map actually supports today: observed
          conditions, held ownership and safety gates, plus one narrowly bounded
          civil-only SYS03 reference. It does not certify a district, route,
          venue, bunker, or railway as complete.
        </p>
        <div className={styles.stats}>
          <div><b>{volume.publication.mapCount}</b><span>exact evidence maps</span></div>
          <div><b>10</b><span>held-interface maps</span></div>
          <div><b>2</b><span>civil-only SYS03 references</span></div>
          <div><b>0</b><span>new construction claims</span></div>
        </div>
      </header>

      <section className={styles.boundary}>
        <div>
          <p className={styles.eyebrow}>Reading rule</p>
          <h2>A condition map is not an authorization.</h2>
        </div>
        <p>
          Map colors, reservation outlines, route traces, and local geometry are
          evidence for a next decision. They do not confer ownership, resolve
          fluids or gravity, open a doorway, create public egress, or approve a
          physical release. The original historical atlases remain available
          separately and have not been overwritten.
        </p>
      </section>

      <section className={styles.maps} aria-label="Current 26 August decision maps">
        {volume.maps.map((map) => (
          <article className={styles.mapCard} key={map.id}>
            <header>
              <span>{map.plan}</span>
              <b>{map.state}</b>
            </header>
            <a href={map.href} target="_blank" rel="noreferrer">
              {/* Evidence SVGs are copied verbatim and intentionally bypass image optimisation. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={map.href} alt={map.title} loading="lazy" />
            </a>
            <div>
              <h2>{map.title}</h2>
              <p>{map.caption}</p>
              <footer>
                <code>{map.sha256.slice(0, 16)}…</code>
                <a href={map.href} target="_blank" rel="noreferrer">Open full map ↗</a>
              </footer>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.provenance}>
        <div>
          <p className={styles.eyebrow}>Source and scope</p>
          <h2>Exact copies, explicit limits.</h2>
        </div>
        <div>
          <p>
            The held-interface maps bind to the current SYS03 post-state evidence
            where applicable: region SHA-256 <code>{volume.publication.sourceSnapshot.regionSha256}</code>.
            The two SYS03 maps are published from its sealed civil-release record
            and remain non-transport references.
          </p>
          <p>
            See the machine-readable <a href="/current-26-aug-decision-maps/publication-manifest.json">publication manifest</a> for exact
            source paths, per-map hashes, and the immutable history policy.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <a href="/reports/master-plan">← Master Plan</a>
        <a href="/reports/build-contract-maps">Build-contract maps →</a>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
