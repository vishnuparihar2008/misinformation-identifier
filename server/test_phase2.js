/**
 * Phase 2 Verification Script
 * Validates Express API endpoints, Zod validation, error middleware, and orchestrator.
 */

const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000/api';

async function runTests() {
  console.log('='.repeat(80));
  console.log('SACHCHECK PHASE 2 BACKEND - ENDPOINT VERIFICATION');
  console.log('='.repeat(80));

  // 1. Health check
  console.log('\n[1] Testing GET /api/health...');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    console.log(` -> Status: ${res.status}, Response:`, data);
    if (res.status === 200 && data.status === 'ok') {
      console.log(' -> PASS ✅');
    } else {
      console.error(' -> FAIL ❌');
    }
  } catch (err) {
    console.error(' -> Health check failed:', err.message);
  }

  // 2. Submit check (POST /api/checks)
  console.log('\n[2] Testing POST /api/checks (Submit message)...');
  let checkId = null;
  try {
    const res = await fetch(`${BASE_URL}/checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'WhatsApp will become chargeable from tomorrow unless you forward this message to 10 people.',
        platform: 'web',
      }),
    });
    const data = await res.json();
    console.log(` -> Status: ${res.status}, Response:`, data);
    if (res.status === 202 && data.checkId) {
      checkId = data.checkId;
      console.log(' -> PASS ✅ Check ID:', checkId);
    } else {
      console.error(' -> FAIL ❌');
    }
  } catch (err) {
    console.error(' -> Submit check failed:', err.message);
  }

  // Wait 3 seconds for async pipeline to process
  console.log('\nWaiting 3 seconds for AI pipeline analysis to finish...');
  await new Promise((r) => setTimeout(r, 3000));

  // 3. Detail check (GET /api/checks/:id)
  if (checkId) {
    console.log(`\n[3] Testing GET /api/checks/${checkId}...`);
    try {
      const res = await fetch(`${BASE_URL}/checks/${checkId}`);
      const data = await res.json();
      console.log(` -> Status: ${res.status}`);
      console.log(` -> Check Status: ${data.status}`);
      console.log(` -> Verdict: ${data.verdict} (Confidence: ${data.confidence})`);
      console.log(` -> Tactics (${(data.tactics || []).length}):`, (data.tactics || []).map((t) => t.code));
      console.log(` -> Sources (${(data.sources || []).length}):`, (data.sources || []).map((s) => s.url));
      console.log(` -> Reply Variants (${(data.replyVariants || []).length}):`, (data.replyVariants || []).map((r) => r.tone));
      if (res.status === 200 && data.verdict) {
        console.log(' -> PASS ✅');
      } else {
        console.error(' -> FAIL ❌');
      }
    } catch (err) {
      console.error(' -> Fetch check detail failed:', err.message);
    }
  }

  // 4. List checks (GET /api/checks)
  console.log('\n[4] Testing GET /api/checks...');
  try {
    const res = await fetch(`${BASE_URL}/checks?limit=5`);
    const data = await res.json();
    console.log(` -> Status: ${res.status}, Count: ${Array.isArray(data) ? data.length : 0}`);
    if (res.status === 200 && Array.isArray(data)) {
      console.log(' -> PASS ✅');
    } else {
      console.error(' -> FAIL ❌');
    }
  } catch (err) {
    console.error(' -> List checks failed:', err.message);
  }

  // 5. Test Approve (POST /api/checks/:id/approve)
  if (checkId) {
    console.log(`\n[5] Testing POST /api/checks/${checkId}/approve...`);
    try {
      const res = await fetch(`${BASE_URL}/checks/${checkId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: 'gentle',
        }),
      });
      const data = await res.json();
      console.log(` -> Status: ${res.status}, Response:`, data);
      if (res.status === 200 && data.status === 'approved') {
        console.log(' -> PASS ✅');
      } else {
        console.error(' -> FAIL ❌');
      }
    } catch (err) {
      console.error(' -> Approve check failed:', err.message);
    }
  }

  // 6. Test Zod Validation Error (POST /api/checks with empty text)
  console.log('\n[6] Testing Zod Validation Error Handling (POST /api/checks with invalid body)...');
  try {
    const res = await fetch(`${BASE_URL}/checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '', // Invalid empty text
      }),
    });
    const data = await res.json();
    console.log(` -> Status: ${res.status}, Error Response:`, data);
    if (res.status === 400 && data.error && data.error.code === 'VALIDATION_ERROR') {
      console.log(' -> PASS ✅ Properly caught by Zod and error middleware');
    } else {
      console.error(' -> FAIL ❌');
    }
  } catch (err) {
    console.error(' -> Validation test failed:', err.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2 VERIFICATION FINISHED');
  console.log('='.repeat(80));
}

runTests();

