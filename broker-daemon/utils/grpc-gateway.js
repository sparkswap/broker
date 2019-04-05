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

const grpc = require('grpc')
const express = require('express')
require('colors')
const fs = require('fs')
const schema = require('protocol-buffers-schema')

/**
 * Supported HTTP methods for proto file
 * @constant
 * @type {Array}
 * @default
 */
const supportedMethods = Object.freeze([
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
 * Wildcard method to indicate every method is available for the whitelist
 * @type {string}
 * @constant
 */
const WILDCARD = '*'

/**
 * @constant
 * @type {string}
 * @default
 */
const GRPC_API_OPTION_ID = '.google.api.http'

/**
 * generate middleware to proxy to gRPC defined by proto files
 * @param  {Array<string>} protoFiles - Filenames of protobuf-file
 * @param  {string} grpcLocation - HOST:PORT of gRPC server
 * @param  {Object} options
 * @param  {ChannelCredentials} options.credentials - credential context (default: grpc.credentials.createInsecure())
 * @param  {boolean} [options.debug=true]
 * @param  {Array} [options.whitelist=['*']] - Whitelist of methods to include. By default, includes all methods as a wildcard.
 * @returns {Function} Middleware
 */
const middleware = (protoFiles, grpcLocation, { credentials = grpc.credentials.createInsecure(), debug = true, whitelist = [ WILDCARD ] } = {}) => {
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
              // We should limit methods to those included on the whitelist
              const permitMethod = whitelist.includes(WILDCARD) || whitelist.includes(m.options[GRPC_API_OPTION_ID][httpMethod])

              if (m.options[GRPC_API_OPTION_ID][httpMethod] && permitMethod) {
                if (debug) {
                  console.log(httpMethod.toUpperCase().green, m.options[GRPC_API_OPTION_ID][httpMethod].blue)
                }

                router[httpMethod](convertUrl(m.options[GRPC_API_OPTION_ID][httpMethod]), (req, res) => {
                  const params = convertParams(req, m.options[GRPC_API_OPTION_ID][httpMethod])
                  const meta = convertHeaders(req.headers, grpc)

                  if (debug) {
                    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
                    console.log(`GATEWAY: ${(new Date()).toISOString().yellow} (${ip.blue}): /${pkg.replace(/\./g, '.'.white).blue}.${svc.blue}/${m.name.blue}(${JSON.stringify(params)})`)
                  }

                  try {
                    // Contains all services in the provided protoFiles
                    const services = getPkg(clients, pkg, false)
                    const implementationName = m.name

                    /**
                     * gRPC request handler for expressjs
                     *
                     * @param {Error|null} err - exception if it thrown
                     * @param {Object} ans - request object from gRPC call
                     */
                    const requestHandler = (err, ans) => {
                      // TODO: PRIORITY:MEDIUM - improve error-handling
                      // TODO: PRIORITY:HIGH - double-check JSON mapping is identical to grpc-gateway
                      if (err) {
                        console.error(`${svc}.${m.name}`.red, err.message.red)
                        console.error(err)
                        return res.status(500).json({ code: err.code, message: err.message })
                      }

                      res.json(convertBody(ans, m.options[GRPC_API_OPTION_ID].body, m.options[GRPC_API_OPTION_ID][httpMethod]))
                    }

                    // gRPC call (e.g. broker.rpc.AdminService.HealthCheck)
                    services[svc][implementationName](params, meta, requestHandler)
                  } catch (err) {
                    console.error(`${svc}.${m.name}: `.red, err.message.red)
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
 * @param  {Object} req - Express request object
 * @param  {string} url  - gRPC url field (ie "/v1/hi/{name}")
 * @returns {Object}      params for gRPC client
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
 * @param {string} url - gRPC URL expression
 */
const convertUrl = (url) => (
  // TODO: PRIORITY:LOW - use types to generate regex for numbers & strings in params
  url.replace(paramRegex, ':$1')
)

/**
 * Convert gRPC response to output, based on gRPC body field
 * @param {Object} value - gRPC response object
 * @param {string} bodyMap - gRPC body field
 * @returns {Object} mapped output for `res.send()`
 */
const convertBody = (value, bodyMap) => {
  bodyMap = bodyMap || '*'
  if (bodyMap === '*') {
    return value
  } else {
    return value[bodyMap]
  }
}

/**
 * Get a list of params from a gRPC URL
 * @param {string} url - gRPC URL
 * @returns {Array<string>} Array of params
 */
const getParamsList = (url) => {
  const out = []
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
 * Convert headers into gRPC meta
 * @param  {Object} headers - Headers: {name: value}
 * @returns {meta}           grpc meta object
 */
const convertHeaders = (headers) => {
  headers = headers || {}
  const metadata = new grpc.Metadata()
  Object.keys(headers).forEach(h => { metadata.set(h, headers[h]) })
  return metadata
}

// interface
module.exports = middleware
module.exports.convertParams = convertParams
module.exports.convertUrl = convertUrl
module.exports.convertBody = convertBody
module.exports.getParamsList = getParamsList
module.exports.convertHeaders = convertHeaders
