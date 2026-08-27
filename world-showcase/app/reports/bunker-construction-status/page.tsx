import type { Metadata } from 'next';
import { SiteHeader } from '../../../components/SiteHeader';
import report from '../../../public/bunker-construction-status/bunker-construction-status.json';
import styles from './report.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Bunker Construction Status',
  description: 'Current physical evidence for Cheyenne, Raven Rock, and C01, separated from design and historical claims.',
};

const shortHash = (value: string) => `${value.slice(0, 16)}…`;
const pct = (part: number, whole: number) => `${((part / whole) * 100).toFixed(3)}%`;

export default async function BunkerConstructionStatusReport() {
  const { cheyenne, ravenRock, legacyC01, eastC01 } = report.systems;
  const c01Routes = eastC01.currentOfflineRouteSummary;
  return (
    <main className={styles.report}>
      <SiteHeader current="bunker-construction-status" />
      <header className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>Report 06 · Terminal evidence review</p>
            <h1>What is actually<br /><em>inside the mountain.</em></h1>
            <p className={styles.lede}>
              A current-block audit of Cheyenne, Raven Rock, and both C01
              programs. Construction evidence is shown plainly; design intent
              and historical releases stay in their own lane.
            </p>
            <div className={styles.actions}>
              <a href="#findings">Read the findings</a>
              <a href="/bunker-construction-status/bunker-construction-status-report.pdf">Download PDF</a>
            </div>
          </div>
          <figure className={styles.heroFigure}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bunker-construction-status/maps/01-bunker-evidence-overview.png" alt="Evidence overview comparing current construction status for Cheyenne, C01, and Raven Rock" />
          </figure>
        </div>
        <div className={styles.metrics}>
          <div><strong>{cheyenne.currentExactTargets.toLocaleString()}</strong><span>Cheyenne exact targets</span></div>
          <div><strong>{eastC01.currentExactModelTargets.toLocaleString()}</strong><span>east C01 model cells exact</span></div>
          <div><strong>{ravenRock.currentAcceptedComplexReleases}</strong><span>current Raven Rock complex releases</span></div>
        </div>
      </header>

      <section className={styles.truth}>
        <p className={styles.eyebrow}>The rule</p>
        <h2>A design is not a bunker.<br />A catalog flag is not a wall.</h2>
        <p>
          This report starts with exact block states in the immutable R08AM
          terminal post, then asks whether accepted execution and QA evidence
          explain them. Rolled-back or superseded work is history—not current
          construction proof.
        </p>
      </section>

      <section className={styles.findings} id="findings">
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>Current finding</p>
          <h2>Four systems.<br />Four honest classifications.</h2>
        </div>
        <div className={styles.cards}>
          <article className={styles.passCard}>
            <span>Cheyenne · B03</span>
            <strong>{cheyenne.currentExactTargets.toLocaleString()} / {cheyenne.currentTargets.toLocaleString()}</strong>
            <h3>Bounded build proven</h3>
            <p>
              The R10A/G/H targets are exact now. R12O proves a 613-station
              passive internal route from index 188 through the closed index-800
              chamber cap.
            </p>
          </article>
          <article className={styles.partialCard}>
            <span>Relocated east C01</span>
            <strong>{pct(eastC01.currentExactModelTargets, eastC01.modelTargetCells)}</strong>
            <h3>Fabric proven; commissioning incomplete</h3>
            <p>
              All 127 differences are deliberate route preservation. {c01Routes.passed} of
              {' '}{c01Routes.total} C01 route families pass current offline geometry;
              {' '}{c01Routes.failedRouteIds.join(', ')} is not an available connection.
            </p>
          </article>
          <article className={styles.historyCard}>
            <span>Raven Rock</span>
            <strong>0 current</strong>
            <h3>No accepted complex survives</h3>
            <p>
              S1 was rolled back. The accepted 151-cell T2B pilot has one
              historical target left; 150 cells were superseded by later fabric.
            </p>
          </article>
          <article className={styles.legacyCard}>
            <span>Legacy MainStreet C01</span>
            <strong>{legacyC01.currentExactHistoricalTargets.toLocaleString()} / {legacyC01.historicalTargets.toLocaleString()}</strong>
            <h3>Substantial physical legacy</h3>
            <p>
              Most historical targets still match. Later construction means
              those old packages no longer seal the whole current as-built state.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.feature}>
        <div>
          <p className={styles.eyebrow}>Cheyenne / B03</p>
          <h2>A long route.<br />A closed end.</h2>
          <p>
            The accepted route contains {cheyenne.commissionedScope.routeAirCells.toLocaleString()} route-air
            cells, {cheyenne.commissionedScope.centralClearanceCells.toLocaleString()} central-clearance cells,
            and {cheyenne.commissionedScope.fixtures} fixtures. It supports passive
            internal inspection and circulation only.
          </p>
          <ul>{cheyenne.nonclaims.map((claim) => <li key={claim}>Not claimed: {claim}</li>)}</ul>
        </div>
        <div className={styles.imagePair}>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bunker-construction-status/screenshots/01-cheyenne-institutional-route.png" alt="Current Cheyenne institutional route" />
            <figcaption>Exact current illuminated route fabric.</figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bunker-construction-status/screenshots/02-cheyenne-closed-gallery-hold.png" alt="Closed Cheyenne gallery terminus" />
            <figcaption>The retained closed gallery/chamber hold.</figcaption>
          </figure>
        </div>
      </section>

      <section className={`${styles.feature} ${styles.reverse}`}>
        <div>
          <p className={styles.eyebrow}>East C01</p>
          <h2>Physically vast.<br />Operationally bounded.</h2>
          <p>
            {eastC01.currentExactModelTargets.toLocaleString()} of {eastC01.modelTargetCells.toLocaleString()} model
            cells match. The remaining {eastC01.deliberateRoutePreservationCells} are entirely explained by
            {` ${eastC01.acceptedStairCoreCells}`} accepted stair-core states and {eastC01.heldRouteAirCells} held route-air cells.
            {' '}The current R08AM route review passes {c01Routes.passed} of {c01Routes.total} C01
            route families; {c01Routes.failedRouteIds.join(', ')} fails both directions.
          </p>
          <ul>{eastC01.nonclaims.map((claim) => <li key={claim}>Not claimed: {claim}</li>)}</ul>
        </div>
        <div className={styles.imagePair}>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bunker-construction-status/maps/02-c01-evidence-stack.png" alt="C01 physical fabric and commissioning gate diagram" />
            <figcaption>Seven levels, one bounded evidence boundary.</figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bunker-construction-status/screenshots/03-east-c01-l1-route.png" alt="Current east C01 L1 route fabric" />
            <figcaption>Physical route fabric; offline geometry acceptance only.</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.raven}>
        <div>
          <p className={styles.eyebrow}>Raven Rock</p>
          <h2>The evidence says no.</h2>
          <p>
            The current volume below is real block fabric, but it does not prove
            the planned Raven Rock complex. Its accepted T2B predecessor was
            superseded and its provenance is unattributed. Full caverns, command
            center, portals, shaft, buildings, and reservoir remain design scope.
          </p>
        </div>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bunker-construction-status/screenshots/04-raven-rock-former-t2b-volume.png" alt="Current observed blocks in the former Raven Rock T2B volume" />
          <figcaption>Observed former T2B volume · physical blocks present · not an accepted Raven Rock complex.</figcaption>
        </figure>
      </section>

      <section className={styles.evidence} id="evidence">
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>Immutable evidence</p>
          <h2>Bound to one terminal post.</h2>
          <p>
            Complete save <code>{shortHash(report.terminalSnapshot.completeSaveSha256)}</code><br />
            Region <code>{shortHash(report.terminalSnapshot.regionSha256)}</code>
          </p>
        </div>
        <div className={styles.downloads}>
          <a href="/bunker-construction-status/bunker-construction-status.json">Machine report JSON</a>
          <a href="/bunker-construction-status/report-qa.json">15-check QA</a>
          <a href="/bunker-construction-status/artifact-manifest.json">Artifact manifest</a>
          <a href="/bunker-construction-status/bunker-basement-repair-program.md">Bunker repair program</a>
          <a href="/bunker-construction-status/bunker-construction-status-report.pdf">PDF report</a>
        </div>
      </section>
    </main>
  );
}
