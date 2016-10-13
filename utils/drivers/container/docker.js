"use strict";
var fs = require("fs");
var Docker = require('dockerode');
var utils = require("soajs/lib/utils");
var Grid = require('gridfs-stream');
var fs = require('fs');
var rimraf = require('rimraf');
var async = require('async');

function checkError(error, cb, fCb) {
	if (error) {
		return cb(error, null);
	}
	return fCb();
}

function getDockerCerts(certs, gfs, db, cb) {
	var certBuffers = {};
	async.each(certs, function (oneCert, callback) {
		var gs = new gfs.mongo.GridStore(db, oneCert._id, 'r', {
			root: 'fs',
			w: 1,
			fsync: true
		});

		gs.open(function (error, gstore) {
			checkError(error, callback, function () {
				gstore.read(function (error, filedata) {
					checkError(error, callback, function () {
						gstore.close();

						var certName = oneCert.filename.split('.')[0];
						certBuffers[certName] = filedata;
						return callback(null, true);
					});
				});
			});
		});
	}, function (error, result) {
		checkError(error, cb, function () {
			return cb(null, certBuffers);
		});
	});
}

var lib = {
	"getDeployer": function (deployerConfig, mongo, cb) {
		/**
			Three options:
				- local: use socket port
				- remote: get fastest manager node and use it
				- remote and target: get deployer for target node
		*/
		var config = utils.cloneObj(deployerConfig);
		var docker;

		if (config.socketPath) {
			docker = new Docker({socketPath: config.socketPath});
			return cb(null, docker);
		}

		getClusterCertificates(config, function (error, certs) {
			checkError(error, cb, function () {

				if (config.flags && (config.flags.newNode || config.flags.targetNode)) {
					getTargetNode(config, function (error, target) {
						checkError(error, cb, function () {
							var dockerConfig = buildDockerConfig(target.host, target.port, certs);
							docker = new Docker(dockerConfig);
							return cb(null, docker);
						});
					});
				}
				else {
					return getManagerNodeDeployer(config, certs, cb);
				}
			});
		});


		function getTargetNode(config, callback) {
			if (!config.host || !config.port) {
				return callback({message: 'Missing host/port info'});
			}
			return callback(null, {host: config.host, port: config.port});
		}

		function getManagerNodeDeployer(config, certs, cb) {
			if (!config.nodes || config.nodes.length === 0) {
				return cb({message: 'No manager nodes found in this environment\'s deployer'});
			}

			mongo.find('docker', {recordType: 'node', role: 'manager'}, function (error, managerNodes) {
				checkError(error, cb, function () {
					async.detect(managerNodes, function (oneNode, callback) {
						var dockerConfig = buildDockerConfig(oneNode.ip, oneNode.dockerPort, certs);
						var docker = new Docker(dockerConfig);
						return docker.ping(function (error, response) {
							//error is insignificant in this case
							return callback(null, response);
						});
					}, function (error, fastestNodeRecord) {
						var dockerConfig = buildDockerConfig(fastestNodeRecord.ip, fastestNodeRecord.dockerPort, certs);
						var docker = new Docker(dockerConfig);
						return cb(null, docker);
					});
				});
			});
		}

		function buildDockerConfig(host, port, certs) {
			var dockerConfig = {
				host: host,
				port: port
			}

			var certKeys = Object.keys(certs);
			certKeys.forEach(function (oneCertKey) {
				dockerConfig[oneCertKey] = certs[oneCertKey];
			});

			return dockerConfig;
		}

		function getClusterCertificates(config, callback) {
			if (!config.envCode) {
				return callback({message: 'Missing environment code'});
			}

			var criteria = {};
			criteria['metadata.env.' + config.envCode.toUpperCase()] = config.selectedDriver;
			mongo.find('fs.files', criteria, function (error, certs) {
				checkError(error, callback, function () {
					if (!certs || (certs && certs.length === 0)) {
						return callback({code: 741, message: 'No certificates for ' + config.envCode + ' environment found'});
					}

					mongo.getMongoSkinDB(function (error, db) {
						checkError(error, callback, function () {
							var gfs = Grid(db, mongo.mongoSkin);
							var counter = 0;
							return getDockerCerts(certs, gfs, db, callback);
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
			checkError(error, cb, function () {
				deployer.info(function (error, nodeInfo) {
					checkError(error, cb, function () {
						deployer.swarmJoin(options, function (error) {
							checkError(error, cb, function () {
								if (options.role === 'manager') {
									var node = deployer.getNode(nodeInfo.Name);
									node.inspect(cb);
								}
								else {
									//get manager node from swarm and inspect newly added node
									delete deployerConfig.flags;
									delete deployerConfig.host;
									delete deployerConfig.port;

									lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
										checkError(error, cb, function () {
											deployer.listNodes(function (error, nodes) {
												checkError(error, cb, function () {
													for (var i = 0; i < nodes.length; i++) {
														if (nodes[i].Description.Hostname === nodeInfo.Name) {
															return cb(null, nodes[i]);
														}
													}
													return cb();
												});
											});
										});
									});
								}
							});
						});
					});
				});
			});
		});
	},

	"removeNode": function (deployerConfig, options, mongo, cb, backgroundCB) {
		/*
			- get deployer for target node
			- leave swarm
			- return success response
			- get deployer of a manager node in the swarm
			- remove node
		*/

		var targetDeployerConfig = JSON.parse(JSON.stringify(deployerConfig));
		targetDeployerConfig.host = options.ip;
		targetDeployerConfig.port = options.dockerPort;
		targetDeployerConfig.flags = { targetNode: true };
		lib.getDeployer(targetDeployerConfig, mongo, function (error, targetDeployer) {
			checkError(error, cb, function () {
				targetDeployer.swarmLeave(function (error) {
					checkError(error, cb, function () {

						//return response and remove node entry from swarm in the background
						cb(null, true);

						lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
							var node = deployer.getNode(options.id);
							setTimeout(function () {
								node.remove(backgroundCB);
							}, 20000);
						});
					});
				});
			});
		});
	},

	"updateNode": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			checkError(error, cb, function () {
				var node = deployer.getNode(options.nodeId);

				//need to inspect node in order to get its current version and pass it to update call
				node.inspect(function (error, nodeRecord) {
					checkError(error, cb, function () {
						options.version = nodeRecord.Version.Index;
						node.update(options, function (error, result) {
							checkError(error, cb, function () {
								return cb(null, true);
							});
						});
					});
				});
			});
		});
	},

	"deployHAService": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			checkError(error, cb, function () {
				deployer.createService(options, cb);
			});
		});
	},

	"scaleHAService": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			checkError(error, cb, function () {
				var service = deployer.getService(options.serviceName);
				service.inspect(function (error, serviceInfo) {
					checkError(error, cb, function () {
						//docker api does not support updating a service using its name
						service = deployer.getService(serviceInfo.ID);

						var update = serviceInfo.Spec;
						update.version = serviceInfo.Version.Index;
						update.Mode.Replicated.Replicas = options.scale;
						service.update(update, cb);
					});
				});
			});
		});
	},

	"inspectHAService": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			checkError(error, cb, function () {
				var output = {}, params = {};
				var service = deployer.getService(options.serviceName);
				service.inspect(function (error, serviceInfo) {
					checkError(error, cb, function () {
						output.service = serviceInfo;

						params.filters = { service: [options.serviceName] };
						deployer.listTasks(params, function (error, serviceTasks) {
							checkError(error, cb, function () {
								output.tasks = serviceTasks;
								return cb(null, output);
							});
						});
					});
				});
			});
		});
	},

	"inspectHATask": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			checkError(error, cb, function () {
				var serviceName = options.taskName.split('.')[0];
				var taskNumber = options.taskName.split('.')[1];
				var params = {
					filters: {
						service: [serviceName]
					}
				};

				deployer.listTasks(params, function (error, taskRecords) {
					checkError(error || taskRecords.length === 0, cb, function () {
						for (var i = 0; i < taskRecords.length; i++) {
							if (taskRecords[i].Slot == taskNumber) {
								return cb(null, taskRecords[i]);
							}
						}
						return cb();
					});
				});
			});
		});
	},

	"deleteHAService": function (deployerConfig, options, mongo, cb) {
		lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
			checkError(error, cb, function () {
				var serviceId = options.serviceName;
				var service = deployer.getService(serviceId);
				service.remove(cb);
			});
		});
	},

	"inspectContainer": function (deployerConfig, options, mongo, cb) {
		mongo.findOne('docker', {recordType: 'node', id: options.nodeId}, function (error, nodeInfo) {
			checkError(error || !nodeInfo, cb, function () {
				deployerConfig.host = nodeInfo.ip;
				deployerConfig.port = nodeInfo.dockerPort;
				deployerConfig.flags = { targetNode: true };
				lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
					checkError(error, cb, function () {
						var container = deployer.getContainer(options.containerId);
						container.inspect(cb);
					});
				});
			});
		});
	},

	"getContainerLogs": function (deployerConfig, options, mongo, soajs, res) {
		mongo.findOne('docker', {recordType: 'node', id: options.nodeId}, function (error, nodeInfo) {
			if (error || !nodeInfo) {
				error = ((error) ? error : {message: 'Node record not found'});
				soajs.log.error(error);
				return res.jsonp(soajs.buildResponse({code: 601, msg: error.message}));
			}

			deployerConfig.host = nodeInfo.ip;
			deployerConfig.port = nodeInfo.dockerPort;
			deployerConfig.flags = { targetNode: true };
			lib.getDeployer(deployerConfig, mongo, function (error, deployer) {
				if (error) {
					soajs.log.error(error);
					return res.jsonp(soajs.buildResponse({code: 601, msg: error.message}));
				}
				var container = deployer.getContainer(options.containerId);
				var logOptions = {
					stdout: true,
					stderr: true,
					tail: 400
				};

				container.logs(logOptions, function (error, logStream) {
					if (error) {
						soajs.log.error(error);
						return res.jsonp(soajs.buildResponse({code: 601, msg: error.message}));
					}

					var data = '';
					var chunk;
					logStream.setEncoding('utf8');
					logStream.on('readable', function () {
						var handle = this;
						while ((chunk = handle.read()) != null) {
							data += chunk.toString("utf8");
						}
					});

					logStream.on('end', function () {
						logStream.destroy();
						var out = soajs.buildResponse(null, {'data': data});
						return res.json(out);
					});
				});
			});
		});
	}
};

module.exports = deployer;
