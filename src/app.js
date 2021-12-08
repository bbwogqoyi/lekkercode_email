const { Database, aql } = require("arangojs");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const express = require('express')
const app = express()
const port = 5001

// enable requests of content-type(s) - application/json | application/x-www-form-urlencoded
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

const db = new Database({
  url: "http://grahslagg.com:8529/",
  databaseName: "lekkercode_email",
  auth: { username: "lekkercode", password: "lekkercode" },
});

app.get('/', (req, res) => {
  res.json({message:'Supp!'})
})

/***
 *  http://localhost:5001/signup
 *  { "email": "bonani@grahslagg.com", "password": "11AAbb!@" }
 * 
 */
app.post('/signup', (req, res) => {
  const account = {
    _key: req.body.email,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8)
  };

  const mailbox = db.collection('Mailbox');
  mailbox.save(account).then(
    meta => {
      console.log('Document saved:', meta._rev);
      res.json(meta);
    },
    err => console.error('Failed to save document:', err)
  )
})

/***
 *  http://localhost:5001/signin
 *  request: { "email": "bonani@grahslagg.com", "password": "11AAbb!@" }
 *  response: { "mailbox": "bonani@grahslagg.com", "accessToken": "XXX.XXXXX.XXXXX" }
 *  
 */
app.post('/signin', async (req, res) => {
  const _key =  req.body.email;
 
  const mailbox = await db.collection('Mailbox').document(_key, {graceful: true});
  if(mailbox) {
    //comparing passwords
    const passwordIsValid = bcrypt.compareSync(
      req.body.password, mailbox.password
    );
     
    if (!passwordIsValid) {
      return res.status(401).send({ message: "Invalid Email or Password!" });
    }

    //signing token with user id
    var token = jwt.sign(
      { _key: mailbox._key }, 
      `Pi%VQoeBCwy2K2bZFtJQ^TeVyCsGPr9y@3RA8cqVedPXMG#arEi$y2R^3!JFoFfb`, //app_api_secret
      { expiresIn: 86400 }
    );

    res.status(200).json({
      mailbox: mailbox.email,
      accessToken: token
    });
  } else {
    console.error("Could not find document");
  }
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})