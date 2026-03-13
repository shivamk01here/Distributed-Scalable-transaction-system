async function testThrottling() {
  const url = 'http://localhost:3000/transactions/shivam-123';
  
  console.log('🚀 Sending 10 rapid requests to test rate limiting (Limit: 5 per 10s)...');

  for (let i = 1; i <= 10; i++) {
    const res = await fetch(url);
    console.log(`📡 Request ${i}: Status ${res.status}`);
    if (res.status === 429) {
      const data = await res.json();
      console.log(`   🛑 Blocked: ${data.error}`);
    }
  }
}

testThrottling().catch(console.error);
