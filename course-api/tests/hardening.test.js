const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const store = require('../db/store');

test.beforeEach(() => store.reset());

function assertJsonError(res, status) {
  assert.equal(res.status, status);
  assert.match(res.headers['content-type'] || '', /application\/json/);
  assert.equal(typeof res.body.error, 'string');
}

// F1
test('F1: unknown route returns 404 with JSON {error}', async () => {
  assertJsonError(await request(app).get('/nope'), 404);
});

test('F1: malformed JSON body on POST /users returns 400 with JSON {error}', async () => {
  const res = await request(app)
    .post('/users')
    .set('Content-Type', 'application/json')
    .send('{"name": ');
  assertJsonError(res, 400);
});

test('F1: malformed JSON body on PUT /users/1 returns 400 with JSON {error}', async () => {
  const res = await request(app)
    .put('/users/1')
    .set('Content-Type', 'application/json')
    .send('{bad');
  assertJsonError(res, 400);
});

// F2
test('F2: POST /users with no body returns 400 JSON', async () => {
  assertJsonError(await request(app).post('/users'), 400);
});

test('F2: POST /users with text/plain body returns 400 JSON', async () => {
  const res = await request(app).post('/users').set('Content-Type', 'text/plain').send('name=a');
  assertJsonError(res, 400);
});

test('F2: PUT /users/1 with no body returns 400 JSON', async () => {
  assertJsonError(await request(app).put('/users/1'), 400);
});

test('F2: PUT /users/1 with text/plain body returns 400 JSON', async () => {
  const res = await request(app).put('/users/1').set('Content-Type', 'text/plain').send('name=a');
  assertJsonError(res, 400);
});

// F3
const badValues = {
  object: {},
  array: ['x'],
  boolean: true,
  number: 42,
  'very long string': 'a'.repeat(10000),
};
for (const [label, value] of Object.entries(badValues)) {
  test(`F3: POST /users rejects ${label} name with 400`, async () => {
    const res = await request(app).post('/users').send({ name: value, email: 'ok@example.com' });
    assertJsonError(res, 400);
  });
  test(`F3: POST /users rejects ${label} email with 400`, async () => {
    const value2 = label === 'very long string' ? `${'a'.repeat(10000)}@example.com` : value;
    const res = await request(app).post('/users').send({ name: 'Ok', email: value2 });
    assertJsonError(res, 400);
  });
}
test('F3: POST /users rejects invalid email format with 400', async () => {
  const res = await request(app).post('/users').send({ name: 'Ok', email: 'not-an-email' });
  assertJsonError(res, 400);
});

// F4
const badPut = {
  'null name': { name: null },
  'empty name': { name: '' },
  'number name': { name: 5 },
  'object name': { name: {} },
  'null email': { email: null },
  'empty email': { email: '' },
  'number email': { email: 5 },
  'array email': { email: ['a@b.co'] },
};
for (const [label, body] of Object.entries(badPut)) {
  test(`F4: PUT /users/1 rejects ${label} and leaves user unchanged`, async () => {
    const before = JSON.parse(JSON.stringify(store.getUser(1)));
    const res = await request(app).put('/users/1').send(body);
    assertJsonError(res, 400);
    assert.deepEqual(store.getUser(1), before);
  });
}

// F5 (docs/api.md does not specify bad-id behavior; 400 per task brief)
for (const id of ['0x1', '1e0', '%201%20', '1.5', '0', '-1', '+1', '01']) {
  test(`F5: GET /users/${id} is rejected with 400`, async () => {
    assertJsonError(await request(app).get(`/users/${id}`), 400);
  });
  test(`F5: PUT /users/${id} is rejected with 400 and user unchanged`, async () => {
    const before = JSON.parse(JSON.stringify(store.getUser(1)));
    const res = await request(app).put(`/users/${id}`).send({ name: 'X' });
    assertJsonError(res, 400);
    assert.deepEqual(store.getUser(1), before);
  });
}
test('F5: GET /users/1 plain integer still works', async () => {
  const res = await request(app).get('/users/1');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 1);
});

// F6 (docs/api.md is silent on duplicates; asserting 409 per task brief)
test('F6: POST /users with duplicate email returns 409', async () => {
  const res = await request(app).post('/users').send({ name: 'Dup', email: 'ada@example.com' });
  assertJsonError(res, 409);
});
test('F6: PUT /users/2 to another user\'s email returns 409', async () => {
  const res = await request(app).put('/users/2').send({ email: 'ada@example.com' });
  assertJsonError(res, 409);
  assert.equal(store.getUser(2).email, 'alan@example.com');
});

// F7
test('F7: mutating listUsers() result does not affect the store', () => {
  const list = store.listUsers();
  list.push({ id: 99, name: 'Evil', email: 'e@e.co' });
  list[0].name = 'Hacked';
  assert.equal(store.listUsers().length, 2);
  assert.equal(store.listUsers()[0].name, 'Ada Lovelace');
});
test('F7: mutating getUser() result does not affect the store', () => {
  const u = store.getUser(1);
  u.name = 'Hacked';
  assert.equal(store.getUser(1).name, 'Ada Lovelace');
});

// F8
test('F8: X-Powered-By header is absent', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.headers['x-powered-by'], undefined);
});
test('F8: oversized body (over 10kb) returns 413 with JSON {error}', async () => {
  const res = await request(app)
    .post('/users')
    .send({ name: 'a'.repeat(20 * 1024), email: 'big@example.com' });
  assertJsonError(res, 413);
});

// F9
test('F9: PORT validation and listen error handling', { skip: 'server.js only listens under require.main === module and exports only the app; testing PORT validation/listen errors would require spawning a process and binding a real port' }, () => {});
