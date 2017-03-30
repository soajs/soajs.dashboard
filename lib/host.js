'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");

var deployer = require("soajs.core.drivers");
var data = require("../models/host.js");

function checkIfError(soajs, res, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            soajs.log.error(data.error);
        }

        return res.jsonp(soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        if (cb) return cb();
    }
}

function buildDeployerOptions(envRecord, soajs) {
	var options = {};
	var envDeployer = envRecord.deployer;

	if (!envDeployer) return null;
	if (Object.keys(envDeployer).length === 0) return null;
	if (!envDeployer.type || !envDeployer.selected) return null;
	if (envDeployer.type === 'manual') return null;

	var selected = envDeployer.selected.split('.');

	options.strategy = selected[1];
	options.driver = selected[1] + '.' + selected[2];
	options.env = envRecord.code.toLowerCase();

	for (var i = 0; i < selected.length; i++) {
		envDeployer = envDeployer[selected[i]];
	}

	options.deployerConfig = envDeployer;
	options.soajs = { registry: soajs.registry };
	options.model = BL.model;

	//temporary///////
	if (options.strategy === 'docker') options.strategy = 'swarm';
	//////////////////

	return options;
}

var BL = {
    model: null,

    "list": function (config, soajs, res) {
        data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
            checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {

                data.getHosts(soajs, BL.model, envRecord.code, null, function (err, hosts) {
                    checkIfError(soajs, res, {config: config, error: err, code: 600}, function () {

                        return res.jsonp(soajs.buildResponse(null, {
                            'hosts': hosts,
                            'deployer': envRecord.deployer,
                            'profile': envRecord.profile
                        }));
                    });
                });
            });
        });
    },

	/*
	 * This function will return all the environments where a service is deployed.
	 * it takes the service name and renders an object having the following form :
	 * "env_code: apiPrefix.domain"
	 * @ param serviceName
	 * @ param getHostEnv
	 * @ param response
	 */
	"listHostEnv": function (config, soajs, res) {
		if(process.env.SOAJS_DEPLOY_HA){
			var output = {};
			
			//fetch the non sensitive environments only
			var opts = {
				"collection": "environment",
				"conditions":{
					"$or": [
						{
							"sensitive" : {"$exists": false}
						},
						{
							"sensitive" : false
						}
					]
				}
			};
			BL.model.findEntries(soajs, opts, function(error, environments){
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
					if(!environments || environments.length === 0){
						return res.jsonp(soajs.buildResponse(null, output));
					}

					async.each(environments, function(oneEnv, mCb){
						var options = buildDeployerOptions(oneEnv, soajs);
						checkIfError(soajs, res, {config: config, error: !options, code: 825}, function () {
							options.params = {
								env: oneEnv.code.toLowerCase()
							};
							deployer.listServices(options, function (error, services) {
								checkIfError(soajs, res, {config: config, error: error}, function () {

									//loop in services and see if you find the one you want only
									for(var i =0; i < services.length; i++){
										var oneService = services[i];
										if(soajs.inputmaskData.service === oneService.labels["soajs.service.name"]){
											if(!output[oneEnv.code.toLowerCase()]){
												output[oneEnv.code.toLowerCase()] = {};
											}
											output[oneEnv.code.toLowerCase()]['domain'] = oneEnv.apiPrefix + "." + oneEnv.domain;
											break;
										}
									}

									services.forEach(function(oneService){
										if(output[oneEnv.code.toLowerCase()] && oneService.labels['soajs.service.group'] === 'nginx' && oneService.labels['soajs.env.code'] === oneEnv.code.toLowerCase()){
											
											//todo: map domain to inner property
											oneService.ports.forEach(function(onePort){
												if(parseInt(onePort.target) === 80){
													output[oneEnv.code.toLowerCase()] += ":" + onePort.published;
												}
											});
										}
									});
									return mCb(null, true);
								});
							});
						});
					}, function(error){
						checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
							//grab the list of tenant that have ext key in requested env and return tenant code, package nad key as part of response
							getTenants(output, function(error){
								checkIfError(soajs, res, {config: config, error: error}, function(){
									return res.jsonp(soajs.buildResponse(null, output));
								});
							});
						});
					});
				});
			});
		}
		else{
			data.getHostEnv(soajs, BL.model, function (error, envs) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
					checkIfError(soajs, res, {config: config, error: envs.length === 0, code: 621}, function () {
						
						async.map(envs, function (oneEnv, callback) {
							var opts = {
								"collection": "environment",
								"conditions":{
									"code": oneEnv.toUpperCase(),
									"$or": [
										{
											"sensitive" : {"$exists": false}
										},
										{
											"sensitive" : false
										}
									]
								}
							};
							BL.model.findEntry(soajs, opts, function(error, environment){
								if(error){
									return callback(error);
								}
								
								if(environment){
									return callback(null, oneEnv.toUpperCase());
								}
								
								return callback(null, null);
							});
						}, function (error, envsList) {
							
							for(var i = envsList.length -1; i>=0; i--){
								if(!envsList[i]){
									envsList.splice(i, 1);
								}
							}
							
							data.getEnvInfo(soajs, BL.model, {envList: envsList}, function (error, result) {
								checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
									var response = {};
									result.forEach(function(oneEnvRec){
										if(!response[oneEnvRec.code.toLowerCase()]){
											response[oneEnvRec.code.toLowerCase()] = {};
										}
										response[oneEnvRec.code.toLowerCase()]['domain'] = oneEnvRec.apiPrefix + "." + oneEnvRec.domain;
									});
									//grab the list of tenant that have ext key in requested env and return tenant code, package nad key as part of response
									getTenants(response, function(error) {
										checkIfError(soajs, res, {config: config, error: error}, function () {
											return res.jsonp(soajs.buildResponse(null, response));
										});
									});
								});
							});
						});
					});
				});
			});
		}
		
		/**
		 * Get the tenant that have external keys in each evnrionment.
		 * @param {Object} output
		 * @param {Function} cb
		 * @returns {*}
		 */
		function getTenants(output, cb){
			if(checkACL()){
				var envCodes = Object.keys(output);
				async.each(envCodes, function(oneEnvCode, mCb){
					var opts = {
						"collection": "tenants",
						"condition":{
							'applications.keys.extKeys.env': oneEnvCode.toUpperCase()
						}
					};
					BL.model.findEntries(soajs, opts, function(error, tenants){
						if(error){ return mCb(error); }
						
						if(tenants.length === 0){ return mCb(null); }
						
						output[oneEnvCode]['tenants'] = [];
						
						tenants.forEach(function(oneTenant){
							oneTenant.applications.forEach(function(oneApp){
								oneApp.keys.forEach(function(oneKey){
									oneKey.extKeys.forEach(function(oneExtKey){
										if(oneExtKey.env === oneEnvCode.toUpperCase()){
											output[oneEnvCode]['tenants'].push({
												code: oneTenant.code,
												package: oneApp.package,
												extKey: oneExtKey.extKey
											});
										}
									});
								});
							});
						});
						return mCb(null);
					});
				}, cb);
			}
			else{
				return cb();
			}
		}
		
		/**
		 * Check if the user has access to list tenants
		 * @returns {*|{result, error}|{result}}
		 */
		function checkACL(){
			var ACL;
			var myGroup;
			if(soajs.uracDriver){
				ACL = soajs.uracDriver.getAcl();
				myGroup = soajs.uracDriver.getProfile().groups;
			}
			
			if(!ACL){
				if(soajs.tenant.application.acl_all_env && Object.keys(soajs.tenant.application.acl_all_env).length > 0){
					ACL = soajs.tenant.application.acl_all_env['dashboard'];
				}
				else if(soajs.tenant.application.acl && Object.keys(soajs.tenant.application.acl).length > 0){
					ACL = soajs.tenant.application.acl;
				}
				else if(soajs.tenant.application.package_acl_all_env && Object.keys(soajs.tenant.application.package_acl_all_env).length > 0){
					ACL = soajs.tenant.application.package_acl_all_env['dashboard'];
				}
				else{
					if(soajs.tenant.application.package_acl && Object.keys(soajs.tenant.application.package_acl).length > 0){
						ACL = soajs.tenant.application.package_acl;
					}
				}
			}
			
			if(!ACL){
				return false;
			}
			return _api.checkPermission(ACL['dashboard'], myGroup, "/tenant/list", "get");
		}
		
		/**
		 * Object that provides methods to check if the requested API is accessible or not
		 * @type {{checkPermission: checkPermission, checkAccess: checkAccess}}
		 * @private
		 */
		var _api = {
			"checkPermission": function (system, myGroup, route, method) {
				if(system && system[method] && Object.keys(system[method]).length > 0){
					if(Object.hasOwnProperty(system[method], 'access') || Object.hasOwnProperty.call(system[method],'apis') || Object.hasOwnProperty.call(system[method],'apisRegExp') || Object.hasOwnProperty.call(system[method],'apisPermission')){
						system = system[method];
					}
				}
				
				var api = system && system.apis ? system.apis[route] : null;
				if (!api && system && system.apisRegExp && Object.keys(system.apisRegExp).length) {
					for (var jj = 0; jj < system.apisRegExp.length; jj++) {
						if (system.apisRegExp[jj].regExp && route.match(system.apisRegExp[jj].regExp)) {
							api = system.apisRegExp[jj];
						}
					}
				}
				
				if (system && 'restricted' === system.apisPermission) {
					if (!api)
						return false;
					return _api.checkAccess(api.access, myGroup);
				}
				if (!api)
					return true;
				
				return _api.checkAccess(api.access, myGroup);
			},
			
			"checkAccess": function (apiAccess, myGroup) {
				if (!apiAccess)
					return true;
				
				if (apiAccess instanceof Array) {
					if (!myGroup)
						return false;
					
					for (var ii = 0; ii < myGroup.length; ii++) {
						if (apiAccess.indexOf(myGroup[ii]) !== -1)
							return true;
					}
					return false;
				}
				else
					return true;
			}
		};
	},

    "maintenanceOperation": function (config, soajs, res) {
        soajs.inputmaskData.env = soajs.inputmaskData.env.toLowerCase();
        checkIfError(soajs, res, {
            config: config,
            error: soajs.inputmaskData.operation === 'awarenessStat' && soajs.inputmaskData.serviceName !== 'controller',
            code: 602
        }, function () {
            checkIfError(soajs, res, {
                config: config,
                error: soajs.inputmaskData.operation === 'loadProvision' && soajs.inputmaskData.serviceName === 'controller',
                code: 602
            }, function () {
                //check that the given service has the given port in services collection
                if (soajs.inputmaskData.serviceName === 'controller') {
                    checkServiceHost();
                }
                else {
                    data.getService(soajs, BL.model, {
                        'name': soajs.inputmaskData.serviceName,
                        'port': soajs.inputmaskData.servicePort
                    }, function (error, record) {
                        checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                            if (!record) {
                                data.getDaemon(soajs, BL.model, {
                                    'name': soajs.inputmaskData.serviceName,
                                    'port': soajs.inputmaskData.servicePort
                                }, function (error, record) {
                                    checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                                        checkIfError(soajs, res, {config: config, error: !record, code: 604}, function () {
                                            checkServiceHost();
                                        });
                                    });
                                });
                            }
                            else {
                                //check that the given service has the given host in hosts collection
                                checkServiceHost();
                            }
                        });
                    });
                }
            });
        });

        function checkServiceHost() {
            data.getOneHost(soajs, BL.model, soajs.inputmaskData.env, soajs.inputmaskData.serviceName, soajs.inputmaskData.serviceHost, soajs.inputmaskData.hostname, function (error, record) {
                checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                    checkIfError(soajs, res, {config: config, error: !record, code: 605}, function () {
                        //perform maintenance operation
                        doMaintenance(record);
                    });
                });
            });
        }

        function doMaintenance(oneHost) {
            data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
                checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {
                    if (!envRecord.deployer) {
                        soajs.log.error('Missing deployer obj');
                    }

                    soajs.inputmaskData.servicePort = soajs.inputmaskData.servicePort + 1000;
                    var maintenanceURL = "http://" + oneHost.ip + ":" + soajs.inputmaskData.servicePort;
                    maintenanceURL += "/" + soajs.inputmaskData.operation;
                    request.get(maintenanceURL, function (error, response, body) {
                        checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                            return res.jsonp(soajs.buildResponse(null, JSON.parse(body)));
                        });
                    });
                });
            });
        }
    }
};

module.exports = {
    "init": function (modelName, cb) {
        var modelPath;

        if (!modelName) {
            return cb(new Error("No Model Requested!"));
        }

        modelPath = __dirname + "/../models/" + modelName + ".js";
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
