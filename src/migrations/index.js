const { Database, aql } = require("arangojs");

const db = new Database({
  url: "http://grahslagg.com:8529/",
  databaseName: "lekkercode_email",
  auth: { username: "lekkercode", password: "lekkercode" },
});


db.collection('Mailbox').create().then(
  () => console.log('Mailbox collection created'),
  err => console.error('Failed to create Mailbox collection:', err)
);

db.collection('Message').create().then(
  () => console.log('Message collection created'),
  err => console.error('Failed to create Message collection:', err)
);

db.collection('Label').create().then(
  () => console.log('Label collection created'),
  err => console.error('Failed to create Label collection:', err)
);