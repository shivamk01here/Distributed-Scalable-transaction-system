async function testPoisonPill() {
  const url = 'http://localhost:3000/pay';
  const res = await fetch(url, { 
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': 'poison-test-' + Date.now() 
    }, 
    // Sending text "INVALID_AMOUNT" instead of a number!
    body: JSON.stringify({ userId: 'hacker-999', amount: 'INVALID_AMOUNT' }) 
  });

  console.log(`📥 API Response: ${res.status} -`, await res.json());
}

testPoisonPill().catch(console.error);