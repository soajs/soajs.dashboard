"use strict";
var fs = require("fs");
var K8Api = require('kubernetes-client');
var utils = require("soajs/lib/utils");
var Grid = require('gridfs-stream');
var fs = require('fs');
var rimraf = require('rimraf');
var async = require('async');
var request = require('request');

var dockerColl = 'docker';
var gridfsColl = 'fs.files';

function checkError(error, cb, fCb) {
	if (error) {
		return cb(error, null);
	}
	return fCb();
}

function getCerts(certs, gfs, db, cb) {
	var certBuffers = {};
	async.each(certs, function (oneCert, callback) {
		var gs = new gfs.mongo.GridStore(db, oneCert._id, 'r', { //TODO: update to support model injection
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
						certBuffers[oneCert.metadata.certType] = filedata;
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
	"getDeployer": function (soajs, deployerConfig, model, cb) {
		var config = utils.cloneObj(deployerConfig);
		var kubernetes = {};

		getClusterCertificates(config, function (error, certs) {
			checkError(error, cb, function () {
				getManagerNodeDeployer(config, certs, cb);
			});
		});

		function getManagerNodeDeployer(config, certs, cb) {
			if (!config.nodes || config.nodes.length === 0) {
				return cb({message: 'No manager nodes found in this environment\'s deployer'});
			}

			var opts = {
				collection: dockerColl,
				conditions: { recordType: 'node', role: 'manager' }
			};

			model.findEntries(soajs, opts, function (error, managerNodes) {
				checkError(error, cb, function () {
					async.detect(managerNodes, function (oneNode, callback) {
						var kubeConfig = buildKubeConfig(oneNode.ip, oneNode.kubePort, certs);
						kubeConfig.version = 'v1';
						var kubernetes = new K8Api.Core(kubeConfig);
						kubernetes.namespaces.pods.get({}, function (error, response) { //TODO: find better ping call
							//error is insignificant in this case
							return callback(null, response);
						});
					}, function (error, fastestNodeRecord) {
						//error is insignificant in this case
						if (!fastestNodeRecord) {
							return cb({'message': 'ERROR: unable to connect to a manager node'});
						}
						var kubeConfig = buildKubeConfig(fastestNodeRecord.ip, fastestNodeRecord.kubePort, certs);
						var kubernetes = {};
						kubeConfig.version = 'v1';
						kubernetes.core = new K8Api.Core(kubeConfig);
						kubeConfig.version = 'v1beta1';
						kubernetes.extensions = new K8Api.Extensions(kubeConfig);

						return cb(null, kubernetes);
					});
				});
			});
		}

		function buildKubeConfig(host, port, certs) {
			var kubeConfig = {
				url: 'https://' + host + ':' + port
			};

			var certKeys = Object.keys(certs);
			certKeys.forEach(function (oneCertKey) {
				kubeConfig[oneCertKey] = certs[oneCertKey];
			});

			return kubeConfig;
		}

		function getClusterCertificates(config, callback) {
			if (!config.envCode) {
				return callback({message: 'Missing environment code'});
			}

			var opts = {
				collection: gridfsColl,
				conditions: {}
			};
			opts.conditions['metadata.env.' + config.envCode.toUpperCase()] = config.selectedDriver;
			model.findEntries(soajs, opts, function (error, certs) {
				checkError(error, callback, function () {
					if (!certs || (certs && certs.length === 0)) {
						return callback({
							code: 741,
							message: 'No certificates for ' + config.envCode + ' environment found'
						});
					}

					model.getDb(soajs).getMongoDB(function (error, db) {
						checkError(error, callback, function () {
							var gfs = Grid(db, model.getDb(soajs).mongodb);
							var counter = 0;
							return getCerts(certs, gfs, db, callback);
						});
					});
				});
			});
		}
	}
};

var deployer = {

	"addNode": function (soajs, deployerConfig, options, model, cb) {
		lib.getDeployer(soajs, deployerConfig, model, function (error, deployer) {
			checkError(error, cb, function () {
				deployer.core.node.get({}, function (error, nodeList) {
					checkError(error, cb, function () {
						async.detect(nodeList.items, function (oneNode, callback) {
							for (var i = 0; i < oneNode.status.addresses.length; i++) {
								if (oneNode.status.addresses[i].type === 'LegacyHostIP') {
									return callback(oneNode.status.addresses[i].address === soajs.inputmaskData.host);
								}
							}

							return callback(false);
						}, function (targetNodeRecord) {
							if (!targetNodeRecord) {
								return cb({'message': 'ERROR: Could not find node in cluster, aborting ...'});
							}

							var nodeInfo = {
								role: targetNodeRecord.role,
								name: targetNodeRecord.name
							};

							return cb(null, targetNodeRecord, nodeInfo);
						});
					});
				});
			});
		});
	},

	"removeNode": function (soajs, deployerConfig, options, model, cb, backgroundCB) {
		lib.getDeployer(soajs, deployerConfig, model, function (error, deployer) {
			checkError(error, cb, function () {
				deployer.core.node.delete({name: options.name}, cb);
			});
		});
	},

	"updateNode": function (soajs, deployerConfig, options, model, cb) {
		//Only supports availability for now, role update not included yet
		var updateValue;
		if (options.Availability === 'active') updateValue = false;
		else if (options.Availability === 'drain') updateValue = true;

		lib.getDeployer(soajs, deployerConfig, model, function (error, deployer) {
			checkError(error, cb, function () {
				deployer.core.node.get({name: options.nodeName}, function (error, node) {
					checkError(error, cb, function () {
						node.spec.unschedulable = updateValue;
						deployer.core.nodes.put({name: options.nodeName, body: node}, cb);
					});
				});
			});
		});
	},

	"buildNodeRecord": function (soajs, deployerConfig, options, model, cb) {

		function calcMemory (memory) {
			var value = memory.substring(0, options.node.status.capacity.memory.length - 2);
			var unit = memory.substring(memory.length - 2);

			if (unit === 'Ki') value += '000';
			else if (unit === 'Mi') value += '000000';

			return parseInt(value);
		}

		function getIP (addresses) {
			var ip = '';
			for (var i = 0; i < addresses.length; i++) {
				if (addresses[i].type === 'LegacyHostIP') {
					ip = addresses[i].address;
				}
			}

			return ip;
		}

		var record = {
			recordType: 'node',
			id: options.node.metadata.uid,
			name: options.node.metadata.name,
			availability: ((!options.node.spec.unschedulable) ? 'active' : 'drained'),
			role: ((options.node.metadata.labels['kubeadm.alpha.kubernetes.io/role'] === 'master') ? 'manager' : 'worker'),
			ip: getIP (options.node.status.addresses),
			port: options.node.status.daemonEndpoints.kubeletEndpoint.Port,
			resources: {
				cpuCount: options.node.status.capacity.cpu,
				memory: calcMemory(options.node.status.capacity.memory)
			},
			tokens: options.managerNodes[0].tokens || {}
		};

		return cb(record);
	},

	"deployHAService": function (soajs, deployerConfig, options, model, cb) {
		var kubernetesServiceParams = {};
        var serviceName = options.context.dockerParams.env + '-' + options.context.dockerParams.name;
		if (options.context.origin === 'service' || options.context.origin === 'controller') {
			serviceName += '-v' + soajs.inputmaskData.version;
		}

		if (options.context.origin === 'nginx') {
			kubernetesServiceParams = {
				"apiVersion": "v1",
		        "kind": "Service",
		        "metadata": {
		            "name": serviceName + '-service',
		            "labels": {
		                "type": "soajs-service"
		            }
		        },
		        "spec": {
		            "type": "NodePort",
		            "selector": {
		                "soajs-app": serviceName
		            },
		            "ports": [
		                {
		                    "protocol": "TCP",
		                    "port": 80,
		                    "targetPort": 80,
		                    "nodePort": soajs.inputmaskData.exposedPort
		                }
		            ]
		        }
			};
		}
		else if (options.context.origin === 'controller') {
			kubernetesServiceParams = {
				"apiVersion": "v1",
				"kind": "Service",
				"metadata": {
					"name": serviceName + '-service',
					"labels": {
						"type": "soajs-service"
					}
				},
				"spec": {
					"selector": {
						"soajs-app": serviceName
					},
					"ports": [
						{
							"protocol": "TCP",
							"port": 4000,
							"targetPort": 4000
						}
					]
				}
			};
		}

        var haDeploymentParams = {
            "apiVersion": "extensions/v1beta1",
            "kind": "Deployment",
            "metadata": {
                "name": serviceName,
                "labels": {
                    "soajs.service": options.context.dockerParams.name,
                    "soajs.env": options.context.dockerParams.env
                }
            },
            "spec": {
                "replicas": soajs.inputmaskData.haCount,
                "selector": {
                    "matchLabels": {
                        "soajs-app": serviceName,
                    }
                },
                "template": {
                    "metadata": {
                        "name": serviceName,
                        "labels": {
                            "soajs-app": serviceName
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": serviceName,
                                "image": soajs.inputmaskData.imagePrefix + '/' + ((options.context.origin === 'service' || options.context.origin === 'controller') ? options.config.images.services : options.config.images.nginx),
                                "workingDir": options.config.imagesDir,
                                "command": [options.context.dockerParams.Cmd[0]],
                                "args": options.context.dockerParams.Cmd.splice(1),
                                "env": buildEnvVariables()
                            }
                        ]
                    }
                }
            }
        };

		if (process.env.SOAJS_TEST) {
			//using lightweight image and commands to optimize travis builds
			//the purpose of travis builds is to test the dashboard api, not the containers
			haDeploymentParams.spec.template.spec.containers[0].image = 'alpine:latest';
			haDeploymentParams.spec.template.spec.containers[0].command = ['sh'];
			haDeploymentParams.spec.template.spec.containers[0].args = ['-c', 'sleep 36000'];
		}

		lib.getDeployer(soajs, deployerConfig, model, function (error, deployer) {
			checkError(error, cb, function () {
				if (Object.keys(kubernetesServiceParams).length > 0) {
					deployer.core.namespaces.services.post({body: kubernetesServiceParams}, function (error) {
						checkError(error, cb, function () {
							deploy();
						});
					});
				}
				else {
					deploy();
				}


				function deploy() {
					soajs.log.debug('Deployer params: ' + JSON.stringify (haDeploymentParams));
			        deployer.extensions.namespaces.deployments.post({body: haDeploymentParams}, cb);
				}
			});
		});

		function buildEnvVariables () {
			var envs = [];
			options.context.dockerParams.variables.forEach(function (oneEnvVar) {
				envs.push({
					name: oneEnvVar.split('=')[0],
					value: oneEnvVar.split('=')[1]
				});
			});
			envs.push({ "name": "SOAJS_DEPLOY_HA", "value": "true" });
			envs.push({ "name": "SOAJS_DEPLOY_KUBE", "value": "true" });
			envs.push({
				"name": "SOAJS_KUBE_POD_IP",
				"valueFrom": {
					"fieldRef": {
						"fieldPath": "status.podIP"
					}
				}
			});
			envs.push({
				"name": "SOAJS_KUBE_POD_NAME",
				"valueFrom": {
					"fieldRef": {
						"fieldPath": "metadata.name"
					}
				}
			});

			return envs;
		}
	},

	"scaleHAService": function (soajs, deployerConfig, options, model, cb) {
		lib.getDeployer(soajs, deployerConfig, model, function (error, deployer) {
			checkError(error, cb, function () {
				deployer.extensions.namespaces.deployments.get({name: options.serviceName}, function (error, deployment) {
					checkError(error, cb, function () {
						deployment.spec.replicas = options.scale
						deployer.extensions.namespaces.deployments.put({name: options.serviceName, body: deployment}, cb);
					});
				});
			});
		});
	},

	"inspectHAService": function (soajs, deployerConfig, options, model, cb) {
		lib.getDeployer(soajs, deployerConfig, model, function (error, deployer) {
			checkError(error, cb, function () {
				var output = {};
				deployer.extensions.namespaces.deployments.get(options.serviceName, function (error, deployment) {
					checkError(error, cb, function () {
						output.service = deployment;

						deployer.core.namespaces.pods.get({qs: {labelSelector: 'soajs-app=' + options.serviceName}}, function (error, pods) {
							checkError(error, cb, function () {
								output.tasks = pods.items;
								return cb(null, output);
							});
						});
					});
				});
			});
		});
	},

	getServiceComponents: function (soajs, deployerConfig, options, model, cb) {
		deployer.inspectHAService(soajs, deployerConfig, options, model, function (error, serviceInfo) {
			checkError(error, cb, function () {
				var runningPods = [];
				serviceInfo.tasks.forEach(function (onePod) {
					if (onePod.metadata.labels['soajs-app'] === options.serviceName && onePod.status.phase === 'Running') {
	                    runningPods.push(onePod);
	                }
				});

				if (runningPods.length !== options.serviceCount) {
					setTimeout(function () {
						return deployer.getServiceComponents(soajs, deployerConfig, options, model, cb);
					}, 500);
				}
				else {
					serviceInfo.tasks = runningPods;
					return cb(null, serviceInfo);
				}
			});
		});
	},

	"inspectHATask": function (soajs, deployerConfig, options, model, cb) {
        //TODO: Remove
	},

	"deleteHAService": function (soajs, deployerConfig, options, model, cb) {
        lib.getDeployer(soajs, deployerConfig, model, function (error, deployer) {
            checkError(error, cb, function () {
				var body = {
					gracePeriodSeconds: 0
				};

				var requestOptions = {
					uri: deployer.extensions.url + deployer.extensions.path + '/namespaces/default/replicasets',
					headers: {
						'Content-Type': 'application/json',
					},
					json: true,
					ca: deployer.extensions.requestOptions.ca,
					cert: deployer.extensions.requestOptions.cert,
					key: deployer.extensions.requestOptions.key
				};

				deployer.extensions.namespaces.deployments.get({name: options.serviceName}, function (error, deployment) {
					checkError(error, cb, function () {
						deployment.spec.replicas = 0;
						deployer.extensions.namespaces.deployments.put({name: options.serviceName, body: deployment}, function (error) {
							checkError(error, cb, function () {
								ensureDeployment(deployer, function (error) {
									checkError(error, cb, function () {
										getReplicaSet(utils.cloneObj(requestOptions), function (error, replicaSet) {
											checkError(error, cb, function () {
												updateReplicaSet(utils.cloneObj(requestOptions), replicaSet, {replicas: 0}, function (error) {
													checkError(error, cb, function () {
														ensureReplicaSet(deployer, utils.cloneObj(requestOptions), function (error) {
															checkError(error, cb, function () {
																deleteReplicaSet(utils.cloneObj(requestOptions), {rsName: replicaSet.metadata.name}, function (error) {
																	checkError(error, cb, function () {
																		deleteKubeService(deployer, function (error) {
																			checkError(error, cb, function () {
																				deleteDeployment(deployer, function (error) {
																					checkError(error, cb, function () {

																						cb(null, true);
																						//delete pods in background
																						deletePods(deployer, function (error) {
																							if (error) {
																								soajs.log.error('Unable to delete pods of ' + options.serviceName);
																							}
																							else {
																								soajs.log.debug('Pods of ' + options.serviceName + ' deleted successfully');
																							}
																						});
																					});
																				});
																			});
																		});
																	});
																});
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});

				function getReplicaSet(requestOptions, cb) {
					requestOptions = injectCerts(requestOptions);
					requestOptions.qs = {
						labelSelector: 'soajs-app=' + options.serviceName
					};

					request.get(requestOptions, function (error, response, body) {
						var rs = ((body && body.items && body.items[0]) ? body.items[0] : null); //replicaset list must contain only one item in this case
						return cb(error, rs);
					});
				}

				function deleteReplicaSet(requestOptions, params, cb) {
					requestOptions = injectCerts(requestOptions);
					requestOptions.uri += '/' + params.rsName;
					requestOptions.body = {
						gracePeriodSeconds: 0
					};

					request.delete(requestOptions, function (error, response, body) {
						return cb(error, body);
					});
				}

				function updateReplicaSet(requestOptions, replicaSet, params, cb) {
					requestOptions = injectCerts(requestOptions);
					requestOptions.uri += '/' + replicaSet.metadata.name;
					replicaSet.spec.replicas = params.replicas;

					request.put(requestOptions, function (error, response, body) {
						return cb(error, body);
					});
				}

				function ensureReplicaSet(deployer, requestOptions, callback) {
					getReplicaSet(requestOptions, function (error, replicaSet) {
						if (error) {
							return callback(error);
						}

						if (!replicaSet) {
							return callback(null, true)
						}

						if (replicaSet.spec.replicas === 0) {
							return callback(null, true)
						}
						else {
							setTimeout(function () {
								return ensureReplicaSet(deployer, requestOptions, callback);
							}, 500);
						}
					});
				}

				function deleteKubeService(deployer, callback) {
					if (options.serviceType === 'controller' || options.serviceType === 'nginx') {
						var kubeServiceName = options.serviceName + '-service';
						deployer.core.namespaces.services.get({name: kubeServiceName}, function (error, service) {
							checkError(error, cb, function () {
								deployer.core.namespaces.services.delete({name: kubeServiceName, body: body}, callback);
							});
						});
					}
					else {
						return callback(null, true);
					}
				}

				function deleteDeployment(deployer, callback) {
					deployer.extensions.namespaces.deployments.delete({name: options.serviceName, body: body}, callback);
				}

				function ensureDeployment(deployer, callback) {
					deployer.extensions.namespaces.deployments.get({name: options.serviceName}, function (error, deployment) {
						checkError(error, cb, function () {
							if (deployment.spec.replicas === 0) {
								return callback(null, true);
							}
							else {
								setTimeout(function () {
									return ensureDeployment(deployer, callback);
								}, 500);
							}
						});
					});
				}

				function deletePods(deployer, callback) {
					var params = {
						qs: {
							labelSelector: 'soajs-app=' + options.serviceName
						}
					};
					deployer.core.namespaces.pods.delete(params, callback);
				}

				function injectCerts (requestOptions) {
					requestOptions.ca = deployer.extensions.requestOptions.ca;
					requestOptions.cert = deployer.extensions.requestOptions.cert;
					requestOptions.key = deployer.extensions.requestOptions.key;
					return requestOptions;
				}
            });
        });
	},

	"inspectContainer": function (soajs, deployerConfig, options, model, cb) {
        //TODO: Remove
	},

	"getContainerLogs": function (soajs, deployerConfig, options, model, res) {
		lib.getDeployer(soajs, deployerConfig, model, function (error, deployer) {
			if (error) {
				soajs.log.error(error);
				return res.jsonp(soajs.buildResponse({code: 774, msg: error.message}));
			}

			var params = {
				name: options.taskName, //pod name
				qs: {
					tailLines: 400
				}
			};

			deployer.core.namespaces.pods.log(params, function (error, logStream) {
				if (error) {
					soajs.log.error(error);
					return res.jsonp(soajs.buildResponse({code: 601, msg: error.message}));
				}

				return res.jsonp(soajs.buildResponse(null, {data: logStream}));
			});
		});
	},

	"buildContainerRecords": function (soajs, deployerConfig, options, model, cb) {
		async.map(options.serviceInfo.tasks, function (onePod, callback) {
			var newRecord = {
				type: options.serviceType,
				env: soajs.inputmaskData.envCode.toLowerCase(),
				running: true,
				recordType: 'container',
				deployer: deployerConfig,
				taskName: onePod.metadata.name,
				serviceName: options.serviceInfo.service.metadata.name
			};

			return callback(null, newRecord);
		}, cb);
	},

	"getNewInstances": function (soajs, deployerConfig, options, model, cb) {
		var newInstances = [];
		async.each(options.serviceInfo.tasks, function (onePod, callback) {
			var found = false;
			var podName = onePod.metadata.name;
			for (var i = 0; i < options.dockerRecords.length; i++) {
				if (options.dockerRecords[i].taskName === podName) {
					found = true;
					break;
				}
			}

			if (!found) {
				newInstances.push(onePod);
			}

			return callback(null, true);
		}, function (error, result) {
			return cb(newInstances);
		});
	},

	"getRemovedInstances": function (soajs, deployerConfig, options, model, cb) {
		var rmInstances = [];
		async.each(options.dockerRecords, function (oneRecord, callback) {
			var found = false;
			for (var i = 0; i < options.serviceInfo.tasks.length; i++) {
				var podName = options.serviceInfo.tasks[i].metadata.name;
				if (podName === oneRecord.taskName) {
					found = true;
					break;
				}
			}

			if (!found) {
				rmInstances.push(oneRecord);
			}

			return callback(null, true);
		}, function (error, result) {
			return cb(rmInstances);
		});
	}
};

module.exports = deployer;
