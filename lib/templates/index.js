'use strict';
const fs = require("fs");
const async = require("async");
const formidable = require('formidable');
const EasyZip = require('easy-zip').EasyZip;
const utils = require("../../utils/utils.js");
const helper = require("./helper");

let modelName = "mongo";
const externalModules = {
	ci: {
		module: require("../ci/index")
	},
	catalog: {
		module: require("../catalog/index")
	},
	endpoint: {
		module: require("../apiBuilder/index")
	},
	daemons: {
		module: require("../daemons/index")
	},
	iac: {
		module: require("../cloud/infra/index")
	}
};

const lib = {
	initBLModel: function (module, cb) {
		externalModules[module].module.init(modelName, cb);
	},
	
	checkReturnError: function (req, mainCb, data, cb) {
		if (data.error) {
			if (typeof (data.error) === 'object') {
				req.soajs.log.error(data.error);
			}
			let code = data.error.code ? data.error.code : data.code;
			let msg = data.error.msg ? data.error.msg : data.config.errors[data.code];
			return mainCb({ "code": code, "msg": msg });
		} else {
			if (cb) {
				return cb();
			}
		}
	}
};

const BL = {
	
	"getTemplates": function (config, req, res, cbMain) {
		let opts = {
			collection: "templates",
			conditions: {
				"type": "_template",
				"envCode": {
					"$exists": false
				}
			}
		};
		
		if (req.soajs.inputmaskData.fullList) {
			opts.conditions = {
				"type": {
					"$nin": ["_import", "_infra"]
				},
				"envCode": {
					"$exists": false
				}
			};
		}

		let envOpts = {
			collection: "templates",
			conditions: {
				"envCode": {
					"$exists": true
				}
			}
		};

		let names = [];
		let validTemplates = [];

		BL.model.findEntries(req.soajs, envOpts, function (error, envTemplates) {
			lib.checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
				async.each(envTemplates, (oneTemplate, cb) => {
					names.push(oneTemplate.name);
					return cb();
				}, () => {
					BL.model.findEntries(req.soajs, opts, function (error, templates) {
						lib.checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
							async.each(templates, (template, mCb) => {
								if (!req.soajs.inputmaskData.fullList) {
									if (template.reusable === false && names.indexOf(template.name) !== -1) {
										return mCb();
									}
								}
								// transform the  __dot__ -> .
								utils.accommodateDeployTemplateForMongo(template.deploy, false, () => {
									validTemplates.push(template);
									return mCb();
								});

							}, () => {
								return cbMain(null, validTemplates);
							});
						});
					});
				});
			});
		});
	},
	
	"deleteTemplate": function (config, req, res, cbMain) {
		BL.model.validateId(req.soajs, (error) => {
			lib.checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
				let opts = {
					collection: "templates",
					conditions: {
						$or: [
							{
								"type": "_import",
								"_id": req.soajs.inputmaskData.id
							},
							{
								"deletable": true,
								"_id": req.soajs.inputmaskData.id
							}
						]
					}
				};
				
				BL.model.removeEntry(req.soajs, opts, function (error) {
					lib.checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
						return cbMain(null, true);
					});
				});
			});

		});
	},
	
	"upgradeTemplates": function (config, req, res, cbMain) {
		//check for templates
		async.series({
			"importTemplates": (mCb) => {
				BL.model.findEntries(req.soajs, {
					collection: "templates",
					conditions: {
						"type": "_template",
						"name": { "$in": ["Blank Environment", "SOAJS Microservices Environment", "NGINX & SOAJS Microservices Environment", "SOAJS Portal Environment"] }
					}
				}, function (err, templates) {
					lib.checkReturnError(req, mCb, { config: config, error: err, code: 402 }, function () {
						if (!templates || templates.length < 1) {
							req.soajs.log.debug("Upgrading templates to the latest version ...");
							let templateSchemas = require("../../templates/environment/index");
							async.each(templateSchemas, (oneTemplateSchema, fCb) => {
								BL.model.updateEntry(req.soajs, {
									collection: "templates",
									conditions: { "type": oneTemplateSchema.type, "name": oneTemplateSchema.name },
									fields: { $set: oneTemplateSchema },
									options: { upsert: true, multi: false }
								}, fCb);
							}, mCb);
						}
						else {
							return mCb(null, true);
						}
					});
				});
			},
			"removeOld": (mCb) => {
				BL.model.removeEntry(req.soajs, {
					collection: "templates",
					conditions: { "type": { "$in": ["_BLANK", "_SOAJS", "_PORTAL"] } },
				}, mCb);
			}
		}, (error) => {
			lib.checkReturnError(req, cbMain, {
				config: config,
				error: error,
				code: (error && error.code) ? error.code : 600
			}, function () {
				return cbMain(null, true);
			});
		});
	},
	
	"import": (config, req, res, deployer, cbMain) => {
		let context = {
			errors: [],
			config: config,
			deployer: deployer
		};
		
		let now = new Date();
		let expires = new Date(now);
		expires.setSeconds(expires.getSeconds() + (7 * 24 * 3600));
		
		/**
		 * 1- unzip the file
		 * 2- parse the file
		 * 3- check mandatory
		 * 4- check duplicates
		 * 5- save file
		 */
		async.series({
			"parse": (mCb) => {
				let form = new formidable.IncomingForm();
				form.encoding = 'utf-8';
				form.keepExtensions = true;
				
				//unzip and parse the json file, assign it to the context.template if ok
				helper.parse(req, form, context, mCb);
			},
			"checkMandatory": (mCb) => {
				//check that the template has the minimum required schema before proceeding
				let validator = new req.soajs.validator.Validator();
				helper.checkMandatoryTemplateSchema(req, BL, lib, context, validator, expires, mCb);
			},
			"checkDuplicates": (mCb) => {
				if (context.errors && context.errors.length > 0) {
					return mCb(context.errors);
				}
				helper.checkDuplicate(req, BL, context, lib, () => {
					if (context.errors && context.errors.length > 0) {
						context.template.expires = expires;
						context.template.type = '_import';

						//transform the . -> __dot__
						utils.accommodateDeployTemplateForMongo(context.template.deploy, true, () => {
							let unrecoverable = [];
							context.errors.forEach((oneIssue) => {
								if (oneIssue.msg.indexOf("=>") === -1 || !oneIssue.entry) {
									unrecoverable.push(oneIssue);
								}
							});
							if (unrecoverable.length > 0) {
								return mCb(context.errors);
							}
							
							BL.model.insertEntry(req.soajs, {
								collection: 'templates',
								record: context.template
							}, (error, record) => {
								lib.checkReturnError(req, mCb, { config: config, error: error, code: 600 }, () => {
									//inject template id as part of the error response
									context.template.id = record[0]._id;
									context.errors.unshift({
										code: 173,
										"msg": "id => " + context.template.id.toString()
									});
									return mCb(context.errors);
								});
							});
						});
					}
					else {
						return mCb(null, true);
					}
				});
			},
			"save": (mCb) => {
				/*
				 1 - save ci
				 2 - save cd
				 3 - save endpoints
				 3.1 - publish endpoints
				 4 - create deployment template
				 4.1 - save deployment template
				 */
				
				//save information
				async.series({
					"saveContent": (vCb) => {
						helper.saveContent(req, BL, context, lib, vCb);
					},
					"generateDeploymentTemplate": (vCb) => {
						helper.generateDeploymentTemplate(req, config, BL, context, lib, vCb);
					}
				}, (error) => {
					return mCb(error);
				});
			}
		}, (error) => {
			helper.cleanUp(req.soajs, context.fileName, () => {
				if (Array.isArray(error)) {
					return cbMain(null, error);
				}
				else {
					return cbMain(error);
				}
			});
		});
	},
	
	"correct": (config, req, res, deployer, cbMain) => {
		let context = {
			errors: [],
			config: config,
			deployer: deployer
		};
		
		/**
		 * 1- unzip the file
		 * 2- parse the file
		 * 3- check mandatory
		 * 4- check duplicates
		 * 5- save file
		 */
		async.series({
			"validateInputs": (mCb) => {
				if (!req.soajs.inputmaskData || !req.soajs.inputmaskData.id || !req.soajs.inputmaskData.correction || typeof(req.soajs.inputmaskData.correction) !== 'object') {
					return mCb({
						"code": 173,
						"msg": "Invalid Inputs provided to correct the previously imported template!"
					});
				}
				return mCb();
			},
			"merge": (mCb) => {
				//unzip and parse the json file, assign it to the context.template if ok
				helper.mergeToTemplate(req, config, BL, context, lib, mCb);
			},
			"checkMandatory": (mCb) => {
				//check that the template has the minimum required schema before proceeding
				let validator = new req.soajs.validator.Validator();
				helper.checkMandatoryTemplateSchema(req, BL, lib, context, validator, null, mCb);
			},
			"checkDuplicates": (mCb) => {
				helper.checkDuplicate(req, BL, context, lib, () => {
					if (context.errors && context.errors.length > 0) {

						//transform the . -> __dot__
						utils.accommodateDeployTemplateForMongo(context.template.deploy, true, () => {
							BL.model.saveEntry(req.soajs, {
								collection: 'templates',
								record: context.template
							}, (error) => {
								lib.checkReturnError(req, mCb, { config: config, error: error, code: 600 }, () => {
									//inject template id as part of the error response
									context.errors.unshift({
										code: 173,
										"msg": "id => " + context.template._id.toString()
									});
									return mCb(context.errors);
								});
							});
						});
					}
					else {
						return mCb(null, true);
					}
				});
			},
			"save": (mCb) => {
				/*
				 1 - save ci
				 2 - save cd
				 3 - save endpoints
				 3.1 - publish endpoints
				 4 - create deployment template
				 4.1 - save deployment template
				 */
				
				//save information
				async.series({
					"saveContent": (vCb) => {
						helper.saveContent(req, BL, context, lib, vCb);
					},
					"generateDeploymentTemplate": (vCb) => {
						helper.generateDeploymentTemplate(req, config, BL, context, lib, vCb);
					}
				}, (error) => {
					return mCb(error);
				});
			}
		}, (error) => {
			if (Array.isArray(error)) {
				return cbMain(null, error);
			}
			else {
				return cbMain(error);
			}
		});
	},
	
	"export": (config, req, res, deployer, cbMain) => {
		let context = {
			config,
			dbData: {},
			template: {
				"name": "New Template " + new Date().toISOString(),
				"description": "",
				"content": {},
				"deploy": {}
			},
			deployer: deployer
		};
		
		//there is nothing to export !
		if (!req.soajs.inputmaskData.ci && !req.soajs.inputmaskData.deployment && !req.soajs.inputmaskData.endpoints && !req.soajs.inputmaskData.iac && !req.soajs.inputmaskData.external) {
			return cbMain({ code: 481, msg: config.errors[481] });
		}
		
		helper.fetchDataFromDB(req, BL, context, lib, (error) => {
			lib.checkReturnError(req, cbMain, {
				config: config,
				error: error,
				code: (error && error.code) ? error.code : 600
			}, () => {
				BL.model.closeConnection(req.soajs);
				
				helper.populateTemplate(context);
				
				let execDir = __dirname + "/downloads/";
				let zipFileName = "soajs_template-" + new Date().toISOString();
				
				let output = "module.exports = " + JSON.stringify(context.template, null, 2) + ";";
				
				let zip = new EasyZip();
				zip.file(zipFileName + ".js", output);
				zip.writeToFile(execDir + "/" + zipFileName + ".zip");
				
				setTimeout(() => {
					//genrate zip file and return response
					let stat = fs.statSync(execDir + zipFileName + ".zip");
					let readStream = fs.createReadStream(execDir + zipFileName + ".zip");
					
					//set the headers to applicaiton/zip and send the file in the response
					res.writeHead(200, {
						'Content-Type': "application/zip",
						'Content-Length': stat.size,
						'FileName': zipFileName
					});

					if (process.env.SOAJS_DEPLOY_TEST) {
						return cbMain()
					} else {
						readStream.pipe(res);
					}
				}, 1000);
			});
		});
	},
	
	'download': function (config, req, res, deployer, cbMain) {
		BL.model.findEntry(req.soajs, {
			"collection": "templates",
			"conditions": {
				"type": "_template",
				"_id": new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.id)
			}
		}, (error, template) => {
			lib.checkReturnError(req, cbMain, {
				config: config,
				error: error,
				code: (error && error.code) ? error.code : 600
			}, () => {
				lib.checkReturnError(req, cbMain, { config: config, error: !template, code: 482 }, () => {
					BL.model.closeConnection(req.soajs);
					
					delete template.type;
					delete template._id;
					delete template.deletable;
					
					//check and fix sensitive env vars in catalog deployment recipes if any
					if (template.content && template.content.recipes && template.content.recipes.deployment) {
						let blackList = config.HA.blacklist;
						if (req.soajs.servicesConfig && req.soajs.servicesConfig.dashboard && req.soajs.servicesConfig.dashboard.HA && req.soajs.servicesConfig.dashboard.HA.blacklist) {
							blackList = req.soajs.servicesConfig.dashboard.HA.blacklist;
						}
						
						template.content.recipes.deployment.forEach((oneRecord) => {
							if (oneRecord.recipe && oneRecord.recipe.buildOptions && oneRecord.recipe.buildOptions.env) {
								for (let env in oneRecord.recipe.buildOptions.env) {
									if (blackList.indexOf(env.toLowerCase()) !== -1) {
										if (oneRecord.recipe.buildOptions.env[env].type === 'static') {
											oneRecord.recipe.buildOptions.env[env].value = "";
										}
										
										if (oneRecord.recipe.buildOptions.env[env].type === 'userInput') {
											oneRecord.recipe.buildOptions.env[env].default = "";
										}
									}
								}
							}
						});
					}
					
					//transform __dot__ to .
					utils.accommodateDeployTemplateForMongo(template.deploy, false, () => {
						//zip and return file in response
						let execDir = __dirname + "/downloads/";
						let zipFileName = "soajs_template-" + new Date().toISOString();
						
						let output = "module.exports = " + JSON.stringify(template, null, 2) + ";";
						
						let zip = new EasyZip();
						zip.file(zipFileName + ".js", output);
						zip.writeToFile(execDir + "/" + zipFileName + ".zip");
						
						setTimeout(() => {
							//genrate zip file and return response
							let stat = fs.statSync(execDir + zipFileName + ".zip");
							let readStream = fs.createReadStream(execDir + zipFileName + ".zip");
							
							//set the headers to applicaiton/zip and send the file in the response
							res.writeHead(200, {
								'Content-Type': "application/zip",
								'Content-Length': stat.size,
								'FileName': zipFileName
							});
							
							if (process.env.SOAJS_DEPLOY_TEST) {
								return cbMain()
							} else {
								readStream.pipe(res);
							}
						}, 1000);
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
