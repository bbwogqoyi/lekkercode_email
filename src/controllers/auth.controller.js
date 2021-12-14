const { Database, aql } = require("arangojs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const db = new Database({
  url: "http://grahslagg.com:8529/",
  databaseName: "lekkercode_email",
  auth: { username: "lekkercode", password: "lekkercode" },
});

/***
 *  http://localhost:5001/signup
 *  { "email": "bonani@grahslagg.com", "password": "11AAbb!@" }
 * 
 */
exports.signup = (req, res) => {
  const account = {
    _key: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8)
  };

  db.collection('accounts').save(account).then(
    meta => {
      console.log('Account Created:', meta);
      const defaultLabels = [
        {
          account: meta._id,
          name: 'Inbox'
        },
        {
          account: meta._id,
          name: 'Sent'
        },
        {
          account: meta._id,
          name: 'Bin'
        }
      ]
      db.collection('labels').saveAll(defaultLabels).then(
        result => {
          console.log('Default Labels saved:', result);
          res.json({ ...meta, email: account.email,
            labels : {
              ...result
          }});
        },
        err => {
          res.json({ error: err.response.body})
        }
      )
    },
    err => {
      console.log('Error(accounts):', err.response.body)
      res.json({ error: err.response.body})
    }
  )
}

/***
 *  http://localhost:5001/signin
 *  request: { "email": "bonani@grahslagg.com", "password": "11AAbb!@" }
 *  response: { "mailbox": "bonani@grahslagg.com", "accessToken": "XXX.XXXXX.XXXXX" }
 *  
 */
exports.signin =  async (req, res) => {
  const account = await db.collection('accounts').document(req.body.email, {graceful: true});

  if(account) {
    const passwordIsValid = bcrypt.compareSync(
      req.body.password, account.password
    );
     
    if (!passwordIsValid) {
      return res.status(401).send({ message: "Invalid Email or Password!" });
    }

    //signing token with user id
    var token = jwt.sign(
      { _id: account._key, email: account.email }, 
      `Pi%VQoeBCwy2K2bZFtJQ^TeVyCsGPr9y@3RA8cqVedPXMG#arEi$y2R^3!JFoFfb`, //app_api_secret
      { expiresIn: 86400 }
    );

    res.status(200).json({
      _id: account._key,
      email: account.email,
      accessToken: token
    });
  } else {
    console.error("The provided credentials do not match our records");
    res.status(404).json({error: "The provided credentials do not match our records"})
  }
}