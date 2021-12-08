const express = require('express')
const app = express()
const port = 5001

app.get('/', (req, res) => {
  res.json({message:'Supp!'})
})

app.listen(port, () => {
  console.log(`lekkercode listening at http://localhost:${port}`)
})