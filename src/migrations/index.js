const { Database, aql } = require("arangojs");

const db = new Database({
  url: "http://grahslagg.com:8529/",
  databaseName: "lekkercode_email",
  auth: { username: "lekkercode", password: "lekkercode" },
});

// db.dropDatabase('lekkercode_email').then(
//   () => console.log('Database created'),
//   err => console.error('Failed to create database:', err)
// );

// db.createDatabase('lekkercode_email').then(
//   () => console.log('Database created'),
//   err => console.error('Failed to create database:', err)
// );

// db.collection('accounts').create().then(
//   () => console.log('accounts created'),
//   err => console.error('Failed to create accounts:', err)
// );

// db.collection('messages').create().then(
//   () => console.log('messages created'),
//   err => console.error('Failed to create messages:', err)
// );

// db.collection('labels').create().then(
//   () => console.log('labels created'),
//   err => console.error('Failed to create labels:', err)
// );

// db.createEdgeCollection('acount_mail').then(
//   () => console.log('acount_mail edge collection created'),
//   err => console.error('Failed to create acount_mail edge collection:', err)
// );

// db.createEdgeCollection('message_labels').then(
//   () => console.log('message_labels edge collection created'),
//   err => console.error('Failed to create message_labels edge collection:', err)
// );