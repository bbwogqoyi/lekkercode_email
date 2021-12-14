const { Database, aql } = require("arangojs");
const express = require('express');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express()
const router = express.Router()
const port = 5001

// enable requests of content-type(s) - application/json | application/x-www-form-urlencoded
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

const { signup, signin } = require("./controllers/auth.controller.js");
const verifyToken = require('./middlewares/jwt.js');
const e = require("express");

const db = new Database({
  url: "http://grahslagg.com:8529/",
  databaseName: "lekkercode_email",
  auth: { username: "lekkercode", password: "lekkercode" },
});

router.post('/signup',signup)
router.post('/signin',signin)    

app.use(router);


/**
 * Labels
 */
app.post('/account/labels', verifyToken, (req, res) => {
  db.collection('labels').save({account: req.account._id, name: req.body.name}).then(
    meta => {
      console.log('Label created:', meta);
      const { _id, _key } = meta;
      res.json({ _id, _key });
    },
    err => {
      console.error('Failed:', err.response.body)
      res.status(501).json(err.response.body)
    }
  )
})

app.get('/account/labels', verifyToken, async (req, res) => {
  const cursor = await db.query(aql`
    FOR l IN labels
    FILTER l.account == ${ req.account._id}
    RETURN l
  `);

  const labels = await cursor.all();
  if(labels.length) {
    res.status(200).send(labels);
  } else res.json({message: 'No records found'})

})

app.delete('/account/labels/:id', verifyToken, async (req, res) => {
  const label = await db.collection('labels').document(req.params.id, {graceful: true});

  if(label){
    const isDefault = ['Inbox', 'Sent', 'Bin'].includes(label.name);
    if(!isDefault) {
      db.collection('labels').remove(req.params.id).then(
        meta => {
          console.log('Label removed:', meta);
          res.status(200).json(meta);
        },
        err => {
          console.error('Failed:', err.response.body)
          res.status(501).json(err.response.body)
        }
      )
    } else {
      res.status(401).json({error: `Default Label '${label.name}' can not be deleted`})
    }
  } else {
    res.status(401).json({error: 'Label does not exist'})
  }
})

/**
 * Messages
 */
const findLabel = async function(accKey, labelName) {
  const cursor = await db.query(aql`
    FOR l IN labels
    FILTER l.account == ${'accounts/'+accKey} && l.name == ${labelName}
    RETURN l
  `);
  const labels = await cursor.all();

  for(var index=0; index<labels.length; index+=1) {
    if(labels[index].name = labelName) {
      return labels[index];
    }
  }

  return null;
}

const findAllLabels = async function(accKey) {
  const cursor = await db.query(aql`
    FOR l IN labels
    FILTER l.account == ${accKey}
    RETURN l
  `);
  return await cursor.all();
}

const queueMessage = async function(label, message) {
  const messageResult = await db.collection('messages').save({ ...message, account:label.account} , {graceful:true});

  if(messageResult) {
    console.log('Message sent:', {...messageResult, ...message});

    const result = await db.collection('message_labels').save({ _from: label._id, _to: messageResult._id }, {graceful:true});
    if(result) {
      return { ...messageResult, ...message, label: { ...result }}
    } else {
      console.log('Error: \n'+JSON.stringify(err.response))
      return { error: err.response.body }
    }
  } else {
    console.error('Failed to save document:', result.response.body)
    return { error: err.response.body }
  }  
}

app.post('/account/message/send', verifyToken, async (req, res) => {
  const label = await findLabel(req.account._key, 'Sent');
  const message = {
    from: req.account._key,
    to: req.body.to,
    subject: req.body.subject, 
    body: req.body.message,
  };

  let response = {};
  response.sender = await queueMessage(label, message);
  response.undelivered = [];

  const recipients = req.body.to;
  let recipientsResponse = []
  for(var index=0; index<recipients.length; index+=1) {
    const recipientLabel = await findLabel(recipients[index], 'Inbox');
    if(recipientLabel) {
      const result = await queueMessage(recipientLabel, message);
      recipientsResponse.push(result);
    } else {
      response.undelivered.push({
        recipient: recipients[index],
        message: "Mailbox does not exist"
      })
    }
    
  }
  res.json(response);
})

app.get('/account/messages/from/:from', verifyToken, async (req, res) => {
  const cursor = await db.query(aql`
    FOR m IN messages
    FILTER m.from == ${req.params.from} && m.account == ${req.account._id}
    RETURN m
  `);

  const result = await cursor.all();
  res.status(200).json(result);
})

app.get('/account/messages/label/:key', verifyToken, async (req, res) => {
  const cursor = await db.query(aql`
    for label in labels
      for message in messages
        for l in message_labels
          filter l._from == ${"labels/"+req.params.key}
        filter l._to == message._id
      filter label._id == ${"labels/"+req.params.key}
    return {message, label}
  `);

  const result = await cursor.all();
  res.json(result)
})

app.put('/account/messages/:message_id/label/:label_id', verifyToken, async (req, res) => {
  const label = `${'labels/'+req.params.label_id}`;
  const message = `${'messages/'+req.params.message_id}`;

  db.collection('message_labels').save({ _from: label, _to: message, }).then(
    meta => {
      res.json(meta)
      console.log('Document updated:', meta._rev)
    },
    err => {
      console.error('Failed to update document:', err.response)
      res.status(401).json(err.response.body)
    }
  );
})

app.delete('/account/messages/:message_id/label/:label_id', verifyToken, async (req, res) => {
  const cursor = await db.query(aql`
    FOR m IN message_labels
    FILTER m._from == ${'labels/'+req.params.label_id} && m._to == ${'messages/'+req.params.message_id}
    RETURN m
  `);
  const result = await cursor.all();

  if(result.length) {
    db.collection('message_labels').remove(result[0]).then(
      meta => {
        res.json(meta)
        console.log('Document updated:', meta._rev)
      },
      err => {
        console.error('Failed to update document:', err.response)
        res.status(401).json(err.response.body)
      }
    );
  } else {
    res.status(404).json({ error: 'record not found matching filtering conditions'});
  }
})

app.delete('/account/messages/:id', verifyToken, async (req, res) => {
  const cursor = await db.query(aql`
    FOR m IN message_labels
    FILTER m._to == ${'messages/'+req.params.id}
    RETURN m
  `);

  const results = await cursor.all();
  db.collection('message_labels').removeAll(results).then(
    async meta => {
      const label = await findLabel(req.account._key, 'Bin');
      const bin = await db.collection('message_labels').save({_from: label._id, _to: `${'messages/'+req.params.id}`})
      res.status(200).json({
        removedLabels: {...results},
        bin: {...bin} 
      });
    },
    err => res.status(404).json({ error: err.response.body })
  )
})


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})