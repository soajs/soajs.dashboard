"use strict";
var shelljs = require("shelljs");
var Docker = require('dockerode');
var utils = require("soajs/lib/utils");
var Grid = require('gridfs-stream');

function checkError(error, cb, fCb) {
	if (error) {
		return cb(error, null);
	}
	return fCb();
}

function getDockerCerts(dockerConfig, certs, gfs, db, counter, cb) {
	var gs = new gfs.mongo.GridStore(db, certs[counter]._id, 'r', {
		root: 'fs',
		w: 1,
		fsync: true
	});

	gs.open(function (error, gstore) {
		checkError(error, cb, function () {
			gstore.read(function (error, filedata) {
				checkError(error, cb, function () {
					gstore.close();
					var certKey = certs[counter].filename.split(".")[0];
					dockerConfig[certKey] = filedata;

					counter++;
					if (counter === certs.length) {
						return cb(null, dockerConfig);
					}
					else {
						getDockerCerts(dockerConfig, certs, gfs, db, counter, cb);
					}
				});
			});
		});
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
			return cb(null, docker);
		}
		else {
			var dockerConfig = {
				host: config.host,
				port: config.port
			};

			var criteria = {};
			criteria['metadata.env.' + config.envCode] = deployerConfig.selectedDriver;
			mongo.find("fs.files", criteria, function (error, certs) {
				checkError(error, cb, function () {
					if (!certs || certs.length === 0) {
						return cb({'code': 741, 'message': "No certificates for " + config.envCode + " environment exist"});
					}

					mongo.getMongoSkinDB(function (error, db) {
						checkError(error, cb, function () {
							var gfs = Grid(db, mongo.mongoSkin);
							var counter = 0;
							getDockerCerts(dockerConfig, certs, gfs, db, counter, function (error, dockerConfig) {
								checkError(error, cb, function () {
									docker = new Docker(dockerConfig);
									return cb(null, docker);
								});
							});
						});
					});
				});
			});
		}
	},

	"container": function (dockerInfo, action, cid, mongo, opts, cb) {
		lib.getDeployer(dockerInfo, mongo, function (error, deployer) {
			checkError(error, cb, function () {
				var container = deployer.getContainer(cid);
				container[action](opts || null, function (error, response) {

					checkError(error, cb, function () {
						if (action === 'start' || action === 'restart') {
							container.inspect(cb);
						}
						else return cb(null, response);
					});
				});
			});
		});
	}
};
var deployer = {
	"createContainer": function (deployerConfig, params, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			if (error) {
				return cb(error);
			}
			deployer.createContainer(params, function (err, container) {
				checkError(err, cb, function () {
					container.inspect(cb);
				});
			});
		});
	},

	"start": function (deployerConfig, cid, mongo, cb) {
		lib.container(deployerConfig, "start", cid, mongo, null, cb);
	},

	"exec": function (deployerConfig, cid, mongo, opts, cb) {
		lib.container(deployerConfig, "exec", cid, mongo, opts, cb);
	},

	"restart": function (deployerConfig, cid, mongo, cb) {
		lib.container(deployerConfig, "restart", cid, mongo, null, cb);
	},

	"remove": function (deployerConfig, cid, mongo, cb) {
		lib.container(deployerConfig, "remove", cid, mongo, {"force": true}, cb);
	},

	"info": function (deployerConfig, cid, soajs, res, mongo) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			deployer.getContainer(cid).logs({
					stderr: true,
					stdout: true,
					timestamps: false,
					tail: 200
				},
				function (error, stream) {
					if (error) {
						soajs.log.error('logStreamContainer error: ', error);
						return res.json(soajs.buildResponse({"code": 601, "msg": error.message}));
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
							var out = soajs.buildResponse(null, {'data': data});
							return res.json(out);
						});
					}
				});
		});
	},

	"copy": function(deployerConfig, cid, mongo, src, dest, cb){
		// lib.getDeployer(deployerConfig, mongo, function(error, deployer){
		// 	checkError(error, cb, function(){
		// 		var container = deployer.getContainer(cid);
		// 		container.cp({
		// 			"SRC_PATH": src,
		// 			"DEST_PATH": dest
		// 		}, function(error){
		// 			return cb(error, true);
		// 		});
		// 	});
		// });
		shelljs.exec("docker cp " + cid + ":" + src + " " + dest);
		return cb(null, true);
	}
};
module.exports = deployer;