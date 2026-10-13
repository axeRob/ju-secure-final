import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, PageHeader, PrimaryButton } from '../components/index.ts';
import type { Route } from '../routes.ts';

const entryScreens = {
  welcome: { title: 'Welcome', subtitle: 'JU Secure', heading: 'Safer passwords, one account at a time.', description: 'See which accounts share a password and give each one its own.', action: 'Get started' },
  'create-vault': { title: 'Your vault', subtitle: 'Ready to explore.', heading: 'Your vault is ready.', description: 'Explore your accounts and improve your password habits.', action: 'Open vault' },
  'import-passwords': { title: 'Your accounts', subtitle: 'A simple way to get started.', heading: 'Explore your accounts.', description: 'Your accounts are ready to explore.', action: 'Open vault' },
  unlock: { title: 'Welcome back', subtitle: 'Open your vault.', heading: 'Continue exploring.', description: 'Return to your accounts and choose your next step.', action: 'Open vault' },
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
  </div>;
}
