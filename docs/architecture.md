# JU Secure final prototype architecture

## Foundation and scope

The final prototype is based on Emma commit `af5a26be1cf0226e502e0cf9285559bf0e6bca7c`; Karim commit `c27236dffba41732bf34f1aa681690423fd63555` informs direct contextual actions and reduced interaction friction. Emma's components, design tokens, hash routing, reducer, and account fixtures remain the structural foundation. The original repositories are unchanged.

This is an educational interaction prototype. It has no real registration, authentication, backend, credential storage, service integrations, or ability to verify an external password change. Generated `DEMO-` values are predictable fictional examples and must never be used on real accounts.

## State and invariants

`AppProvider` owns a React reducer and exposes state, dispatch, and derived selectors. State is in memory. Reloading restores the initial fixtures, preferences, and progress; neither localStorage nor a backend stores accounts or passwords.

Each account has `id`, `serviceName`, `username`, `status`, `issueType`, `passwordStrength`, `reusedGroupId`, `initial`, and `demoPassword`. Reuse is represented by explicit group IDs. Group membership is not inferred from service names, usernames, or presumed real password analysis. Add account can opt into matching the exact fictional examples.

Initial data contains **24 accounts: 3 safe, 15 reused, 6 weak**. JU Student Web, Canvas / JU, and University Library are safe. GitHub, Facebook, Apple, Slack, Duolingo, and Student Email are weak.

| Reused group | Accounts sharing the same demo password |
| --- | --- |
| `demo-shared-a` | Spotify, Google, Netflix, Instagram |
| `demo-shared-b` | Amazon, Booking.com, Microsoft |
| `demo-shared-c` | LinkedIn, Zoom, Notion |
| `demo-shared-d` | Reddit, Discord, Steam |
| `demo-shared-e` | Dropbox, Adobe |

Security renders all active groups and their actual members, with a contextual fix available for each account. Reuse explanations refer to sharing the same password, rather than implying a technical connection between services.

`getSecuritySummary` derives displayed counts from current accounts. `getRecommendedAccount` prioritizes unresolved Spotify, then another reused account, then a weak account, and returns no recommendation when all accounts are safe. Vault and optional post-success guidance share this recommendation logic. Security offers every active group's accounts as equal choices. A deferred account can remain the Vault recommendation without changing its password or status. The bottom-navigation attention badge derives from `summary.needsAttention` and disappears at zero.

`resolve-issue` saves a valid fresh supplied `demoPassword`, or generates a fresh example if needed. It marks the selected account strong and safe and removes it from its reused group. Other accounts keep their passwords. Group normalization makes a strong final member safe; a weak final member retains its strength issue. `status` and `issueType` describe the primary displayed issue, while `passwordStrength` preserves strength independently.

`lastResolution` captures the selected account, original issue, related names/IDs, before/after summaries, and the original peers' resulting statuses/groups. Success uses historical snapshots, so later changes cannot rewrite an earlier comparison. The number of issues cleared is `before.needsAttention - after.needsAttention`; it can exceed one when a final reuse relationship disappears.

Resolving Spotify produces **4 safe / 14 reused / 6 weak**. Resolving Google next gives **5 / 13 / 6**; resolving Netflix gives **7 / 11 / 6**, because Instagram no longer shares its password with another account. In the two-member Dropbox/Adobe group, resolving one account removes both reuse warnings without changing the other's password. Unrelated groups and weak accounts retain their issues.

The reducer also supports account addition/import, filters, demo settings, onboarding, and returning-user state. Informational Import, Create vault, and Unlock screens do not collect real credentials or perform an actual import/authentication operation. Existing accounts are preserved; collision-safe IDs are assigned to additions.

## Password-change journey

The contextual fix opens one prepared password screen rather than requiring the user to read a separate risk screen first. The account name, generated example, short demo warning, password controls, and continue action appear first. Full group context, the concise risk explanation, and optional expanded education remain below so a user can act immediately or read further.

The route `/security/safer/:accountId` has two local screen steps: **Prepare a demo password**, then **Service guidance and demo confirmation**. Their actions follow three logical stages:

| Stage | Actions and effect |
| --- | --- |
| Prepare | Display a fresh unique `DEMO-` example; reveal, copy, generate another, or continue. Account state is unchanged. |
| Service instructions | Explain that JU Secure cannot change the external account; give short instructions to find the service's own password settings. Account state is unchanged. |
| Confirm | Ask whether the user changed the password on the website. Only **Yes, mark as completed in this demo** dispatches `resolve-issue` and opens success. **Not yet** leaves the account unchanged. |

Preparation and step selection live in screen state. Cancelling, leaving the route, browser back, and generating/copying an example do not dispatch resolution. In-app back returns from instructions to preparation, then to the flow's origin. Completion is a user-reported fictional update, never a verified external change. There is no timer that silently completes an action.

`data/serviceGuidance.ts` supplies manual navigation hints, including provider sign-in and passkey cases. The user opens a service separately through its own app, a known website, or a saved bookmark. The app does not invent settings URLs, render fake service login screens, or request real credentials. For a real password change, the instructions explicitly require a different password from a trusted password manager, not the generated `DEMO-` value.

`data/passwords.ts` retains the educational generator: predictable 20-character examples with letters, numbers, and symbols, prefixed with `DEMO-`. A counter and exclusion list ensure fresh examples within the demonstration; this is uniqueness for the demo, not cryptographic security.

`PasswordDisplay` supports reveal/hide and copying the example. Copy success is shown only when clipboard writing succeeds; unavailable access or an error requires manual copying and does not show a false success. Transient reveal/copy feedback resets when the value changes or the screen remounts.

Success reports **Demo action completed**, displays historical before/after relationships and actual summary changes, and explains that JU Secure did not change or verify a real-service password. It offers an optional next contextual fix or Back to Vault. Missing or already-safe accounts have return actions instead of dead ends.

## Retained interactions

Add account uses fictional service/user details and defaults to a unique generated example. Selecting an existing demo value immediately shows its exact matching accounts and a unique alternative. A deliberate **Keep this password** confirmation is required to save a duplicate; changing the selection resets that confirmation.

This flow opts into `add-account.detectDemoReuse`. Matching fake values join an existing explicit group or form a collision-safe `demo-reuse-*` group. Matching safe/weak accounts become primarily reused while keeping their independent strength fields. Resolving a newly added reused account can therefore leave a weak final peer weak. Legacy addition/import does not infer reuse without the opt-in flag. Added accounts live only for the visit.

Learn retains short articles about unique passwords, 2FA, and passkeys. Automatic lock and helpful guidance switches update in-memory demo preferences with safe defaults enabled; they do not perform real locking or authentication.

## Routes and navigation

Typed hash routes support browser history and direct reloads on GitHub Pages without server rewrites. A missing hash opens Welcome. Unknown or malformed routes fall back to Vault; missing account IDs provide a return action.

| Area | Route | Behaviour |
| --- | --- | --- |
| Onboarding | `#/welcome` | Default entry; **Get started** enters the demo vault |
| Onboarding | `#/create-vault` | Informational demo entry |
| Onboarding | `#/import` | Informational entry; no file import |
| Onboarding | `#/unlock` | Informational entry; no real authentication |
| Vault | `#/vault` | Derived overview, recommendation, account list |
| Vault | `#/vault/account/:accountId` | Details, reveal/hide, copy, contextual fix |
| Vault | `#/vault/add` | Unique default, reuse guidance, deliberate Keep |
| Security | `#/security` | Derived summary, all reuse groups, weak accounts |
| Security | `#/security/reused/:accountId` | Account-specific reuse explanation and fix |
| Security | `#/security/safer/:accountId` | Prepare, service instructions, explicit confirmation |
| Security | `#/security/weak/:accountId` | Weak-password explanation and fix |
| Security | `#/security/success` | Historical demo result and optional next action |
| Learn | `#/learn` | Learning overview |
| Learn | `#/learn/:articleId` | Short learning article |
| Settings | `#/settings` | Demo preference switches |

Exactly four primary sections exist: Vault, Security, Learn, and Settings. Subscreens inherit their parent section. Onboarding routes sit outside the primary navigation. Route changes reset document scrolling, update the page title, and focus the main content for keyboard and assistive-technology users.

## Design and behaviour rationale

`styles/tokens.css` retains Emma's colours, typography, spacing, radii, and app dimensions. The flat viewport has a 390px maximum width and normal document scrolling. Fixed bottom navigation aligns with the app; end padding keeps the last account accessible. The magenta add button floats in a transparent wrapper without a phone frame, decorative outer border, or rectangular overlay.

Reusable semantic components provide worded statuses, visible focus, labelled switches, account/group visuals, and live feedback. Short descriptions are the default; expandable inline explanations preserve educational material without requiring every user to read it.

| Fogg element | Design evidence |
| --- | --- |
| Motivation | Actual accounts sharing the same password and a calm consequence explanation make the risk concrete. Success shows what one action changed. The interface does not rank accounts by presumed personal importance. |
| Ability | A prepared unique example, safe defaults, copying, regeneration, clear manual service guidance, and one explicit demo confirmation reduce technical decisions. |
| Trigger / Prompt | A service-specific fix button appears beside the detected problem; the optional next-fix action follows completion. Explanations primarily support motivation, while buttons supply the prompt. |

The internal Emma principles in `data/emmaPrinciples.ts` remain design guidance rather than application screens. The reported user-testing findings inform these design choices; no quantitative research results or claims of a new evaluation are introduced.

## Validation and publication

Use Node **24.19.0** and frozen installation via `npm ci`. `npm test` validates reducer/domain invariants and manual service guidance; `npm run build` checks TypeScript and creates the production output. `npm run test:e2e` uses Playwright **1.58.2** to exercise the browser flows and responsive layouts. In the cloud, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`; elsewhere install the Playwright Chromium browser first.

Required interaction checks include unchanged state before explicit confirmation, cancellation/navigation without resolution, accurate multi-member and two-member normalization, retained weak strength, clipboard failure without false success, all group members selectable, and reset after reload. Manual visual checks cover keyboard access, mobile widths, desktop centering, bottom-navigation clearance, and no horizontal overflow.

Vite uses `/ju-secure-final/`. The GitHub Actions Pages workflow runs unit tests and Playwright browser tests before building on `main`, uploads `dist`, and deploys with Pages/OIDC permissions. It installs Chromium using `npx playwright install --with-deps chromium`. Repository Pages source must be **GitHub Actions**. The intended URL is `https://axerob.github.io/ju-secure-final/`; a successful workflow and a live-site check are required before claiming publication. Local build success alone does not establish deployment.
