import { useEffect, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Plus,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import type { Account } from '../types/index.ts'

const classes = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ')

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function PrimaryButton({ className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={classes('button', 'button-primary', className)} {...props} />
}

export function SecondaryButton({ className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={classes('button', 'button-secondary', className)} {...props} />
}

export function TextAction({ className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={classes('text-action', className)} {...props} />
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes('card', className)} {...props} />
}

type NoticeProps = HTMLAttributes<HTMLDivElement> & { title?: string }

function NoticeCard({ title, children, className, icon: Icon, tone, ...props }: NoticeProps & {
  icon: LucideIcon
  tone: 'info' | 'warning' | 'success'
}) {
  return (
    <div className={classes('card', 'notice-card', `${tone}-card`, className)} {...props}>
      <Icon className="notice-icon" size={19} aria-hidden="true" />
      <div className="notice-copy">
        {title && <h3 className="notice-title">{title}</h3>}
        <div className="notice-description">{children}</div>
      </div>
    </div>
  )
}

export function InfoCard(props: NoticeProps) {
  return <NoticeCard {...props} icon={Info} tone="info" />
}

export function WarningCard(props: NoticeProps) {
  return <NoticeCard {...props} icon={CircleAlert} tone="warning" />
}

export function SuccessCard(props: NoticeProps) {
  return <NoticeCard {...props} icon={CheckCircle2} tone="success" />
}

export function StatusPill({ status }: { status: 'safe' | 'reused' | 'weak' }) {
  const safe = status === 'safe'
  return (
    <span className={classes('status-pill', safe ? 'status-safe' : 'status-attention')} data-testid="status-pill">
      {safe ? <Check size={11} aria-hidden="true" /> : <CircleAlert size={11} aria-hidden="true" />}
      {safe ? 'Safe' : 'Needs attention'}
    </span>
  )
}

export function AccountCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const serviceKey = account.serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <button type="button" className="account-card" onClick={onClick} data-testid="account-card"
      aria-label={`${account.serviceName}, ${account.username}, ${account.status === 'safe' ? 'Safe' : 'Needs attention'}`}>
      <div className="account-main">
        <span className={classes('service-mark', `service-${serviceKey}`)} aria-hidden="true">{account.initial}</span>
        <span className="account-copy">
          <span className="account-service">{account.serviceName}</span>
          <span className="account-username">{account.username}</span>
        </span>
      </div>
      <span className="account-meta">
        <StatusPill status={account.status} />
        <ChevronRight className="account-chevron" size={16} aria-hidden="true" />
      </span>
    </button>
  )
}

type SecuritySummaryProps = {
  summary: { total: number; safe: number; reused: number; weak: number; needsAttention: number }
}

export function SecuritySummary({ summary }: SecuritySummaryProps) {
  const hasIssue = summary.needsAttention > 0
  return (
    <section className="card security-summary" aria-label="Security overview" data-testid="security-summary">
      <h2 className="summary-title">Your password health</h2>
      <div className="summary-stats" role="group" aria-label={`${summary.total} accounts: ${summary.safe} safe, ${summary.reused} reused, ${summary.weak} weak`}>
        <div className="summary-stat"><span className="stat-number">{summary.safe}</span><span className="stat-label">Safe</span></div>
        <div className="summary-stat"><span className="stat-number">{summary.reused}</span><span className="stat-label">Reused</span></div>
        <div className="summary-stat"><span className="stat-number">{summary.weak}</span><span className="stat-label">Weak</span></div>
      </div>
      {hasIssue ? (
        <>
          <p className="health-attention-count">{summary.needsAttention} {summary.needsAttention === 1 ? 'account needs' : 'accounts need'} attention.</p>
        </>
      ) : (
        <div className="summary-all-clear"><CheckCircle2 size={17} aria-hidden="true" /> No recommended fixes right now</div>
      )}
    </section>
  )
}

export function SecurityIssueCard({ title, description, actionLabel, onAction, primary = false }: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  primary?: boolean
}) {
  return (
    <Card className="security-issue-card">
      <div className="issue-heading"><CircleAlert size={19} aria-hidden="true" /><h3 className="issue-title">{title}</h3></div>
      <p className="issue-description">{description}</p>
      {primary ? <PrimaryButton onClick={onAction}>{actionLabel}<ArrowRight size={16} aria-hidden="true" /></PrimaryButton>
        : <TextAction onClick={onAction}>{actionLabel}<ArrowRight size={16} aria-hidden="true" /></TextAction>}
    </Card>
  )
}

export function PasswordDisplay({
  label = 'Password',
  value = 'DEMO-JU-Secure-24!',
  defaultVisible = false,
  hideCopy = false,
}: {
  label?: string
  value?: string
  defaultVisible?: boolean
  hideCopy?: boolean
}) {
  const [visible, setVisible] = useState(defaultVisible)
  const [copied, setCopied] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyRequest = useRef(0)

  useEffect(() => {
    setVisible(defaultVisible)
    setCopied(false)
    setCopyStatus('')
    return () => {
      copyRequest.current += 1
      if (feedbackTimer.current !== null) {
        clearTimeout(feedbackTimer.current)
        feedbackTimer.current = null
      }
    }
  }, [value, defaultVisible])

  async function copyDemoValue() {
    const request = ++copyRequest.current
    if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current)
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        throw new Error('Clipboard unavailable')
      }
    } catch {
      if (request !== copyRequest.current) return
      setCopied(false)
      setCopyStatus(visible ? 'Copy unavailable. Select the password to copy it manually.' : 'Copy unavailable. Show the password to copy it manually.')
      return
    }
    if (request !== copyRequest.current) return
    setCopied(true)
    setCopyStatus('Password copied.')
    feedbackTimer.current = setTimeout(() => {
      setCopied(false)
      setCopyStatus('')
      feedbackTimer.current = null
    }, 1500)
  }

  return (
    <div className="password-display">
      <span className="password-label">{label}</span>
      <div className="password-value-row">
        <span className="password-value" role="img" aria-label={visible ? `Password: ${value}` : 'Hidden password'}>
          {visible ? value : '•••• •••• •••• ••••'}
        </span>
        <div className="password-controls">
          <button type="button" className="password-icon-button" aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible} onClick={() => setVisible(current => !current)}>
            {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
          {!hideCopy && <button type="button" className="password-copy" onClick={copyDemoValue}>
            {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy password'}
          </button>}
        </div>
      </div>
      <span className="password-copy-status" role="status" aria-live="polite">{copyStatus}</span>
    </div>
  )
}

export type NavigationSection = 'vault' | 'security' | 'learn' | 'settings'

const navigationItems: Array<{ id: NavigationSection; label: string; icon: LucideIcon }> = [
  { id: 'vault', label: 'Vault', icon: LockKeyhole },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function BottomNavigation({ active, onNavigate, needsAttention = 0 }: {
  active: NavigationSection
  onNavigate: (section: NavigationSection) => void
  needsAttention?: number
}) {
  return (
    <nav className="bottom-navigation" aria-label="Main navigation">
      {navigationItems.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className={classes('nav-item', active === id && 'nav-item-active')}
          aria-current={active === id ? 'page' : undefined}
          aria-label={id === 'security' && needsAttention > 0 ? `Security, ${needsAttention} ${needsAttention === 1 ? 'account needs' : 'accounts need'} attention` : undefined}
          onClick={() => onNavigate(id)}>
          <span className="nav-icon-wrap"><Icon size={21} aria-hidden="true" />
            {id === 'security' && needsAttention > 0 && <span className="nav-attention-badge" aria-hidden="true">{needsAttention}</span>}
          </span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}

export function PageHeader({ title, subtitle, onBack }: {
  title: string
  subtitle?: string
  onBack?: () => void
}) {
  return (
    <header className="page-header">
      {onBack && <button type="button" className="header-back" aria-label="Go back" onClick={onBack}><ArrowLeft size={20} aria-hidden="true" /></button>}
      <div className="header-copy">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </header>
  )
}

export function SettingsRow({ icon: Icon, title, description, children, onClick }: {
  icon?: LucideIcon
  title: string
  description?: string
  children?: ReactNode
  onClick?: () => void
}) {
  const content = <>
    {Icon && <span className="settings-icon"><Icon size={19} aria-hidden="true" /></span>}
    <span className="settings-copy"><span className="settings-title">{title}</span>{description && <span className="settings-description">{description}</span>}</span>
  </>
  return (
    <div className="settings-row">
      {onClick ? <button type="button" className="settings-row-main" onClick={onClick}>{content}</button> : <div className="settings-row-main">{content}</div>}
      {children ? <div className="settings-end">{children}</div> : onClick ? <ChevronRight className="settings-chevron" size={16} aria-hidden="true" /> : null}
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled = false }: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return <button type="button" className={classes('toggle', checked && 'toggle-on')} role="switch"
    aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}>
    <span className="toggle-thumb" />
  </button>
}

export function LearnCard({ title, description, children, onClick }: {
  title: string
  description: string
  children?: ReactNode
  onClick?: () => void
}) {
  return (
    <Card className="learn-card">
      <h3 className="learn-title">{title}</h3>
      <p className="learn-description">{description}</p>
      {children && <div className="learn-body">{children}</div>}
      {onClick && <TextAction className="learn-action" onClick={onClick} aria-label={`Read about ${title}`}>Read more<ArrowRight size={16} aria-hidden="true" /></TextAction>}
    </Card>
  )
}

export function FloatingActionButton({ onClick }: { onClick: () => void }) {
  return <div className="floating-action-area"><button type="button" className="floating-action-button" aria-label="Add account" onClick={onClick}><Plus size={25} aria-hidden="true" /></button></div>
}
