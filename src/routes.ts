import { useEffect, useState } from 'react';

export type Section = 'vault' | 'security' | 'learn' | 'settings';
export type Route =
  | { screen: Section }
  | { screen: 'account'; accountId: string }
  | { screen: 'add-account' }
  | { screen: 'reused-password' | 'safer-password' | 'weak-password'; accountId: string }
  | { screen: 'success' }
  | { screen: 'learn-article'; articleId: string }
  | { screen: 'welcome' | 'create-vault' | 'import-passwords' | 'unlock' };

export const ROUTE_PATHS = {
  vault: '/vault', security: '/security', learn: '/learn', settings: '/settings',
  account: '/vault/account/:accountId', 'add-account': '/vault/add',
  'reused-password': '/security/reused/:accountId', 'safer-password': '/security/safer/:accountId',
  'weak-password': '/security/weak/:accountId', success: '/security/success',
  'learn-article': '/learn/:articleId', welcome: '/welcome', 'create-vault': '/create-vault',
  'import-passwords': '/import', unlock: '/unlock',
} satisfies Record<Route['screen'], string>;

export function routePath(route: Route): string {
  let path = ROUTE_PATHS[route.screen];
  if ('accountId' in route) path = path.replace(':accountId', encodeURIComponent(route.accountId));
  if ('articleId' in route) path = path.replace(':articleId', encodeURIComponent(route.articleId));
  return path;
}

function readRoute(): Route {
  const path = window.location.hash.slice(1) || '/welcome';
  for (const [screen, pattern] of Object.entries(ROUTE_PATHS)) {
    const keys = [...pattern.matchAll(/:(\w+)/g)].map(match => match[1]);
    const match = path.match(new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}/?$`));
    if (!match) continue;
    try {
      return Object.assign({ screen }, Object.fromEntries(keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]))) as Route;
    } catch { return { screen: 'vault' }; }
  }
  return { screen: 'vault' };
}

export function activeSection(route: Route): Section | null {
  if (['vault', 'account', 'add-account'].includes(route.screen)) return 'vault';
  if (['security', 'reused-password', 'safer-password', 'weak-password', 'success'].includes(route.screen)) return 'security';
  if (['learn', 'learn-article'].includes(route.screen)) return 'learn';
  if (route.screen === 'settings') return 'settings';
  return null;
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return { route, navigate: (next: Route) => { window.location.hash = routePath(next); } };
}
