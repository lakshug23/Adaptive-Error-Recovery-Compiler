// Simple mock backend server for POST /compile
// Uses only Node built-in modules so no extra dependencies are required.

const http = require('http');

const PORT = 8000;

function sendJSON(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  // handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.url === '/compile' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const code = payload.code || '';

        // Very small mock logic: if "printf" in code => success, else return an error
        if (code.includes('printf')) {
          sendJSON(res, 200, {
            status: 'success',
            message: 'Mock compilation succeeded',
            tokens: [
              { type: 'keyword', value: 'int', line: 1 },
              { type: 'identifier', value: 'main', line: 1 },
            ],
            errors: [],
          });
        } else {
          sendJSON(res, 200, {
            status: 'error',
            message: 'Mock compilation failed',
            tokens: [],
            errors: [
              { type: 'SyntaxError', message: 'Missing printf call', line: 2 },
            ],
          });
        }
      } catch (err) {
        sendJSON(res, 400, { status: 'error', message: 'Invalid JSON' });
      }
    });
    return;
  }

  // default 404
  sendJSON(res, 404, { status: 'error', message: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`Mock backend server listening on http://localhost:${PORT}`);
});
