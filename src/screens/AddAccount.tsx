import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Card, PageHeader, PasswordDisplay, PrimaryButton, SecondaryButton, WarningCard } from '../components/index.ts';
import { generateDemoPassword, isStrongDemoPassword } from '../data/passwords.ts';
import type { Route } from '../routes.ts';
import { useAppState } from '../state/AppContext.tsx';
import { getDemoPasswordMatches } from '../state/security.ts';

type PasswordChoice = 'generated' | 'existing-demo';

const WEAK_DEMO_PASSWORDS = ['DEMO-123', 'DEMO-abc'] as const;

export function AddAccount({ navigate, onAdded }: { navigate: (route: Route) => void; onAdded: () => void }) {
  const { state, dispatch } = useAppState();
  const [serviceName, setServiceName] = useState('Study App');
  const [username, setUsername] = useState('emma@example.com');
  const [passwordChoice, setPasswordChoice] = useState<PasswordChoice>('generated');
  const [generatedPassword, setGeneratedPassword] = useState(() =>
    generateDemoPassword(state.accounts.map(account => account.demoPassword)),
  );
  const [existingDemoPassword, setExistingDemoPassword] = useState<string>(() =>
    state.accounts.find(account => account.id === 'spotify')?.demoPassword ?? WEAK_DEMO_PASSWORDS[0],
  );
  const [keptDemoPassword, setKeptDemoPassword] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const reuseWarningRef = useRef<HTMLDivElement>(null);
  const existingOptions = new Map<string, string[]>();
  for (const account of state.accounts) {
    if (!account.demoPassword.startsWith('DEMO-')) continue;
    const names = existingOptions.get(account.demoPassword) ?? [];
    existingOptions.set(account.demoPassword, [...names, account.serviceName]);
  }
  for (const value of WEAK_DEMO_PASSWORDS) {
    if (!existingOptions.has(value)) existingOptions.set(value, []);
  }
  const matches = passwordChoice === 'existing-demo'
    ? getDemoPasswordMatches(state.accounts, existingDemoPassword)
    : [];
  const reuseNeedsConfirmation = matches.length > 0 && keptDemoPassword !== existingDemoPassword;
  const existingIsStrong = matches.length > 0
    ? matches.every(account => account.passwordStrength === 'strong')
    : isStrongDemoPassword(existingDemoPassword);
  useEffect(() => {
    if (!matches.length) return;
    const frame = window.requestAnimationFrame(() => {
      reuseWarningRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [passwordChoice, existingDemoPassword, matches.length]);

  const selectGeneratedPassword = () => {
    setGeneratedPassword(generateDemoPassword(
      state.accounts.map(account => account.demoPassword),
      generatedPassword,
    ));
    setPasswordChoice('generated');
    setKeptDemoPassword(null);
    setFormError('');
  };

  const addAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const demoService = serviceName.trim();
    const demoUsername = username.trim();
    if (!demoService || !demoUsername) {
      setFormError('Add an app name and a made-up email or username.');
      return;
    }
    if (reuseNeedsConfirmation) {
      setFormError('Use the recommended unique password, or choose “Keep this password” before adding the account.');
      return;
    }

    const isStrong = passwordChoice === 'generated' || existingIsStrong;
    const reused = passwordChoice === 'existing-demo' && matches.length > 0;
    const baseId = demoService.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account';
    const initial = demoService.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
    dispatch({
      type: 'add-account',
      detectDemoReuse: passwordChoice === 'existing-demo',
      account: {
        id: `demo-${baseId}`,
        serviceName: demoService,
        username: demoUsername,
        status: reused ? 'reused' : isStrong ? 'safe' : 'weak',
        issueType: reused ? 'reused' : isStrong ? 'none' : 'weak',
        passwordStrength: isStrong ? 'strong' : 'weak',
        reusedGroupId: null,
        initial,
        demoPassword: passwordChoice === 'generated' ? generatedPassword : existingDemoPassword,
      },
    });
    dispatch({ type: 'set-filter', filter: 'all' });
    onAdded();
  };

  return (
    <>
      <PageHeader title="Add account" subtitle="Keep your accounts together." onBack={() => navigate({ screen: 'vault' })} />
      <div className="screen-stack">
        <form className="demo-account-form screen-stack" onSubmit={addAccount} autoComplete="off">
          <Card className="screen-stack">
            <p className="form-help account-details-help" id="account-details-help">Use made-up details</p>
            <div className="form-field">
              <label className="form-label" htmlFor="demo-service">Website or app</label>
              <input className="form-input" id="demo-service" name="demo-service" value={serviceName}
                placeholder="Study App" maxLength={60} required autoComplete="off" aria-describedby="account-details-help"
                onChange={event => { setServiceName(event.target.value); setFormError(''); }} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="demo-username">Email / username</label>
              <input className="form-input" id="demo-username" name="demo-username" value={username}
                placeholder="emma@example.com" maxLength={80} required autoComplete="off" spellCheck={false} aria-describedby="account-details-help"
                onChange={event => { setUsername(event.target.value); setFormError(''); }} />
            </div>
            <fieldset className="password-options">
              <legend className="form-label">Password</legend>
              <button type="button" className={`password-option${passwordChoice === 'generated' ? ' password-option-selected' : ''}`}
                aria-pressed={passwordChoice === 'generated'} onClick={selectGeneratedPassword}>
                <Sparkles size={17} aria-hidden="true" />
                <span>Use a unique password</span>
                {passwordChoice === 'generated' && <Check size={17} aria-hidden="true" />}
              </button>
              <button type="button" className={`password-option${passwordChoice === 'existing-demo' ? ' password-option-selected' : ''}`}
                aria-pressed={passwordChoice === 'existing-demo'} onClick={() => {
                  setPasswordChoice('existing-demo'); setKeptDemoPassword(null); setFormError('');
                }}>
                <span>Choose an existing password</span>
                {passwordChoice === 'existing-demo' && <Check size={17} aria-hidden="true" />}
              </button>
            </fieldset>
            {passwordChoice === 'generated' ? (
              <div>
                <PasswordDisplay value={generatedPassword} label="Generated password" defaultVisible />
                <p className="form-help">Strong and unique, with no settings to choose.</p>
              </div>
            ) : (
              <div className="form-field">
                <label className="form-label" htmlFor="existing-demo-password">Choose a sample password</label>
                <select className="form-input" id="existing-demo-password" value={existingDemoPassword}
                  onChange={event => {
                    setExistingDemoPassword(event.target.value); setKeptDemoPassword(null); setFormError('');
                  }} aria-describedby="existing-demo-help">
                  {[...existingOptions].map(([password, names]) => (
                    <option key={password} value={password}>
                      {names.length ? `${names.join(', ')} — existing password` : `${password} — easy to guess`}
                    </option>
                  ))}
                </select>
                <p className="form-help" id="existing-demo-help">Select an existing password to see how reuse is detected.</p>
                {!matches.length && !existingIsStrong && <p className="form-help">This password is easy to guess. The account will need attention.</p>}
              </div>
            )}
          </Card>
          {matches.length > 0 && <div className="reuse-warning-region" ref={reuseWarningRef}><WarningCard className="add-reuse-warning" title="This password is already used">
            <p aria-live="polite">You already use this password on {matches.length} other {matches.length === 1 ? 'account' : 'accounts'}.</p>
            <ul className="reuse-account-list" aria-label="Accounts using this password">
              {matches.map(account => <li key={account.id}>{account.serviceName}</li>)}
            </ul>
            <div className="reuse-recommendation"><span className="section-eyebrow">Recommended</span><p>Use a unique password instead. We’ll create it for you.</p></div>
            <div className="reuse-warning-actions">
              <PrimaryButton onClick={selectGeneratedPassword}>Use a unique password</PrimaryButton>
              <SecondaryButton onClick={() => { setKeptDemoPassword(existingDemoPassword); setFormError(''); }}
                aria-pressed={keptDemoPassword === existingDemoPassword}>Keep this password</SecondaryButton>
            </div>
            {keptDemoPassword === existingDemoPassword && <p className="reuse-keep-confirmation" role="status">The account will be marked as needing attention.</p>}
          </WarningCard></div>}
          {formError && <p className="form-error" role="alert">{formError}</p>}
          {reuseNeedsConfirmation && <p className="form-help add-account-pending-help" id="reuse-save-help">Choose the unique password or confirm that you want to keep sharing before adding this account.</p>}
          <PrimaryButton type="submit" disabled={reuseNeedsConfirmation}
            aria-describedby={reuseNeedsConfirmation ? 'reuse-save-help' : undefined}>Add account</PrimaryButton>
        </form>
      </div>
    </>
  );
}
