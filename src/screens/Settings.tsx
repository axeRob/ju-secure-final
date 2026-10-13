import { HeartHandshake, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Card, InfoCard, PageHeader, SettingsRow, Toggle } from '../components/index.ts';
import { useAppState } from '../state/AppContext.tsx';

export function Settings() {
  const { state, dispatch } = useAppState();
  return (
    <>
      <PageHeader title="Settings" subtitle="Simple by default. Safer by design." />
      <Card className="persona-card"><span className="persona-avatar" aria-hidden="true">E</span><div><h2>Emma’s vault</h2><p>Student demo</p></div><ShieldCheck size={20} aria-hidden="true" /></Card>
      <div className="section-heading settings-heading"><h2>Safe defaults</h2></div>
      <InfoCard className="settings-defaults-note" title={state.settings.autoLock && state.settings.securityGuidance ? 'Safe defaults are already on' : 'Simple preferences, safe recommendations'}>
        <p>The recommended demo preferences are selected. These switches let you explore settings; they do not secure real accounts.</p>
      </InfoCard>
      <Card className="settings-group">
        <SettingsRow icon={LockKeyhole} title="Automatic lock" description="Demo preference. This prototype does not lock.">
          <Toggle label="Automatic lock" checked={state.settings.autoLock}
            onChange={autoLock => dispatch({ type: 'update-settings', settings: { autoLock } })} />
        </SettingsRow>
        <SettingsRow icon={HeartHandshake} title="Helpful guidance" description="Demo preference. Essential guidance stays available.">
          <Toggle label="Helpful guidance" checked={state.settings.securityGuidance}
            onChange={securityGuidance => dispatch({ type: 'update-settings', settings: { securityGuidance } })} />
        </SettingsRow>
      </Card>
      {!state.settings.autoLock && <p className="form-help settings-preference-note">Keeping automatic lock on is recommended.</p>}
      <InfoCard title="A space to try things out"><p>This is an educational prototype with demo accounts. It doesn’t store real passwords or connect to your accounts.</p></InfoCard>
      <div className="about-app"><div className="about-wordmark">JU Secure</div><p>Made for student life.</p><span>Final prototype · v0.1</span></div>
    </>
  );
}
