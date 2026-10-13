import { ArrowRight } from 'lucide-react';
import { Card, PageHeader, PrimaryButton, SecondaryButton, SuccessCard } from '../components/index.ts';
import { ReuseGroup, WhyItMatters } from '../components/ReuseGroup.tsx';
import { useAppState } from '../state/AppContext.tsx';
import type { Account } from '../types/index.ts';
import type { Route } from '../routes.ts';

export function Security({ navigate }: { navigate: (route: Route) => void }) {
  const { state, summary } = useAppState();
  const groups = new Map<string, Account[]>();
  for (const account of state.accounts) {
    if (account.status !== 'reused' || !account.reusedGroupId) continue;
    const members = groups.get(account.reusedGroupId) ?? [];
    members.push(account);
    groups.set(account.reusedGroupId, members);
  }
  const reusedGroups = [...groups.entries()].filter(([, accounts]) => accounts.length > 1);
  const weakAccounts = state.accounts.filter(account => account.status === 'weak');
  return (
    <>
      <PageHeader title="Security" subtitle="Choose the account that matters to you." />
      <div className="security-intro">
        <span className="section-eyebrow">YOUR VAULT AT A GLANCE</span>
        <h2>{summary.needsAttention ? 'One account at a time.' : 'Your accounts look good.'}</h2>
        <p>{summary.safe} {summary.safe === 1 ? 'account uses' : 'accounts use'} strong, unique passwords.
          {summary.needsAttention > 0 && ` ${summary.needsAttention} ${summary.needsAttention === 1 ? 'needs' : 'need'} attention.`}</p>
      </div>
      <div className="screen-stack" data-testid="security-issues-summary">
        {reusedGroups.length > 0 && <section aria-labelledby="reused-heading" className="security-groups-section">
          <div className="section-heading"><h2 id="reused-heading">Shared passwords</h2><span className="count-label">{reusedGroups.length} {reusedGroups.length === 1 ? 'group' : 'groups'}</span></div>
          <div className="screen-stack">
            {reusedGroups.map(([groupId, accounts]) => <Card key={groupId} className="reuse-issue-card">
              <ReuseGroup accounts={accounts} />
              <p className="recommendation-description">If one password is exposed, someone could try it on the other accounts.</p>
              <div className="reuse-fix-actions" aria-label="Choose an account to fix">
                {accounts.map(account => <SecondaryButton key={account.id} className="reuse-account-action"
                  onClick={() => navigate({ screen: 'safer-password', accountId: account.id })}>
                  Fix {account.serviceName} password <ArrowRight size={16} aria-hidden="true" />
                </SecondaryButton>)}
              </div>
              <WhyItMatters><p>A unique password means a password exposed on one service does not work on the other accounts. Start with the account you value most.</p></WhyItMatters>
            </Card>)}
          </div>
        </section>}
        {weakAccounts.length > 0 && <section aria-labelledby="weak-heading">
          <div className="section-heading"><h2 id="weak-heading">Weak passwords</h2><span className="count-label">{weakAccounts.length} accounts</span></div>
          <div className="screen-stack">
            {weakAccounts.map(account => <Card key={account.id} className="weak-issue-card">
              <h3>{account.serviceName}</h3>
              <p className="recommendation-description">This password is easy to guess.</p>
              <PrimaryButton onClick={() => navigate({ screen: 'safer-password', accountId: account.id })}>
                Fix {account.serviceName} password <ArrowRight size={16} aria-hidden="true" />
              </PrimaryButton>
              <WhyItMatters><p>A long, unique password is harder to guess and avoids sharing a password with another account.</p></WhyItMatters>
            </Card>)}
          </div>
        </section>}
        {summary.needsAttention === 0 && <SuccessCard title="All passwords look good"><p>Every account has a strong, unique password.</p></SuccessCard>}
      </div>
    </>
  );
}
