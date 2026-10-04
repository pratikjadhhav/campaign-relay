const { createTransporter, sendEmail } = require('../lib/smtp');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }
    const { to, from, fromName, subject, bodyHtml, bodyText, campaignId, leadId, runId, draftId, senderEmail, appPassword, unsubscribeUrl } = body;
    if (!to || typeof to !== 'string' || to.indexOf('@') === -1) return { statusCode: 400, body: JSON.stringify({ error: 'Valid "to" email is required' }) };
    if (!from || typeof from !== 'string') return { statusCode: 400, body: JSON.stringify({ error: 'Valid "from" email is required' }) };
    if (!subject || typeof subject !== 'string') return { statusCode: 400, body: JSON.stringify({ error: 'Valid "subject" is required' }) };
    if (!senderEmail || !appPassword) return { statusCode: 400, body: JSON.stringify({ error: 'senderEmail and appPassword are required' }) };
    const transporter = await createTransporter(senderEmail, appPassword);
    const result = await sendEmail(transporter, { to, from, fromName, subject, bodyHtml, bodyText, campaignId, leadId, runId, draftId, unsubscribeUrl });
    return { statusCode: 200, body: JSON.stringify({ success: true, messageId: result.messageId, accepted: result.accepted, rejected: result.rejected }) };
  } catch (error) {
    console.error('send.js error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
