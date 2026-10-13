import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { AccountCard, Card, FloatingActionButton, PrimaryButton, SecuritySummary, TextAction } from '../components/index.ts';
import { ReuseGroup, WhyItMatters } from '../components/ReuseGroup.tsx';
import { LeakDiagram } from '../components/LeakDiagram.tsx';
import { useAppState } from '../state/AppContext.tsx';
import { getRecommendedAccount, getRelatedAccounts } from '../state/security.ts';
import type { Route } from '../routes.ts';

export function Vault({ navigate, focusNewestAccount = false, deferredAccountId }: {
  navigate: (route: Route) => void;
  focusNewestAccount?: boolean;
  deferredAccountId?: string | null;
}) {
  const { state, summary } = useAppState();
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusNewestAccount) return;
    const frame = window.requestAnimationFrame(() => {
      const lastAccount = listRef.current?.lastElementChild as HTMLButtonElement | null;
      lastAccount?.scrollIntoView({ block: 'center', behavior: 'instant' });
      lastAccount?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusNewestAccount]);
  const deferred = state.accounts.find(account => account.id === deferredAccountId && account.status !== 'safe');
  const recommended = deferred || getRecommendedAccount(state.accounts);
  const related = recommended ? getRelatedAccounts(state.accounts, recommended.id) : [];
  return (
    <>
      <header className="account-overview-intro" data-testid="account-overview-intro">
        <h1 className="visually-hidden">Your accounts</h1>
      </header>
      <SecuritySummary summary={summary} />
      {recommended && <Card className="recommendation-card" data-testid="vault-recommendation">
        {recommended.issueType === 'reused' ? <>
          {deferred && <span className="recommendation-eyebrow">Still needs attention</span>}
          <h2 className="visually-hidden">{`Give ${recommended.serviceName} its own password.`}</h2>
          <LeakDiagram leaked={recommended.serviceName} others={related.map(account => account.serviceName)} />
        </> : <>
          <span className="recommendation-eyebrow">{deferred ? 'Still needs attention' : 'Recommended action'}</span>
          <h2 className="recommendation-title">{`${recommended.serviceName} needs a stronger password.`}</h2>
        </>}
        {recommended.issueType === 'reused' && <ReuseGroup accounts={[recommended, ...related]} />}
        <p className="recommendation-description">{recommended.issueType === 'reused'
          ? 'If one password is exposed, someone could try it on the other accounts.'
          : 'A password that is easy to guess makes an account easier to access.'}</p>
        {deferred && <p className="recommendation-reminder">You can fix this whenever you’re ready.</p>}
        <PrimaryButton onClick={() => navigate({ screen: 'safer-password', accountId: recommended.id })}>
          Fix {recommended.serviceName} password <ArrowRight size={17} aria-hidden="true" />
        </PrimaryButton>
        <TextAction onClick={() => navigate({ screen: 'security' })}>Choose another account</TextAction>
        <WhyItMatters><p>{recommended.issueType === 'reused'
          ? 'A unique password keeps an exposed password from being reused on your other accounts. Choose the account that matters most to you.'
          : 'Long, unique passwords are harder to guess and keep one exposed password from working across accounts.'}</p></WhyItMatters>
      </Card>}
      <section className="accounts-section" aria-labelledby="accounts-heading">
        <div className="section-heading accounts-heading"><h2 id="accounts-heading">Your accounts</h2><span className="count-label">{summary.total} accounts</span><FloatingActionButton onClick={() => navigate({ screen: 'add-account' })} /></div>
        <div className="account-list" ref={listRef}>{state.accounts.map(account => (
          <AccountCard key={account.id} account={account} onClick={() => navigate({ screen: 'account', accountId: account.id })} />
        ))}</div>
      </section>
    </>
  );
}
