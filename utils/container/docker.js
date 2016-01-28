"use strict";
var Docker = require('dockerode');
var utils = require("soajs/lib/utils");
var Grid = require('gridfs-stream');

function getDockerCerts (dockerConfig, certs, gfs, db, counter, cb) {
    var gs = new gfs.mongo.GridStore(db, certs[counter]._id, 'r', {
        root: 'fs',
        w: 1,
        fsync: true
    });

    gs.open(function (error, gstore) {
        if (error) {
            cb (error, null);
        } else {
            gstore.read(function (error, filedata) {
                if (error) {
                    cb (error, null);
                } else {
                    gstore.close();
                    var certKey = certs[counter].filename.split(".")[0];
                    dockerConfig[certKey] = filedata;

                    counter++;
                    if (counter === certs.length) {
                        return cb (null, dockerConfig);
                    } else {
                        getDockerCerts(dockerConfig, certs, gfs, db, counter, cb);
                    }
                }
            });
        }
    });
}

var lib = {
    "getDeployer": function (deployerConfig, mongo, cb) {
        var config = utils.cloneObj(deployerConfig);
        delete config.driver;
        config.envCode = config.envCode.toUpperCase();
        var docker;
        if (config.socketPath) {
            docker = new Docker({socketPath: config.socketPath});
        }
        else {
            var dockerConfig = {
                host: config.host,
                port: config.port
            };

            mongo.find("fs.files", {metadata: {envCode: config.envCode}}, function (error, certs) {
                if (error) {
                    return cb (error, null);
                }

                if (!certs || certs.length === 0) {
                    return cb ("No certificates for " + config.envCode + " environment exist", null);
                }

                mongo.getMongoSkinDB(function (error, db) {
                    if (error) {
                        cb (error, null);
                    } else {
                        var gfs = Grid(db, mongo.mongoSkin);
                        var counter = 0;
                        getDockerCerts(dockerConfig, certs, gfs, db, counter, function (error, dockerConfig) {
                            if (error) {
                                cb (error, null);
                            } else {
                                docker = new Docker(dockerConfig);
                                cb (null, docker);
                            }
                        });
                    }
                });
            });
        }
    },

    "container": function (dockerInfo, action, cid, mongo, opts, cb) {
        lib.getDeployer(dockerInfo, mongo, function (error, deployer) {
            if (error) {
                cb (error, null);
            } else {
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
        });
    }
};
var deployer = {
    "createContainer": function (deployerConfig, params, mongo, cb) {
        lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
            if (error) {
                cb (error);
            } else {
                deployer.createContainer(params, function (err, container) {
                    if (err) {
                        return cb(err);
                    }
                    container.inspect(cb);
                });
            }
        });
    },

    "start": function (deployerConfig, cid, mongo, cb) {
        lib.container(deployerConfig, "start", cid, mongo, null, cb);
    },

    "remove": function (deployerConfig, cid, mongo, cb) {
        lib.container(deployerConfig, "remove", cid, mongo, {"force": true}, cb);
    },

    "info": function (deployerConfig, cid, req, res, mongo) {
        lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
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
        });
    }
};
module.exports = deployer;