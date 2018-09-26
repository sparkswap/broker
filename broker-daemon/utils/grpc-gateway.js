const grpcGateway = require('grpc-dynamic-gateway')
const express = require('express')
const bodyParser = require('body-parser')
const { readFileSync } = require('fs')

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const credentials = grpc.credentials.createSsl(
  readFileSync(yourca),
  readFileSync(yourkey),
  readFileSync(yourcert)
)

// load the proxy on / URL
app.use('/', grpcGateway(['api.proto'], '0.0.0.0:5051'))

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Listening on http://0.0.0.0:${port}`)
})
