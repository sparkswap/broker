const fs = require('fs')
const grpc = require('grpc')
const grpcProtoLoader = require('@grpc/proto-loader')

const GRPC_PROTO_OPTIONS = {
  longs: String,
  bytes: String,
  enums: String,
  defaults: true,
  oneofs: true
}

const packageDefinition = grpcProtoLoader.loadSync('/path/to/broker.proto', GRPC_PROTO_OPTIONS)
const proto = grpc.loadPackageDefinition(packageDefinition)

const tlscert = fs.readFileSync('/path/to/broker/root/key')
const channelCredentials = grpc.credentials.createSsl(tlscert)

const username = process.env.BROKER_RPC_USER
const password = process.env.BROKER_RPC_PASS

const callCredentials = grpc.credentials.createFromMetadataGenerator((_, callback) => {
  const metadata = new grpc.Metadata()
  const encodedCredentials = Buffer.from(`${username}:${password}`).toString('base64')
  metadata.set('Authorization', `Basic ${encodedCredentials}`)
  callback(null, metadata)
})

const credentials = grpc.credentials.combineChannelCredentials(channelCredentials, callCredentials)

const address = 'localhost:27492'
const adminService = new proto.broker.rpc.AdminService(address, credentials)

adminService.healthCheck({}, (err, res) => {
  if (err) return console.error(err)
  console.log(res)
})
