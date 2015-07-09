"use strict";
var fs = require("fs");
var Docker = require('dockerode');
var utils = require("soajs/lib/utils");

var lib = {
    "getDeployer": function (deployerConfig) {
        var config = utils.cloneObj(deployerConfig);
        delete config.driver;
        var docker;
        if (config.socketPath) {
            docker = new Docker({socketPath: config.socketPath});
        }
        else {
            docker = new Docker({
                host: config.host,
                port: config.port,
                ca: fs.readFileSync(__dirname + '/../certs/ca.pem'),
                cert: fs.readFileSync(__dirname + '/../certs/cert.pem'),
                key: fs.readFileSync(__dirname + '/../certs/key.pem')
            });
        }

        return docker;
    },

    "container": function (dockerInfo, action, cid, opts, cb) {
        var deployer = lib.getDeployer(dockerInfo);
        var container = deployer.getContainer(cid);
        container[action](opts || null, function (error, response) {
            if (error) {
                return cb(error);
            }
            if (action === 'start') {
                container.inspect(cb);
            }
            else return cb(null, response);
        });
    }
};
var deployer = {
    "createContainer": function (deployerConfig, params, cb) {
        var deployer = lib.getDeployer(deployerConfig);
        deployer.createContainer(params, function (err, container) {
            if (err) {
                return cb(err);
            }
            container.inspect(cb);
        });
    },

    "start": function (deployerConfig, cid, cb) {
        lib.container(deployerConfig, "start", cid, null, cb);
    },

    "stop": function (deployerConfig, cid, cb) {
        lib.container(deployerConfig, "stop", cid, null, cb);
    },

    "remove": function (deployerConfig, cid, cb) {
        lib.container(deployerConfig, "remove", cid, {"force": true}, cb);
    },

    "info": function (deployerConfig, cid, req, res) {
        var deployer = lib.getDeployer(deployerConfig);
        deployer.getContainer(cid).logs({
                stderr: true,
                stdout: true,
                timestamps: false,
                tail: 200
            },
            function (error, stream) {
                if (error) {
                    req.soajs.log.error('logStreamContainer error: ', error);
                    return res.json(req.soajs.buildResponse({"code": 601, "msg": error.message}));
                }
                else {
                    var data = '';
                    var chunk;
                    stream.setEncoding('utf8');
                    stream.on('readable', function () {
                        var handle = this;
                        while ((chunk = handle.read()) != null) {
                            data += chunk.toString("utf8");
                        }
                    });

                    stream.on('end', function () {
                        stream.destroy();
                        var out = req.soajs.buildResponse(null, {'data': data});
                        return res.json(out);
                    });
                }
            });
    }
};
module.exports = deployer;