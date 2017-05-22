'use strict';
var fs = require('fs');
var async = require('async');
var deployer = require("soajs").drivers;

var utils = require('../../utils/utils.js');

var colName = 'cicd';
var envColName = 'environment';

function checkIfError(req, mainCb, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            req.soajs.log.error(data.error);
        }

        return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
    } else {
        if (cb) return cb();
    }
}


var BL = {

    model: null,

    /**
     * Function that gets CD config
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    getConfig: function (config, req, cb) {
        var opts = { collection: colName, conditions: {"type": "cd"} };
        BL.model.findEntry(req.soajs, opts, function (error, record) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
               return cb(null, record || {});
            });
        });
    },

    /**
     * Function that saves CD config
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    saveConfig: function (config, req, cb) {
	    req.soajs.inputmaskData.config.type = "cd";
        var opts = {
            collection: colName,
            conditions: {
            	"type": "cd"
            },
            fields: req.soajs.inputmaskData.config,
            options: { upsert: true }
        };
        BL.model.updateEntry(req.soajs, opts, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, true);
            });
        });
    },

    /**
     * Function that triggers CD deploy operation
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    cdDeploy: function (config, req, cb) {

        //verify that the deploy_token is valid
        verifyDeployToken(function () {
            //get CD recipe
            BL.getConfig(config, req, function (error, record) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    // get all environments
                    getEnvs(function (error, envs) {
                        //NOTE: the only error returned by this function is from the drivers, which are handled by utils.checkErrorReturn
                        utils.checkErrorReturn(req, cb, {config: config, error: error}, function () {
                            // check if cd should be triggered based on available input
                            checkConfig(record, envs, function (error, servicesList) {
                                // no error to be handled here
                                // redeploy services
                                processCD(servicesList, function (error) {
                                    checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                                        return cb(null, true);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        function verifyDeployToken(fcb) {
            var opts = {
                collection: colName,
	            conditions: {
                	"type": "ci"
                }
            };
            BL.model.findEntries(req.soajs, opts, function (error, records) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    checkIfError(req, cb, {config: config, error: !records || records.length === 0, code: 955}, function () {
                        var ciConfig = records[0];
                        checkIfError(req, cb, {
                            config: config,
                            error: ciConfig.settings.gitToken !== req.soajs.inputmaskData.deploy_token,
                            code: 956
                        }, fcb);
                    });
                });
            });
        }

        function getEnvs(fcb) {
            var opts = {
                collection: envColName,
                conditions: {}
            };
            BL.model.findEntries(req.soajs, opts, function (error, envs) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    // get all services deployed in each environment
                    async.map(envs, function (oneEnv, callback) {
                        var options = utils.buildDeployerOptions(oneEnv, req.soajs, BL);
                        options.params = { env: oneEnv.code.toLowerCase() };
                        deployer.listServices(options, function (error, services) {
                            if (error) return callback(error);

                            //map repo name and branch of each service and return an updated array with the values
                            async.map(services, function (oneService, callback) {
                                var repo = '', branch = '';
                                oneService.env.forEach(function (oneEnv) {
                                    if (oneEnv.indexOf('SOAJS_GIT_REPO') !== -1) oneService.repo = oneEnv.split('=')[1];
                                    else if (oneEnv.indexOf('SOAJS_GIT_BRANCH') !== -1) oneService.branch = oneEnv.split('=')[1];
                                });

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
                    }, fcb);
                });
            });
        }
	    
        function checkConfig(record, envs, cb) {
            if (!record) return cb(); // no CD config found
            async.concat(envs, function (oneEnv, callback) {
                var cdEnvConfig = record[oneEnv.record.code.toUpperCase()];
                if (!cdEnvConfig) return callback(null, []); // no CD config found for environment
                if (!oneEnv.services || oneEnv.services.length === 0) return callback(null, []); // no services matching repo/branch were found in this environment

                async.concat(oneEnv.services, function (oneService, callback) {
                    var serviceCD = {
                        id: oneService.id,
                        mode: ((oneService.labels && oneService.labels['soajs.service.mode'] ? oneService.labels['soajs.service.mode'] : 'deployment')), //NOTE: only required for kubernetes driver
                        repo: oneService.repo,
                        envRecord: oneEnv.record
                    };

                    var serviceName = '';
                    if (oneService.labels && oneService.labels['soajs.service.name']) {
                        serviceName = oneService.labels['soajs.service.name'];
                    }
                    else {
                        req.soajs.log.error('Unable to find the name of service(s) included in ' + oneService.repo + ' repository. Make sure [soajs.service.name] label is set.');
                        req.soajs.log.error('CD configuration per service cannot be applied (if any), label [soajs.service.name] is missing');
                    }

                    // check if service has custom set CD configuration that overrides the global
                    if (cdEnvConfig[serviceName]) {
                    	if(cdEnvConfig[serviceName]['v' + req.soajs.inputmaskData.version]){
                    		var version = ['v' + req.soajs.inputmaskData.version];
		                    //make sure that the service custom config points to the same branch
		                    if (cdEnvConfig[serviceName][version].branch && cdEnvConfig[serviceName][version].branch === req.soajs.inputmaskData.branch) {
			                    serviceCD.branch = cdEnvConfig[serviceName][version].branch;
			                    if (cdEnvConfig[serviceName].strategy) serviceCD.strategy = cdEnvConfig[serviceName][version].strategy;
		                    }
	                    }
                    	else{
		                    //make sure that the service custom config points to the same branch
		                    if (cdEnvConfig[serviceName].branch && (cdEnvConfig[serviceName].branch === req.soajs.inputmaskData.branch)) {
			                    serviceCD.branch = cdEnvConfig[serviceName].branch;
			                    if (cdEnvConfig[serviceName].strategy) serviceCD.strategy = cdEnvConfig[serviceName].strategy;
		                    }
	                    }
                    }
                    else {
                        // check if service matches the global CD configuration
                        if (cdEnvConfig.branch === req.soajs.inputmaskData.branch) {
                            serviceCD.branch = cdEnvConfig.branch;
                            if (cdEnvConfig.strategy) serviceCD.strategy = cdEnvConfig.strategy;
                        }
                    }

                    if (serviceCD.branch && serviceCD.strategy) {
                        //matching CD configuration was found for repo service(s), CD can be applied
                        return callback(null, [ serviceCD ]);
                    }
                    else {
                        //matching CD configuration was not found or applicable, CD will not be applied
                        return callback(null, []);
                    }
                }, callback);
            }, cb);
        }

        function processCD(servicesList, cb) {
            async.each(servicesList, function (oneService, callback) {
                if (oneService.strategy === 'update') {
                    var options = utils.buildDeployerOptions(oneService.envRecord, req.soajs, BL);
                    options.params = {
						id: oneService.id,
						mode: oneService.mode,
						action: 'redeploy'
					};
                    return deployer.redeployService(options, callback);
                }
                else if (oneService.strategy === 'notify') {
	                req.soajs.log.info('NOTIFY: Received CD trigger for ' + oneService.repo);
	                return callback();
                }
            }, cb);
        }
    },
	
	/**
	 * Function that gets Update Notification Ledger
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 */
	getLedger: function (config, req, cb) {
		
		function initBLModel (BLModule, modelName, cb) {
			BLModule.init(modelName, cb);
		}
		
		function getCatalogs(cb) {
			let opts = {
				collection: "catalogs",
				conditions: {}
			};
			BL.model.findEntries(req.soajs, opts, cb);
		}
		
		function getCiRepos(cb) {
			let ciBL = require("../ci/index.js");
			initBLModel(ciBL, 'mongo', function(error, BL){
				if(error){
					return cb(error);
				}
				BL.getConfig(config, req, cb);
			});
		}
		
		function getServices(cb) {
			var servicesBL = require("../cloud/services.js");
			initBLModel(servicesBL, 'mongo', function(error, BL){
				if(error){
					return cb(error);
				}
				BL.listServices(config, req.soajs, cb);
			});
		}
		
		var updateList= [];
		async.parallel({'catalogs': getCatalogs, 'repos': getCiRepos, 'services': getServices}, function(error, response){
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				/**
				 * compare entries
				 */
				async.each(response.services, function(oneService, cb){
					doesServiceHaveUpdates(oneService, response.catalogs, response.repos.list, cb);
				}, function(){
					return cb(null, updateList);
				});
			});
		});
		
		function doesServiceHaveUpdates(oneService, catalogs, repos, cb){
			//check if service has labels
			if(!oneService.labels){
				return cb(null, true);
			}
			
			if(!oneService.tasks || oneService.tasks.length === 0){
				return cb(null, true);
			}
			
			var proceed = false;
			var biggestTaskTs = 0;
			oneService.tasks.forEach(function(oneTask){
				if(oneTask.status && oneTask.status.state === 'running'){
					proceed = true;
					var taskTs = new Date(oneTask.status.ts).getTime();
					if(taskTs > biggestTaskTs){
						biggestTaskTs = taskTs;
					}
				}
			});
			
			if(!proceed){
				return cb(null, true);
			}
			
			//if no catalog id is found in labels, no need to notify
			//if no env code is found in labels, no need to notify
			//if env code found but not matching input, no need to notify
			if(!oneService.labels['soajs.catalog.id'] || !oneService.labels['soajs.env.code'] || oneService.labels['soajs.env.code'] !== req.soajs.inputmaskData.env.toLowerCase()){
				return cb(null, true);
			}
			
			let updateObj = {
				'id': oneService.id,
				'name': oneService.name,
				'labels': oneService.labels,
				'mode': ''
			};
			
			let myCatalog;
			for(let i =0; i < catalogs.length -1; i++){
				if(catalogs[i]._id.toString() === oneService.labels['soajs.catalog.id']){
					myCatalog = catalogs[i];
					break;
				}
			}
			
			//no catalog recipe found, no need to notify
			if(!myCatalog || !myCatalog.v){
				return cb(null, true);
			}
			updateObj.catalog = {
				name: myCatalog.name,
				type: myCatalog.type,
				subtype: myCatalog.subtype,
				v: myCatalog.v
			};
			//if catalog.v and no service catalog v, then update
			//if catalog.v is greater than service catalog v, then update
			if(myCatalog.v.toString() && (!oneService.labels['soajs.catalog.v'] || parseInt(myCatalog.v) > parseInt(oneService.labels['soajs.catalog.v']) )){
				updateObj.catalog.ts = myCatalog.ts;
				updateObj.catalog.envs = myCatalog.recipe.buildOptions.env;
				updateObj.mode = 'rebuild';
				updateList.push(updateObj);
				return cb(null, true);
			}
			
			let repo = {
				name: '',
				owner: '',
				branch: ''
			};
			
			oneService.env.forEach(function(oneEnv){
				if(oneEnv.indexOf("SOAJS_GIT_OWNER") !== -1){
					repo.owner = oneEnv.split("=")[1];
				}
				if(oneEnv.indexOf("SOAJS_GIT_REPO") !== -1){
					repo.name = oneEnv.split("=")[1];
				}
				if(oneEnv.indexOf("SOAJS_GIT_BRANCH") !== -1){
					repo.branch = oneEnv.split("=")[1];
				}
			});
			
			//check the build information to see if there are code updates
			let done = false;
			for(let i=0; i < repos.length -1; i++){
				if(repos[i].build && repos[i].name === repo.owner + "/" + repo.name){
					
					//check the branches
					for(let j =0; j < repos[i].branches.length -1; j++){
						if(repos[i].branches[j].branch === repo.branch && repos[i].branches[j].state === 'passed'){
							var lastBuild = new Date(repos[i].branches[j].lastBuild).getTime();
							if(lastBuild > biggestTaskTs){
								updateObj.mode = 'redeploy';
								repo.ts = lastBuild;
								updateObj.repo = repo;
								updateList.push(updateObj);
								done = true;
								break;
							}
						}
					}
				}
				if(done){
					break;
				}
			}
			
			return cb(null, true);
		}
	}

};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;

		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		modelPath = __dirname + "/../../models/" + modelName + ".js";
		return requireModel(modelPath, cb);
		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel(filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}

				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
