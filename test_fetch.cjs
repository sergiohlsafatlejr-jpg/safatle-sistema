const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: encodeURI('/api/trpc/repasse.list?batch=1&input={"0":{"json":{"tipoRelatorio":"exames","page":1,"pageSize":50},"meta":{"values":{"tipoRelatorio":["undefined"],"page":["undefined"]}}}}'),
  method: 'GET',
};

const req = http.request(options, res => {
  let chunks = '';
  res.on('data', chunk => chunks += chunk);
  res.on('end', () => console.log('Response:', chunks));
});

req.on('error', e => console.error(e));
req.end();
