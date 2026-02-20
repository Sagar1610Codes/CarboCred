/**
 * tests/debug.register.js — Debug registration validation
 */

const BASE = 'http://127.0.0.1:5000/api/v1';

const TEST_USER = {
    name: 'Debug User',
    email: `debug_${Date.now()}@test.com`,
    password: 'Password123',
};

async function run() {
    console.log('Testing registration with:', TEST_USER);
    const res = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER),
    });

    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(json, null, 2));
}

run();
