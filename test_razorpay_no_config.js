const https = require('https');

const keyId = 'rzp_test_ST7f045YojoWKh';
const keySecret = 'qdlNjPLK5MP7PqZ7EvbTOAjJ';

const data = JSON.stringify({
  amount: 1000,
  currency: 'INR',
  receipt: 'test_receipt'
});

const options = {
  hostname: 'api.razorpay.com',
  port: 443,
  path: '/v1/orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
