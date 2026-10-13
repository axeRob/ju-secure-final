import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, PageHeader, PrimaryButton } from '../components/index.ts';
import type { Route } from '../routes.ts';

const entryScreens = {
  welcome: { title: 'Welcome', subtitle: 'JU Secure – Final Prototype', heading: 'Safer passwords, one account at a time.', description: 'See which fictional accounts share a password and practise giving each one its own.', action: 'Get started' },
  'create-vault': { title: 'Demo vault', subtitle: 'Ready to explore.', heading: 'Your demo vault is ready.', description: 'Explore fictional accounts without registration or a master password.', action: 'Open demo vault' },
  'import-passwords': { title: 'Demo accounts', subtitle: 'A simple way to get started.', heading: 'Explore the sample accounts.', description: 'The demo uses fictional accounts. No files or real passwords are imported.', action: 'Open demo vault' },
  unlock: { title: 'Welcome back', subtitle: 'Open your demo vault.', heading: 'Continue exploring.', description: 'No password is needed. Demo accounts and preferences reset when you reload.', action: 'Open demo vault' },
};

export function RouteShell({ route, navigate }: { route: Route; navigate: (route: Route) => void }) {
  const openVault = () => navigate({ screen: 'vault' });
  const content = Object.hasOwn(entryScreens, route.screen) ? entryScreens[route.screen as keyof typeof entryScreens] : entryScreens.welcome;
  return <div className="welcome-screen">
    <PageHeader title={content.title} subtitle={content.subtitle} />
    <Card className="workflow-shell welcome-card">
      <span className="shell-icon"><ShieldCheck size={25} aria-hidden="true" /></span>
      <h2>{content.heading}</h2><p>{content.description}</p>
      <PrimaryButton onClick={openVault}>{content.action} <ArrowRight size={17} aria-hidden="true" /></PrimaryButton>
    </Card>
    <p className="welcome-demo-note">Educational demo · Fictional accounts only<br />No registration or real credentials needed.</p>
  </div>;
}
