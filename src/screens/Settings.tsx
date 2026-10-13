import { HeartHandshake, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Card, PageHeader, SettingsRow, Toggle } from '../components/index.ts';
import { useAppState } from '../state/AppContext.tsx';

export function Settings() {
  const { state, dispatch } = useAppState();
  return (
    <>
      <PageHeader title="Settings" subtitle="Make yourself at home." />
      <Card className="persona-card"><span className="persona-avatar" aria-hidden="true">E</span><div><h2>Emma’s vault</h2><p>Your account collection</p></div><ShieldCheck size={20} aria-hidden="true" /></Card>
      <div className="section-heading settings-heading"><h2>Preferences</h2></div>
      <Card className="settings-group">
        <SettingsRow icon={LockKeyhole} title="Automatic lock">
          <Toggle label="Automatic lock" checked={state.settings.autoLock}
            onChange={autoLock => dispatch({ type: 'update-settings', settings: { autoLock } })} />
        </SettingsRow>
        <SettingsRow icon={HeartHandshake} title="Helpful guidance">
          <Toggle label="Helpful guidance" checked={state.settings.securityGuidance}
            onChange={securityGuidance => dispatch({ type: 'update-settings', settings: { securityGuidance } })} />
        </SettingsRow>
      </Card>
      <details className="why-it-matters settings-learn-more"><summary>Learn more</summary><div className="why-it-matters-content"><p>These preferences reset when you reload. Automatic lock does not lock this interface. Security explanations stay available.</p></div></details>
      <div className="about-app"><div className="about-wordmark">JU Secure</div><p>Made for student life.</p><span>v0.1</span></div>
    </>
  );
}
