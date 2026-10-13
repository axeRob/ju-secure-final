import { useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, InfoCard, PageHeader, PasswordDisplay, PrimaryButton, SecondaryButton, SuccessCard, TextAction } from '../components/index.ts';
import { ReuseGroup, WhyItMatters } from '../components/ReuseGroup.tsx';
import { generateDemoPassword } from '../data/passwords.ts';
import { useAppState } from '../state/AppContext.tsx';
import { getRecommendedAccount, getRelatedAccounts } from '../state/security.ts';
import { AccountNotFound } from './AccountDetails.tsx';
import type { Route } from '../routes.ts';
import type { ResolutionSummary } from '../types/index.ts';

type NavigationProps = { accountId: string; navigate: (route: Route) => void; onCancel: () => void; onBack?: () => void };
const listNames = (names: string[]) => new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(names);

export function SecurityProblem({ accountId, navigate, onCancel, onBack = onCancel }: NavigationProps) {
  const { state } = useAppState();
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return <AccountNotFound navigate={navigate} />;
  const reused = account.issueType === 'reused';
  const related = getRelatedAccounts(state.accounts, account.id);
  return (
    <>
      <PageHeader title={account.status === 'safe' ? 'Account security' : reused ? 'Shared password' : 'Weak password'} subtitle={account.status === 'safe' ? undefined : reused ? 'A small change can protect more than one account.' : 'Easy for you. Harder to guess.'} onBack={onBack} />
      <div className="screen-stack">
        {account.status === 'safe' ? <>
          <SuccessCard title={`${account.serviceName} looks good`}><p>This account already has its own strong password.</p></SuccessCard>
          <PrimaryButton onClick={onBack}>Back to your accounts</PrimaryButton>
        </> : <>
          <Card className="problem-card">
            <span className="shell-icon"><ShieldCheck size={25} aria-hidden="true" /></span>
            <h2>{reused ? 'Give this account its own password' : 'This password is easy to guess.'}</h2>
            {reused ? <><ReuseGroup accounts={[account, ...related]} /><p>If one password is exposed, someone could try it on the other accounts.</p></> : <p>{account.serviceName} uses a short or common password.</p>}
            <WhyItMatters><p>{reused ? 'A different password for each service limits where an exposed password can be used. You decide which account to improve first.' : 'A longer, unique password is harder to guess. A password manager can prepare it without asking you to choose settings.'}</p></WhyItMatters>
          </Card>
          <div className="screen-actions">
            <PrimaryButton onClick={() => navigate({ screen: 'safer-password', accountId: account.id })}>Fix {account.serviceName} password</PrimaryButton>
            <SecondaryButton onClick={onCancel}>Not now</SecondaryButton>
          </div>
        </>}
      </div>
    </>
  );
}

export function SaferPassword({ accountId, navigate, onCancel, onBack = onCancel }: NavigationProps) {
  const { state, dispatch } = useAppState();
  const account = state.accounts.find(item => item.id === accountId);
  const [demoPassword, setDemoPassword] = useState(() => generateDemoPassword(state.accounts.map(item => item.demoPassword)));
  const hasConfirmed = useRef(false);
  if (!account) return <AccountNotFound navigate={navigate} />;
  if (account.status === 'safe') return <><PageHeader title="Safer password" onBack={onBack} /><div className="screen-stack"><SuccessCard title={`${account.serviceName} already has its own password`}><p>This account already uses a strong, unique password.</p></SuccessCard><PrimaryButton onClick={() => navigate({ screen: 'vault' })}>Back to vault</PrimaryButton></div></>;

  const usePreparedPassword = () => {
    if (hasConfirmed.current) return;
    hasConfirmed.current = true;
    dispatch({ type: 'resolve-issue', accountId: account.id, demoPassword });
    navigate({ screen: 'success' });
  };
  const related = getRelatedAccounts(state.accounts, account.id);
  const reused = account.issueType === 'reused';

  return (
    <>
      <PageHeader title="Safer password" subtitle={`For ${account.serviceName}`} onBack={onBack} />
      <div className="screen-stack">
        <Card className="generated-password-card">
          <div className="generated-password-heading"><h2>Ready to use</h2><span className="strength-label"><CheckCircle2 size={15} aria-hidden="true" />Unique password</span></div>
          <p className="quick-fix-risk">{reused ? 'Give this account its own password to limit reuse risk.' : 'Replace this short or common password with a stronger one.'}</p>
          <PasswordDisplay value={demoPassword} label="Generated password" defaultVisible />
          <p className="password-detail">{demoPassword.length} characters · unique for this account</p>
        </Card>
        <div className="screen-actions">
          <PrimaryButton className="quick-fix-use" onClick={usePreparedPassword}>
            <Sparkles size={20} aria-hidden="true" /><span>Use unique password</span><ArrowRight size={20} aria-hidden="true" />
          </PrimaryButton>
          <SecondaryButton onClick={() => setDemoPassword(generateDemoPassword(state.accounts.map(item => item.demoPassword), demoPassword))}>Generate another</SecondaryButton>
          <SecondaryButton onClick={onCancel}>Not now</SecondaryButton>
        </div>
        <Card className="quick-fix-explanation">
          <WhyItMatters>
            {reused && <ReuseGroup accounts={[account, ...related]} />}
            <p>{reused ? 'If one password is exposed, someone could try it on the other accounts. A different password for each account limits this risk.' : 'A longer, unique password is harder to guess. The recommended settings are already selected for you.'}</p>
          </WhyItMatters>
        </Card>
      </div>
    </>
  );
}

export function SecuritySuccess({ navigate }: { navigate: (route: Route) => void }) {
  const { state } = useAppState();
  const result = state.lastResolution;
  if (!result) return <><PageHeader title="Your next step" /><div className="screen-stack"><InfoCard title="Start with an account"><p>Choose an account that needs attention to see what improves.</p></InfoCard><PrimaryButton onClick={() => navigate({ screen: 'vault' })}>Back to vault</PrimaryButton></div></>;
  const reused = result.issueType === 'reused';
  const nextAccount = getRecommendedAccount(state.accounts);
  return (
    <>
      <PageHeader title="Password updated" />
      <div className="screen-stack">
        <Card className="success-feedback">
          <CheckCircle2 className="success-feedback-icon" size={42} strokeWidth={1.5} aria-hidden="true" />
          <h2>{result.serviceName} now has {reused ? 'its own' : 'a stronger'} password.</h2>
          {reused && result.relatedServiceNames.length > 0 ? <>
            <p>{result.serviceName} no longer shares its password with {listNames(result.relatedServiceNames)}.</p>
            <p>If {result.serviceName} has a problem, the password used by the other accounts is still separate.</p>
          </> : <p>A longer, unique password makes this account harder to guess.</p>}
        </Card>
        {reused && <ReuseComparison result={result} />}
        {nextAccount && <Card className="next-account-card">
          <h2>Want to improve one more account?</h2>
          <p>{nextAccount.serviceName} {nextAccount.issueType === 'reused' ? 'still shares a password.' : 'still has a password that is easy to guess.'}</p>
          <PrimaryButton onClick={() => navigate({ screen: 'safer-password', accountId: nextAccount.id })}>Fix {nextAccount.serviceName} password</PrimaryButton>
        </Card>}
        <TextAction onClick={() => navigate({ screen: 'vault' })}>Back to vault</TextAction>
      </div>
    </>
  );
}

function ReuseComparison({ result }: { result: ResolutionSummary }) {
  const peers = result.relatedAccountsAfter ?? [];
  const stillShared = peers.filter(account => account.status === 'reused');
  const nowUnique = peers.filter(account => account.status === 'safe');
  const stillWeak = peers.filter(account => account.status === 'weak');
  return <Card className="reuse-progress-card">
    <h2>What changed</h2>
    <div className="reuse-comparison" data-testid="reuse-comparison">
      <section className="reuse-comparison-panel" aria-label="Before the password change" data-testid="before-reuse-group">
        <h3>Before</h3><p className="comparison-caption">Same password</p>
        <ul className="connected-accounts">{[result.serviceName, ...result.relatedServiceNames].map((name, index) => <li key={index}>{name}</li>)}</ul>
      </section>
      <section className="reuse-comparison-panel" aria-label="After the password change" data-testid="after-reuse-group">
        <h3>Now</h3>
        <ul className="unique-accounts"><li><span>{result.serviceName}</span><span className="comparison-unique"><Check size={14} aria-hidden="true" />Unique</span></li></ul>
        {stillShared.length > 0 && <><p className="comparison-caption remaining-accounts-caption">Still sharing a password</p><ul className="connected-accounts">{stillShared.map(account => <li key={account.id}>{account.serviceName}</li>)}</ul></>}
        {nowUnique.length > 0 && <><p className="comparison-caption remaining-accounts-caption">Own passwords</p><ul className="unique-accounts">{nowUnique.map(account => <li key={account.id}><span>{account.serviceName}</span><span className="comparison-unique"><Check size={14} aria-hidden="true" />Unique</span></li>)}</ul></>}
        {stillWeak.length > 0 && <><p className="comparison-caption remaining-accounts-caption">Still needs a stronger password</p><ul className="comparison-weak-accounts">{stillWeak.map(account => <li key={account.id}>{account.serviceName}</li>)}</ul></>}
      </section>
    </div>
  </Card>;
}
