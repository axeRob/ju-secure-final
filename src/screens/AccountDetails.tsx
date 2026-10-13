import { ArrowRight } from 'lucide-react';
import { Card, InfoCard, PageHeader, PasswordDisplay, PrimaryButton, StatusPill } from '../components/index.ts';
import { ReuseGroup, WhyItMatters } from '../components/ReuseGroup.tsx';
import { useAppState } from '../state/AppContext.tsx';
import { getRelatedAccounts } from '../state/security.ts';
import type { Route } from '../routes.ts';

export function AccountNotFound({ navigate }: { navigate: (route: Route) => void }) {
  return <><PageHeader title="Account not found" onBack={() => navigate({ screen: 'vault' })} /><div className="screen-stack"><InfoCard><p>This account isn’t in the vault.</p></InfoCard><PrimaryButton onClick={() => navigate({ screen: 'vault' })}>Back to vault</PrimaryButton></div></>;
}

export function AccountDetails({ accountId, navigate }: { accountId: string; navigate: (route: Route) => void }) {
  const { state } = useAppState();
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return <AccountNotFound navigate={navigate} />;
  const related = getRelatedAccounts(state.accounts, account.id);
  return (
    <>
      <PageHeader title="Account details" subtitle="The essentials, all in one place." onBack={() => navigate({ screen: 'vault' })} />
      <Card className="account-details">
        <span className={`service-mark detail-mark service-${account.serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} aria-hidden="true">{account.initial}</span>
        <h2>{account.serviceName}</h2><p>{account.username}</p><StatusPill status={account.status} />
        <PasswordDisplay value={account.demoPassword} />
      </Card>
      {account.status === 'safe' && <InfoCard title="This account looks good"><p>It has its own strong password.</p></InfoCard>}
      {account.status !== 'safe' && <Card className="recommendation-card account-recommendation">
        <span className="recommendation-eyebrow">Recommended action</span>
        <h2 className="recommendation-title">Give {account.serviceName} {account.issueType === 'reused' ? 'its own' : 'a stronger'} password.</h2>
        {account.issueType === 'reused' && <ReuseGroup accounts={[account, ...related]} />}
        <p className="recommendation-description">{account.issueType === 'reused'
          ? 'If one password is exposed, someone could try it on the other accounts.'
          : 'This password is easy to guess.'}</p>
        <PrimaryButton className="account-security-action" onClick={() => navigate({ screen: 'safer-password', accountId: account.id })}>Fix {account.serviceName} password <ArrowRight size={17} aria-hidden="true" /></PrimaryButton>
        <WhyItMatters><p>{account.issueType === 'reused'
          ? 'A unique password means a password exposed on one service does not work on the other accounts.'
          : 'A long, unique password is harder to guess and avoids sharing a password with another account.'}</p></WhyItMatters>
      </Card>}
    </>
  );
}
