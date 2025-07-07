const fetch = require('node-fetch');

async function testActivityEndpoint() {
  try {
    console.log('Testing activity endpoint with mock data...');
    
    // Test the GET endpoint (this will fail without proper auth, but shows the structure)
    const response = await fetch('http://localhost:3000/api/activity', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.status === 401) {
      console.log('✅ API is working (returns 401 without auth token as expected)');
    }
    
  } catch (error) {
    console.error('❌ Error testing activity endpoint:', error);
    console.log('Make sure the dev server is running: pnpm dev');
  }
}

testActivityEndpoint();