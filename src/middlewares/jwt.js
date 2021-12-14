const jwt = require("jsonwebtoken");
const { Database, aql } = require("arangojs");

const db = new Database({
  url: "http://grahslagg.com:8529/",
  databaseName: "lekkercode_email",
  auth: { username: "lekkercode", password: "lekkercode" },
});

const verifyToken = async (req, res, next) => {
  if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {
    jwt.verify(req.headers.authorization.split(' ')[1], `Pi%VQoeBCwy2K2bZFtJQ^TeVyCsGPr9y@3RA8cqVedPXMG#arEi$y2R^3!JFoFfb`, async function (err, decode) {
      if (err) {
        req.account = undefined;
        res.status(501).json({ error: 'token not recognized'})
      } else {
        const account = await db.collection('accounts').document(decode._id, {graceful: true});
        if(account) {
          const { _id, _key, email } = account;
          req.account = { _id, _key, email };
          next();
        } else {
          res.status(500).send({ error: "invalid account details" });
        }
      }
    });
  } else {
    req.account = undefined;
    res.status(501).json({ error: 'token not recognized'})
  }
};
module.exports = verifyToken;