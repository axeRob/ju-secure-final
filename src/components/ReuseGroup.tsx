import { KeyRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Account } from '../types/index.ts';

/** Shows a shared fictional password, not a connection between services. */
export function ReuseGroup({ accounts }: { accounts: Account[] }) {
  if (accounts.length < 2) return null;
  return (
    <div className="shared-password-group" data-testid="reuse-group">
      <p className="shared-password-label"><KeyRound size={16} aria-hidden="true" />
        <span>{accounts.length} accounts share the same password</span>
      </p>
      <ul className="shared-password-accounts" aria-label="Accounts sharing the same password">
        {accounts.map(account => {
          const serviceKey = account.serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return <li key={account.id}>
            <span className={`service-mark service-${serviceKey}`} aria-hidden="true">{account.initial}</span>
            <span>{account.serviceName}</span>
          </li>;
        })}
      </ul>
    </div>
  );
}

export function WhyItMatters({ children }: { children: ReactNode }) {
  return <details className="why-it-matters">
    <summary>Why does this matter?</summary>
    <div className="why-it-matters-content">{children}</div>
  </details>;
}
