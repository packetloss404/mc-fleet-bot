import type { Metadata } from 'next';
import { SiteHeader } from '../../../components/SiteHeader';
import volume from '../../../public/current-26-aug-build-contract-maps/publication-manifest.json';
import styles from '../current-decision-maps/page.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Build-contract maps · Current source evidence',
  description: 'Current source-bound acceptance maps for remaining Master Plan interfaces; they are not construction completion claims.',
};

export default async function BuildContractMapsPage() {
  return (
    <main className={styles.report}>
      <SiteHeader current="master-plan" />
      <header className={styles.hero} id="top">
        <p className={styles.eyebrow}>Current-source volume · 26 August 2026</p>
        <h1>Build-contract maps,<br /><em>not imaginary builds.</em></h1>
        <p>
          These exact maps show the next acceptance boundaries for the Master Plan:
          containment, protected interfaces, route-use thresholds, ownership, and egress.
          They are additive evidence maps and do not claim a physical release.
        </p>
        <div className={styles.stats}>
          <div><b>{volume.publication.mapCount}</b><span>new exact maps</span></div>
          <div><b>0</b><span>operation files</span></div>
          <div><b>0</b><span>world edits</span></div>
          <div><b>6</b><span>held build gates</span></div>
        </div>
      </header>
      <section className={styles.boundary}>
        <div><p className={styles.eyebrow}>Reading rule</p><h2>A map identifies work; it does not make that work built.</h2></div>
        <p>Every map remains source-bound and default-deny until the required owners, receivers, reversibility, and scoped release checks have been accepted.</p>
      </section>
      <section className={styles.maps} aria-label="Current build-contract maps">
        {volume.maps.map((map) => (
          <article className={styles.mapCard} key={map.id}>
            <header><span>{map.plan}</span><b>{map.state}</b></header>
            <a href={map.href} target="_blank" rel="noreferrer"><img src={map.href} alt={map.title} loading="lazy" /></a>
            <div><h2>{map.title}</h2><p>{map.caption}</p><footer><code>{map.sha256.slice(0, 16)}…</code><a href={map.href} target="_blank" rel="noreferrer">Open full map ↗</a></footer></div>
          </article>
        ))}
      </section>
      <section className={styles.provenance}><div><p className={styles.eyebrow}>Provenance</p><h2>Exact copies with recorded hashes.</h2></div><div><p>See the <a href="/current-26-aug-build-contract-maps/publication-manifest.json">machine-readable manifest</a> for original paths and SHA-256 values.</p></div></section>
      <footer className={styles.footer}><a href="/reports/current-decision-maps">← Decision maps</a><span>Build-contract evidence · not completion</span><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
