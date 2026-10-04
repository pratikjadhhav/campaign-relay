const nodemailer = require('nodemailer');

async function createTransporter(senderEmail, appPassword) {
  if (!senderEmail || !appPassword) throw new Error('Sender email and app password required');
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: senderEmail, pass: appPassword }
  });
}

async function sendEmail(transporter, payload) {
  const { to, from, fromName, subject, bodyHtml, bodyText, campaignId, leadId, runId, draftId, unsubscribeUrl } = payload;
  const fromAddress = fromName ? `${fromName} <${from}>` : from;
  const html = bodyHtml || bodyText || '';
  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text: bodyText,
    html,
    headers: {
      'X-Campaign-ID': campaignId || '',
      'X-Lead-ID': leadId || '',
      'X-Run-ID': runId || '',
      'X-Draft-ID': draftId || '',
      'List-Unsubscribe': unsubscribeUrl ? `<${unsubscribeUrl}>` : undefined
    }
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

async function verifyConnection(senderEmail, appPassword) {
  const transporter = await createTransporter(senderEmail, appPassword);
  await transporter.verify();
  return { verified: true, sender: senderEmail };
}

module.exports = { createTransporter, sendEmail, verifyConnection };
