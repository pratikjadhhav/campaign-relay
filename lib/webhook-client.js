const fetch = require('node-fetch');

async function sendToAppsScript(endpoint, data, secret) {
  const payload = {
    ...data,
    timestamp: new Date().toISOString(),
    secret: secret
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Apps Script webhook returned ' + response.status);
  return response.json();
}

module.exports = { sendToAppsScript };
