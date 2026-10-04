const Imap = require('imap');
const { simpleParser } = require('mailparser');

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
          results.slice(0, batchSize).forEach(function(msg) {
            const f = imap.fetch(msg.attributes.uid, { bodies: '', struct: true, markSeen });
            f.on('message', function(_, eml) {
              simpleParser(eml, function(err, parsed) {
                if (err) return;
                results.push({
                  uid: msg.attributes.uid,
                  from: parsed.from?.text || '',
                  to: parsed.to?.text || '',
                  subject: parsed.subject || '',
                  text: parsed.text || '',
                  html: parsed.html || '',
                  date: parsed.date || new Date(),
                  messageId: parsed.messageId || ''
                });
              });
            });
            f.once('error', function(err) { /* skip */ });
            f.once('end', function() {
              if (results.filter(r => r).length >= batchSize) { imap.end(); resolve(results.slice(0, batchSize)); }
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
