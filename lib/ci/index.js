'use strict';
var fs = require('fs');
var async = require('async');
var path = require('path');
var yamljs = require("yamljs");
var EasyZip = require('easy-zip').EasyZip;
var soajsUtils = require('soajs').utils;
var colName = 'cicd';

var utils = require("../../utils/utils.js");

function checkIfError (req, mainCb, data, cb) {
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

var helpers = {
	buildEnvVarsList: function (gitToken, model, config, req, cb) {
		var opts = {
			collection: 'environment',
			conditions: { 'code': process.env.SOAJS_ENV.toUpperCase() },
			fields: {
				'domain': 1,
				'apiPrefix': 1
			}
		};
		model.findEntry(req.soajs, opts, function (error, reg) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				var response = {
					'SOAJS_CD_AUTH_KEY': req.soajs.tenant.key.eKey,
					'SOAJS_CD_DEPLOY_TOKEN': gitToken,
					'SOAJS_CD_DASHBOARD_DOMAIN': reg.apiPrefix + "." + reg.domain,
					'SOAJS_CD_API_ROUTE': '/cd/deploy',
					'SOAJS_CD_DASHBOARD_PORT': '' + req.soajs.inputmaskData.port,
					'SOAJS_CD_DASHBOARD_PROTOCOL': req.protocol
				};
				return cb(response);
			});
		});
	},
	/**
	 * Function that cleans user-provided environment variables from any SOAJS computed variables
	 * @param  {Object} vars
	 * @return {Object}
	 */
	cleanEnvVarsList: function (vars) {
		if (vars && Object.keys(vars).length > 0) {
			delete vars[ 'SOAJS_CD_AUTH_KEY' ];
			delete vars[ 'SOAJS_CD_DEPLOY_TOKEN' ];
			delete vars[ 'SOAJS_CD_DASHBOARD_DOMAIN' ];
			delete vars[ 'SOAJS_CD_API_ROUTE' ];
			delete vars[ 'SOAJS_CD_DASHBOARD_PORT' ];
			delete vars[ 'SOAJS_CD_DASHBOARD_PROTOCOL' ];
		}

		return vars;
	}
};
var BL = {

	model: null,

	/**
	 * Function that lists all CI accounts
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	listCIAccounts: function (config, req, cb) {
		var opts = {
			collection: colName,
			conditions: { "type": "account" }
		};

		BL.model.findEntries(req.soajs, opts, function (error, accounts) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				return cb(null, accounts);
			});
		});
	},

	/**
	 * Function that lists unique available CI providers
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	listUniqueProviders: function (config, req, cb) {
		var opts = {
			collection: colName,
			conditions: { "type": "account" },
			fields: 'provider'
		};
		
		if(req.soajs.inputmaskData.owner){
			opts.conditions.owner = req.soajs.inputmaskData.owner;
		}
		
		BL.model.distinctEntries(req.soajs, opts, function (error, providers) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				
				opts = {
					collection: colName,
					conditions: {
						"type": "recipe",
						"provider" : {"$in": providers}
					}
				};
				BL.model.findEntries(req.soajs, opts, function(error, recipes){
					checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
						var output = {};
						
						async.each(providers, function (oneProvider, callback) {
							if(!output[oneProvider]){
								output[oneProvider] = [];
							}
							
							async.each(recipes, function(oneRecipe, mCb){
								if(oneRecipe.provider === oneProvider){
									output[oneProvider].push(oneRecipe);
								}
								mCb();
							}, callback);
						}, function () {
							return cb(null, output);
						});
						
					});
				});
			});
		});
	},

	/**
	 * Function that deactivates a CI account
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	deactivateProvider: function (config, req, cb) {
		var opts = {
			collection: colName,
			conditions: {
				type: "account",
				owner: req.soajs.inputmaskData.owner,
				provider: req.soajs.inputmaskData.provider
			}
		};

		BL.model.removeEntry(req.soajs, opts, function (error) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				return cb(null, true);
			});
		});
	},
	
	/**
	 * Function that activates a CI account
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	activateProvider: function(config, req, ciDriver, cb){
		var opts = {
			collection: colName,
			conditions: {
				type: "account",
				owner: req.soajs.inputmaskData.owner,
				provider: req.soajs.inputmaskData.provider
			}
		};
		
		//if id --> check if another account has the same provider and owner
		if(req.soajs.inputmaskData.id){
			BL.model.validateId(req.soajs);
			opts.conditions._id = {"$ne": req.soajs.inputmaskData.id};
		}
		BL.model.countEntries(req.soajs, opts, function(error, count){
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				checkIfError(req, cb, { config: config, error: (count && count === 1), code: 968 }, function () {
					
					var settings = {
						log : req.soajs.log,
						settings: {
							domain: req.soajs.inputmaskData.domain,
							gitToken: req.soajs.inputmaskData.gitToken
						},
						driver: req.soajs.inputmaskData.provider
					};
					req.soajs.log.debug("retrieving authorization code from provider" , req.soajs.inputmaskData.provider, "for account", req.soajs.inputmaskData.owner);
					ciDriver.generateToken(settings, function (error, authToken) {
						checkIfError(req, cb, {config: config, error: error, code: 969}, function () {
							opts = {
								collection:colName,
								conditions: {},
								fields: {
									"$set": {
										"type": "account",
										"owner": req.soajs.inputmaskData.owner,
										"provider": req.soajs.inputmaskData.provider,
										"gitToken": req.soajs.inputmaskData.gitToken,
										"domain": req.soajs.inputmaskData.domain,
										"ciToken": authToken
									}
								},
								options: {
									safe: true,
									multi: false,
									upsert: true
								}
							};
							
							//if id --> update
							if(req.soajs.inputmaskData.id){
								opts.conditions = {
									"_id" : req.soajs.inputmaskData.id
								};
								opts.options.upsert = false;
							}
							BL.model.updateEntry(req.soajs, opts, function(error){
								checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
									return cb(null, true);
								});
							});
						});
					});
				});
			});
		});
	},

	/**
	 * Function that saves CI config
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	saveConfig: function (config, req, ciDriver, cb) {
		req.soajs.inputmaskData.config.type = "ci";
		var opts = {
			collection: colName,
			conditions: {
				"type": "ci"
			},
			fields: req.soajs.inputmaskData.config,
			options: { upsert: true }
		};
		if (req.soajs.inputmaskData.config.recipe && req.soajs.inputmaskData.config.recipe.trim() !== '') {
			try {
				var jsonYaml = yamljs.parse(req.soajs.inputmaskData.config.recipe);
			}
			catch (e){
				req.soajs.log.error(e);
				return cb({"code": 984, "msg": config.errors[984]});
			}
			if (typeof jsonYaml !== "object"){
				return cb({"code": 984, "msg": config.errors[984]});
			}
			if (!(jsonYaml && jsonYaml.after_success)) {
				jsonYaml.after_success = [];
			}
			if (jsonYaml && jsonYaml.after_success && jsonYaml.after_success.indexOf("node ./soajs.cd.js") === -1) {
				jsonYaml.after_success.push("node ./soajs.cd.js");
			}
			req.soajs.inputmaskData.config.recipe = yamljs.stringify(jsonYaml, 4, 4);
		}
		doSave();

		function doSave () {
			BL.model.updateEntry(req.soajs, opts, function (error) {
				checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
					return cb(null, true);
				});
			});
		}
	},

	/**
	 * Function that deletes CI config from data store
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	deleteConfig: function (config, req, ciDriver, cb) {
		var opts = { collection: colName, conditions: { "type": "ci" } };
		BL.model.removeEntry(req.soajs, opts, function (error) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				return cb(null, true);
			});
		});
	},

	/**
	 * Function that streams CI recipe
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	downloadRecipe: function (config, req, res, cb) {
		BL.model.validateId(req.soajs);
		var opts = {
			collection: colName,
			conditions: {
				"type": "recipe",
				"id": req.soajs.inputmaskData.id
			}
		};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				var driver = record.provider, recipe = record.recipe;
				
				var zip = new EasyZip();
				zip.file('.' + driver + '.yml', recipe);
				zip.writeToResponse(res, 'ci-' + record.name.toLowerCase().replace(/\s+/g, ' ').replace(/\s/g, '-') + '.zip');
			});
		});
	},
	
	downloadScript: function( config, req, res, cb){
		var zip = new EasyZip();
		var ciTmpl = path.join(config.templates.path, 'ci/');
		var fileName = req.soajs.inputmaskData.provider || "soajs.cd";
		var scriptPath = path.join(ciTmpl, fileName + '.js');
		var files = [
			{ source: scriptPath, target: fileName + '.js' }
		];
		zip.batchAdd(files, function () {
			zip.writeToResponse(res, fileName + '.zip');
		});
	},

	/**
	 * Function that turns On/Off Repo CI
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	toggleRepoStatus: function (config, req, ciDriver, cb) {
		var opts = {
			collection: colName,
			conditions: { "type": "ci" }
		};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {

				var options = record;
				options.hook = {
					id: req.soajs.inputmaskData.id,
					active: req.soajs.inputmaskData.enable
				};
				options.log = req.soajs.log;
				ciDriver.setHook(options, function (error) {
					checkIfError(req, cb, { config: config, error: error, code: 969 }, function () {
						return cb(null, true);
					});
				});
			});
		});
	},

	/**
	 * Function that get the available environment variables and settings for one repository
	 * @param  {Object}   config
	 * @param  {Request Object}   req
	 * @param  {Function} cb
	 *
	 */
	getRepoSettings: function (config, req, ciDriver, cb) {
		var opts = {
			collection: colName,
			conditions: { "type": "ci" }
		};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {

				var options = record;
				options.log = req.soajs.log;
				options.params = {
					repoId: req.soajs.inputmaskData.id
				};
				ciDriver.listEnvVars(options, function (error, vars) {
					checkIfError(req, cb, {
						config: config,
						error: error,
						code: ((error) ? error.code : null)
					}, function () {
						ciDriver.listSettings(options, function (error, settings) {
							checkIfError(req, cb, {
								config: config,
								error: error,
								code: ((error) ? error.code : null)
							}, function () {
								return cb(null, { envs: vars, settings: settings });
							});
						});
					});
				});
			});
		});
	},

	/**
	 * Function that updates the environment variables and settings of one repository
	 * @param  {Object}   config
	 * @param  {Request Object}   req
	 * @param  {Function} cb
	 *
	 */
	updateRepoSettings: function (config, req, ciDriver, cb) {
		var opts = {
			collection: colName,
			conditions: { "type": "ci" }
		};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {

				var options = record;
				options.log = req.soajs.log;
				options.params = {
					repoId: req.soajs.inputmaskData.id,
					settings: req.soajs.inputmaskData.settings,
					variables: helpers.cleanEnvVarsList(req.soajs.inputmaskData.variables)
				};

				helpers.buildEnvVarsList(options.settings.gitToken, BL.model, config, req, function (soajsVars) {
					options.params.variables = Object.assign(options.params.variables, soajsVars);
					ciDriver.updateSettings(options, function (error) {
						checkIfError(req, cb, {
							config: config,
							error: error,
							code: ((error) ? error.code : null)
						}, function () {
							ciDriver.ensureRepoVars(options, function (error) {
								checkIfError(req, cb, {
									config: config,
									error: error,
									code: ((error) ? error.code : null)
								}, function () {
									return cb(null, true);
								});
							});
						});
					});
				});
			});
		});
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
		function requireModel (filePath, cb) {
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
