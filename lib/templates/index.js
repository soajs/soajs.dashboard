'use strict';
const fs = require("fs");
const async = require("async");
const formidable = require('formidable');
const EasyZip = require('easy-zip').EasyZip;

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
			return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
		} else {
			if (cb) {
				return cb();
			}
		}
	}
};

const BL = {
	
	"getTemplates": function(config, req, res, cbMain){
		let opts = {
			collection: "templates",
			conditions: {
				"type": "_template"
			}
		};
		
		if(req.soajs.inputmaskData.fullList){
			opts.conditions = {
				"type": {
					"$ne": "_import"
				}
			};
		}
		
		BL.model.findEntries(req.soajs, opts, function (error, templates) {
			lib.checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
				async.each(templates, (template, mCb) => {
					for(let stage in template.deploy){
						for (let group in template.deploy[stage]){
							for(let section in template.deploy[stage][group]){
								if(section.indexOf("__dot__") !== -1){
									let newSection = section.replace(/__dot__/g, ".");
									template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(template.deploy[stage][group][section]));
									delete template.deploy[stage][group][section];
								}
							}
						}
					}
					return mCb();
				}, () => {
					return cbMain(null, templates);
				});
			});
		});
	},
	
	"deleteTemplate": function(config, req, res, cbMain){
		let opts = {
			collection: "templates",
			conditions: {
				$or: [
					{
						"type": "_import",
						"_id": new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.id)
					},
					{
						"deletable": true,
						"_id": new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.id)
					}
				]
			}
		};
		
		BL.model.removeEntry(req.soajs, opts, function (error) {
			lib.checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
				return cbMain(null, true);
			});
		});
	},
	
	"upgradeTemplates": function(config, req, res, cbMain){
		//check for templates
		async.series({
			"importTemplates": (mCb) => {
				BL.model.findEntries(req.soajs, {
					collection: "templates",
					conditions: {"type": "_template"}
				}, function (err, templates) {
					lib.checkReturnError(req, mCb, {config: config, error: err, code: 402}, function () {
						if(!templates || templates.length < 1){
							req.soajs.log.debug("Upgrading templates to the latest version ...");
							let templateSchemas = require("../../templates/environment/index");
							async.each(templateSchemas, (oneTemplateSchema, fCb) => {
								BL.model.updateEntry(req.soajs, {
									collection: "templates",
									conditions: {"type": oneTemplateSchema.type, "name": oneTemplateSchema.name},
									fields: {$set: oneTemplateSchema},
									options: {upsert: true, multi:false}
								}, fCb);
							}, mCb);
						}
						else{
							return mCb(null, true);
						}
					});
				});
			},
			"removeOld": (mCb) => {
				BL.model.removeEntry(req.soajs, {
					collection: "templates",
					conditions: {"type": {"$in": ["_BLANK", "_SOAJS", "_PORTAL"] } },
				}, mCb);
			}
		}, (error) => {
			lib.checkReturnError(req, cbMain, {config: config, error: error, code: (error && error.code) ? error.code : 600 }, function () {
				return cbMain(null, true);
			});
		});
	},
	
	"import": (config, req, res, cbMain) => {
		let context = {
			errors: [],
			config: config
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
				if(context.errors && context.errors.length > 0){
					return mCb(context.errors);
				}
				
				helper.checkDuplicate(req, BL, context, lib, () => {
					if (context.errors && context.errors.length > 0) {
						context.template.expires = expires;
						context.template.type = '_import';
						
						//transform the . -> __dot__
						for(let stage in context.template.deploy){
							for (let group in context.template.deploy[stage]){
								for(let section in context.template.deploy[stage][group]){
									if(section.indexOf(".") !== -1){
										let newSection = section.replace(/\./g, "__dot__");
										context.template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(context.template.deploy[stage][group][section]));
										delete context.template.deploy[stage][group][section];
									}
								}
							}
						}
						
						let unrecoverable = [];
						context.errors.forEach((oneIssue) => {
							if(oneIssue.msg.indexOf("=>") === -1 || !oneIssue.entry){
								unrecoverable.push(oneIssue);
							}
						});
						if(unrecoverable.length > 0){
							return mCb(context.errors);
						}
						
						BL.model.insertEntry(req.soajs, {
							collection: 'templates',
							record: context.template
						}, (error, record) => {
							lib.checkReturnError(req, mCb, {config: config, error: error, code: 600}, () => {
								//inject template id as part of the error response
								context.template.id = record[0]._id;
								context.errors.unshift({code: 173, "msg": "id => " + context.template.id.toString()});
								return mCb(context.errors);
							});
						});
					}
					else{
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
				if(Array.isArray(error)){
					return cbMain(null, error);
				}
				else{
					return cbMain(error);
				}
			});
		});
	},
	
	"correct": (config, req, res, cbMain) => {
		let context = {
			errors: [],
			config: config
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
						BL.model.saveEntry(req.soajs, {
							collection: 'templates',
							record: context.template
						}, (error) => {
							lib.checkReturnError(req, mCb, {config: config, error: error, code: 600}, () => {
								//inject template id as part of the error response
								context.errors.unshift({code: 173, "msg": "id => " + context.template._id.toString()});
								return mCb(context.errors);
							});
						});
					}
					else{
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
			if(Array.isArray(error)){
				return cbMain(null, error);
			}
			else{
				return cbMain(error);
			}
		});
	},
	
	"export": (config, req, res, cbMain) => {
		let context = {
			config,
			dbData: {},
			template : {
				"name": "New Template " + new Date().toISOString(),
				"description": "",
				"link": "",
				"content": {},
				"deploy": {}
			}
		};
		
		//there is nothing to export !
		if(!req.soajs.inputmaskData.ci && !req.soajs.inputmaskData.deployment && !req.soajs.inputmaskData.endpoints){
			return cbMain({code: 481, msg: config.errors[481]});
		}
		
		helper.fetchDataFromDB(req, BL, context, lib, (error) => {
			lib.checkReturnError(req, mCb, {config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
				BL.model.closeConnection(req.soajs);
				
				helper.populateTemplate(context);
				
				let execDir = __dirname + "/downloads/";
				let zipFileName = "soajs_template-" + new Date().toISOString();
				
				let output = "module.exports = " + context.template + ";";
				fs.writeFile(zipFileName + ".js", output, 'utf8', (error) =>{
					lib.checkReturnError(req, mCb, {config: config, error: error, code: 482 }, () => {
						
						//genrate zip file and return response
						let stat = fs.statSync(execDir + zipFileName + ".zip");
						let readStream = fs.createReadStream(execDir + zipFileName + ".zip");
						
						//set the headers to applicaiton/zip and send the file in the response
						res.writeHead(200, {
							'Content-Type': "application/zip",
							'Content-Length': stat.size
						});
						readStream.pipe(res);
						
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
