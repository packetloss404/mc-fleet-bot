import type { Metadata } from 'next';
import { SiteHeader } from '../../../components/SiteHeader';
import publication from '../../../public/empty-eight/catalog.json';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'The Empty Eight · South Galleria',
  description: 'Accepted public south-galleria route and vacant-shell catalog for the Empty Eight.',
};

const shortHash = (value: string) => `${value.slice(0, 16)}…`;
const boundsLabel = (bounds: {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}) => `x ${bounds.minX}…${bounds.maxX} · y ${bounds.minY}…${bounds.maxY} · z ${bounds.minZ}…${bounds.maxZ}`;

export default async function EmptyEightReport() {
  return (
    <main className="ee-report">
      <SiteHeader current="empty-eight" />
      <header className="ee-hero">
        <div className="ee-hero-grid">
          <div className="ee-hero-copy">
            <p className="eyebrow">Report 05 · accepted 22 August 2026</p>
            <h1>The Empty Eight.<br /><em>Open, honestly.</em></h1>
            <p>
              Eleven illuminated south-galleria shells are now publicly viewable
              from two contained PF08 stairs. They remain vacant: no tenant,
              occupancy, or operating-retail claim is being made.
            </p>
            <div className="ee-actions">
              <a className="button primary" href="#route">Explore the route</a>
              <a className="button ghost" href="/empty-eight/publication-manifest.json">Inspect manifest</a>
            </div>
          </div>
          <a className="ee-hero-map" href={publication.map.href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publication.map.href} alt="Sectional map of the accepted Empty Eight south public galleria and restricted back-of-house boundary" />
            <span><b>Public south galleria</b> Sectional plan · north ↑</span>
          </a>
        </div>

        <div className="ee-metrics">
          <div><strong>{publication.publicProgram.bayCount}</strong><span>public vacant bays</span></div>
          <div><strong>{publication.publicProgram.stairCount}</strong><span>contained PF08 stairs</span></div>
          <div><strong>{publication.publicProgram.publicLights}</strong><span>public lights</span></div>
          <div><strong>0</strong><span>tenants claimed</span></div>
        </div>
      </header>

      <section className="ee-route" id="route">
        <div className="ee-section-heading">
          <div>
            <p className="eyebrow">Bounded public circulation</p>
            <h2>Two ways up.<br />One honest limit.</h2>
          </div>
          <p>
            Both stairs rise eight blocks from the accepted PF08 interior to the
            south gallery. The gallery is public; every staff door, backroom,
            deeper annex, and external system remains outside this claim.
          </p>
        </div>
        <div className="ee-route-grid">
          {publication.publicProgram.stairs.map((stair) => (
            <article key={stair.id}>
              <span>{stair.id}</span>
              <h3>PF08 {stair.id} stair</h3>
              <p>x {stair.stairX} · z {stair.firstZ}…{stair.lastZ}</p>
              <b>{stair.rise}-block rise</b>
            </article>
          ))}
          <article className="ee-route-limit">
            <span>retained</span>
            <h3>EE-R-S06</h3>
            <p>The suspended-gravity exception stays behind its exact cap.</p>
            <b>Not public</b>
          </article>
        </div>
      </section>

      <section className="ee-bays" id="bays">
        <div className="ee-section-heading dark">
          <div>
            <p className="eyebrow">Public shell directory</p>
            <h2>Eleven spaces.<br />No invented tenants.</h2>
          </div>
          <p>
            Each card is an exact R08AL public record preserved by the final
            R08AM terminal snapshot. “Vacant shell” means exactly that.
          </p>
        </div>
        <div className="ee-bay-grid">
          {publication.publicProgram.bays.map((bay) => (
            <article key={bay.id}>
              <div><span>{bay.id}</span><i>Publicly viewable</i></div>
              <h3>Vacant retail shell</h3>
              <p>{boundsLabel(bay.bounds)}</p>
              <footer>
                <b>Unoccupied</b>
                <span>No tenant fit-out</span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="ee-boundaries">
        <div className="ee-section-heading">
          <div>
            <p className="eyebrow">Fail-closed publication boundary</p>
            <h2>What remains closed.</h2>
          </div>
        </div>
        <div className="ee-boundary-list">
          {publication.closedBoundaries.map((boundary, index) => (
            <article key={boundary}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ee-evidence" id="evidence">
        <div className="ee-section-heading dark">
          <div>
            <p className="eyebrow">Immutable acceptance layer</p>
            <h2>Bound to the final post.</h2>
          </div>
          <p>
            The website package binds the accepted R08AM world snapshot, both
            release ledgers, both independent post-QA reports, and a fresh
            read-only catalog generated from that same region.
          </p>
        </div>
        <div className="ee-evidence-grid">
          <article>
            <span>Terminal complete save</span>
            <code>{shortHash(publication.terminalSnapshot.completeSaveSha256)}</code>
          </article>
          <article>
            <span>Terminal region</span>
            <code>{shortHash(publication.terminalSnapshot.regionSha256)}</code>
          </article>
          <article>
            <span>Catalog feature rows</span>
            <strong>{publication.catalog.worldFeatureCount.toLocaleString()}</strong>
          </article>
          <article>
            <span>Publication status</span>
            <strong>Accepted</strong>
          </article>
        </div>
        <div className="ee-evidence-actions">
          <a className="button primary" href="/empty-eight/catalog.json">Open public catalog JSON</a>
          <a className="button ghost" href="/empty-eight/publication-manifest.json">Open asset manifest</a>
          <a className="button ghost" href={publication.map.href}>Open sectional map</a>
        </div>
      </section>

      <footer className="ee-footer">
        <a className="brand" href="/">
          <span className="brand-mark">IN</span>
          <span>IANLAN NextGen</span>
        </a>
        <p>
          Public scope: the R08AL south gallery and eleven vacant shells only.
          Restricted areas are evidenced, not published as public circulation.
        </p>
      </footer>
    </main>
  );
}
