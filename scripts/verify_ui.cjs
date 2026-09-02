const http = require('http');

http.get('http://127.0.0.1:5173/', (res) => {
  console.log('STATUS_CODE:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('CONTENT_LENGTH:', data.length);
    console.log('CONTAINS_TITLE:', data.includes('BayShift | Container Yard Relocation Canvas'));
    console.log('CONTAINS_ROOT:', data.includes('<div id="root"></div>'));
    console.log('CONTAINS_MODULE:', data.includes('src/main.tsx'));
  });
}).on('error', (err) => {
  console.error('FETCH_ERROR:', err.message);
});
