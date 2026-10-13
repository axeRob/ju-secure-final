import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const originalGroup = ['Spotify', 'Google', 'Netflix', 'Instagram'];
const initialSummary = { total: 24, safe: 3, reused: 15, weak: 6 };
type Summary = typeof initialSummary;

const main = (page: Page) => page.getByRole('main');
const navigation = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' });
const accountCard = (page: Page, service: string) =>
  page.getByTestId('account-card').filter({ has: page.locator('.account-service', { hasText: new RegExp(`^${service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) });

async function expectCleanInterface(page: Page) {
  await expect(page.locator('.prototype-identification')).toHaveCount(0);
  await expect(page.getByText(/\bprototype\b|Sample accounts|FINAL DEMO|Demo only|Fictional accounts only|Your demo vault is safer|Demo action completed|Demo problem resolved/i)).toHaveCount(0);
  const isOverview = await page.getByTestId('account-overview-intro').count() > 0;
  await expect(page.getByText('Your accounts, all in one place.', { exact: true })).toHaveCount(isOverview ? 1 : 0);
}

async function expectAccountOverview(page: Page) {
  const tagline = page.locator('.brand-header').getByText('Your accounts, all in one place.', { exact: true });
  await expect(tagline).toBeVisible();
  expect(await tagline.evaluate(element => element.parentElement?.matches('header.brand-header'))).toBe(true);
  await expect(main(page).getByText('Your accounts, all in one place.', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('security-summary')).toBeVisible();
  await expect(main(page).getByRole('heading', { level: 1, name: 'Vault', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('account-overview-intro').getByRole('heading', { level: 1, name: 'Your accounts', exact: true })).toHaveCount(1);
  await expect(page.locator('.brand-header').getByText('JU Secure', { exact: true })).toBeVisible();
  await expectCleanInterface(page);
}

/** Checks the full click surface, including fixed navigation and overlapping controls. */
async function expectClearAction(action: Locator, scroll = false) {
  if (scroll) await action.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(action).toBeInViewport();
  await expect.poll(() => action.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const nav = document.querySelector('nav[aria-label="Main navigation"]')!.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > nav.top || bounds.left < 0 || bounds.right > window.innerWidth) return false;
    const inset = 5;
    return [
      [bounds.left + inset, bounds.top + inset],
      [bounds.right - inset, bounds.top + inset],
      [bounds.left + inset, bounds.bottom - inset],
      [bounds.right - inset, bounds.bottom - inset],
      [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2],
    ].every(([x, y]) => {
      const target = document.elementFromPoint(x, y);
      return target !== null && element.contains(target);
    });
  }), { message: 'The full action must be clickable above navigation and other controls' }).toBe(true);
}

async function openVault(page: Page) {
  await page.goto('./#/vault');
  await expectAccountOverview(page);
}

async function navigateTo(page: Page, section: 'Vault' | 'Security' | 'Learn' | 'Settings') {
  await navigation(page).getByRole('button', { name: section === 'Security' ? /^Security/ : section, exact: section !== 'Security' }).click();
  if (section === 'Vault') await expectAccountOverview(page);
  else await expect(main(page).getByRole('heading', { name: section, level: 1, exact: true })).toBeVisible();
  await expectCleanInterface(page);
}

async function expectSummary(page: Page, summary: Summary) {
  await expect(page.getByRole('group', {
    name: `${summary.total} accounts: ${summary.safe} safe, ${summary.reused} reused, ${summary.weak} weak`,
    exact: true,
  })).toBeVisible();
}

async function vaultSnapshot(page: Page) {
  await expectAccountOverview(page);
  return {
    summary: await page.locator('.summary-stats').getAttribute('aria-label'),
    accounts: await page.getByTestId('account-card').evaluateAll(cards => cards.map(card => card.getAttribute('aria-label'))),
  };
}

async function visiblePassword(page: Page) {
  await expect(page.getByRole('img', { name: /^Password: DEMO-/ })).toBeVisible();
  const value = (await page.locator('.password-value').textContent())!.trim();
  expect(value).toMatch(/^DEMO-/);
  return value;
}

async function savedPassword(page: Page, service: string) {
  await accountCard(page, service).click();
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  const password = await visiblePassword(page);
  await navigateTo(page, 'Vault');
  return password;
}

async function passwordSnapshot(page: Page) {
  const names = await page.locator('.account-service').allTextContents();
  const passwords: Record<string, string> = {};
  for (const name of names) passwords[name] = await savedPassword(page, name);
  return passwords;
}

async function expectQuickFix(page: Page, service: string) {
  await expect(page.getByRole('heading', { name: 'Safer password', level: 1, exact: true })).toBeVisible();
  await expect(page.locator('.page-subtitle')).toHaveText(`For ${service}`);
  await expect(page.getByRole('button', { name: 'Use unique password', exact: true })).toBeVisible();
  await expect(page.getByText('Generated password', { exact: true })).toBeVisible();
  await expect(page.getByTestId('password-website-guidance')).toHaveCount(0);
  await expect(page.getByTestId('password-change-confirmation')).toHaveCount(0);
  await expect(page.getByTestId('password-flow-progress')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Continue to password change|Yes, mark as completed|Not yet/ })).toHaveCount(0);
  await expect(main(page).locator('.screen-actions').getByRole('button')).toHaveText(['Use unique password', 'Generate another', 'Not now']);
  await expect(page.getByRole('button', { name: 'Use unique password', exact: true })).toHaveClass(/button-primary/);
  await expect(page.getByRole('button', { name: 'Generate another', exact: true })).toHaveClass(/button-secondary/);
  await expectCleanInterface(page);
}

async function startRecommendedFix(page: Page, service = 'Spotify') {
  await page.getByTestId('vault-recommendation').getByRole('button', { name: new RegExp(`^Fix ${service}`) }).click();
  await expectQuickFix(page, service);
}

async function startAccountFix(page: Page, service: string) {
  await accountCard(page, service).click();
  await page.getByRole('button', { name: `Fix ${service} password`, exact: true }).click();
  await expectQuickFix(page, service);
}

async function usePreparedPassword(page: Page) {
  await page.getByRole('button', { name: 'Use unique password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Password updated', level: 1, exact: true })).toBeVisible();
  await expect(page.locator('.progress-card')).toHaveCount(0);
  await expect(page.getByRole('group', { name: /accounts:.*safe.*reused.*weak/ })).toHaveCount(0);
  await expectCleanInterface(page);
}

async function expectComparison(page: Page) {
  await expect(page.getByRole('heading', { name: 'What changed', exact: true })).toBeVisible();
  await expect(page.getByText('See what changed', { exact: true })).toHaveCount(0);
  await expect(page.locator('.success-comparison-details')).toHaveCount(0);
  await expect(page.getByTestId('reuse-comparison')).toBeVisible();
  await expect(page.getByTestId('before-reuse-group').getByRole('heading', { name: 'Before', exact: true })).toBeVisible();
  await expect(page.getByTestId('after-reuse-group').getByRole('heading', { name: 'Now', exact: true })).toBeVisible();
}

test('welcome opens the account overview with one action and no registration', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Welcome', level: 1, exact: true })).toBeVisible();
  await expectCleanInterface(page);
  await expect(page.locator('input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await expectAccountOverview(page);
  await expectSummary(page, initialSummary);
  await expect(page.getByTestId('account-card')).toHaveCount(24);
  await expect(navigation(page)).toBeVisible();
});

test('reuse shows every actual member and optional explanations without delaying the fix', async ({ page }) => {
  await openVault(page);
  const recommendation = page.getByTestId('vault-recommendation');
  await expect(recommendation.getByRole('list', { name: 'Accounts sharing the same password' }).locator('li > span:last-child')).toHaveText(originalGroup);
  const disclosure = recommendation.locator('details');
  const why = disclosure.getByText('Why does this matter?', { exact: true });
  await expect(disclosure).toHaveJSProperty('open', false);
  await why.click();
  await expect(disclosure).toHaveJSProperty('open', true);
  await expect(disclosure.locator('.why-it-matters-content')).toBeVisible();
  await why.click();
  await expect(disclosure).toHaveJSProperty('open', false);
  await expect(disclosure.locator('.why-it-matters-content')).not.toBeVisible();
  await startRecommendedFix(page);
  await expectQuickFix(page, 'Spotify');
  const quickFixDetails = main(page).locator('details');
  await expect(quickFixDetails).toHaveJSProperty('open', false);
  await expect(page.getByTestId('reuse-group')).not.toBeVisible();
  await quickFixDetails.locator('summary').click();
  await expect(page.getByTestId('reuse-group')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Accounts sharing the same password' }).locator('li > span:last-child')).toHaveText(originalGroup);
});

test('the account overview and ordered password actions are clickable with an expanded result comparison', async ({ page }) => {
  await openVault(page);
  await expect(page.getByTestId('vault-recommendation')).toContainText('If one password is exposed, someone could try it on the other accounts.');
  await expect(page.getByTestId('vault-recommendation').getByRole('list', { name: 'Accounts sharing the same password' }).locator('li > span:last-child')).toHaveText(originalGroup);
  await expectClearAction(page.getByTestId('vault-recommendation').getByRole('button', { name: 'Fix Spotify password', exact: true }));
  await expectClearAction(page.getByRole('button', { name: 'Choose another account', exact: true }));
  await startRecommendedFix(page);
  for (const label of ['Copy password', 'Use unique password', 'Generate another', 'Not now']) await expectClearAction(page.getByRole('button', { name: label, exact: true }));
  const useBounds = await page.getByRole('button', { name: 'Use unique password', exact: true }).boundingBox();
  const generateBounds = await page.getByRole('button', { name: 'Generate another', exact: true }).boundingBox();
  const cancelBounds = await page.getByRole('button', { name: 'Not now', exact: true }).boundingBox();
  expect(useBounds!.y + useBounds!.height).toBeLessThanOrEqual(generateBounds!.y);
  expect(generateBounds!.y + generateBounds!.height).toBeLessThanOrEqual(cancelBounds!.y);
  const useAction = page.getByRole('button', { name: 'Use unique password', exact: true });
  const icons = useAction.locator('svg');
  await expect(icons).toHaveCount(2);
  for (const icon of await icons.all()) {
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
  }
  const leftIconBounds = await icons.first().boundingBox();
  const labelBounds = await useAction.getByText('Use unique password', { exact: true }).boundingBox();
  const arrowBounds = await icons.last().boundingBox();
  expect(leftIconBounds!.x + leftIconBounds!.width).toBeLessThanOrEqual(labelBounds!.x);
  expect(labelBounds!.x + labelBounds!.width).toBeLessThanOrEqual(arrowBounds!.x);
  expect(labelBounds!.x + labelBounds!.width / 2).toBeLessThan(useBounds!.x + useBounds!.width / 2);
  expect(arrowBounds!.x + arrowBounds!.width).toBeGreaterThanOrEqual(useBounds!.x + useBounds!.width - 32);
  await usePreparedPassword(page);
  await expectComparison(page);
  const feedbackBounds = await page.locator('.success-feedback').boundingBox();
  const comparisonBounds = await page.locator('.reuse-progress-card').boundingBox();
  const nextBounds = await page.locator('.next-account-card').boundingBox();
  expect(feedbackBounds!.y + feedbackBounds!.height).toBeLessThanOrEqual(comparisonBounds!.y);
  expect(comparisonBounds!.y + comparisonBounds!.height).toBeLessThanOrEqual(nextBounds!.y);
  const next = page.getByRole('button', { name: 'Fix Google password', exact: true });
  await expect(next).toHaveClass(/button-primary/);
  await expectClearAction(next, true);
  await expect(page.getByRole('button', { name: 'Back to vault', exact: true })).not.toHaveClass(/button-primary/);
});

test('generation, copying, cancellation, back, history and navigation preserve every account and password', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value: string) => { (window as unknown as { copiedSampleValue: string }).copiedSampleValue = value; },
    } });
  });
  await openVault(page);
  const before = await vaultSnapshot(page);
  const passwords = await passwordSnapshot(page);
  await startRecommendedFix(page);
  const first = await visiblePassword(page);
  expect(Object.values(passwords)).not.toContain(first);
  await page.getByRole('button', { name: 'Generate another', exact: true }).click();
  const second = await visiblePassword(page);
  expect(second).not.toBe(first);
  expect(Object.values(passwords)).not.toContain(second);
  await page.getByRole('button', { name: 'Copy password', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  await expect(page.locator('.password-copy-status')).toHaveText('Password copied.');
  expect(await page.evaluate(() => (window as unknown as { copiedSampleValue: string }).copiedSampleValue)).toBe(second);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  expect(await vaultSnapshot(page)).toEqual(before);
  await startRecommendedFix(page);
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  expect(await vaultSnapshot(page)).toEqual(before);
  await startRecommendedFix(page);
  await page.goBack();
  expect(await vaultSnapshot(page)).toEqual(before);
  await startRecommendedFix(page);
  await navigateTo(page, 'Learn');
  await navigateTo(page, 'Settings');
  await navigateTo(page, 'Vault');
  expect(await vaultSnapshot(page)).toEqual(before);
  expect(await passwordSnapshot(page)).toEqual(passwords);
});

test('Security preserves every shared group and lets the user choose a different account', async ({ page }) => {
  await openVault(page);
  const before = await vaultSnapshot(page);
  await navigateTo(page, 'Security');
  const groups = [
    ['Google', 'Spotify', 'Netflix', 'Instagram'],
    ['Microsoft', 'Amazon', 'Booking.com'],
    ['LinkedIn', 'Zoom', 'Notion'],
    ['Discord', 'Steam', 'Reddit'],
    ['Dropbox', 'Adobe'],
  ];
  const cards = page.locator('.reuse-issue-card');
  await expect(cards).toHaveCount(groups.length);
  for (let index = 0; index < groups.length; index += 1) {
    await expect(cards.nth(index).getByRole('list', { name: 'Accounts sharing the same password' }).locator('li > span:last-child')).toHaveText(groups[index]);
    for (const service of groups[index]) await expect(cards.nth(index).getByRole('button', { name: `Fix ${service} password`, exact: true })).toBeVisible();
    await expect(cards.nth(index).locator('details')).toHaveJSProperty('open', false);
  }
  await expect(page.locator('.weak-issue-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Fix Instagram password', exact: true }).click();
  await expectQuickFix(page, 'Instagram');
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Security', level: 1, exact: true })).toBeVisible();
  await navigateTo(page, 'Vault');
  expect(await vaultSnapshot(page)).toEqual(before);
});

test('Use unique password alone saves the displayed unique value and offers the next direct fix', async ({ page }) => {
  await openVault(page);
  const original = await savedPassword(page, 'Spotify');
  const peerOriginal = await savedPassword(page, 'Google');
  expect(original).toBe(peerOriginal);
  await startRecommendedFix(page);
  const generated = await visiblePassword(page);
  expect(generated).not.toBe(original);
  await usePreparedPassword(page);
  await expect(page.getByText('Spotify no longer shares its password with Google, Netflix, and Instagram.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Want to improve one more account?', exact: true })).toBeVisible();
  await expect(page.getByText('Google still shares a password.', { exact: true })).toBeVisible();
  await expect(page.getByText('If Spotify has a problem, the password used by the other accounts is still separate.', { exact: true })).toBeVisible();
  await expect(page.locator('.success-feedback p')).toHaveCount(2);
  await expectComparison(page);
  await expect(page.getByTestId('before-reuse-group').getByRole('listitem')).toHaveText(originalGroup);
  const after = page.getByTestId('after-reuse-group');
  await expect(after).toContainText('Spotify');
  await expect(after).toContainText('Unique');
  await expect(after).toContainText('Still sharing a password');
  await expect(after.locator('.connected-accounts').getByRole('listitem')).toHaveText(['Google', 'Netflix', 'Instagram']);
  await expect(page.locator('.next-account-card')).toContainText('Google');
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await expectSummary(page, { ...initialSummary, safe: 4, reused: 14 });
  await expect(accountCard(page, 'Spotify')).toHaveAttribute('aria-label', /, Safe$/);
  await expect(accountCard(page, 'Google')).toHaveAttribute('aria-label', /, Needs attention$/);
  expect(await savedPassword(page, 'Spotify')).toBe(generated);
  expect(await savedPassword(page, 'Google')).toBe(peerOriginal);
  await startRecommendedFix(page, 'Google');
  await expectQuickFix(page, 'Google');
});

test('fixing a two-member reuse group also clears the final member without changing its password', async ({ page }) => {
  await openVault(page);
  const adobeOriginal = await savedPassword(page, 'Adobe');
  const dropboxOriginal = await savedPassword(page, 'Dropbox');
  expect(adobeOriginal).toBe(dropboxOriginal);
  await startAccountFix(page, 'Dropbox');
  await usePreparedPassword(page);
  await expect(page.getByText('Dropbox no longer shares its password with Adobe.', { exact: true })).toBeVisible();
  await expectComparison(page);
  const after = page.getByTestId('after-reuse-group');
  await expect(after).toContainText('Adobe');
  await expect(after).toContainText('Own passwords');
  await expect(after).not.toContainText('Still sharing a password');
  await expect(after.locator('.comparison-unique')).toHaveCount(2);
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await expectSummary(page, { ...initialSummary, safe: 5, reused: 13 });
  await expect(accountCard(page, 'Dropbox')).toHaveAttribute('aria-label', /, Safe$/);
  await expect(accountCard(page, 'Adobe')).toHaveAttribute('aria-label', /, Safe$/);
  expect(await savedPassword(page, 'Adobe')).toBe(adobeOriginal);
  await expect(page.getByTestId('vault-recommendation')).toContainText('Spotify');
});

test('weak password completion changes only the selected account and needs no reuse result screen', async ({ page }) => {
  await openVault(page);
  const before = await vaultSnapshot(page);
  await startAccountFix(page, 'GitHub');
  const generated = await visiblePassword(page);
  await usePreparedPassword(page);
  await expect(page.getByTestId('reuse-comparison')).toHaveCount(0);
  await expect(page.getByText('See what changed', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'GitHub now has a stronger password.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await expectSummary(page, { ...initialSummary, safe: 4, weak: 5 });
  const after = await vaultSnapshot(page);
  expect(after.accounts.filter(label => !label?.startsWith('GitHub,'))).toEqual(before.accounts.filter(label => !label?.startsWith('GitHub,')));
  expect(await savedPassword(page, 'GitHub')).toBe(generated);
});

test('removing a two-member weak reuse relationship preserves the remaining strength issue', async ({ page }) => {
  await openVault(page);
  const githubOriginal = await savedPassword(page, 'GitHub');
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await page.getByLabel('Website or app', { exact: true }).fill('Sample Weak Copy');
  await page.getByRole('button', { name: 'Choose an existing password', exact: true }).click();
  await page.getByLabel('Choose an existing password', { exact: true }).selectOption(githubOriginal);
  await page.getByRole('button', { name: 'Keep this password', exact: true }).click();
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await startAccountFix(page, 'Sample Weak Copy');
  await usePreparedPassword(page);
  await expectComparison(page);
  await expect(page.getByTestId('before-reuse-group').getByRole('listitem')).toHaveText(['Sample Weak Copy', 'GitHub']);
  const after = page.getByTestId('after-reuse-group');
  await expect(after).toContainText('Still needs a stronger password');
  await expect(after.locator('.comparison-weak-accounts').getByRole('listitem')).toHaveText(['GitHub']);
  await expect(after.locator('.comparison-unique')).toHaveCount(1);
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 25, safe: 4 });
  expect(await savedPassword(page, 'GitHub')).toBe(githubOriginal);
  await accountCard(page, 'GitHub').click();
  await expect(page.getByTestId('reuse-group')).toHaveCount(0);
  await expect(main(page)).toContainText('easy to guess');
});

test('expanded comparisons retain the completed change snapshot when the remaining group changes later', async ({ page }) => {
  await openVault(page);
  const original = await savedPassword(page, 'Google');
  await startRecommendedFix(page);
  await usePreparedPassword(page);
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await page.getByLabel('Website or app', { exact: true }).fill('Later Shared App');
  await page.getByRole('button', { name: 'Choose an existing password', exact: true }).click();
  await page.getByLabel('Choose an existing password', { exact: true }).selectOption(original);
  await page.getByRole('button', { name: 'Keep this password', exact: true }).click();
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await navigateTo(page, 'Security');
  await expect(page.locator('.reuse-issue-card').first().getByRole('list', { name: 'Accounts sharing the same password' }).locator('li > span:last-child')).toHaveText(['Google', 'Netflix', 'Instagram', 'Later Shared App']);
  await page.evaluate(() => { window.location.hash = '/security/success'; });
  await expect(page.getByRole('heading', { name: 'Password updated', level: 1, exact: true })).toBeVisible();
  await expectComparison(page);
  await expect(page.getByTestId('before-reuse-group').getByRole('listitem')).toHaveText(originalGroup);
  await expect(page.getByTestId('after-reuse-group').locator('.connected-accounts').getByRole('listitem')).toHaveText(['Google', 'Netflix', 'Instagram']);
  await expect(page.getByTestId('reuse-comparison')).not.toContainText('Later Shared App');
});

test('Add account preserves generated defaults and exposes a fix for deliberately reused sample values', async ({ page }) => {
  await openVault(page);
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await page.getByLabel('Website or app', { exact: true }).fill('Sample Unique App');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  const generated = await visiblePassword(page);
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 25, safe: 4 });
  await expect(accountCard(page, 'Sample Unique App')).toHaveAttribute('aria-label', /, Safe$/);
  expect(await savedPassword(page, 'Sample Unique App')).toBe(generated);

  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await page.getByLabel('Website or app', { exact: true }).fill('Sample Shared App');
  await page.getByRole('button', { name: 'Choose an existing password', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Accounts using this password' }).getByRole('listitem')).toHaveText(['Google', 'Spotify', 'Netflix', 'Instagram']);
  await expect(page.getByRole('button', { name: 'Add account', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Keep this password', exact: true }).click();
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 26, safe: 4, reused: 16 });
  await startAccountFix(page, 'Sample Shared App');
  await usePreparedPassword(page);
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 26, safe: 5 });
  await expect(accountCard(page, 'Sample Shared App')).toHaveAttribute('aria-label', /, Safe$/);
  await expect(accountCard(page, 'Spotify')).toHaveAttribute('aria-label', /, Needs attention$/);
});

test('the unique alternative removes Add account reuse warnings without changing existing accounts', async ({ page }) => {
  await openVault(page);
  const before = await vaultSnapshot(page);
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await page.getByRole('button', { name: 'Choose an existing password', exact: true }).click();
  await page.locator('.reuse-warning-actions').getByRole('button', { name: 'Use a unique password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'This password is already used', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add account', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 25, safe: 4 });
  const after = await vaultSnapshot(page);
  expect(after.accounts.slice(0, 24)).toEqual(before.accounts);
  await expect(accountCard(page, 'Study App')).toHaveAttribute('aria-label', /, Safe$/);
});

test('clipboard failures report manual copy instead of claiming a successful copy', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { throw new DOMException('Clipboard permission denied', 'NotAllowedError'); },
    } });
  });
  await openVault(page);
  await startRecommendedFix(page);
  await page.getByRole('button', { name: 'Copy password', exact: true }).click();
  await expect(page.locator('.password-copy-status')).toHaveText('Copy unavailable. Select the password to copy it manually.');
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  await accountCard(page, 'Spotify').click();
  await page.getByRole('button', { name: 'Copy password', exact: true }).click();
  await expect(page.locator('.password-copy-status')).toHaveText('Copy unavailable. Show the password to copy it manually.');
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toHaveCount(0);
});

test('Learn, Settings, history and direct reloads remain usable without persistent credentials', async ({ page }) => {
  await openVault(page);
  await navigateTo(page, 'Learn');
  await page.getByRole('button', { name: 'Read about Why unique passwords matter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Why unique passwords matter', level: 1, exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Learn', level: 1, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'What is 2FA?', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is 2FA?', level: 1, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'What is 2FA?', level: 1, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Learn', exact: true }).click();
  await page.getByRole('button', { name: 'What is a passkey?', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is a passkey?', level: 1, exact: true })).toBeVisible();
  await navigateTo(page, 'Settings');
  const guidance = page.getByRole('switch', { name: 'Helpful guidance', exact: true });
  await expect(guidance).toHaveAttribute('aria-checked', 'true');
  await guidance.click();
  await expect(guidance).toHaveAttribute('aria-checked', 'false');
  await navigateTo(page, 'Vault');
  await expectSummary(page, initialSummary);
  await navigateTo(page, 'Settings');
  await expect(guidance).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(guidance).toHaveAttribute('aria-checked', 'true');
  await page.goto('./#/security/safer/spotify');
  await expectQuickFix(page, 'Spotify');
  await page.reload();
  await expectQuickFix(page, 'Spotify');
  await navigateTo(page, 'Vault');
  await expectSummary(page, initialSummary);
});

for (const width of [320, 390, 430, 1280]) {
  test(`flat centered layout and scrolling actions remain clickable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openVault(page);

    async function expectLayout() {
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
      const shell = await page.getByTestId('app-shell').boundingBox();
      expect(shell).not.toBeNull();
      expect(shell!.width).toBeCloseTo(Math.min(width, 390), 0);
      expect(shell!.x).toBeCloseTo((width - shell!.width) / 2, 0);
      await expect(page.getByTestId('app-shell')).toHaveCSS('border-radius', '0px');
      await expect(navigation(page)).toHaveCSS('position', 'fixed');
      const nav = await navigation(page).boundingBox();
      expect(nav!.y + nav!.height).toBeCloseTo(844, 0);
      expect(nav!.width).toBeCloseTo(shell!.width, 0);
      for (const label of ['Vault', 'Security', 'Learn', 'Settings']) {
        await expect(navigation(page).getByRole('button', { name: label === 'Security' ? /^Security/ : label, exact: label !== 'Security' })).toBeInViewport();
      }
      await expectCleanInterface(page);
    }

    await expectLayout();
    await expectClearAction(page.getByTestId('vault-recommendation').getByRole('button', { name: 'Fix Spotify password', exact: true }), true);
    await expectClearAction(page.getByRole('button', { name: 'Add account', exact: true }), true);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expectClearAction(page.getByTestId('account-card').last());
    await expectLayout();
    await navigateTo(page, 'Security');
    await expectLayout();
    await expectClearAction(page.getByRole('button', { name: 'Fix Adobe password', exact: true }), true);
    await expectClearAction(page.getByRole('button', { name: 'Fix Student Email password', exact: true }), true);
    await navigateTo(page, 'Vault');
    await startRecommendedFix(page);
    await expectLayout();
    await expectClearAction(page.getByRole('button', { name: 'Use unique password', exact: true }), true);
    await usePreparedPassword(page);
    await expectLayout();
    await expectComparison(page);
    await expectClearAction(page.getByRole('button', { name: 'Fix Google password', exact: true }), true);
    await expectLayout();
    await expectClearAction(page.getByRole('button', { name: 'Back to vault', exact: true }), true);
    await navigateTo(page, 'Vault');
    await page.getByRole('button', { name: 'Add account', exact: true }).click();
    await expectLayout();
    await expectClearAction(page.getByRole('button', { name: 'Add account', exact: true }), true);
    await navigateTo(page, 'Learn');
    await expectLayout();
    await navigateTo(page, 'Settings');
    await expectLayout();
  });
}
