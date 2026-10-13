import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const originalGroup = ['Spotify', 'Google', 'Netflix', 'Instagram'];
const initialSummary = { total: 24, safe: 3, reused: 15, weak: 6 };
type Summary = typeof initialSummary;

const main = (page: Page) => page.getByRole('main');
const navigation = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' });
const accountCard = (page: Page, service: string) =>
  page.getByTestId('account-card').filter({ has: page.locator('.account-service', { hasText: new RegExp(`^${service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) });

async function openVault(page: Page) {
  await page.goto('./#/vault');
  await expect(main(page).getByRole('heading', { level: 1, name: 'Vault', exact: true })).toBeVisible();
}

async function navigateTo(page: Page, section: 'Vault' | 'Security' | 'Learn' | 'Settings') {
  await navigation(page).getByRole('button', { name: section === 'Security' ? /^Security/ : section, exact: section !== 'Security' }).click();
  await expect(main(page).getByRole('heading', { name: section, level: 1, exact: true })).toBeVisible();
}

async function expectSummary(page: Page, summary: Summary) {
  await expect(page.getByRole('group', {
    name: `${summary.total} accounts: ${summary.safe} safe, ${summary.reused} reused, ${summary.weak} weak`,
    exact: true,
  })).toBeVisible();
}

async function vaultSnapshot(page: Page) {
  await expect(main(page).getByRole('heading', { name: 'Vault', level: 1, exact: true })).toBeVisible();
  return {
    summary: await page.locator('.summary-stats').getAttribute('aria-label'),
    accounts: await page.getByTestId('account-card').evaluateAll(cards => cards.map(card => card.getAttribute('aria-label'))),
  };
}

async function visiblePassword(page: Page) {
  await expect(page.getByRole('img', { name: /^Fictitious demo password: DEMO-/ })).toBeVisible();
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

async function startRecommendedFix(page: Page, service = 'Spotify') {
  await page.getByTestId('vault-recommendation').getByRole('button', { name: new RegExp(`^Fix ${service}`) }).click();
  await expect(page.getByRole('button', { name: 'Continue to password change', exact: true })).toBeVisible();
}

async function startAccountFix(page: Page, service: string) {
  await accountCard(page, service).click();
  await page.getByRole('button', { name: `Fix ${service} password`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue to password change', exact: true })).toBeVisible();
}

async function confirmChange(page: Page) {
  await page.getByRole('button', { name: 'Continue to password change', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Did you change your password on the website?', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, mark as completed in this demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo action completed', level: 1, exact: true })).toBeVisible();
}

test('welcome opens the fictional vault with one action and no registration', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Welcome', level: 1, exact: true })).toBeVisible();
  await expect(page.getByText('Final demo', { exact: true })).toBeVisible();
  await expect(page.locator('input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await expectSummary(page, initialSummary);
  await expect(page.getByTestId('account-card')).toHaveCount(24);
  await expect(navigation(page)).toBeVisible();
});

test('reuse shows every actual member and optional explanations without delaying the fix', async ({ page }) => {
  await openVault(page);
  const recommendation = page.getByTestId('vault-recommendation');
  await expect(recommendation.getByRole('list', { name: 'Accounts sharing the same demo password' }).locator('li > span:last-child')).toHaveText(originalGroup);
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
  await expect(page.getByRole('heading', { name: 'For Spotify', exact: true })).toBeVisible();
});

test('the first mobile viewport exposes the fix, copy and continue actions without navigation overlap', async ({ page }) => {
  await openVault(page);
  const navBounds = await navigation(page).boundingBox();
  const fix = page.getByTestId('vault-recommendation').getByRole('button', { name: 'Fix Spotify password', exact: true });
  await expect(fix).toBeInViewport();
  const fixBounds = await fix.boundingBox();
  const addBounds = await page.getByRole('button', { name: 'Add demo account', exact: true }).boundingBox();
  expect(fixBounds!.y + fixBounds!.height, 'the contextual fix should be fully visible above the navigation').toBeLessThanOrEqual(navBounds!.y);
  const overlapWidth = Math.max(0, Math.min(fixBounds!.x + fixBounds!.width, addBounds!.x + addBounds!.width) - Math.max(fixBounds!.x, addBounds!.x));
  const overlapHeight = Math.max(0, Math.min(fixBounds!.y + fixBounds!.height, addBounds!.y + addBounds!.height) - Math.max(fixBounds!.y, addBounds!.y));
  expect(overlapWidth * overlapHeight, 'Add account should not cover the contextual fix').toBe(0);
  await startRecommendedFix(page);
  for (const label of ['Copy password', 'Continue to password change']) {
    const button = page.getByRole('button', { name: label, exact: true });
    await expect(button).toBeInViewport();
    const bounds = await button.boundingBox();
    expect(bounds!.y + bounds!.height, `${label} should be fully visible above the fixed navigation`).toBeLessThanOrEqual(navBounds!.y);
  }
});

test('generation, copying, regeneration, back and cancelling never mark an account completed', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value: string) => { (window as unknown as { copiedDemoValue: string }).copiedDemoValue = value; },
    } });
  });
  await openVault(page);
  const before = await vaultSnapshot(page);
  const original = await savedPassword(page, 'Spotify');
  await startRecommendedFix(page);
  const first = await visiblePassword(page);
  expect(first).not.toBe(original);
  await page.getByRole('button', { name: 'Generate another', exact: true }).click();
  const second = await visiblePassword(page);
  expect(second).not.toBe(first);
  await page.getByRole('button', { name: 'Copy password', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { copiedDemoValue: string }).copiedDemoValue)).toBe(second);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  expect(await vaultSnapshot(page)).toEqual(before);
  await startRecommendedFix(page);
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  expect(await vaultSnapshot(page)).toEqual(before);
  expect(await savedPassword(page, 'Spotify')).toBe(original);
});

test('website guidance and Not yet preserve the draft and navigation leaves demo state unchanged', async ({ page }) => {
  await openVault(page);
  const before = await vaultSnapshot(page);
  await startRecommendedFix(page);
  const generated = await visiblePassword(page);
  await page.getByRole('button', { name: 'Continue to password change', exact: true }).click();
  const guidance = page.getByTestId('password-website-guidance');
  await expect(guidance).toContainText('Spotify');
  await expect(guidance).toContainText(/cannot|can’t/i);
  await expect(guidance).toContainText('Open Spotify separately');
  await expect(guidance).toContainText(/account settings/i);
  await expect(guidance).toContainText('Never use this prototype’s DEMO value.');
  await expect(guidance.locator('input')).toHaveCount(0);
  await expect(guidance.getByRole('link')).toHaveCount(0);
  await page.getByRole('button', { name: 'Not yet', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No demo changes saved.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Did you change your password on the website?', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  expect(await visiblePassword(page)).toBe(generated);
  await page.getByRole('button', { name: 'Continue to password change', exact: true }).click();
  await navigateTo(page, 'Learn');
  await navigateTo(page, 'Vault');
  expect(await vaultSnapshot(page)).toEqual(before);
  await startRecommendedFix(page);
  await page.getByRole('button', { name: 'Continue to password change', exact: true }).click();
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  expect(await vaultSnapshot(page)).toEqual(before);
});

test('only explicit confirmation saves the displayed unique password and advances the reuse recommendation', async ({ page }) => {
  await openVault(page);
  const original = await savedPassword(page, 'Spotify');
  const peerOriginal = await savedPassword(page, 'Google');
  expect(original).toBe(peerOriginal);
  await startRecommendedFix(page);
  const generated = await visiblePassword(page);
  expect(generated).not.toBe(original);
  await confirmChange(page);
  await expect(page.getByTestId('before-reuse-group').getByRole('listitem')).toHaveText(originalGroup);
  const after = page.getByTestId('after-reuse-group');
  await expect(after).toContainText('Spotify');
  await expect(after).toContainText('Unique');
  await expect(after).toContainText('Still sharing a password');
  await expect(after.locator('.connected-accounts').getByRole('listitem')).toHaveText(['Google', 'Netflix', 'Instagram']);
  await expect(page.locator('.progress-card')).toContainText('3 safe · 15 reused · 6 weak');
  await expect(page.locator('.progress-card')).toContainText('4 safe · 14 reused · 6 weak');
  await expect(page.locator('.next-account-card')).toContainText('Google');
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await expectSummary(page, { ...initialSummary, safe: 4, reused: 14 });
  await expect(accountCard(page, 'Spotify')).toHaveAttribute('aria-label', /, Safe$/);
  await expect(accountCard(page, 'Google')).toHaveAttribute('aria-label', /, Needs attention$/);
  expect(await savedPassword(page, 'Spotify')).toBe(generated);
  expect(await savedPassword(page, 'Google')).toBe(peerOriginal);
  await startRecommendedFix(page, 'Google');
  await expect(page.getByRole('heading', { name: 'For Google', exact: true })).toBeVisible();
});

test('fixing a two-member reuse group also clears the final member without changing its password', async ({ page }) => {
  await openVault(page);
  const adobeOriginal = await savedPassword(page, 'Adobe');
  const dropboxOriginal = await savedPassword(page, 'Dropbox');
  expect(adobeOriginal).toBe(dropboxOriginal);
  await startAccountFix(page, 'Dropbox');
  await confirmChange(page);
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

test('weak password completion updates only the selected demo account and preserves reuse groups', async ({ page }) => {
  await openVault(page);
  const before = await vaultSnapshot(page);
  await startAccountFix(page, 'GitHub');
  const generated = await visiblePassword(page);
  await confirmChange(page);
  await expect(page.getByTestId('reuse-comparison')).toHaveCount(0);
  await expect(main(page)).toContainText('GitHub');
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await expectSummary(page, { ...initialSummary, safe: 4, weak: 5 });
  const after = await vaultSnapshot(page);
  expect(after.accounts.filter(label => !label?.startsWith('GitHub,'))).toEqual(before.accounts.filter(label => !label?.startsWith('GitHub,')));
  expect(await savedPassword(page, 'GitHub')).toBe(generated);
});

test('Add account preserves generated defaults and exposes a fix for deliberately reused demo values', async ({ page }) => {
  await openVault(page);
  await page.getByRole('button', { name: 'Add demo account', exact: true }).click();
  await page.getByLabel('Website or app', { exact: true }).fill('Demo Unique App');
  const generated = await visiblePassword(page);
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 25, safe: 4 });
  await expect(accountCard(page, 'Demo Unique App')).toHaveAttribute('aria-label', /, Safe$/);
  expect(await savedPassword(page, 'Demo Unique App')).toBe(generated);

  await page.getByRole('button', { name: 'Add demo account', exact: true }).click();
  await page.getByLabel('Website or app', { exact: true }).fill('Demo Shared App');
  await page.getByRole('button', { name: 'I already have a password', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Accounts using this demo password' }).getByRole('listitem')).toHaveText(['Google', 'Spotify', 'Netflix', 'Instagram']);
  await expect(page.getByRole('button', { name: 'Add account', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Keep this password', exact: true }).click();
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 26, safe: 4, reused: 16 });
  await startAccountFix(page, 'Demo Shared App');
  await confirmChange(page);
  await page.getByRole('button', { name: 'Back to vault', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 26, safe: 5 });
  await expect(accountCard(page, 'Demo Shared App')).toHaveAttribute('aria-label', /, Safe$/);
  await expect(accountCard(page, 'Spotify')).toHaveAttribute('aria-label', /, Needs attention$/);
});

test('the unique alternative removes Add account reuse warnings without changing existing accounts', async ({ page }) => {
  await openVault(page);
  const before = await vaultSnapshot(page);
  await page.getByRole('button', { name: 'Add demo account', exact: true }).click();
  await page.getByRole('button', { name: 'I already have a password', exact: true }).click();
  await page.locator('.reuse-warning-actions').getByRole('button', { name: 'Use a unique password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'This password is already used', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add account', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await expectSummary(page, { ...initialSummary, total: 25, safe: 4 });
  const after = await vaultSnapshot(page);
  expect(after.accounts.slice(0, 24)).toEqual(before.accounts);
  await expect(accountCard(page, 'Demo Study App')).toHaveAttribute('aria-label', /, Safe$/);
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
  await expect(page.locator('.password-copy-status')).toHaveText('Copy unavailable. Select the demo password to copy it manually.');
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  await accountCard(page, 'Spotify').click();
  await page.getByRole('button', { name: 'Copy password', exact: true }).click();
  await expect(page.locator('.password-copy-status')).toHaveText('Copy unavailable. Show the demo password to copy it manually.');
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
  await expect(page.getByRole('button', { name: 'Continue to password change', exact: true })).toBeVisible();
  await navigateTo(page, 'Vault');
  await expectSummary(page, initialSummary);
});

for (const width of [320, 390, 430, 1280]) {
  test(`flat centered layout and fixed navigation remain usable at ${width}px`, async ({ page }) => {
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
    }

    await expectLayout();
    await page.getByTestId('account-card').last().scrollIntoViewIfNeeded();
    await expectLayout();
    await navigateTo(page, 'Security');
    await expectLayout();
    await navigateTo(page, 'Vault');
    await startRecommendedFix(page);
    await expectLayout();
    await page.getByRole('button', { name: 'Continue to password change', exact: true }).click();
    await expectLayout();
    await page.getByRole('button', { name: 'Yes, mark as completed in this demo', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Demo action completed', level: 1, exact: true })).toBeVisible();
    await expectLayout();
    await navigateTo(page, 'Vault');
    await page.getByRole('button', { name: 'Add demo account', exact: true }).click();
    await expectLayout();
    await navigateTo(page, 'Learn');
    await expectLayout();
    await navigateTo(page, 'Settings');
    await expectLayout();
  });
}
