const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { AdminClient } = require('../.test-build/auth/client');
const user = {
  id: randomUUID(),
  role: 'ADMIN',
  maskedPhone: '+91*****1234',
  onboardingStatus: 'NOT_APPLICABLE',
};
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
test('admin client rejects session credentials in browser-visible responses and non-admin users', async () => {
  const leaked = new AdminClient(
    () => '',
    async () => json({ user, csrfToken: 'fixture', refreshToken: 'must-not-be-readable' }),
  );
  await assert.rejects(() => leaked.refresh());
  const wrong = new AdminClient(
    () => '',
    async () => json({ user: { ...user, role: 'CUSTOMER' }, csrfToken: 'fixture' }),
  );
  await assert.rejects(() => wrong.refresh());
});
test('cookie refresh is serialized, carries CSRF and never sends a refresh token in JSON', async () => {
  let count = 0;
  const client = new AdminClient(
    () => 'csrf-fixture',
    async (url, options) => {
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.headers['X-CSRF-Token'], 'csrf-fixture');
      assert.equal(options.body, undefined);
      count++;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return json({ user, csrfToken: 'csrf-fixture' });
    },
  );
  const values = await Promise.all([client.refresh(), client.refresh()]);
  assert.equal(count, 1);
  assert.equal(values[0].role, 'ADMIN');
});
test('first factor is an MFA challenge and invalid second factor retains a clear error', async () => {
  const client = new AdminClient(
    () => '',
    async (url) =>
      url.endsWith('/login')
        ? json({ mfaChallengeId: randomUUID(), mfaToken: 'fixture', expiresInSeconds: 300 })
        : json({ code: 'INVALID_CHALLENGE' }, 401),
  );
  const challenge = await client.login('+919000012345', 'fixture');
  assert.equal('user' in challenge, false);
  await assert.rejects(() => client.mfa(challenge, '000000'), /authenticator code/);
});
