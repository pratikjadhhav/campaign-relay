const { sendToAppsScript } = require('../lib/webhook-client');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }
    const providedSecret = event.headers['x-webhook-secret'] || body.secret;
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (!expectedSecret) return { statusCode: 500, body: JSON.stringify({ error: 'WEBHOOK_SECRET not configured on server' }) };
    if (!providedSecret || providedSecret !== expectedSecret) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    const { eventType, eventData } = body;
    if (!eventType || typeof eventType !== 'string') return { statusCode: 400, body: JSON.stringify({ error: 'eventType is required' }) };
    if (!eventData || typeof eventData !== 'object') return { statusCode: 400, body: JSON.stringify({ error: 'eventData is required' }) };
    const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
    if (!webhookUrl) return { statusCode: 500, body: JSON.stringify({ error: 'APPS_SCRIPT_WEBHOOK_URL not configured' }) };
    const result = await sendToAppsScript(webhookUrl, { eventType, eventData });
    return { statusCode: 200, body: JSON.stringify({ success: true, forwarded: true, result }) };
  } catch (error) {
    console.error('webhook.js error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
