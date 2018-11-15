'use strict';
var fs = require('fs');
var async = require('async');
var path = require('path');
var yamljs = require("yamljs");
var EasyZip = require('easy-zip').EasyZip;
var colName = 'cicd';
var hash = require('object-hash');
var utils = require("../../utils/utils.js");

function checkIfError(req, mainCb, data, cb) {
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

var helpers = {
	buildEnvVarsList: function (gitToken, model, config, req, cb) {
		var opts = {
			collection: 'environment',
			conditions: {'code': process.env.SOAJS_ENV.toUpperCase()},
			fields: {
				'domain': 1,
				'apiPrefix': 1,
				'port': 1,
				'protocol': 1
			}
		};

		model.findEntry(req.soajs, opts, function (error, reg) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

				let apiPrefix;
				let domain;
				let protocol;
				let port;

				if(reg && reg.apiPrefix && reg.domain){
					apiPrefix = reg.apiPrefix;
					domain = reg.domain;
					port = reg.port || 80;
					protocol = reg.protocol || 'http';
				}
				else{
					if(process.env.SOAJS_SAAS && req.soajs.inputmaskData.soajs_project && req.soajs.registry.custom && req.soajs.registry.custom.ciConfig){
						let serviceConfig = req.soajs.servicesConfig.SOAJS_SAAS;
						if(serviceConfig && serviceConfig[req.soajs.inputmaskData.soajs_project]){
							apiPrefix = req.soajs.registry.custom.ciConfig.value.apiPrefix;
							domain = req.soajs.registry.custom.ciConfig.value.domain;
							protocol = req.soajs.registry.custom.ciConfig.value.protocol;
							port = req.soajs.registry.custom.ciConfig.value.port;
						}
					}
				}

				if(!domain || !apiPrefix){
					return cb({code: 955, msg: config.errors[955]});
				}


				var response = {
					'SOAJS_CD_AUTH_KEY': req.soajs.tenant.key.eKey,
					'SOAJS_CD_DEPLOY_TOKEN': gitToken,
					'SOAJS_CD_DASHBOARD_DOMAIN': apiPrefix + "." + domain,
					'SOAJS_CD_API_ROUTE': '/cd/deploy',
					'SOAJS_CD_DASHBOARD_PORT': '' + port,
					'SOAJS_CD_DASHBOARD_PROTOCOL': protocol
				};
				if(req.soajs.inputmaskData.soajs_project){
					response['SOAJS_PROJECT'] = req.soajs.inputmaskData.soajs_project;
				}
				return cb(null, response);
			});
		});
	},
	/**
	 * Function that cleans user-provided environment variables from any SOAJS computed variables
	 * @param  {Object} vars
	 * @return {Object}
	 */
	cleanEnvVarsList: function (vars) {
		let preDefined = ["SOAJS_CD_AUTH_KEY", "SOAJS_CD_DEPLOY_TOKEN","SOAJS_CD_DASHBOARD_DOMAIN","SOAJS_CD_API_ROUTE","SOAJS_CD_DASHBOARD_PORT","SOAJS_CD_DASHBOARD_PROTOCOL"];
		if (vars && vars.length > 0) {
			for (let x = vars.length - 1; x >= 0; x--) {
				if (preDefined.indexOf(vars[x].name) !== -1) {
					vars.splice(x, 1);
				}
			}
		}
		return vars;
	},
	/**
	 * Function that transforms environment variables object to array
	 * @param  {Object} vars
	 * @return {Object}
	 */
	transformVarList: function (vars) {
		let varArray = [];
		if (vars && Object.keys(vars).length > 0) {
			for (let key in vars) {
				if (vars.hasOwnProperty(key)) {
					varArray.push({
						"name": key,
						"value":vars[key]
					});
				}
			}
		}
		return varArray;
	},
	/**
	 * Function that parses yaml to json and creates sha1 checksum.
	 * @param {Request Object} req
	 * @param {Object} config
	 * @param {Function} mainCb
	 * @param {string} yaml
	 * @param {Function} cb
	 */
	parseYaml: function (req, config, mainCb, provider, yaml, cb) {
		try {
			var jsonYaml = yamljs.parse(yaml);
			var sha = hash.sha1(jsonYaml);
		}
		catch (e) {
			req.soajs.log.error(e);
			return mainCb({"code": 984, "msg": config.errors[984]});
		}
		if (typeof jsonYaml !== "object") {
			return mainCb({"code": 984, "msg": config.errors[984]});
		}

		switch (provider) {
			case 'travis':
				if (!(jsonYaml && jsonYaml.after_success)) {
					jsonYaml.after_success = [];
				}
				if (jsonYaml && jsonYaml.after_success && jsonYaml.after_success.indexOf("node ./soajs.cd.js") === -1) {
					jsonYaml.after_success.push("node ./soajs.cd.js");
				}

				break;
			case 'drone':
				if (!jsonYaml) {
					jsonYaml = {};
				}

				if (!jsonYaml.pipeline) {
					jsonYaml.pipeline = {};
				}

				jsonYaml.pipeline.triggerCD = {
					image: 'node:6.9.5', //NOTE: static value here, this image must refer to nodejs so that the CD script can run
					when: {status: ['success']},
					secrets: [
						{
							"source": "SOAJS_CD_AUTH_KEY",
							"target": "SOAJS_CD_AUTH_KEY"
						},
						{
							"source": "SOAJS_CD_DEPLOY_TOKEN",
							"target": "SOAJS_CD_DEPLOY_TOKEN"
						},
						{
							"source": "SOAJS_CD_DASHBOARD_DOMAIN",
							"target": "SOAJS_CD_DASHBOARD_DOMAIN"
						},
						{
							"source": "SOAJS_CD_API_ROUTE",
							"target": "SOAJS_CD_API_ROUTE"
						},
						{
							"source": "SOAJS_CD_DASHBOARD_PORT",
							"target": "SOAJS_CD_DASHBOARD_PORT"
						},
						{
							"source": "SOAJS_CD_DASHBOARD_PROTOCOL",
							"target": "SOAJS_CD_DASHBOARD_PROTOCOL"
						}
					],
					commands: ['npm install request', 'node ./soajs.cd.js']
				};
				break;
		}
		return cb(sha, jsonYaml);
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
			conditions: {"type": "account"}
		};

		if (req.soajs.inputmaskData.owner) {
			opts.conditions['owner'] = req.soajs.inputmaskData.owner;
		}

		BL.model.findEntries(req.soajs, opts, function (error, accounts) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

				var activeAccounts = [];
				accounts.forEach(function (oneAccount) {
					if (activeAccounts.indexOf(oneAccount) === -1) {
						activeAccounts.push(oneAccount);
					}
				});

				var opts = {
					collection: "git_accounts",
					conditions: {
						"owner": {"$nin": activeAccounts}
					},
					fields: {token: 0, repos: 0}
				};

				if (req.soajs.inputmaskData.owner) {
					opts.conditions['owner'] = req.soajs.inputmaskData.owner;
				}

				BL.model.findEntries(req.soajs, opts, function (error, gitAccounts) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

						gitAccounts.forEach(function (oneGitAccount) {
							var skip = false;
							accounts.forEach(function (oneCiAccount) {
								if (oneCiAccount.owner === oneGitAccount.owner && oneCiAccount.gitProvider === oneGitAccount.provider) {
									skip = true;
								}
							});
							if (!skip) {
								accounts.push({
									"owner": oneGitAccount.owner,
									"gitProvider": oneGitAccount.provider
								})
							}
						});
						if (req.soajs.inputmaskData.variables) {
							async.each(accounts, function (oneAccount, callback) {
								helpers.buildEnvVarsList(oneAccount.gitToken, BL.model, config, req, function (error, soajsVars) {
									if(error){
										return callback(error);
									}
									oneAccount.variables = soajsVars;
									return callback();
								});

							}, function (error) {
								if (error) {
									return cb(error);
								}
								return cb(null, accounts);
							});
						}
						else {
							return cb(null, accounts);
						}
					});
				});
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
			conditions: {"type": "account"},
			fields: 'provider'
		};

		if (req.soajs.inputmaskData.owner) {
			opts.conditions.owner = req.soajs.inputmaskData.owner;
		}
		if (req.soajs.inputmaskData.provider) {
			opts.conditions.provider = req.soajs.inputmaskData.provider;
		}

		BL.model.distinctEntries(req.soajs, opts, function (error, providers) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

				opts = {
					collection: colName,
					conditions: {
						"type": "recipe",
						"provider": {"$in": providers}
					}
				};
				BL.model.findEntries(req.soajs, opts, function (error, recipes) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
						var output = {};

						async.each(providers, function (oneProvider, callback) {
							if (!output[oneProvider]) {
								output[oneProvider] = [];
							}

							async.each(recipes, function (oneRecipe, mCb) {
								if (oneRecipe.provider === oneProvider) {
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
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				return cb(null, true);
			});
		});
	},

	/**
	 * Function that activates a CI account
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Request Object}     ciDriver
	 * @param  {Function}           cb
	 *
	 */
	activateProvider: function (config, req, ciDriver, cb) {
		var opts = {
			collection: colName,
			conditions: {
				type: "account",
				owner: req.soajs.inputmaskData.owner,
				provider: req.soajs.inputmaskData.provider
			}
		};
		//if id --> check if another account has the same provider and owner
		if (req.soajs.inputmaskData.id) {
			BL.model.validateId(req.soajs);
			opts.conditions._id = {"$ne": req.soajs.inputmaskData.id};
		}
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				checkIfError(req, cb, {config: config, error: (count && count === 1), code: 968}, function () {

					var settings = {
						log: req.soajs.log,
						settings: {
							domain: req.soajs.inputmaskData.domain,
							gitToken: req.soajs.inputmaskData.gitToken
						},
						driver: req.soajs.inputmaskData.provider
					};
					req.soajs.log.debug("retrieving authorization code from provider", req.soajs.inputmaskData.provider, "for account", req.soajs.inputmaskData.owner);
					ciDriver.generateToken(settings, function (error, authToken) {
						checkIfError(req, cb, {config: config, error: error, code: 969}, function () {
							opts = {
								collection: colName,
								conditions: {
									"type": "account",
									"owner": req.soajs.inputmaskData.owner,
									"provider": req.soajs.inputmaskData.provider
								},
								fields: {
									"$set": {
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

							if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version')) {
								opts.fields['$set'].version = req.soajs.inputmaskData.version;
							}
							else {
								opts.fields['$unset'] = {
									version: {}
								};
							}

							//if id --> update
							if (req.soajs.inputmaskData.id) {
								opts.conditions = {
									"_id": req.soajs.inputmaskData.id
								};
								opts.options.upsert = false;
							}
							BL.model.updateEntry(req.soajs, opts, function (error) {
								checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
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
	 * Function that streams CI recipe
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Request Object}     res
	 * @param  {Function}           cb
	 *
	 */
	downloadRecipe: function (config, req, res, cb) {
		BL.model.validateId(req.soajs);
		var opts = {
			collection: colName,
			conditions: {
				"type": "recipe",
				"_id": req.soajs.inputmaskData.id
			}
		};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				BL.model.closeConnection(req.soajs);
				var driver = record.provider, recipe = record.recipe;
				var zip = new EasyZip();
				zip.file('.' + driver + '.yml', recipe);
				zip.writeToResponse(res, 'ci-' + record.name.toLowerCase().replace(/\s+/g, ' ').replace(/\s/g, '-') + '.zip');
			});
		});
	},

	/**
	 * Function that streams the CD Script
	 * @param config
	 * @param req
	 * @param res
	 */
	downloadScript: function (config, req, res) {
		var zip = new EasyZip();
		var ciTmpl = path.join(config.templates.path, 'ci/');
		var fileName = "soajs.cd";
		var scriptPath = path.join(ciTmpl, fileName + '.js');
		var files = [
			{source: scriptPath, target: fileName + '.js'}
		];
		zip.batchAdd(files, function () {
			zip.writeToResponse(res, fileName + '.zip');
		});
	},

	/**
	 * Function that adds/updates CI recipe
	 * @param config
	 * @param req
	 * @param cb
	 */
	addRecipe: function (config, req, cb) {
		var opts = {
			collection: colName,
			conditions: {
				"type": "recipe",
				"provider": req.soajs.inputmaskData.provider,
				"name": req.soajs.inputmaskData.name
			}
		};
		//if id --> check if recipe name already exists for this provider.
		if (req.soajs.inputmaskData.id) {
			BL.model.validateId(req.soajs);
			opts.conditions._id = {"$ne": req.soajs.inputmaskData.id};
		}
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				checkIfError(req, cb, {config: config, error: (count && count === 1), code: 967}, function () {
					var sha = '';
					if (req.soajs.inputmaskData.recipe && req.soajs.inputmaskData.recipe.trim() !== '') {
						helpers.parseYaml(req, config, cb, req.soajs.inputmaskData.provider, req.soajs.inputmaskData.recipe, function (sha1, jsonYaml) {
							req.soajs.inputmaskData.recipe = yamljs.stringify(jsonYaml, 4, 4);
							sha = sha1;
							doAddRecipe(sha);
						});
					}
					else {
						doAddRecipe();
					}
				});
			});
		});

		function doAddRecipe(sha) {
			opts = {
				collection: colName,
				conditions: {
					"type": "recipe",
					"provider": req.soajs.inputmaskData.provider,
					"name": req.soajs.inputmaskData.name,
				},
				fields: {
					"$set": {
						"recipe": req.soajs.inputmaskData.recipe
					}
				},
				options: {
					safe: true,
					multi: false,
					upsert: true
				}
			};
			if (sha) {
				opts.fields['$set'].sha = sha;
			}

			if (req.soajs.inputmaskData.id) {
				opts.conditions['_id'] = req.soajs.inputmaskData.id;
				opts.options.upsert = false;
			}

			BL.model.updateEntry(req.soajs, opts, function (error) {
				checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
					return cb(null, true);
				});
			});
		}
	},

	/**
	 * Function that deletes CI recipe
	 * @param config
	 * @param req
	 * @param cb
	 */
	deleteRecipe: function (config, req, cb) {
		BL.model.validateId(req.soajs);
		var opts = {
			collection: colName,
			conditions: {"_id": req.soajs.inputmaskData.id}
		};
		BL.model.removeEntry(req.soajs, opts, function (error) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				return cb(null, true);
			});
		});
	},
	
	/**
	 * Function that turns On/Off Repo CI
	 * @param  {Object}             config
	 * @param  {Object}     req
	 * @param  {Object}     ciDriver
	 * @param  {Function}           cb
	 *
	 */
	toggleRepoStatus: function (config, req, ciDriver, cb) {
		var opts = {
			collection: colName,
			conditions: {
				"type": "account",
				"owner": req.soajs.inputmaskData.owner,
				"provider": req.soajs.inputmaskData.provider
			}
		};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error || !record, code: 600}, function () {
				var repo = req.soajs.inputmaskData.id;
				var options = {
					driver: record.provider,
					settings: {
						ciToken: record.ciToken,
						domain: record.domain,
						owner: record.owner,
						repo: repo
					},
					log: req.soajs.log
				};

				if (record.version) {
					options.settings.version = record.version;
				}

				ciDriver.listRepos(options, function (error, reposFromCi) {
					checkIfError(req, cb, {
						config: config,
						error: error,
						code: ((error) ? error.code : null)
					}, function () {
						req.soajs.inputmaskData.id = reposFromCi[0].id;

						var options = {
							'driver': record.provider,
							'settings': {
								domain: record.domain,
								ciToken: record.ciToken,
								owner: record.owner,
								repo: repo
							},
							hook: {
								id: req.soajs.inputmaskData.id,
								active: req.soajs.inputmaskData.enable
							},
							log: req.soajs.log
						};
						ciDriver.setHook(options, function (error) {
							checkIfError(req, cb, {config: config, error: error, code: 969}, function () {
								return cb(null, true);
							});
						});

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
		var repoOwner = req.soajs.inputmaskData.id.split(/\/(.+)/)[0];
		var opts = {
			collection: colName,
			conditions: {
				"type": "account",
				"owner": req.soajs.inputmaskData.owner,
				"provider": req.soajs.inputmaskData.provider
			}
		};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error || !record, code: 600}, function () {
				var repo = req.soajs.inputmaskData.id;
				var options = {
					driver: record.provider,
					settings: {
						ciToken: record.ciToken,
						domain: record.domain,
						owner: repoOwner,
						repo: repo
					},
					log: req.soajs.log
				};

				if (record.version) {
					options.settings.version = record.version;
				}

				ciDriver.listRepos(options, function (error, reposFromCi) {
					checkIfError(req, cb, {
						config: config,
						error: error,
						code: ((error) ? error.code : null)
					}, function () {
						req.soajs.inputmaskData.id = reposFromCi[0].id;
						record.active = reposFromCi[0].active;
						record.repoName = repo.split(/\/(.+)/)[1];
						doGetSettings(record);
					});
				});
			});
		});

		function doGetSettings(record) {
			var options = {
				driver: record.provider,
				settings: {
					ciToken: record.ciToken,
					domain: record.domain,
					owner: repoOwner,
					repo: record.repoName
				},
				log: req.soajs.log,
				params: {
					repoId: req.soajs.inputmaskData.id
				}
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
							if (!settings.active) {
								settings.active = record.active;
							}
							settings.repoCiId = req.soajs.inputmaskData.id;
							return cb(null, {envs: vars, settings: settings});
						});
					});
				});
			});
		}
	},

	/**
	 * Function that updates the environment variables and settings of one repository
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   ciDriver
	 * @param  {Function} cb
	 *
	 */
	updateRepoSettings: function (config, req, ciDriver, cb) {
		var opts = {
			collection: colName,
			conditions: {
				"type": "account",
				"owner": req.soajs.inputmaskData.owner,
				"provider": req.soajs.inputmaskData.provider
			}
		};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error || !record, code: 600}, function () {
				var options = {
					driver: record.provider,
					settings: {
						ciToken: record.ciToken,
						domain: record.domain,
						owner: record.owner,
						gitToken: record.gitToken
					},
					log: req.soajs.log,
					params: {
						variables: helpers.cleanEnvVarsList(req.soajs.inputmaskData.variables),
						settings: req.soajs.inputmaskData.settings
					}
				};
				if (isNaN(req.soajs.inputmaskData.id) && req.soajs.inputmaskData.id.indexOf("/") !== -1) {
					options.params.repoId = req.soajs.inputmaskData.id.split(/\/(.+)/)[1];
					options.params.repoOwner = req.soajs.inputmaskData.id.split("/")[0];
				}
				else {
					options.params.repoId = req.soajs.inputmaskData.id;
				}
				helpers.buildEnvVarsList(options.settings.gitToken, BL.model, config, req, function (error, soajsVars) {
					checkIfError(req, cb, {
						config: config,
						error: error,
						code: ((error) ? error.code : null)
					}, function () {
						options.params.variables = options.params.variables.concat(helpers.transformVarList(soajsVars));
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
		});
	},

	/**
	 * Function that returns the content of the provider file name
	 * @param {Object} config
	 * @param {Request Object} req
	 * @param {Object} ciDriver
	 * @param {Object} git
	 * @param {Object} gitHelpers
	 * @param {Object} gitModel
	 * @param {Object} gitBL
	 * @param {Function} cb
	 */
	getRepoYamlFile: function (config, req, ciDriver, git, gitHelpers, gitModel, gitBL, cb) {
		ciDriver.getFileName({
			driver: req.soajs.inputmaskData.provider
		}, function (error, fileName) {
			req.soajs.inputmaskData.filepath = "/" + fileName;
			gitModel.getAccount(req.soajs, gitBL.model, {
				owner: req.soajs.inputmaskData.owner,
				repo: req.soajs.inputmaskData.repo
			}, function (error, account) {
				checkIfError(req, cb, {config: config, error: error || !account, code: 757}, function () {
					gitHelpers.doGetFile(req, BL, git, gitModel, account, req.soajs.inputmaskData.branch, function (err, fileData) {
						if (error || !fileData) {
							return cb(error, null);
						}
						var res = {};
						helpers.parseYaml(req, config, cb, req.soajs.inputmaskData.provider, fileData.content, function (sha1) {
							res.sha = sha1;
							res.file = fileData.content;
							cb(null, res);
						});
					});
				});
			});
		});
	},

	/**
	 * Function that returns the latest build of a repo per branch from provider
	 * @param config
	 * @param req
	 * @param ciDriver
	 * @param cb
	 */
	getRepoBuilds: function (config, req, ciDriver, git, gitHelpers, gitModel, gitBL, cb) {

		function mapDeployStrategy(envCode, buildResponse, currentCDData){
			if(buildResponse[currentCDData.branch] &&
				currentCDData.strategy &&
				currentCDData.options &&
				currentCDData.options.gitSource &&
				currentCDData.options.gitSource.owner === req.soajs.inputmaskData.owner &&
				currentCDData.options.gitSource.repo === req.soajs.inputmaskData.repo.split("/")[1]
			) {
				if(!buildResponse[currentCDData.branch].deploy){
					buildResponse[currentCDData.branch].deploy = {};
				}
				buildResponse[currentCDData.branch].deploy[envCode] = currentCDData.strategy;
			}
		}

		async.parallel({
			"ciProviderInfo": (mCb) => {
				let opts = {
					collection: colName,
					conditions: {
						"type": "account",
						"owner": req.soajs.inputmaskData.owner,
						"provider": req.soajs.inputmaskData.provider
					}
				};
				BL.model.findEntry(req.soajs, opts, mCb);
			},
			"gitAccountInfo": (mCb) => {
				let opts = {
					collection: "git_accounts",
					conditions: {
						"owner": req.soajs.inputmaskData.owner
					}
				};
				BL.model.findEntry(req.soajs, opts, mCb);
			},
			"getCD": (mCb) => {
				let opts = {
					collection: "cicd",
					conditions: {
						"type": "cd"
					}
				};
				BL.model.findEntry(req.soajs, opts, mCb);
			}
		}, (error, record) => {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				checkIfError(req, cb, {config: config, error: !record.ciProviderInfo || !record.gitAccountInfo, code: 969}, function () {
					var options = {
						driver: record.ciProviderInfo.provider,
						settings: {
							ciToken: record.ciProviderInfo.ciToken,
							domain: record.ciProviderInfo.domain,
							owner: record.gitAccountInfo.owner,
							gitToken: record.ciProviderInfo.gitToken
						},
						log: req.soajs.log,
						params: {
							repo: req.soajs.inputmaskData.repo,
							gitDomain: record.gitAccountInfo.domain
						}
					};

					ciDriver.getRepoBuilds(options, function (error, buildResponse) {
						checkIfError(req, cb, {
							config: config,
							error: error,
							code: ((error) ? error.code : null)
						}, function () {
							if (record.getCD) {
								delete record.getCD.type;
								delete record.getCD._id;

								for (let envCode in record.getCD) {
									for (let service in record.getCD[envCode]) {
										switch (record.getCD[envCode][service].type) {
											case 'service':
												//check in versions
												for (let version in record.getCD[envCode][service]) {
													let currentCDData = record.getCD[envCode][service][version];
													mapDeployStrategy(envCode, buildResponse, currentCDData);
												}
												break;
											case 'daemon':
												// check in groups and versions
												for (let version in record.getCD[envCode][service]) {
													for (let groupName in record.getCD[envCode][service][version]) {
														let currentCDData = record.getCD[envCode][service][version][groupName];
														mapDeployStrategy(envCode, buildResponse, currentCDData);
													}
												}
												break;
											case 'custom':
												//skip
												continue;
												break;
										}
									}
								}
							}

							let branches = Object.keys(buildResponse);
							async.each(branches, (oneBranchName, mCb) => {
								if (buildResponse[oneBranchName].config) {
									return mCb();
								}
								req.soajs.inputmaskData.branch = oneBranchName;
								req.soajs.inputmaskData.repo = req.soajs.inputmaskData.repo.split("/")[1];

								BL.getRepoYamlFile(config, req, ciDriver, git, gitHelpers, gitModel, gitBL, (error, file) => {
									if (error) {
										return mCb(error);
									}
									buildResponse[oneBranchName].config = file.file;
									return mCb();
								});
							}, (error) => {
								checkIfError(req, cb, {
									config: config,
									error: error,
									code: ((error) ? error.code : null)
								}, function () {
									return cb(null, buildResponse);
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
