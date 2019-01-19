/**
 * Sparkswap GRPC Gateway HTTP Proxy
 *
 * This loads a proto file and creates REST endpoints from it's google.api.http declarations.
 *
 * We 'forked' this library from the origin author konsumer which can be found at
 * the link below.
 *
 * @see {@link https://github.com/konsumer/grpc-dynamic-gateway}
 */

import * as grpc from 'grpc'
import * as express from 'express'
import * as colors from 'colors/safe'
import * as fs from 'fs'
import * as schema from 'protocol-buffers-schema'

/**
 * Supported HTTP methods for proto file
 * @constant
 * @type {Array}
 * @default
 */
const supportedMethods: ReadonlyArray<string> = Object.freeze([
  'get',
  'put',
  'post',
  'delete',
  'patch'
])

/**
 * Regexp to find gRPC params in url
 * @constant
 * @type {RegExp}
 * @default
 */
const paramRegex = /{(\w+)}/g

/**
 * @constant
 * @type {String}
 * @default
 */
const GRPC_API_OPTION_ID: string = '.google.api.http'

/**
 * Takes a string (from grpc proto file) and formats to camelCase
 *
 * @param {String} str
 * @returns {String} string formatted in camelCase
 */
function lowerFirstChar (str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * generate middleware to proxy to gRPC defined by proto files
 * @param  {string[]} protoFiles Filenames of protobuf-file
 * @param  {string} grpcLocation HOST:PORT of gRPC server
 * @param  {ChannelCredentials}  gRPC credential context (default: grpc.credentials.createInsecure())
 * @return {Function}            Middleware
 */
const middleware = (protoFiles, grpcLocation, credentials = grpc.credentials.createInsecure(), debug = true) => {
  const router = express.Router()
  const clients = {}
  const protos = protoFiles.map(p => grpc.load(p))

  protoFiles
    .map(p => `/${p}`)
    .map(p => schema.parse(fs.readFileSync(p)))
    .forEach((sch, si) => {
      const pkg = sch.package
      if (!sch.services) { return }

      sch.services.forEach(s => {
        const svc = s.name

        getPkg(clients, pkg, true)[svc] = new (getPkg(protos[si], pkg, false))[svc](grpcLocation, credentials)
        s.methods.forEach(m => {
          if (m.options[GRPC_API_OPTION_ID]) {
            supportedMethods.forEach(httpMethod => {
              if (m.options[GRPC_API_OPTION_ID][httpMethod]) {
                if (debug) {
                  console.log(colors.green(httpMethod.toUpperCase()), m.options[GRPC_API_OPTION_ID][httpMethod].blue)
                }

                router[httpMethod](convertUrl(m.options[GRPC_API_OPTION_ID][httpMethod]), (req, res) => {
                  const params = convertParams(req, m.options[GRPC_API_OPTION_ID][httpMethod])
                  const meta = convertHeaders(req.headers)

                  if (debug) {
                    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
                    console.log(`GATEWAY: ${colors.yellow((new Date()).toISOString())} (${ip.blue}): /${colors.blue(pkg.replace(/\./g, colors.white('.')))}.${colors.blue(svc)}/${colors.blue(m.name)}(${params})`)
                  }

                  try {
                    getPkg(clients, pkg, false)[svc][lowerFirstChar(m.name)](params, meta, (err, ans) => {
                      // TODO: PRIORITY:MEDIUM - improve error-handling
                      // TODO: PRIORITY:HIGH - double-check JSON mapping is identical to grpc-gateway
                      if (err) {
                        console.error(colors.red(`${svc}.${m.name}`), colors.red(err.message))
                        console.trace()
                        return res.status(500).json({ code: err.code, message: err.message })
                      }
                      res.json(convertBody(ans, m.options[GRPC_API_OPTION_ID].body))
                    })
                  } catch (err) {
                    console.error(colors.red(`${svc}.${m.name}: `), colors.red(err.message))
                    console.trace()
                  }
                })
              }
            })
          }
        })
      })
    })
  return router
}

const getPkg = (client, pkg, create = false) => {
  if (!((pkg || '').indexOf('.') !== -1) && client[pkg] !== undefined) {
    return client[pkg]
  }

  if (((pkg || '').indexOf('.') !== -1) && client[pkg] !== undefined) {
    return client[pkg]
  }

  const ls = pkg.split('.')
  let obj = client
  ls.forEach(function (name) {
    if (create) {
      obj[name] = obj[name] || {}
    }
    obj = obj[name]
  })
  return obj
}

/**
 * Parse express request params & query into params for grpc client
 * @param  {Request} req Express request object
 * @param  {String} url  gRPC url field (ie "/v1/hi/{name}")
 * @return {Object}      params for gRPC client
 */
const convertParams = (req, url) => {
  const gparams = getParamsList(url)
  const out = req.body

  if (req.query) {
    Object.keys(req.query).forEach((queryParam) => {
      out[queryParam] = req.query[queryParam]
    })
  }
  gparams.forEach(p => {
    if (req.params && req.params[p]) {
      out[p] = req.params[p]
    }
  })
  return out
}

/**
 * Convert gRPC URL expression into express
 * @param  {string} url gRPC URL expression
 * @return {string}     express URL expression
 */
function convertUrl (url: string): string {
  // TODO: PRIORITY:LOW - use types to generate regex for numbers & strings in params
  return url.replace(paramRegex, ':$1')
}

/**
 * Convert gRPC response to output, based on gRPC body field
 * @param  {Object} value   gRPC response object
 * @param  {string} bodyMap gRPC body field
 * @return {mixed}          mapped output for `res.send()`
 */
function convertBody (value: object, bodyMap: string = '*') {
  if (bodyMap === '*') {
    return value
  }
  return value[bodyMap]
}

/**
 * Get a list of params from a gRPC URL
 * @param  {string} url gRPC URL
 * @return {Array<string>}   Array of params
 */
function getParamsList (url: string): Array<string> {
  const out = []

  // TODO: refactor this
  let m
  while ((m = paramRegex.exec(url)) !== null) {
    if (m.index === paramRegex.lastIndex) {
      paramRegex.lastIndex++
    }
    out.push(m[1])
  }

  return out
}

/**
 * Convert http headers received from express into gRPC meta
 *
 * @param  {object} [headers={}] Headers: {name: value}
 * @return {grpc.Metadata} gRPC metadata object
 */
function convertHeaders (headers: object = {}): grpc.Metadata {
  const metadata = new grpc.Metadata()
  Object.keys(headers).forEach(h => metadata.set(h, headers[h]))
  return metadata
}

export = middleware
