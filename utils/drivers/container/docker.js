"use strict";
var fs = require("fs");
var Docker = require('dockerode');
var utils = require("soajs/lib/utils");
var Grid = require('gridfs-stream');
var fs = require('fs');
var rimraf = require('rimraf');

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
						return getDockerCerts(dockerConfig, certs, gfs, db, counter, cb);
					}
				});
			});
		});
	});
}

var lib = {
	"getDeployer": function (deployerConfig, mongo, cb) {
		/**
			Three options:
				- local: use socket port
				- remote: get manager node record, extract ip/port and certificates
				- remote and adding a new node: in case of adding a new node, use ip/port of new node and certificates
		*/
		var config = utils.cloneObj(deployerConfig);
		var docker;
		if (config.socketPath) {
			docker = new Docker({socketPath: config.socketPath});
			return cb(null, docker);
		}
		else {
			var dockerConfig = {};
			getTargetNode(config, function (error, target) {
				checkError(error, cb, function () {
					dockerConfig.host = target.host;
					dockerConfig.port = target.port;

					getNodeCertificates(config, dockerConfig, function (error, dockerConfig) {
						checkError(error, cb, function () {
							docker = new Docker(dockerConfig);
							return cb(null, docker);
						});
					});
				});
			});
		}

		function getTargetNode(config, callback) {
			if (config.flags && config.flags.newNode) {
				if (!config.host || !config.port) {
					return callback({message: 'Missing host/port info'});
				}
				return callback(null, {host: config.host, port: config.port});
			}
			else {
				if (!config.nodes || (config.nodes && config.nodes.length === 0)) {
					return callback({message: 'No manager nodes found in this environment\'s deployer'});
				}
				var oneManagerNode = config.nodes[0]; //any manager node can be selected
				mongo.findOne('docker', {name: oneManagerNode}, function (error, nodeRecord) {
					checkError(error, callback, function () {
						return callback(null, {host: nodeRecord.ip, port: nodeRecord.dockerPort});
					});
				});
			}
		}

		function getNodeCertificates(config, dockerConfig, callback) {
			if (!config.envCode) {
				return callback({message: 'Missing environment code'});
			}

			var criteria = {};
			criteria['metadata.env.' + config.envCode.toUpperCase()] = config.selectedDriver;
			mongo.find('fs.files', criteria, function (error, certs) {
				checkError(error, callback, function () {
					if (!certs || (certs && certs.length === 0)) {
						return callback({message: 'No certificates for ' + config.envCode + ' environment found'});
					}

					mongo.getMongoSkinDB(function (error, db) {
						checkError(error, callback, function () {
							var gfs = Grid(db, mongo.mongoSkin);
							var counter = 0;
							getDockerCerts(dockerConfig, certs, gfs, db, counter, function (error, dockerConfig) {
								checkError(error, callback, function () {
									return callback(null, dockerConfig);
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

	"addNode": function (deployerConfig, options, mongo, cb) {
		deployerConfig.flags = {
			newNode: true
		};

		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			if (error) {
				return cb(error);
			}

			deployer.info(function (error, nodeInfo) {
				if (error) {
					return cb(error);
				}

				deployer.swarmJoin(options, function (error) {
					if (error) {
						return cb(error);
					}

					if (options.role === 'manager') {
						var node = deployer.getNode(nodeInfo.Name);
						node.inspect(cb);
					}
					else {
						//get manager node from swarm and inspect newly added node
						mongo.findOne('docker', {role: 'manager'}, function (error, managerNode) {
							if (error) {
								return cb(error);
							}

							var managerConfig = {
								driver: deployerConfig.driver,
								nodes: [managerNode.name]
								envCode: deployerConfig.envCode
							};
							lib.getDeployer(managerConfig, mongo, function (error, deployer) {
								if (error) {
									return cb(error);
								}

								var node = deployer.getNode(nodeInfo.Name);
								node.inspect(cb);
							});
						});
					}
				});
			});
		});
	},

	"removeNode": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			if (error) {
				return cb(error);
			}

			deployer.swarmLeave(options, cb);
		});
	},

	"updateNodeRole": function (deployerConfig, options, mongo, cb) {

	},

	"updateNodeAvailability": function (deployerConfig, options, mongo, cb) {

	},

	"deployHAService": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			if (error) {
				return cb(error);
			}

			deployer.createService(options, cb);
		});
	},

	"scaleHAService": function (deployerConfig, options, mongo, cb) {

	},

	"deleteHAService": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			if (error) {
				return cb(error);
			}

			var serviceId = '';
			var service = deployer.getService(serviceId);
			service.remove(cb);
		});
	}
};
module.exports = deployer;
