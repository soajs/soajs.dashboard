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
				if (compareVersions(oneImage.name, tag) === 1) {
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

	processOneService: function (req, BL, oneService, deployer, options, callback) {
		//check if the strategy of the service is "notify" or the CD strategies of the environemnt are paused
		if (!oneService.deploy && (oneService.strategy === 'notify' || oneService.pause)) {
			var opts = {
				"collection": "ledger",
				"record": {
					"serviceId": oneService.id,
					"mode": oneService.service.labels["soajs.service.mode"],
					"serviceName": oneService.service.labels["soajs.service.name"],
					"env": oneService.service.labels["soajs.env.code"],
					"repo": oneService.repo,
					"branch": oneService.branch,
					"ts": new Date().getTime(),
					"notify": true
				}
			};
			if (oneService.serviceVersion) {
				opts.record.serviceVersion = oneService.service.labels["soajs.service.version"];
			}
			BL.model.insertEntry(req.soajs, opts, (err, res) => {
				req.soajs.log.info('NOTIFY: Received CD trigger for ' + oneService.repo);
				return callback();
			});
		}
		//check if the strategy of the service is "update
		else if (!oneService.deploy && oneService.strategy === 'update') {
			var opts = {
				"collection": "ledger",
				"record": {
					"serviceName": oneService.service.labels["soajs.service.name"],
					"env": oneService.service.labels["soajs.env.code"],
					"repo": oneService.repo,
					"branch": oneService.branch,
					"ts": new Date().getTime(),
					"update": true
				}
			};
			if (oneService.serviceVersion) {
				opts.record.serviceVersion = oneService.service.labels["soajs.service.version"];
			}
			BL.model.insertEntry(req.soajs, opts, (err, res) => {
				var options = utils.buildDeployerOptions(oneService.envRecord, req.soajs, BL);
				options.params = {
					id: oneService.id,
					mode: oneService.mode,
					action: 'redeploy'
				};
				req.soajs.log.info('UPDATE: Received CD trigger for ' + oneService.repo);
				return deployer.redeployService(options, callback);
			});
		}
		else if (oneService.deploy === true) {
			var opts = {
				"collection": "ledger",
				"record": {
					"serviceName": oneService.serviceName,
					"env": oneService.envRecord.code.toLowerCase(),
					"repo": oneService.repo,
					"branch": oneService.branch,
					"ts": new Date().getTime(),
					"deploy": true
				}
			};
			if (oneService.serviceVersion) {
				opts.record.serviceVersion = oneService.serviceVersion;
			}

			BL.model.insertEntry(req.soajs, opts, function (error) {
				if (error) return callback(error);

				initBLModel(deployBL, modelName, function (error, deployBL) {
					if (error) return callback(error);

					req.soajs.inputmaskData = oneService.options;
					deployBL.deployService(options.config, req.soajs, options.registry, deployer, function (error, data) {
						return callback(error, data);
					});
				});
			});
		};
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

				var serviceName = '';
				if (oneService.labels && oneService.labels['soajs.service.name']) {
					serviceName = oneService.labels['soajs.service.name'];
				}
				else {
					req.soajs.log.error('Unable to find the name of service(s) included in ' + oneService.repo + ' repository. Make sure [soajs.service.name] label is set.');
					req.soajs.log.error('CD configuration per service cannot be applied (if any), label [soajs.service.name] is missing');
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

							if (version && cdEnvConfig[serviceName]['v' + version]) {
								req.soajs.log.debug("found specific version ", version, "for service", serviceName, "in CD configuration");
								version = 'v' + version;
								//make sure that the service custom config points to the same branch
								if (cdEnvConfig[serviceName][version].branch && cdEnvConfig[serviceName][version].branch === req.soajs.inputmaskData.branch) {
									serviceCD.branch = cdEnvConfig[serviceName][version].branch;
									if (cdEnvConfig[serviceName].strategy) serviceCD.strategy = cdEnvConfig[serviceName][version].strategy;
								}
							}
							else {
								req.soajs.log.debug("did not find any specific version ", version, "for service", serviceName, "in CD configuration, using default service configuration");
								//make sure that the service custom config points to the same branch
								if (cdEnvConfig[serviceName].branch && cdEnvConfig[serviceName].branch === req.soajs.inputmaskData.branch) {
									serviceCD.branch = cdEnvConfig[serviceName].branch;
									if (cdEnvConfig[serviceName].strategy) serviceCD.strategy = cdEnvConfig[serviceName].strategy;
								}
							}
						}
					}
					else {
						req.soajs.log.debug("Service ", serviceName, " was not found in inputmaskData request, ignoring CD update/notify for service.");
					}
				}
				else {
					req.soajs.log.debug("no CD configuration found for service ", serviceName, ", ignoring CD update/notify for service.");
				}

				if (serviceCD.branch && serviceCD.strategy) {
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
			options.params = { env: oneEnv.code.toLowerCase() };
			deployer.listServices(options, function (error, services) {
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

					if (oneService.labels && oneService.labels['service.branch']) {
						oneService.branch = oneService.labels['service.branch'];
					}
					return callback(null, oneService);
				}, function (error, mappedServices) {
					//filter services, only return those who match the repo and branch provided by the api request
					async.filter(mappedServices, function (oneService, callback) {
						return callback(null, ((oneService.repo === req.soajs.inputmaskData.repo) && (oneService.branch === req.soajs.inputmaskData.branch)));
					}, function (error, repoServices) {
						return callback(null, { record: oneEnv, services: repoServices });
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
				'env': oneService.env
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
			updateObj.catalog.git = myCatalog.recipe.deployOptions.specifyGitConfiguration;
			updateObj.mode = 'rebuild';
			updateObj.image = updateObj.catalog.image;
			updateList.push(updateObj);
		}

		//check if there are image updates
		let opts = {
			imageInfo: myCatalog.recipe.deployOptions.image,
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
						else if (imageLastUpdated > new Date(opts.oneService.labels['service.image.ts']).getTime()) {
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
						var output = helpers.deepVersionComparison(oneImage, tag, opts, newObj);
						newVersion = output[0];
						imageLastUpdated = output[1];
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

	callDeployer: function (config, req, registry, deployer, opName, cb) {
		var cloudDeploy = require("../cloud/deploy/index.js");
		initBLModel(cloudDeploy, 'mongo', function (error, BL) {
			if (error) {
				return cb(error);
			}
			BL[opName](config, req.soajs, registry, deployer, cb);
		});
	}

};

module.exports = helpers;
