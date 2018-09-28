"use strict";
var fs = require("fs");
var async = require("async");
var unzip2 = require("unzip2");
const utils = require("../../utils/utils.js");
let soajsUtils = require("soajs").utils;

let path = __dirname + "/uploads/";

const helpers = {
	
	ci: function (cmd, req, context, BL, lib, callback) {
		const ci = require("./drivers/ci");
		ci[cmd](req, context, lib, async, BL, callback);
	},
	
	daemon: function (cmd, req, context, BL, lib, callback) {
		const daemon = require("./drivers/daemon");
		daemon[cmd](req, context, lib, async, BL, callback);
	},
	
	cd: function (cmd, req, context, BL, lib, callback) {
		const cd = require("./drivers/cd");
		cd[cmd](req, context, lib, async, BL, callback);
	},
	
	iac: function (cmd, req, context, BL, lib, callback) {
		const iac = require("./drivers/iac");
		iac[cmd](req, context, lib, async, BL, callback);
	},
	
	endpoint: function (cmd, req, context, BL, lib, callback) {
		const endpoint = require("./drivers/endpoint");
		endpoint[cmd](req, context, lib, async, BL, callback);
	},
	
	productization: function (cmd, req, context, BL, lib, callback) {
		const productization = require("./drivers/productization");
		productization[cmd](req, context, lib, async, BL, callback);
	},
	
	tenant: function (cmd, req, context, BL, lib, callback) {
		const tenant = require("./drivers/tenant");
		tenant[cmd](req, context, lib, async, BL, callback);
	},
	
	repos: function (cmd, req, context, BL, lib, callback) {
		const repos = require("./drivers/repos");
		repos[cmd](req, context, lib, async, BL, callback);
	},
	
	resources: function (cmd, req, context, BL, lib, callback) {
		const resources = require("./drivers/resources");
		resources[cmd](req, context, lib, async, BL, callback);
	},
	
	"cleanUp": function (soajs, fileName, mCb) {
		soajs.log.debug("cleaning uploaded", fileName);
		if (fileName) {
			fs.exists(path + fileName + ".zip", (exists) => {
				if (exists) {
					fs.unlinkSync(path + fileName + ".zip");
				}
			});
			
			fs.exists(path + fileName, (exists) => {
				if (exists) {
					fs.unlinkSync(path + fileName + ".js");
				}
			});
		}
		return mCb();
	},
	
	"parse": function (req, form, context, mCb) {
		try {
			form.onPart = function (part) {
				if (!part) {
					return mCb({code: 172, msg: "No Uploaded File Detected in request !"});
				}
				
				if (!part.filename) return form.handlePart(part);
				
				let currentDate = new Date().toISOString();
				let originalFileName = part.filename.replace(".zip", "") + "_" + currentDate;
				let fileName = originalFileName;
				context.fileName = originalFileName;
				
				let writeStream = fs.createWriteStream(path + fileName + ".zip");
				
				part.pipe(writeStream);
				
				writeStream.on('error', function (error) {
					return mCb({code: 600, msg: error.toString()});
				});
				
				let filesWithin = [];
				let allFileNames = [];
				//once file is written, unzip it and parse it
				writeStream.on('close', function () {
					//if zip file, trigger parse
					let myPath = path + fileName + "_" + currentDate + "/";
					
					if (!fs.existsSync(myPath)) {
						fs.mkdirSync(myPath);
					}
					
					fs.createReadStream(path + fileName + ".zip").pipe(unzip2.Parse()).on('entry', (entry) => {
						if (entry.type === 'File' && !entry.path.includes("__MACOSX") && !entry.path.includes("DS_Store")) {
							let filtered = entry.path.replace(/ /g, '_');
							if (filtered.indexOf("/") !== -1) {
								filtered = filtered.substring(filtered.indexOf("/") + 1, filtered.length);
							}
							filtered = filtered;
							entry.pipe(fs.createWriteStream(myPath + filtered));
							filesWithin.push(myPath + filtered);
							allFileNames.push(filtered);
						} else {
							entry.autodrain();
						}
					}).on('error', (error) => {
						req.soajs.log.error(error);
						return mCb({
							code: 173,
							msg: "Invalid Template provided, make sure to supply a compressed template using ZIP format."
						});
					}).on("close", () => {
						fileName = filesWithin[0]; // if 1 file => default
						allFileNames.forEach(function (eachFileName, index) {
							if (eachFileName.indexOf("index.js") !== -1) { // index.js
								fileName = filesWithin[index];
							}
							if (eachFileName === originalFileName) { // same filename zip and file within
								fileName = filesWithin[index];
							}
						});
						
						let f;
						let uploadContent = fs.readFileSync(fileName, 'utf8');
						f = uploadContent.indexOf("module.exports") !== -1 ? ".js" : ".json";
						fs.renameSync(fileName, fileName + f);
						fileName = fileName + f;
						fs.exists(fileName, (exists) => {
							if (!exists) {
								return mCb({code: 600, msg: "Unable to Load or Parse Uploaded Template!"});
							}
							else {
								parseTheFile(fileName);
							}
						});
						
						function parseTheFile(filePath) {
							if (require.resolve(filePath)) {
								delete require.cache[require.resolve(filePath)];
							}
							try {
								context.template = require(filePath);
							}
							catch (error) {
								return mCb({code: 600, msg: error.toString()});
							}
							return mCb(null, true);
						}
					});
				});
				
			};
			form.parse(req);
		}
		catch (e) {
			return mCb({code: 173, msg: e.toString()});
		}
	},
	
	"checkDuplicate": function (req, BL, context, lib, mCb) {
		let template = context.template;
		
		let stack = [];
		//check ci recipes
		if (template.content && template.content.recipes && template.content.recipes.ci) {
			let stepMethod = function (vCb) {
				helpers.ci("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		//check deamonGroups
		if (template.content && template.content.daemonGroups) {
			let stepMethod = function (vCb) {
				helpers.daemon("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		//check iac
		if (template.content && template.content.iac) {
			let stepMethod = function (vCb) {
				helpers.iac("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check cd recipes
		if (template.content && template.content.recipes && template.content.recipes.deployment) {
			let stepMethod = function (vCb) {
				helpers.cd("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check endpoints & services
		if (template.content && template.content.endpoints) {
			let stepMethod = function (vCb) {
				helpers.endpoint("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check productization schemas
		if (template.content && template.content.productization) {
			let stepMethod = function (vCb) {
				helpers.productization("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check tenant schemas
		if (template.content && template.content.tenant) {
			let stepMethod = function (vCb) {
				helpers.tenant("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check activated repos
		if (template.content && template.content.deployments && template.content.deployments.repo) {
			let stepMethod = function (vCb) {
				helpers.repos("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check activated resources
		if (template.content && template.content.deployments && template.content.deployments.resources) {
			let stepMethod = function (vCb) {
				helpers.resources("check", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		async.series(stack, mCb);
	},
	
	"saveContent": function (req, BL, context, lib, mCb) {
		let template = context.template;
		
		let stack = [];
		//check ci recipes
		if (template.content && template.content.recipes && template.content.recipes.ci) {
			let stepMethod = function (vCb) {
				helpers.ci("save", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check iac recipes
		if (template.content && template.content.iac) {
			let stepMethod = function (vCb) {
				helpers.iac("save", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check daemonGroups
		if (template.content && template.content.daemonGroups) {
			let stepMethod = function (vCb) {
				helpers.daemon("save", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check cd recipes
		if (template.content && template.content.recipes && template.content.recipes.deployment) {
			let stepMethod = function (vCb) {
				helpers.cd("save", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check endpoints & services
		if (template.content && template.content.endpoints) {
			let stepMethod = function (vCb) {
				helpers.endpoint("save", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		async.series(stack, mCb);
	},
	
	"generateDeploymentTemplate": function (req, config, BL, context, lib, mCb) {
		/**
		 * remove unneeded information: content.recipes & content.endpoints
		 * set type to _template
		 */
		if (!context.template.deploy) {
			return mCb(null, true);
		}
		
		delete context.template.expires;
		context.template.type = "_template";
		
		// transform the . -> __dot__
		utils.accommodateDeployTemplateForMongo(context.template.deploy, true, (err, nothingToDeploy) => {
			if (nothingToDeploy) {
				if (context.template._id) {
					BL.model.removeEntry(req.soajs, {
						"collection": "templates",
						"conditions": {"_id": context.template._id}
					}, mCb);
				}
				else {
					return mCb();
				}
			}
			else {
				context.template.deletable = true;
				let method = (context.template._id) ? "saveEntry" : "insertEntry";
				BL.model[method](req.soajs, {"collection": "templates", "record": context.template}, mCb);
			}
		});
	},
	
	"mergeToTemplate": function (req, config, BL, context, lib, mCb) {
		//get the template from the database to rectify it
		BL.model.findEntry(req.soajs, {
			"collection": "templates",
			"conditions": {
				"type": "_import",
				"_id": new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.id)
			}
		}, (error, template) => {
			lib.checkReturnError(req, mCb, {config: config, error: error, code: 600}, () => {
				lib.checkReturnError(req, mCb, {config: config, error: !template, code: 482}, () => {
					context.template = template;
					
					//change __dot__ to .
					utils.accommodateDeployTemplateForMongo(context.template.deploy, false, () => {
						let stack = [];
						//check ci recipes
						if (template.content && template.content.recipes && template.content.recipes.ci) {
							let stepMethod = function (vCb) {
								helpers.ci("merge", req, context, BL, lib, vCb);
							};
							stack.push(stepMethod);
						}
						
						//check iac recipes
						if (template.content && template.content.iac) {
							let stepMethod = function (vCb) {
								helpers.iac("merge", req, context, BL, lib, vCb);
							};
							stack.push(stepMethod);
						}
						//check daemonGroups
						if (template.content && template.content.daemonGroups) {
							let stepMethod = function (vCb) {
								helpers.daemon("merge", req, context, BL, lib, vCb);
							};
							stack.push(stepMethod);
						}
						
						//check cd recipes
						if (template.content && template.content.recipes && template.content.recipes.deployment) {
							let stepMethod = function (vCb) {
								helpers.cd("merge", req, context, BL, lib, vCb);
							};
							stack.push(stepMethod);
						}
						
						//check endpoints & services
						if (template.content && template.content.endpoints) {
							let stepMethod = function (vCb) {
								helpers.endpoint("merge", req, context, BL, lib, vCb);
							};
							stack.push(stepMethod);
						}
						
						async.series(stack, mCb);
					});
				});
			});
		});
	},
	
	"checkMandatoryTemplateSchema": function (req, BL, lib, context, validator, ts, mCb) {
		let errors = [];
		let schema = require("../../schemas/template");
		context.template.name += (ts) ? " _ " + ts : "";
		
		let myTemplate = soajsUtils.cloneObj(context.template);
		delete myTemplate.expires;
		delete myTemplate._id;
		delete myTemplate.id;
		delete myTemplate.type;
		
		let status = validator.validate(myTemplate, schema);
		if (!status.valid) {
			status.errors.forEach(function (err) {
				errors.push({code: 173, msg: err.stack, group: "General"});
			});
		}
		
		if (myTemplate.restriction && myTemplate.restriction.driver) {
			if (!myTemplate.restriction.deployment) {
				errors.push({
					code: 173,
					msg: "Detected restriction drivers configuration but template is missing restriction parent deployment configuration!",
					group: "General"
				});
			}
			else {
				myTemplate.restriction.driver.forEach((oneDriver) => {
					let driverPrefix = oneDriver.split(".")[0];
					let driverName = oneDriver.split(".")[1];
					if (myTemplate.restriction.deployment.indexOf(driverPrefix) === -1) {
						errors.push({
							code: 173,
							msg: `Restriction driver ${driverName} found, but either its associated parent restriction deployment ${driverPrefix} is not supported or not provided!`,
							group: "General"
						});
					}
				});
			}
		}
		
		let content = Object.keys(myTemplate.content);
		let deploy = [];
		utils.accommodateDeployTemplateForMongo(myTemplate.deploy, true, () => {
			if (myTemplate.content.deployments && myTemplate.content.deployments.repo) {
				for (let i = 0; i < Object.keys(myTemplate.content.deployments.repo).length; i++) {
					let repoName = Object.keys(myTemplate.content.deployments.repo)[i];
					if (myTemplate.content.deployments.repo[repoName].deploy) {
						content.push("deployments__dot__repo__dot__" + Object.keys(myTemplate.content.deployments.repo)[i]);
					}
				}
			}
			
			if (myTemplate.content.deployments && myTemplate.content.deployments.resources) {
				for (let i = 0; i < Object.keys(myTemplate.content.deployments.resources).length; i++) {
					let resourceName = Object.keys(myTemplate.content.deployments.resources)[i];
					if (myTemplate.content.deployments.resources[resourceName].type !== 'authorization') {
						content.push("deployments__dot__resources__dot__" + Object.keys(myTemplate.content.deployments.resources)[i]);
					}
				}
			}
			let deployDatabase = [];
			let deployDeployments = [];
			if (myTemplate.deploy && myTemplate.deploy.database) {
				deployDatabase = Object.keys(myTemplate.deploy.database.pre).concat(Object.keys(myTemplate.deploy.database.steps), Object.keys(myTemplate.deploy.database.post))
			}
			if (myTemplate.deploy && myTemplate.deploy.deployments) {
				deployDeployments = Object.keys(myTemplate.deploy.deployments.pre).concat(Object.keys(myTemplate.deploy.deployments.steps), Object.keys(myTemplate.deploy.deployments.post))
			}
			deploy = deployDatabase.concat(deployDeployments);
			//check if entries in content exists in deploy
			
			async.forEach(content, (oneContent, cb) => {
				if (oneContent !== 'secrets' && oneContent !== 'recipes' && oneContent !== 'deployments' && oneContent !== 'endpoints' && oneContent !== 'daemonGroups' && oneContent !== 'iac') {
					if (deploy.indexOf(oneContent) === -1) {
						errors.push({
							code: 173,
							msg: `Invalid template, Must add a schema for <b>${oneContent}</b> in deploy object`,
							group: "General"
						});
						return cb();
					}
				}
				return cb();
			});
			//check if entries in deploy exists in content
			async.forEach(deploy, (oneDeploy, cb) => {
				if (!oneDeploy.includes('secrets.') && ['infra.cluster.deploy', 'infra.dns'].indexOf(oneDeploy) === -1) {
					if (content.indexOf(oneDeploy) === -1) {
						errors.push({
							code: 173,
							msg: `Invalid template, Must add a schema for <b>${oneDeploy}</b> in content object`,
							group: "General"
						});
						return cb();
					}
				}
				return cb();
			});
			
			//there is a conflict in the schema
			if (errors && errors.length > 0) {
				return mCb(errors);
			}

			// validate restrictions
			let forceContainer = false;
			if (myTemplate.deploy && myTemplate.deploy.deployments) {
				let deployments = myTemplate.deploy.deployments;
				let stepsKeys = Object.keys(deployments);
				stepsKeys.forEach(function (eachStep) {
					if (deployments[eachStep]) {
						let stagesKeys = Object.keys(deployments[eachStep]);
						stagesKeys.forEach(function (eachStage) {
							if (eachStage.includes('__repo__dot') || eachStage.includes('.repo.') || eachStage.includes('secrets')) {
								forceContainer = true;
							}
							// if (eachStage.includes('.resources.')) {}
						});
					}
				});
			}

			if (forceContainer) {
				if (myTemplate.restriction) {
					if (myTemplate.restriction.deployment && Array.isArray(myTemplate.restriction.deployment)) {
						if (myTemplate.restriction.deployment.indexOf('container') === -1) {
							myTemplate.restriction.deployment.push('container');
							errors.push({
								code: 173,
								msg: `Invalid template, Must add container restriction or remove restriction object`,
								group: "General"
							});
							return mCb(errors);
						}
					}
				}
			}
			return mCb(null, true);
		});
	},
	
	"fetchDataFromDB": function (req, BL, context, lib, mCb) {
		let stack = [];
		//check ci recipes
		if (req.soajs.inputmaskData.ci) {
			let stepMethod = function (vCb) {
				helpers.ci("export", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		if (req.soajs.inputmaskData.iac || req.soajs.inputmaskData.external) {
			let stepMethod = function (vCb) {
				helpers.iac("export", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check cd recipes
		if (req.soajs.inputmaskData.deployment) {
			let stepMethod = function (vCb) {
				helpers.cd("export", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		//check endpoints & services
		if (req.soajs.inputmaskData.endpoints) {
			let stepMethod = function (vCb) {
				helpers.endpoint("export", req, context, BL, lib, vCb);
			};
			stack.push(stepMethod);
		}
		
		async.series(stack, mCb);
	},
	
	"populateTemplate": function (context) {
		
		//fill ci recipes
		if (context.dbData.ci && context.dbData.ci.length > 0) {
			if (!context.template.content.recipes) {
				context.template.content.recipes = {};
			}
			context.template.content.recipes.ci = context.dbData.ci;
		}
		
		//fill catalog deployment recipes
		if (context.dbData.deployment && context.dbData.deployment.length > 0) {
			if (!context.template.content.recipes) {
				context.template.content.recipes = {};
			}
			context.template.content.recipes.deployments = context.dbData.deployment;
		}
		
		//fill iac
		if (context.dbData.iac && context.dbData.iac.length > 0) {
			context.template.content.iac = {
				data: context.dbData.iac
			};
		}
		
		//fill endpoints recipes
		if (context.dbData.endpoints && context.dbData.endpoints.length > 0) {
			context.template.content.endpoints = {
				data: context.dbData.endpoints
			};
		}
		
		//fill associated endpoints resources
		if (context.dbData.resources && Object.keys(context.dbData.resources).length > 0) {
			if (!context.template.content.deployments) {
				context.template.content.deployments = {};
			}
			context.template.content.deployments.resources = context.dbData.resources;
		}
	}
};

module.exports = helpers;
