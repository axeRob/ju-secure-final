import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_ACCOUNTS } from './demo.ts';
import { getServiceGuidance } from './serviceGuidance.ts';

test('every demo service receives manual instructions and an explicit real-account boundary', () => {
  for (const account of DEMO_ACCOUNTS) {
    const guidance = getServiceGuidance(account.serviceName);
    assert.equal(guidance.steps.length, 3);
    assert.ok(guidance.steps[0]?.includes(account.serviceName));
    assert.match(guidance.steps[0]!, /separately/);
    assert.match(guidance.steps[2]!, /different, real password/);
    assert.match(guidance.steps[2]!, /Never use .*DEMO value/);
    assert.match(guidance.signInNote, /provider/);
    assert.ok(guidance.steps.every(step => !/https?:\/\//i.test(step)), 'Do not invent external settings links');
  }
});

test('supported service hints stay specific while unknown names never become invented destinations', () => {
  assert.match(getServiceGuidance('Instagram').steps[1]!, /Accounts Center/);
  assert.match(getServiceGuidance('Google').steps[1]!, /Google Account/);
  assert.match(getServiceGuidance('GitHub').steps[1]!, /Password and authentication/);
  const unknown = getServiceGuidance('Fictional Service');
  assert.match(unknown.steps[0]!, /Open Fictional Service separately/);
  assert.match(unknown.steps[1]!, /Fictional Service’s own help/);
  assert.match(getServiceGuidance('  ').steps[0]!, /Open the service separately/);
});
