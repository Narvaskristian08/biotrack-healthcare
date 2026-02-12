
// ESM script, using global fetch (Node 18+)
async function test() {
    try {
        console.log('Fetching http://localhost:5000/api/healthcenters...');
        const res = await fetch('http://localhost:5000/api/healthcenters');
        console.log('Status /:', res.status);
        const text = await res.text();
        console.log('Body /:', text);

        console.log('Fetching http://localhost:5000/api/healthcenters/ping...');
        const resPing = await fetch('http://localhost:5000/api/healthcenters/ping');
        console.log('Status /ping:', resPing.status);
        const textPing = await resPing.text();
        console.log('Body /ping:', textPing);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
