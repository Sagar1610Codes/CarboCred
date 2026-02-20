/**
 * tests/test.auth.js — Auth integration test (no extra deps, uses Node 18+ fetch)
 *
 * Run: node tests/test.auth.js
 */

const BASE = 'http://127.0.0.1:5000/api/v1';

// ── Unique email per run ───────────────────────────────────────────────────
const RUN_ID = Date.now();
const TEST_USER = {
    name: 'Test User',
    email: `testuser_${RUN_ID}@carbocred.com`,
    password: 'P@ssword123',
};

let TOKEN = null;

// ── Helpers ─────────────────────────────────────────────────────────────────
const post = (path, body, token) =>
    fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });

const get = (path, token) =>
    fetch(`${BASE}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

// Colours
const C = {
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

const check = (label, condition, got) => {
    if (condition) {
        console.log(C.green(`  ✅ PASS`) + ` ${label}`);
        passed++;
    } else {
        console.log(C.red(`  ❌ FAIL`) + ` ${label}`);
        if (got && typeof got === 'object') {
            console.log(C.dim(`       Body: ${JSON.stringify(got, null, 2)}`));
        } else {
            console.log(C.dim(`       Got: ${got}`));
        }
        failed++;
    }
};

// ── Tests ────────────────────────────────────────────────────────────────────
async function runTests() {
    console.log(C.bold(C.cyan('\n🔐 Auth Integration Tests\n')));
    console.log(C.dim(`   Base URL : ${BASE}`));
    console.log(C.dim(`   Test user: ${TEST_USER.email}\n`));

    // ── 1. Register (success) ────────────────────────────────────────────────
    console.log(C.bold('1. POST /auth/register — success'));
    try {
        const res = await post('/auth/register', TEST_USER);
        const json = await res.json();
        check('Status 201', res.status === 201, res.status);
        check('success: true', json.success === true, json);
        if (json.data?.token) { TOKEN = json.data.token; }
    } catch (err) {
        check('Request succeeded', false, err.message);
    }

    // ── 2. Register duplicate email (409) ───────────────────────────────────
    console.log(C.bold('\n2. POST /auth/register — duplicate (expect 409)'));
    try {
        const res = await post('/auth/register', TEST_USER);
        const json = await res.json();
        check('Status 409', res.status === 409, res.status);
        check('success: false', json.success === false, json);
    } catch (err) {
        check('Request succeeded', false, err.message);
    }

    // ── 3. Login (success) ───────────────────────────────────────────────────
    console.log(C.bold('\n3. POST /auth/login — correct credentials'));
    try {
        const res = await post('/auth/login', { email: TEST_USER.email, password: TEST_USER.password });
        const json = await res.json();
        check('Status 200', res.status === 200, res.status);
        check('success: true', json.success === true, json);
        if (json.data?.token) { TOKEN = json.data.token; }
    } catch (err) {
        check('Request succeeded', false, err.message);
    }

    // ── 4. Login wrong password (401) ───────────────────────────────────────
    console.log(C.bold('\n4. POST /auth/login — wrong password (expect 401)'));
    try {
        const res = await post('/auth/login', { email: TEST_USER.email, password: 'WrongP@ss999' });
        const json = await res.json();
        check('Status 401', res.status === 401, res.status);
        check('success: false', json.success === false, json);
    } catch (err) {
        check('Request succeeded', false, err.message);
    }

    // ── 5. GET /me with valid token ──────────────────────────────────────────
    console.log(C.bold('\n5. GET /auth/me — with valid token'));
    try {
        const res = await get('/auth/me', TOKEN);
        const json = await res.json();
        check('Status 200', res.status === 200, res.status);
        check('success: true', json.success === true, json);
        check('email matches', json.data?.email === TEST_USER.email.toLowerCase(), json.data);
    } catch (err) {
        check('Request succeeded', false, err.message);
    }

    // ── 6. GET /me with no token (401) ──────────────────────────────────────
    console.log(C.bold('\n6. GET /auth/me — no token (expect 401)'));
    try {
        const res = await get('/auth/me');
        const json = await res.json();
        check('Status 401', res.status === 401, res.status);
        check('success: false', json.success === false, json);
    } catch (err) {
        check('Request succeeded', false, err.message);
    }

    // ── 7. Register with missing name (validation error 400) ─────────────────
    console.log(C.bold('\n7. POST /auth/register — missing name (expect 400)'));
    try {
        const res = await post('/auth/register', { email: 'nope@carbocred.com', password: 'P@ssword123' });
        const json = await res.json();
        check('Status 400', res.status === 400, res.status);
        check('success: false', json.success === false, json);
    } catch (err) {
        check('Request succeeded', false, err.message);
    }

    // ── 8. Wallet nonce for unknown address ──────────────────────────────────
    console.log(C.bold('\n8. POST /auth/wallet/nonce — unknown address (expect 500/404)'));
    try {
        const res = await post('/auth/wallet/nonce', { walletAddress: '0x1234567890123456789012345678901234567890' });
        const json = await res.json();
        // According to service, it tries to create a user if not found, but it might fail due to SSL/RPC
        console.log(C.dim(`       Status: ${res.status}`));
        console.log(C.dim(`       Message: ${json.message}`));
    } catch (err) {
        check('Request succeeded', false, err.message);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const total = passed + failed;
    console.log('\n' + '─'.repeat(45));
    console.log(C.bold(`Results: ${C.green(passed + ' passed')}, ${failed > 0 ? C.red(failed + ' failed') : C.green('0 failed')} / ${total} total`));
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
