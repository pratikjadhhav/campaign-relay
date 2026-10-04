const { scanMailbox } = require('../lib/imap');
const { sendToAppsScript } = require('../lib/webhook-client');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }
    const { senderEmail, appPassword, batchSize = 5 } = body;
    if (!senderEmail || typeof senderEmail !== 'string' || senderEmail.indexOf('@') === -1) return { statusCode: 400, body: JSON.stringify({ error: 'Valid senderEmail is required' }) };
    if (!appPassword || typeof appPassword !== 'string') return { statusCode: 400, body: JSON.stringify({ error: 'appPassword is required' }) };
    const batch = Math.max(1, Math.min(20, parseInt(batchSize) || 5));
    const messages = await scanMailbox(senderEmail, appPassword, { batchSize: batch });
    const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const processed = [];
    const errors = [];
    for (const msg of messages) {
      try {
        if (webhookUrl) {
          await sendToAppsScript(webhookUrl, { eventType: 'reply', eventData: { from: msg.from, subject: msg.subject, text: msg.text, messageId: msg.messageId, senderEmail } }, webhookSecret);
        }
        processed.push({ uid: msg.uid, from: msg.from, subject: msg.subject });
      } catch (e) { errors.push({ uid: msg.uid, error: e.message }); }
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, scanned: messages.length, processed: processed.length, errors: errors.length > 0 ? errors : undefined }) };
  } catch (error) {
    console.error('imap-scan.js error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
