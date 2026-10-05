const Imap = require('imap');

function createImapConnection(senderEmail, appPassword) {
  const config = {
    user: senderEmail,
    password: appPassword,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  };
  return new Imap(config);
}

function parseSimpleMessage(eml) {
  let text = '';
  let from = '';
  let subject = '';
  let messageId = '';
  if (typeof eml === 'string') {
    const fromMatch = eml.match(/From:.*?<([^>]+)>/i) || eml.match(/From: (.*)/i);
    from = fromMatch ? fromMatch[1] : '';
    const subjectMatch = eml.match(/Subject: (.*)/i);
    subject = subjectMatch ? subjectMatch[1] : '';
    const msgIdMatch = eml.match(/Message-ID: (.*)/i);
    messageId = msgIdMatch ? msgIdMatch[1] : '';
  }
  return { from, subject, text, messageId };
}

async function scanMailbox(senderEmail, appPassword, options = {}) {
  const { batchSize = 5, markSeen = false } = options;
  const imap = createImapConnection(senderEmail, appPassword);

  return new Promise((resolve, reject) => {
    const results = [];
    let opened = false;

    function openInbox(cb) {
      imap.openBox('INBOX', true, cb);
    }

    imap.once('ready', function() {
      openInbox(function(err, box) {
        if (err) return reject(err);
        opened = true;
        const f = imap.search(['UNSEEN', ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]], { or: true });
        f.on('error', function(err) { imap.end(); reject(err); });
        f.on('end', function() {
          if (results.length === 0) { imap.end(); return resolve(results); }
          const items = results.slice(0, batchSize);
          if (items.length === 0) { imap.end(); return resolve(results); }
          items.forEach(function(msg) {
            const f = imap.fetch(msg.attributes.uid, { bodies: ['HEADER.FIELDS (FROM SUBJECT MESSAGE-ID)', 'TEXT'], struct: true, markSeen });
            f.on('message', function(_, eml) {
              let header = '';
              let body = '';
              eml.on('header', function(h) { header += h.toString(); });
              eml.on('body', function(b) { body += b.toString(); });
              eml.once('end', function() {
                const parsed = parseSimpleMessage(header + '\n\n' + body);
                results.push({
                  uid: msg.attributes.uid,
                  from: parsed.from,
                  subject: parsed.subject,
                  text: body.replace(/Content-Type: text\/plain; charset=utf-8\r?\n/g, '').trim(),
                  html: '',
                  date: new Date(),
                  messageId: parsed.messageId
                });
              });
            });
            f.once('error', function(err) { /* skip */ });
            f.once('end', function() {
              const valid = results.filter(r => r);
              if (valid.length >= batchSize) { imap.end(); resolve(valid.slice(0, batchSize)); }
            });
          });
        });
      });
    });

    imap.once('error', reject);
    imap.connect();
  });
}

function closeConnection(imap) {
  try { imap.end(); } catch (e) {}
}

module.exports = { createImapConnection, scanMailbox, closeConnection };
