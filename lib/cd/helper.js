'use strict';
var fs = require('fs');
var async = require('async');
var request = require("request");
var compareVersions = require('compare-versions');

var utils = require('../../utils/utils.js');
var deployBL = require('../cloud/deploy/index.js');

var colName = 'cicd';
var envColName = 'environment';

var modelName = 'mongo';

function initBLModel(BLModule, modelName, cb) {
	BLModule.init(modelName, cb);
}

var helpers = {

	deepVersionComparison: function (oneImage, tag, opts, newObj) {
		//check if both the tag and the oneImage.name
		if (!isNaN(parseInt(oneImage.name)) && !isNaN(parseInt(tag))) {
			//the tags might be something like 10.0.x or 9.5.2
			if (opts.imageInfo.prefix === 'soajsorg' && oneImage.name.indexOf("-") !== -1) {
				//comparing new soajs tag 1.1.x-1.1.x with something like 1.0.x-1.0.x
				var info1 = oneImage.name.split("-");
				var info2 = tag.split("-");

				//check if deployer got updated
				if (compareVersions(info1[0], info2[0]) == 1) {
					newObj.image.deployer = true;
					return [true, new Date(oneImage.last_updated).getTime()];
				}
				//check if soajs got updated
				else if (compareVersions(info1[1], info2[1]) == 1) {
					newObj.image.upgrade = true;
					return [true, new Date(oneImage.last_updated).getTime()];
				}
				else
					return [false, null];
			}
			else {
				//compare image tags
				if (!isNaN(parseInt(oneImage.name)) && compareVersions(parseInt(oneImage.name).toString(), tag) === 1) {
					newObj.image.update = true;
					// newVersion = true;
					// imageLastUpdated = new Date(oneImage.last_updated).getTime();
					return [true, new Date(oneImage.last_updated).getTime()];
				}
				else
					return [false, null];
			}
		}
		else if (!isNaN(parseInt(oneImage.name)) && tag !== 'latest' && isNaN(tag)) {
			//comparing new soajs tag 1.0.x-1.0.x with old ones
			newObj.image.upgrade = true;
			// newVersion = true;
			// imageLastUpdated = new Date(oneImage.last_updated).getTime();
			return [true, new Date(oneImage.last_updated).getTime()];
		}
		else {
			return [false, null];
		}
	},

	processUndeployedServices: function (req, deployedServices, allServices, cdInfo, cb) {
		//get services that are not deployed
		async.reject(allServices, function (oneCDService, callback) {
			async.detect(deployedServices, function (oneServiceInfo, callback) {
				if (!oneCDService.custom) {
					if(oneCDService.type === 'service') {
						return callback(null, oneCDService.serviceName === oneServiceInfo.service.labels['soajs.service.name']);
					}
					else if (oneCDService.type === 'daemon') {
						if(oneCDService.serviceName === oneServiceInfo.service.labels['soajs.service.name']) {
							if((oneServiceInfo.service.labels['soajs.service.type'] === 'daemon') && oneServiceInfo.service.labels['soajs.daemon.group']) {
								if(oneServiceInfo.service.env && Array.isArray(oneServiceInfo.service.env) && oneServiceInfo.service.env.length > 0) {
									var deployedGroup = '';
									for (var i = 0; i < oneServiceInfo.service.env.length; i++) {
										if(oneServiceInfo.service.env[i].split('=')[0] === 'SOAJS_DAEMON_GRP_CONF') {
											deployedGroup = oneServiceInfo.service.env[i].split('=')[1];
											break;
										}
									}
									return callback(null, deployedGroup && deployedGroup === oneCDService.group);
								}
							}
						}
						return callback(null, false);
					}
				}
				else {
					var serviceRepoLabel = oneServiceInfo.service.labels['soajs.service.repo'] || oneServiceInfo.service.labels['service.repo'];
					return callback(null, oneCDService.repoName === serviceRepoLabel);
				}
			}, callback);
		}, function (error, undeployedServices) {
			async.concat(undeployedServices, function (oneService, callback) {
				//normalize service/repo name between service and custom repos
				oneService.label = oneService.serviceName || oneService.repoName;
				if(oneService.type === 'daemon') {
					req.soajs.log.debug('Daemon ' + oneService.label + ' has groups that aren\'t deployed yet, checking CD strategy');
				}
				else {
					req.soajs.log.debug('Service ' + oneService.label + ' is not deployed, checking CD strategy');
				}

				async.concat(cdInfo, function (oneCDEnvConfig, callback) {
					var serviceCD = {
						repo: req.soajs.inputmaskData.repo,
						branch: req.soajs.inputmaskData.branch,
						serviceName: oneService.label,
						envRecord: oneCDEnvConfig.envRecord
					};

					if (oneCDEnvConfig.envConfig.pause) {
						serviceCD.pause = true;
						req.soajs.log.debug("CD strategies are paused for environment", oneCDEnvConfig.envRecord.code);
					}

					oneCDEnvConfig = oneCDEnvConfig.envConfig;
					//service version was specified in CD request
					if (!oneService.custom && oneService.serviceVersion) {
						var srvVersionLabel = 'v' + oneService.serviceVersion;
						if (oneCDEnvConfig[oneService.label] && oneCDEnvConfig[oneService.label][srvVersionLabel]) {
							if (oneCDEnvConfig[oneService.label].type === 'service') {
								if (oneCDEnvConfig[oneService.label][srvVersionLabel].branch === req.soajs.inputmaskData.branch) {
									if (oneCDEnvConfig[oneService.label][srvVersionLabel].deploy && oneCDEnvConfig[oneService.label][srvVersionLabel].options) {
										serviceCD.serviceVersion = oneService.serviceVersion;
										serviceCD.strategy = oneCDEnvConfig[oneService.label][srvVersionLabel].strategy;
										serviceCD.options = oneCDEnvConfig[oneService.label][srvVersionLabel].options;
										if(serviceCD.options.gitSource && req.soajs.inputmaskData.commit){
											serviceCD.options.gitSource.commit = req.soajs.inputmaskData.commit;
											req.soajs.log.debug("Adding Commit to Configuration");
										}
										serviceCD.deploy = oneCDEnvConfig[oneService.label][srvVersionLabel].deploy;
										req.soajs.log.debug('Service ' + oneService.label + ' v.' + oneService.serviceVersion + ' will be deployed');
										return callback(null, [ serviceCD ]);
									}
								}
							}
							else if (oneCDEnvConfig[oneService.label].type === 'daemon') {
								if (oneCDEnvConfig[oneService.label][srvVersionLabel][oneService.group]) {
									var oneGroupConfig = oneCDEnvConfig[oneService.label][srvVersionLabel][oneService.group];
									if (oneGroupConfig.branch === req.soajs.inputmaskData.branch) {
										if (oneGroupConfig.deploy && oneGroupConfig.options) {
											serviceCD.serviceVersion = oneService.serviceVersion;
											serviceCD.strategy = oneGroupConfig.strategy;
											serviceCD.options = oneGroupConfig.options;
											if(serviceCD.options.gitSource && req.soajs.inputmaskData.commit){
												serviceCD.options.gitSource.commit = req.soajs.inputmaskData.commit;
												req.soajs.log.debug("Adding Commit to Configuration");
											}
											serviceCD.deploy = oneGroupConfig.deploy;
											req.soajs.log.debug('Daemon ' + oneService.label + ' v.' + oneService.serviceVersion + ' using group ' + oneService.group + ' will be deployed');
											return callback(null, [ serviceCD ]);
										}
									}
								}
							}
						}
					}

					//service version was not specified, use default config per service if any
					if (oneCDEnvConfig[oneService.label] && oneCDEnvConfig[oneService.label].deploy && oneCDEnvConfig[oneService.label].options) {
						if (oneCDEnvConfig[oneService.label].branch === req.soajs.inputmaskData.branch) {
							serviceCD.strategy = oneCDEnvConfig[oneService.label].strategy;
							serviceCD.options = oneCDEnvConfig[oneService.label].options;
							if(serviceCD.options.gitSource && req.soajs.inputmaskData.commit){
								serviceCD.options.gitSource.commit = req.soajs.inputmaskData.commit;
								req.soajs.log.debug("Adding Commit to Configuration");
							}
							serviceCD.deploy = oneCDEnvConfig[oneService.label].deploy;
							req.soajs.log.debug('Service ' + oneService.label + ' will be deployed');
							return callback(null, [ serviceCD ]);
						}
					}

					//no deploy config detected, ignore entry
					req.soajs.log.debug('CD strategy for service ' + oneService.label + ' is not configured to deploy');
					return callback(null, []);
				}, callback);
			}, cb);
		});
	},

	processOneService: function (req, BL, oneService, deployer, options, cdConfigRecord, callback) {
		var opts = {
			"collection": "ledger",
			"record": {}
		};
		// todo fix branch name
		var branchName = oneService.branch;
		if(branchName) {
			branchName = branchName.replace(/\//g, "__");
		}
		if(oneService.commitError){
			req.soajs.log.error("This service has already been updated with this commit " + req.soajs.inputmaskData.commit);
			opts = {
				"collection": "ledger",
				"record": {
					"serviceId": oneService.id,
					"mode": '',
					"serviceName": '',
					"env": '',
					"repo": oneService.repo,
					"branch": branchName,
					"commit": oneService.commit,
					"ts": new Date().getTime(),
					"commitError": true,
					"serviceIsDeployed": !oneService.deploy
				}
			};

			//if service is not deployed, deploy options should be added to the ledger record to enable manual deployment later on
			if (oneService.deploy) {
				opts.record.deployOptions = oneService.options;
			}

			//in case service is already deployed, required info will be present in labels
			if (oneService.service && oneService.service.labels) {
				opts.record.mode = oneService.service.labels["soajs.service.mode"] || '';
				opts.record.serviceName = oneService.service.labels["soajs.service.name"] || '';
				opts.record.env = oneService.service.labels["soajs.env.code"] || '';

				if (oneService.serviceVersion) {
					opts.record.serviceVersion = oneService.service.labels["soajs.service.version"] || '';
				}
			}

			//check if daemon and add group config name to record
			if(oneService.service && oneService.service.env && Array.isArray(oneService.service.env)) {
				for (var i = 0; i < oneService.service.env.length; i++) {
					var oneEnv = oneService.service.env[i];
					if(oneEnv.split('=')[0] === 'SOAJS_DAEMON_GRP_CONF') {
						opts.record.daemonGroup = oneEnv.split('=')[1];
						break;
					}
				}
			}
			else if(oneService.options && oneService.options.custom && oneService.options.custom.type === 'daemon') {
				opts.record.daemonGroup = oneService.options.custom.daemonGroup;
			}

			BL.model.insertEntry(req.soajs, opts, (err, res) => {
				return callback(null , []);
			});
		}
		//check if the strategy of the service is "notify" or the CD strategies of the environemnt are paused
		else if ((!oneService.deploy && oneService.strategy === 'notify') || oneService.pause) {
			opts = {
				"collection": "ledger",
				"record": {
					"serviceId": oneService.id,
					"mode": '',
					"serviceName": '',
					"env": '',
					"repo": oneService.repo,
					"branch": branchName,
					"commit": oneService.commit,
					"ts": new Date().getTime(),
					"notify": true,
					"serviceIsDeployed": !oneService.deploy
				}
			};

			//if service is not deployed, deploy options should be added to the ledger record to enable manual deployment later on
			if (oneService.deploy) {
				opts.record.deployOptions = oneService.options;
			}

			//check if daemon and add group config name to record
			if(oneService.service && oneService.service.env && Array.isArray(oneService.service.env)) {
				for (var i = 0; i < oneService.service.env.length; i++) {
					var oneEnv = oneService.service.env[i];
					if(oneEnv.split('=')[0] === 'SOAJS_DAEMON_GRP_CONF') {
						opts.record.daemonGroup = oneEnv.split('=')[1];
						break;
					}
				}
			}
			else if(oneService.options && oneService.options.custom && oneService.options.custom.type === 'daemon') {
				opts.record.daemonGroup = oneService.options.custom.daemonGroup;
			}

			//in case service is already deployed, required info will be present in labels
			if (oneService.service && oneService.service.labels) {
				opts.record.mode = oneService.service.labels["soajs.service.mode"] || '';
				opts.record.serviceName = oneService.service.labels["soajs.service.name"] || '';
				opts.record.env = oneService.service.labels["soajs.env.code"] || '';

				if (oneService.serviceVersion) {
					opts.record.serviceVersion = oneService.service.labels["soajs.service.version"] || '';
				}
			}
			//otherwise, get required info from deploy options that will be used to deploy the service
			else {
				opts.record.serviceName = oneService.serviceName || '';
				if (oneService.options && oneService.options.deployConfig && oneService.options.deployConfig.replication && oneService.options.deployConfig.replication.mode) {
					opts.record.mode = oneService.options.deployConfig.replication.mode;
				}
				if (oneService.envRecord && oneService.envRecord.code) {
					opts.record.env = oneService.envRecord.code.toLowerCase();
				}
				if (oneService.serviceVersion) {
					opts.record.serviceVersion = oneService.serviceVersion || '';
				}
			}

			BL.model.insertEntry(req.soajs, opts, (err, res) => {
				req.soajs.log.info('NOTIFY: Received CD trigger for ' + oneService.repo);
				return callback();
			});
		}
		//check if the strategy of the service is "update
		else if (!oneService.deploy && oneService.strategy === 'update') {
			opts = {
				"collection": "ledger",
				"record": {
					"serviceName": oneService.service.labels["soajs.service.name"],
					"env": oneService.service.labels["soajs.env.code"],
					"repo": oneService.repo,
					"branch": branchName,
					"commit": oneService.commit,
					"ts": new Date().getTime(),
					"update": true,
					"serviceIsDeployed": !oneService.deploy
				}
			};
			if (oneService.serviceVersion) {
				opts.record.serviceVersion = oneService.service.labels["soajs.service.version"];
			}

			if(oneService.service && oneService.service.env && Array.isArray(oneService.service.env)) {
				for (var i = 0; i < oneService.service.env.length; i++) {
					var oneEnv = oneService.service.env[i];
					if(oneEnv.split('=')[0] === 'SOAJS_DAEMON_GRP_CONF') {
						opts.record.daemonGroup = oneEnv.split('=')[1];
						break;
					}
				}
			}

			BL.model.insertEntry(req.soajs, opts, (err, res) => {
				
				let serviceCustomInputs = cdConfigRecord[oneService.envRecord.code.toUpperCase()][oneService.repo];
				let version;
				console.log(oneService.envRecord.code);
				console.log(oneService.repo);
				switch(serviceCustomInputs.type){
					case 'service':
						version = 'v' + oneService.service.labels['soajs.service.version'];
						serviceCustomInputs = serviceCustomInputs[version].options.custom;
						break;
					case 'daemon':
						version = 'v' + oneService.service.labels['soajs.service.version'];
						let daemonGroup;
						if (oneService.env && Array.isArray(oneService.env) && oneService.env.length > 0) {
							for (let i = 0; i < oneService.env.length; i++) {
								if (oneService.env[i].split('=')[0] === 'SOAJS_DAEMON_GRP_CONF') {
									daemonGroup = oneService.env[i].split('=')[1];
									break;
								}
							}
						}
						serviceCustomInputs = serviceCustomInputs[version][daemonGroup].options.custom;
						break;
					default:
						serviceCustomInputs = serviceCustomInputs.options.custom;
						break;
				}
				
				oneService.options = {
					"env": oneService.envRecord.code.toUpperCase(),
					"serviceId": oneService.id,
					"mode": oneService.mode,
					"action": "rebuild",
					"custom": serviceCustomInputs
				};
				
				oneService.options.custom.commit = oneService.commit;
				req.soajs.log.info('UPDATE: Received CD trigger for ' + oneService.repo);
				
				initBLModel(deployBL, modelName, function (error, deployBL) {
					if (error) return callback(error);
					
					req.soajs.inputmaskData = oneService.options;
					deployBL.redeployService(options.config, req, deployer, function (error, data) {
						return callback(error, data);
					});
				});
				// deployer.execute({'type': 'container', 'driver': options.strategy}, 'redeployService', options, callback);
			});
		}
		//check if deploy: true is set as flag for the service and deploy the service accordingly
		//deploy: true flag is added only for services that go through processUndeployedServices()
		else if (oneService.deploy === true) {
			opts = {
				"collection": "ledger",
				"record": {
					"serviceName": oneService.serviceName,
					"env": oneService.envRecord.code.toLowerCase(),
					"repo": oneService.repo,
					"branch": branchName,
					"ts": new Date().getTime(),
					"deploy": true,
					"serviceIsDeployed": !oneService.deploy
				}
			};
			if (oneService.serviceVersion) {
				opts.record.serviceVersion = oneService.serviceVersion;
			}

			//check if daemon deployment and add daemon group name to record
			if(oneService.options && oneService.options.custom && oneService.options.custom.type === 'daemon') {
				opts.record.daemonGroup = oneService.options.custom.daemonGroup;
			}

			BL.model.insertEntry(req.soajs, opts, function (error) {
				if (error) return callback(error);

				initBLModel(deployBL, modelName, function (error, deployBL) {
					if (error) return callback(error);

					req.soajs.inputmaskData = oneService.options;
					deployBL.deployService(options.config, req, deployer, function (error, data) {
						return callback(error, data);
					});
				});
			});
		}
	},

	checkRecordConfig: function (req, envs, record, cb) {
		async.concat(envs, function (oneEnv, cback) {
			var cdEnvConfig = record[oneEnv.record.code.toUpperCase()];
			if (!cdEnvConfig) {
				req.soajs.log.debug("No CD configuration found for environment", oneEnv.record.code);
				return cback(null, []); // no CD config found for environment
			}

			if (!oneEnv.services || oneEnv.services.length === 0) {
				req.soajs.log.debug("No services matching repo name or branch found in environment", oneEnv.record.code);
				return cback(null, []); // no services matching repo/branch were found in this environment
			}

			async.concat(oneEnv.services, function (oneService, callback) {
				var serviceCD = {
					id: oneService.id,
					mode: ((oneService.labels && oneService.labels['soajs.service.mode'] ? oneService.labels['soajs.service.mode'] : 'deployment')), //NOTE: only required for kubernetes driver
					repo: oneService.repo,
					envRecord: oneEnv.record,
					service: oneService
				};

				var serviceName = '', serviceType = '', daemonGroup = '';
				if (oneService.labels && (oneService.labels['soajs.service.name'] || oneService.labels['service.name'])) {
					serviceName = oneService.labels['soajs.service.name'] || oneService.labels['service.name'];
				}
				else {
					req.soajs.log.error('Unable to find the name of service(s) included in ' + oneService.repo + ' repository. Make sure [soajs.service.name] label is set.');
					req.soajs.log.error('CD configuration per service cannot be applied (if any), label [soajs.service.name] is missing');
				}

				if (oneService.labels && oneService.labels['soajs.service.type']) {
					if (oneService.labels['soajs.service.type'] === 'service') {
						serviceType = 'service';
					}
					else if (oneService.labels['soajs.service.type'] === 'daemon' && oneService.labels['soajs.daemon.group']) {
						serviceType = 'daemon';
						if (oneService.env && Array.isArray(oneService.env) && oneService.env.length > 0) {
							for (var i = 0; i < oneService.env.length; i++) {
								if (oneService.env[i].split('=')[0] === 'SOAJS_DAEMON_GRP_CONF') {
									daemonGroup = oneService.env[i].split('=')[1];
									break;
								}
							}
						}
					}
				}

				var repoName = '';
				if (oneService.labels && (oneService.labels['soajs.service.repo'] || oneService.labels['service.repo'])) {
					repoName = oneService.labels['soajs.service.repo'] || oneService.labels['service.repo'];
				}

				if (cdEnvConfig[serviceName]) {
					//check if the CD strategies are paused for this environment
					if (cdEnvConfig.pause) {
						serviceCD.pause = true;
						req.soajs.log.debug("CD strategies are paused for environment", oneEnv.record.code);
					}

					if (req.soajs.inputmaskData.services && Array.isArray(req.soajs.inputmaskData.services) && req.soajs.inputmaskData.services.length > 0) {
						//loop in array and find the service version
						var version;
						var found = false;
						for (let i = 0; i < req.soajs.inputmaskData.services.length; i++) {
							if (req.soajs.inputmaskData.services[i].serviceName === serviceName && req.soajs.inputmaskData.services[i].serviceVersion === parseInt(oneService.labels['soajs.service.version'])) {
								version = req.soajs.inputmaskData.services[i].serviceVersion;
								found = true;
								break;
							}
						}

						if (found) {
							req.soajs.log.debug("found specific entry in CD configuration for service", serviceName, 'in environment', oneEnv.record.code);
							serviceCD.serviceVersion = version;

							if (version && cdEnvConfig[serviceName]['v' + version]) {
								req.soajs.log.debug("found specific version ", version, "for service", serviceName, "in CD configuration");
								version = 'v' + version;
								if(serviceType === 'service') {
									//make sure that the service custom config points to the same branch
									if (cdEnvConfig[serviceName][version].branch && cdEnvConfig[serviceName][version].branch === req.soajs.inputmaskData.branch) {
										//check if cd already processed this commit
										if(oneService.commit && oneService.commit === req.soajs.inputmaskData.commit){
											//do not proceed, service already updated
											serviceCD.commit = req.soajs.inputmaskData.commit;
											serviceCD.commitError = true;
										}
										serviceCD.branch = cdEnvConfig[serviceName][version].branch;
										if (cdEnvConfig[serviceName][version].strategy) serviceCD.strategy = cdEnvConfig[serviceName][version].strategy;
									}
								}
								else if (serviceType === 'daemon') {
									//make sure that the daemon group name is present in the cd configuration
									if(daemonGroup && cdEnvConfig[serviceName][version][daemonGroup]) {
										if (cdEnvConfig[serviceName][version][daemonGroup].branch && cdEnvConfig[serviceName][version][daemonGroup].branch === req.soajs.inputmaskData.branch) {
											req.soajs.log.debug("found specific group ", daemonGroup, "for daemon", serviceName, "in CD configuration");
											//check if cd already processed this commit
											if(oneService.commit && oneService.commit === req.soajs.inputmaskData.commit){
												//do not proceed, service already updated
												serviceCD.commit = req.soajs.inputmaskData.commit;
												serviceCD.commitError = true;
											}
											serviceCD.branch = cdEnvConfig[serviceName][version][daemonGroup].branch;
											if (cdEnvConfig[serviceName][version][daemonGroup].strategy) serviceCD.strategy = cdEnvConfig[serviceName][version][daemonGroup].strategy;
										}
									}
									else {
										req.soajs.log.debug("No CD configuration found for daemon " + serviceName + ", version " + version + " and group configuration " + daemonGroup);
									}
								}
							}
							else {
								req.soajs.log.debug("did not find any specific version ", version, "for service", serviceName, "in CD configuration, using default service configuration");
								//make sure that the service custom config points to the same branch
								if (cdEnvConfig[serviceName].branch && cdEnvConfig[serviceName].branch === req.soajs.inputmaskData.branch) {
									//check if cd already processed this commit
									if(oneService.commit && oneService.commit === req.soajs.inputmaskData.commit){
										//do not proceed, service already updated
										serviceCD.commit = req.soajs.inputmaskData.commit;
										serviceCD.commitError = true;
									}
									else {
										serviceCD.branch = cdEnvConfig[serviceName].branch;
										if (cdEnvConfig[serviceName].strategy) serviceCD.strategy = cdEnvConfig[serviceName].strategy;
									}
								}
							}
						}
					}
					else {
						req.soajs.log.debug("Service ", serviceName, " was not found in inputmaskData request, ignoring CD update/notify for service.");
					}
				}
				else if (cdEnvConfig[repoName]) {
					req.soajs.log.debug("Found a CD configuration for " + repoName + " repository, checking branch and strategy");
					if (cdEnvConfig[repoName].branch && cdEnvConfig[repoName].strategy) {
						//todo: check commit
						//check if cd already processed this commit
						if(oneService.commit && oneService.commit === req.soajs.inputmaskData.commit){
							//do not proceed, service already updated
							serviceCD.commit = req.soajs.inputmaskData.commit;
							serviceCD.commitError = true;
						}
						serviceCD.strategy = cdEnvConfig[repoName].strategy;
						serviceCD.branch = cdEnvConfig[repoName].branch;
					}
					else {
						req.soajs.log.debug("CD configuration for repository " + repoName + " is missing strategy or branch values");
					}
				}
				else {
					req.soajs.log.debug("no CD configuration found for service ", serviceName, ", ignoring CD update/notify for service.");
				}

				if (serviceCD.branch && serviceCD.strategy) {
					serviceCD.commit = req.soajs.inputmaskData.commit;
					//matching CD configuration was found for repo service(s), CD can be applied
					return callback(null, [serviceCD]);
				}
				else {
					//matching CD configuration was not found or applicable, CD will not be applied
					return callback(null, []);
				}
			}, cback);
		}, cb);
	},

	getEnvsServices: function (envs, req, deployer, BL, fcb) {

		/**
		 * loop in environments
		 */
		async.map(envs, function (oneEnv, callback) {
			var options = utils.buildDeployerOptions(oneEnv, req.soajs, BL);
			options.params = {env: oneEnv.code.toLowerCase()};
			deployer.execute({'type': 'container', 'driver': options.strategy}, 'listServices', options, (error,services) =>{
				if (error) {
					return callback(error)
				}

				/**
				 * loop in services of this environment
				 */
				//map repo name and branch of each service and return an updated array with the values
				async.map(services, function (oneService, callback) {
					if (oneService.labels && oneService.labels['service.repo']) {
						oneService.repo = oneService.labels['service.repo'];
					}
					// todo fix branch name
					if (oneService.labels && oneService.labels['service.branch']) {
						oneService.branch = oneService.labels['service.branch'];
					}
					if (oneService.labels && oneService.labels['service.commit']) {
						oneService.commit = oneService.labels['service.commit'];
					}
					return callback(null, oneService);
				}, function (error, mappedServices) {
					//filter services, only return those who match the repo and branch provided by the api request
					async.filter(mappedServices, function (oneService, callback) {
						// todo fix branch name
						var inputBranchName = req.soajs.inputmaskData.branch;
						inputBranchName = inputBranchName.replace(/\//g, "__");
						return callback(null, ((oneService.repo === req.soajs.inputmaskData.repo) && (oneService.branch === inputBranchName)));
					}, function (error, repoServices) {
						return callback(null, {record: oneEnv, services: repoServices});
					});
				});
			});
		}, function (err, results) {
			return fcb(err, results);
		});
	},

	/**
	 * Checks if there is a catalog, code and/or image update for this service
	 * @param oneService
	 * @param catalogs
	 * @param soajsImages
	 * @param cb
	 * @returns {*}
	 */
	doesServiceHaveUpdates: function (req, config, updateList, oneService, catalogs, soajsImages, cb) {
		//check if service has labels
		if (!oneService.labels) {
			return cb(null, true);
		}

		if (!oneService.tasks || oneService.tasks.length === 0) {
			return cb(null, true);
		}

		var proceed = false;
		var biggestTaskTs = 0;
		oneService.tasks.forEach(function (oneTask) {
			if (oneTask.status && (process.env.SOAJS_DEPLOY_TEST || oneTask.status.state === 'running')) {
				proceed = true;
				var taskTs = new Date(oneTask.status.ts).getTime();
				if (taskTs > biggestTaskTs) {
					biggestTaskTs = taskTs;
				}
			}
		});
		if (!proceed) {
			return cb(null, true);
		}
		//if no catalog id is found in labels, no need to notify
		//if no env code is found in labels, no need to notify
		//if env code found but not matching input, no need to notify
		if (!oneService.labels['soajs.catalog.id'] || !oneService.labels['soajs.env.code'] || oneService.labels['soajs.env.code'] !== req.soajs.inputmaskData.env.toLowerCase()) {
			return cb(null, true);
		}

		let myCatalog;
		for (let i = 0; i < catalogs.length; i++) {
			if (catalogs[i]._id.toString() === oneService.labels['soajs.catalog.id']) {
				myCatalog = catalogs[i];
				break;
			}
		}

		//no catalog recipe found, no need to notify
		if (!myCatalog || !myCatalog.v) {
			return cb(null, true);
		}

		let updateObj = {
			'id': oneService.id,
			'name': oneService.name,
			'labels': oneService.labels,
			'mode': '',
			'service': {
				'env': oneService.env,
				'image': {
					prefix: oneService.labels['service.image.prefix'] || myCatalog.recipe.deployOptions.image.prefix,
					name: oneService.labels['service.image.name'] || myCatalog.recipe.deployOptions.image.name,
					tag: oneService.labels['service.image.tag'] || myCatalog.recipe.deployOptions.image.tag
				}
			},
			'catalog': {
				'name': myCatalog.name,
				'type': myCatalog.type,
				'subtype': myCatalog.subtype,
				'v': myCatalog.v
			}
		};

		//if catalog.v and no service catalog v, then update
		//if catalog.v is greater than service catalog v, then update
		if (myCatalog.v && (!oneService.labels['soajs.catalog.v'] || parseInt(myCatalog.v) > parseInt(oneService.labels['soajs.catalog.v']) )) {
			updateObj.catalog.ts = myCatalog.ts;
			updateObj.catalog.envs = myCatalog.recipe.buildOptions.env;
			updateObj.catalog.image = myCatalog.recipe.deployOptions.image;
			updateObj.catalog.sourceCode = myCatalog.recipe.deployOptions.sourceCode;
			updateObj.mode = 'rebuild';
			updateObj.image = updateObj.catalog.image;
			updateList.push(updateObj);
		}

		//check if there are image updates
		let opts = {
			imageInfo: {
				prefix: oneService.labels['service.image.prefix'] || myCatalog.recipe.deployOptions.image.prefix,
				name: oneService.labels['service.image.name'] || myCatalog.recipe.deployOptions.image.name,
				tag: oneService.labels['service.image.tag'] || myCatalog.recipe.deployOptions.image.tag
			},
			results: soajsImages,
			oneService: oneService,
			updateObj: updateObj,
			biggestTaskTs: biggestTaskTs
		};
		checkImageforUpdates(opts, cb);

		/**
		 * checks if there is an updated image
		 * @param opts
		 * @param cb
		 */
		function checkImageforUpdates(opts, cb) {
			if (opts.imageInfo.name === 'soajs' && opts.imageInfo.prefix === 'soajsorg') {
				step2(opts.results);
			}
			else {
				let myUrl = config.docker.url;
				var prefix = "library";
				if (opts.imageInfo.prefix && opts.imageInfo.prefix !== '') {
					prefix = opts.imageInfo.prefix;
				}

				myUrl = myUrl.replace("%organization%", prefix).replace("%imagename%", opts.imageInfo.name);
				let options = {
					method: 'GET',
					url: myUrl,
					headers: { 'cache-control': 'no-cache' },
					json: true
				};
				request.get(options, function (error, response, body) {
					if (error) {
						return cb(error);
					}
					if (body && body.results && Array.isArray(body.results) && body.results.length > 0) {
						step2(body.results);
					}
					else {
						step2([]);
					}
				});
			}

			function step2(results) {
				if (results.length === 0) {
					return cb(null, true);
				}

				let tag = opts.imageInfo.tag;
				var latest;
				let newVersion;
				let imageLastUpdated;

				var newObj = JSON.parse(JSON.stringify(opts.updateObj));
				newObj.image = opts.imageInfo;
				results.forEach(function (oneImage) {
					if (oneImage.name === tag) {
						latest = oneImage;
						imageLastUpdated = new Date(oneImage.last_updated).getTime();
						if (!opts.oneService.labels['service.image.ts']) {
							newObj.image.noimage = true;
							newVersion = true;
						}
						else if (imageLastUpdated > parseInt(opts.oneService.labels['service.image.ts'])) {
							newObj.image.update = true;
							newVersion = true;
						}
					}

					if (oneImage.name === 'latest' && !newVersion) {
						latest = oneImage;
						//if the image name is not latest and there is a newer version
						if (latest.name !== tag) {
							imageLastUpdated = new Date(latest.last_updated).getTime();
							newVersion = (new Date(latest.last_updated).getTime() > new Date(opts.oneService.labels['service.image.ts']).getTime());
							if (newVersion) {
								newObj.image.upgrade = true;
							}
						}
					}

					if (oneImage.name !== tag && !newVersion) {
						try{
							var output = helpers.deepVersionComparison(oneImage, tag, opts, newObj);
							newVersion = output[0];
							imageLastUpdated = output[1];
						}
						catch(e){
							req.soajs.log.error(e);
						}
					}
				});

				if (!newVersion) {
					return cb(null, true);
				}

				newObj.image.ts = imageLastUpdated;
				newObj.mode = 'image';
				updateList.push(newObj);

				return cb(null, true);
			}
		}
	},

	getLatestSOAJSImageInfo: function (config, cb) {
		let myUrl = config.docker.url;
		myUrl = myUrl.replace("%organization%", "soajsorg").replace("%imagename%", "soajs");
		let opts = {
			method: 'GET',
			url: myUrl,
			headers: { 'cache-control': 'no-cache' },
			json: true
		};
		request.get(opts, function (error, response, body) {
			return cb(error, (body && body.results) ? body.results : []);
		});
	},

	getServices: function (config, req, deployer, cloudServices, cb) {
		initBLModel(cloudServices, 'mongo', function (error, BL) {
			if (error) {
				return cb(error);
			}
			req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toLowerCase();
			BL.listServices(config, req.soajs, deployer, cb);
		});
	},

	callDeployer: function (config, req, deployer, opName, cb) {
		var cloudDeploy = require("../cloud/deploy/index.js");
		initBLModel(cloudDeploy, 'mongo', function (error, BL) {
			if (error) {
				return cb(error);
			}
			BL[opName](config, req, req.soajs, deployer, cb);
		});
	}

};

module.exports = helpers;
