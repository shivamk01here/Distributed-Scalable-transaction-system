async function testIdempotency() {
  const url = 'http://localhost:3000/pay';
  const headers = {
    'Content-Type': 'application/json',
    'x-idempotency-key': 'node-test-key-001' // Our unique checkout session
  };
  const body = JSON.stringify({ userId: 'shivam-123', amount: 100.00 });

  console.log('🚀 Sending First Request...');
  const res1 = await fetch(url, { method: 'POST', headers, body });
  console.log(`📥 Response 1: ${res1.status} -`, await res1.json());

  console.log('\n🚀 Sending Second Request (Duplicate)...');
  const res2 = await fetch(url, { method: 'POST', headers, body });
  console.log(`📥 Response 2: ${res2.status} -`, await res2.json());
}

testIdempotency().catch(console.error);