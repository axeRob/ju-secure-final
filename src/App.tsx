import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { BottomNavigation } from './components/index.ts';
import { Vault } from './screens/Vault.tsx';
import { Learn } from './screens/Learn.tsx';
import { Security } from './screens/Security.tsx';
import { Settings } from './screens/Settings.tsx';
import { RouteShell } from './screens/RouteShell.tsx';
import { AccountDetails } from './screens/AccountDetails.tsx';
import { AddAccount } from './screens/AddAccount.tsx';
import { LearnArticle } from './screens/LearnArticle.tsx';
import { SaferPassword, SecurityProblem, SecuritySuccess } from './screens/SecurityFlow.tsx';
import { activeSection, useRoute } from './routes.ts';
import type { Route } from './routes.ts';
import { useAppState } from './state/AppContext.tsx';

export function App() {
  const { route, navigate: navigateRoute } = useRoute();
  const { summary } = useAppState();
  const section = activeSection(route);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const flowOrigin = useRef<Route>({ screen: 'security' });
  const [focusNewestAccount, setFocusNewestAccount] = useState(false);
  const [deferredAccountId, setDeferredAccountId] = useState<string | null>(null);
  const navigate = (next: Route) => {
    if (next.screen === 'reused-password' || next.screen === 'weak-password' || next.screen === 'safer-password') {
      if (route.screen === 'vault' || route.screen === 'security' || route.screen === 'account' || route.screen === 'success') flowOrigin.current = route;
    }
    if (next.screen === 'reused-password' || next.screen === 'weak-password' || next.screen === 'safer-password') setDeferredAccountId(null);
    setFocusNewestAccount(false);
    navigateRoute(next);
  };
  const finishAddingAccount = () => {
    setFocusNewestAccount(true);
    navigateRoute({ screen: 'vault' });
  };
  const returnFromSecurityFlow = () => navigate(flowOrigin.current);
  const deferSecurityFix = (accountId: string) => {
    setDeferredAccountId(accountId);
    navigate({ screen: 'vault' });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const title = mainRef.current?.querySelector('h1')?.textContent;
    document.title = `${title || 'JU Secure'} · JU Secure – Final Prototype`;
    if (firstRender.current) { firstRender.current = false; return; }
    mainRef.current?.focus({ preventScroll: true });
  }, [route]);

  return (
    <div className="app-shell" data-testid="app-shell">
      <a className="skip-link" href="#main-content" onClick={event => {
        event.preventDefault(); mainRef.current?.focus();
      }}>Skip to content</a>
      <header className="brand-header">
        <div className="brand"><ShieldCheck size={23} strokeWidth={1.8} aria-hidden="true" /><span><strong>JU</strong> Secure</span></div>
        <span className="demo-badge">Final demo</span>
      </header>
      <main id="main-content" className="page-content" ref={mainRef} tabIndex={-1}>
        {route.screen === 'vault' ? <Vault navigate={navigate} focusNewestAccount={focusNewestAccount} deferredAccountId={deferredAccountId} />
          : route.screen === 'learn' ? <Learn navigate={navigate} />
          : route.screen === 'security' ? <Security navigate={navigate} />
          : route.screen === 'settings' ? <Settings />
          : route.screen === 'account' ? <AccountDetails key={route.accountId} accountId={route.accountId} navigate={navigate} />
          : route.screen === 'add-account' ? <AddAccount navigate={navigate} onAdded={finishAddingAccount} />
          : route.screen === 'learn-article' ? <LearnArticle articleId={route.articleId} navigate={navigate} />
          : route.screen === 'reused-password' || route.screen === 'weak-password' ? <SecurityProblem accountId={route.accountId} navigate={navigate} onCancel={() => deferSecurityFix(route.accountId)} onBack={returnFromSecurityFlow} />
          : route.screen === 'safer-password' ? <SaferPassword key={route.accountId} accountId={route.accountId} navigate={navigate} onCancel={() => deferSecurityFix(route.accountId)} onBack={returnFromSecurityFlow} />
          : route.screen === 'success' ? <SecuritySuccess navigate={navigate} />
          : <RouteShell route={route} navigate={navigate} />}
      </main>
      {section && <BottomNavigation active={section} needsAttention={summary.needsAttention} onNavigate={screen => navigate({ screen })} />}
    </div>
  );
}
