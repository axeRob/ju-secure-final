import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, InfoCard, PageHeader, PasswordDisplay, PrimaryButton, SecondaryButton, SuccessCard, TextAction } from '../components/index.ts';
import { ReuseGroup, WhyItMatters } from '../components/ReuseGroup.tsx';
import { generateDemoPassword } from '../data/passwords.ts';
import { getServiceGuidance } from '../data/serviceGuidance.ts';
import { useAppState } from '../state/AppContext.tsx';
import { getRecommendedAccount, getRelatedAccounts } from '../state/security.ts';
import { AccountNotFound } from './AccountDetails.tsx';
import type { Route } from '../routes.ts';
import type { ResolutionSummary, SecuritySummary } from '../types/index.ts';

type NavigationProps = { accountId: string; navigate: (route: Route) => void; onCancel: () => void; onBack?: () => void };
const listNames = (names: string[]) => new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(names);
const summaryText = (summary: SecuritySummary) => `${summary.safe} safe · ${summary.reused} reused · ${summary.weak} weak`;

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
          <SuccessCard title={`${account.serviceName} looks good`}><p>This demo account already has its own strong password.</p></SuccessCard>
          <PrimaryButton onClick={onBack}>Back to your accounts</PrimaryButton>
        </> : <>
          <Card className="problem-card">
            <span className="shell-icon"><ShieldCheck size={25} aria-hidden="true" /></span>
            <h2>{reused ? 'Give this account its own password' : 'This password is easy to guess.'}</h2>
            {reused ? <><ReuseGroup accounts={[account, ...related]} /><p>If one password is exposed, someone could try it on the other accounts.</p></> : <p>{account.serviceName} uses a short or common demo password.</p>}
            <WhyItMatters><p>{reused ? 'A different password for each service limits where an exposed password can be used. You decide which account to improve first.' : 'A longer, unique password is harder to guess. A password manager can prepare it without asking you to choose settings.'}</p></WhyItMatters>
          </Card>
          <div className="screen-actions">
            <PrimaryButton onClick={() => navigate({ screen: 'safer-password', accountId: account.id })}>Fix {account.serviceName} password</PrimaryButton>
            <p className="simulation-note">Prepare a demo password, then see how to change it on the service.</p>
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
  const [step, setStep] = useState<'prepare' | 'website'>('prepare');
  const [notYet, setNotYet] = useState(false);
  const hasConfirmed = useRef(false);
  const guideHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (step === 'website') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      guideHeading.current?.focus({ preventScroll: true });
    }
  }, [step]);
  if (!account) return <AccountNotFound navigate={navigate} />;
  if (account.status === 'safe') return <><PageHeader title="Safer password" onBack={onBack} /><div className="screen-stack"><SuccessCard title={`${account.serviceName} already has its own demo password`}><p>This account already uses a strong, unique demo password.</p></SuccessCard><PrimaryButton onClick={() => navigate({ screen: 'vault' })}>Back to vault</PrimaryButton></div></>;

  const confirmDemoCompletion = () => {
    if (hasConfirmed.current) return;
    hasConfirmed.current = true;
    dispatch({ type: 'resolve-issue', accountId: account.id, demoPassword });
    navigate({ screen: 'success' });
  };
  const back = () => {
    if (step === 'website') {
      setStep('prepare');
      setNotYet(false);
    } else onBack();
  };
  const related = getRelatedAccounts(state.accounts, account.id);
  const guidance = getServiceGuidance(account.serviceName);

  return (
    <>
      <PageHeader title="Safer password" subtitle={`For ${account.serviceName}`} onBack={back} />
      <div className="screen-stack">
        <p className="password-flow-progress" data-testid="password-flow-progress">{step === 'prepare' ? '1 of 2 · Prepare a demo password' : '2 of 2 · Service guidance and demo confirmation'}</p>
        {step === 'prepare' ? <>
        <Card className="generated-password-card">
          <div className="generated-password-heading"><h2>For {account.serviceName}</h2><span className="strength-label"><CheckCircle2 size={15} aria-hidden="true" />Strong demo example</span></div>
          <PasswordDisplay value={demoPassword} label="Generated demo password" defaultVisible />
          <p className="password-detail">{demoPassword.length} characters · letters · numbers · symbols</p>
          <p className="password-detail">Demo only. Never use this value on a real account.</p>
          <SecondaryButton onClick={() => setDemoPassword(generateDemoPassword(state.accounts.map(item => item.demoPassword), demoPassword))}>Generate another</SecondaryButton>
        </Card>
        <div className="screen-actions">
          <PrimaryButton onClick={() => setStep('website')}>Continue to password change</PrimaryButton>
          <SecondaryButton onClick={onCancel}>Not now</SecondaryButton>
        </div>
        <InfoCard title="Demo only"><p>Fictitious example. Never use this DEMO value on a real account. Only confirmation updates this demo.</p></InfoCard>
        <Card className="password-flow-context">
          <h2>{account.issueType === 'reused' ? 'Give this account its own password' : 'Make this password harder to guess'}</h2>
          {account.issueType === 'reused' ? <><ReuseGroup accounts={[account, ...related]} /><p>If one password is exposed, someone could try it on the other accounts.</p></> : <p>{account.serviceName} has a short or common demo password.</p>}
          <WhyItMatters><p>{account.issueType === 'reused' ? 'A unique password limits where an exposed password can be used. Choose the accounts that matter to you; each change improves the fictional demo vault.' : 'A longer, unique password is harder to guess. The recommended settings are already selected for this demonstration.'}</p></WhyItMatters>
        </Card>
        </> : <>
        <Card className="website-guide-card" data-testid="password-website-guidance">
          <h2 ref={guideHeading} tabIndex={-1}>Change the password on {account.serviceName}</h2>
          <p>JU Secure cannot change or verify passwords on external services. You can rehearse these steps without signing in.</p>
          <ol className="next-steps">{guidance.steps.map(stepText => <li key={stepText}>{stepText}</li>)}</ol>
          <details className="inline-guidance"><summary>Different sign-in method?</summary><p>{guidance.signInNote}</p></details>
        </Card>
        <Card className="confirmation-card" data-testid="password-change-confirmation">
          <h2>Did you change your password on the website?</h2>
          <p>For this rehearsal, your answer only updates the fictional {account.serviceName} account in JU Secure. It does not confirm or verify any real password change.</p>
          <div className="screen-actions">
            <PrimaryButton onClick={confirmDemoCompletion}>Yes, mark as completed in this demo</PrimaryButton>
            <SecondaryButton onClick={() => setNotYet(true)}>Not yet</SecondaryButton>
          </div>
          {notYet && <p className="simulation-note" role="status">No demo changes saved. Take your time or choose Not now to leave.</p>}
        </Card>
        <SecondaryButton onClick={onCancel}>Not now</SecondaryButton>
        </>}
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
  const problemsFixed = result.before.needsAttention - result.after.needsAttention;
  return (
    <>
      <PageHeader title="Demo action completed" />
      <div className="screen-stack">
        <Card className="success-feedback">
          <CheckCircle2 className="success-feedback-icon" size={42} strokeWidth={1.5} aria-hidden="true" />
          <h2>{result.serviceName} now has {reused ? 'its own' : 'a stronger'} demo password.</h2>
          {reused && result.relatedServiceNames.length > 0 ? <p>In this demo, {result.serviceName} no longer shares its password with {listNames(result.relatedServiceNames)}.</p> : <p>The fictional account now uses a longer, unique demo password.</p>}
          <p>You confirmed the demonstration. JU Secure did not change or verify a password on the real service.</p>
        </Card>
        {reused && <ReuseComparison result={result} />}
        <Card className="progress-card">
          <h2>Your demo vault is safer</h2>
          <dl><div><dt>Before</dt><dd>{summaryText(result.before)}</dd></div><div><dt>Now</dt><dd>{summaryText(result.after)}</dd></div></dl>
          <p className="problems-fixed"><CheckCircle2 size={16} aria-hidden="true" />{problemsFixed} demo {problemsFixed === 1 ? 'problem' : 'problems'} resolved.</p>
        </Card>
        <div className="screen-actions">
          <PrimaryButton onClick={() => navigate({ screen: 'vault' })}>Back to vault</PrimaryButton>
        </div>
        {nextAccount && <Card className="next-account-card">
          <h2>Want to improve one more account?</h2>
          <p>{nextAccount.serviceName} {nextAccount.issueType === 'reused' ? 'still shares a demo password.' : 'still has a demo password that is easy to guess.'}</p>
          <SecondaryButton onClick={() => navigate({ screen: 'safer-password', accountId: nextAccount.id })}>Fix {nextAccount.serviceName} password</SecondaryButton>
          <p className="next-account-optional">Only if you want to. You can stop here.</p>
        </Card>}
        <TextAction onClick={() => navigate({ screen: 'learn-article', articleId: 'unique-passwords' })}>Why unique passwords help</TextAction>
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
      <section className="reuse-comparison-panel" aria-label="Before the demo change" data-testid="before-reuse-group">
        <h3>Before</h3><p className="comparison-caption">Same password</p>
        <ul className="connected-accounts">{[result.serviceName, ...result.relatedServiceNames].map((name, index) => <li key={index}>{name}</li>)}</ul>
      </section>
      <section className="reuse-comparison-panel" aria-label="After the demo change" data-testid="after-reuse-group">
        <h3>Now</h3>
        <ul className="unique-accounts"><li><span>{result.serviceName}</span><span className="comparison-unique"><Check size={14} aria-hidden="true" />Unique</span></li></ul>
        {stillShared.length > 0 && <><p className="comparison-caption remaining-accounts-caption">Still sharing a password</p><ul className="connected-accounts">{stillShared.map(account => <li key={account.id}>{account.serviceName}</li>)}</ul></>}
        {nowUnique.length > 0 && <><p className="comparison-caption remaining-accounts-caption">Own passwords</p><ul className="unique-accounts">{nowUnique.map(account => <li key={account.id}><span>{account.serviceName}</span><span className="comparison-unique"><Check size={14} aria-hidden="true" />Unique</span></li>)}</ul></>}
        {stillWeak.length > 0 && <><p className="comparison-caption remaining-accounts-caption">Still needs a stronger password</p><ul className="comparison-weak-accounts">{stillWeak.map(account => <li key={account.id}>{account.serviceName}</li>)}</ul></>}
      </section>
    </div>
  </Card>;
}
