import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  current?: string;
}

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <a className={styles.brand} href="/reports/master-plan" aria-label="IANLAN NextGen Master Plan">
        <span>IN</span>
        <b>IANLAN NextGen</b>
      </a>
      <nav className={styles.desktop} aria-label="Master Plan workspace">
        <a aria-current={current === 'master-plan' ? 'page' : undefined} href="/reports/master-plan">
          <span>01</span>Master Plan
        </a>
        <a href="/reports/master-plan#world-atlas"><span>ATLAS</span>Dated world maps</a>
        <a href="/reports/master-plan#evidence-chapters"><span>FILE</span>Evidence</a>
      </nav>
      <details className={styles.mobile}>
        <summary>Master Plan <i /></summary>
        <nav aria-label="Mobile Master Plan workspace">
          <a href="/reports/master-plan" aria-current={current === 'master-plan' ? 'page' : undefined}>
            <span>01</span>Master Plan
          </a>
          <a href="/reports/master-plan#world-atlas"><span>ATLAS</span>Dated world maps</a>
          <a href="/reports/master-plan#evidence-chapters"><span>FILE</span>Evidence chapters</a>
        </nav>
      </details>
    </header>
  );
}
