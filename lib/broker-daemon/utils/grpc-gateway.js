"use strict";
const grpc = require("grpc");
const express = require("express");
const colors = require("colors/safe");
const fs = require("fs");
const schema = require("protocol-buffers-schema");
const supportedMethods = Object.freeze([
    'get',
    'put',
    'post',
    'delete',
    'patch'
]);
const paramRegex = /{(\w+)}/g;
const GRPC_API_OPTION_ID = '.google.api.http';
function lowerFirstChar(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
}
const middleware = (protoFiles, grpcLocation, credentials = grpc.credentials.createInsecure(), debug = true) => {
    const router = express.Router();
    const clients = {};
    const protos = protoFiles.map(p => grpc.load(p));
    protoFiles
        .map(p => `/${p}`)
        .map(p => schema.parse(fs.readFileSync(p)))
        .forEach((sch, si) => {
        const pkg = sch.package;
        if (!sch.services) {
            return;
        }
        sch.services.forEach(s => {
            const svc = s.name;
            getPkg(clients, pkg, true)[svc] = new (getPkg(protos[si], pkg, false))[svc](grpcLocation, credentials);
            s.methods.forEach(m => {
                if (m.options[GRPC_API_OPTION_ID]) {
                    supportedMethods.forEach(httpMethod => {
                        if (m.options[GRPC_API_OPTION_ID][httpMethod]) {
                            if (debug) {
                                console.log(colors.green(httpMethod.toUpperCase()), colors.blue(m.options[GRPC_API_OPTION_ID][httpMethod]));
                            }
                            router[httpMethod](convertUrl(m.options[GRPC_API_OPTION_ID][httpMethod]), (req, res) => {
                                const params = convertParams(req, m.options[GRPC_API_OPTION_ID][httpMethod]);
                                const meta = convertHeaders(req.headers);
                                if (debug) {
                                    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                    console.log(`GATEWAY: ${colors.yellow((new Date()).toISOString())} (${colors.blue(ip)}): /${colors.blue(pkg.replace(/\./g, colors.white('.')))}.${colors.blue(svc)}/${colors.blue(m.name)}(${params})`);
                                }
                                try {
                                    getPkg(clients, pkg, false)[svc][lowerFirstChar(m.name)](params, meta, (err, ans) => {
                                        if (err) {
                                            console.error(colors.red(`${svc}.${m.name}`), colors.red(err.message));
                                            console.trace();
                                            return res.status(500).json({ code: err.code, message: err.message });
                                        }
                                        res.json(convertBody(ans, m.options[GRPC_API_OPTION_ID].body));
                                    });
                                }
                                catch (err) {
                                    console.error(colors.red(`${svc}.${m.name}: `), colors.red(err.message));
                                    console.trace();
                                }
                            });
                        }
                    });
                }
            });
        });
    });
    return router;
};
const getPkg = (client, pkg, create = false) => {
    if (!((pkg || '').indexOf('.') !== -1) && client[pkg] !== undefined) {
        return client[pkg];
    }
    if (((pkg || '').indexOf('.') !== -1) && client[pkg] !== undefined) {
        return client[pkg];
    }
    const ls = pkg.split('.');
    let obj = client;
    ls.forEach(function (name) {
        if (create) {
            obj[name] = obj[name] || {};
        }
        obj = obj[name];
    });
    return obj;
};
const convertParams = (req, url) => {
    const gparams = getParamsList(url);
    const out = req.body;
    if (req.query) {
        Object.keys(req.query).forEach((queryParam) => {
            out[queryParam] = req.query[queryParam];
        });
    }
    gparams.forEach(p => {
        if (req.params && req.params[p]) {
            out[p] = req.params[p];
        }
    });
    return out;
};
function convertUrl(url) {
    return url.replace(paramRegex, ':$1');
}
function convertBody(value, bodyMap = '*') {
    if (bodyMap === '*') {
        return value;
    }
    return value[bodyMap];
}
function getParamsList(url) {
    const out = [];
    let m;
    while ((m = paramRegex.exec(url)) !== null) {
        if (m.index === paramRegex.lastIndex) {
            paramRegex.lastIndex++;
        }
        out.push(m[1]);
    }
    return out;
}
function convertHeaders(headers = {}) {
    const metadata = new grpc.Metadata();
    Object.keys(headers).forEach(h => metadata.set(h, headers[h]));
    return metadata;
}
module.exports = middleware;
//# sourceMappingURL=grpc-gateway.js.map