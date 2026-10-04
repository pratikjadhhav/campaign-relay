const { verifyConnection } = require('../lib/smtp');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }
    const { senderEmail, appPassword } = body;
    if (!senderEmail || typeof senderEmail !== 'string' || senderEmail.indexOf('@') === -1) return { statusCode: 400, body: JSON.stringify({ error: 'Valid senderEmail is required' }) };
    if (!appPassword || typeof appPassword !== 'string') return { statusCode: 400, body: JSON.stringify({ error: 'appPassword is required' }) };
    const result = await verifyConnection(senderEmail, appPassword);
    return { statusCode: 200, body: JSON.stringify({ success: true, verified: true, sender: senderEmail }) };
  } catch (error) {
    console.error('verify-sender.js error:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
