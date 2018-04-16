"use strict";
var fs = require("fs");
var async = require("async");
var unzip2 = require("unzip2");

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
			
			fs.exists(path + fileName + ".js", (exists) => {
				if (exists) {
					fs.unlinkSync(path + fileName + ".js");
				}
			});
			
			fs.exists(path + fileName + ".json", (exists) => {
				if (exists) {
					fs.unlinkSync(path + fileName + ".json");
				}
			});
		}
		return mCb();
	},
	
	"parse": function (req, form, context, mCb) {
		try{
			form.onPart = function (part) {
				if(!part){
					return mCb({code: 172, msg: "No Uploaded File Detected in request !"});
				}
				
				if (!part.filename) return form.handlePart(part);
				
				let fileName = part.filename.replace(".zip", "") + "_" + new Date().toISOString();
				context.fileName = fileName;
				
				let writeStream = fs.createWriteStream(path + fileName + ".zip");
				
				part.pipe(writeStream);
				
				writeStream.on('error', function (error) {
					return mCb({code: 600, msg: error.toString()});
				});
				
				//once file is written, unzip it and parse it
				writeStream.on('close', function () {
					//if zip file, trigger parse
					fs.createReadStream(path + fileName + ".zip").pipe(unzip2.Parse()).on('entry', (entry) => {
						if (entry.type === 'File' && entry.path === part.filename.replace(".zip", "")) {
							entry.pipe(fs.createWriteStream(path + fileName));
						} else {
							entry.autodrain();
						}
					}).on('error', (error) => {
						return mCb({code: 600, msg: error.toString()});
					}).on("close", () => {
						let f;
						let uploadContent = fs.readFileSync(path + fileName, 'utf8');
						f = uploadContent.indexOf("module.exports") !== -1 ? fileName + ".js" : fileName + ".json";
						fs.renameSync(path + fileName, path + f);
						fs.exists(path + f, (exists) =>{
							if(!exists){
								return mCb({code: 600, msg: "Unable to Load or Parse Uploaded Template!"});
							}
							else{
								parseTheFile(path + f);
							}
						});

						function parseTheFile(filePath){
							if (require.resolve(filePath)) {
								delete require.cache[require.resolve(filePath)];
							}
							try {
								context.template = require(filePath);
								return mCb(null, true);
							}
							catch (error) {
								return mCb({code: 600, msg: error.toString()});
							}
						}
					});
				});

			};
			form.parse(req);
		}
		catch(e){
			return mCb({code: 173, msg: e.toString() });
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
		if(!context.template.deploy){
			return mCb(null, true);
		}
		
		delete context.template.expires;
		context.template.type = "_template";
		
		//transform the . -> __dot__
		let nothingToDeploy = true;
		for(let stage in context.template.deploy){
			for (let group in context.template.deploy[stage]){
				for(let section in context.template.deploy[stage][group]){
					nothingToDeploy = false;
					if(section.indexOf(".") !== -1){
						let newSection = section.replace(/\./g, "__dot__");
						context.template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(context.template.deploy[stage][group][section]));
						delete context.template.deploy[stage][group][section];
					}
				}
			}
		}
		if(nothingToDeploy){
			if(context.template._id){
				BL.model.removeEntry(req.soajs, {"collection": "templates", "conditions": {"_id": context.template._id}}, mCb);
			}
			else{
				return mCb();
			}
		}
		else{
			context.template.deletable = true;
			let method = (context.template._id) ? "saveEntry" : "insertEntry";
			BL.model[method](req.soajs, {"collection": "templates", "record": context.template}, mCb);
		}
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
					for(let stage in context.template.deploy){
						for (let group in context.template.deploy[stage]){
							for(let section in context.template.deploy[stage][group]){
								if(section.indexOf("__dot__") !== -1) {
									let newSection = section.replace(/__dot__/g, ".");
									context.template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(context.template.deploy[stage][group][section]));
									delete context.template.deploy[stage][group][section];
								}
							}
						}
					}

					let stack = [];
					//check ci recipes
					if (template.content && template.content.recipes && template.content.recipes.ci) {
						let stepMethod = function (vCb) {
							helpers.ci("merge", req, context, BL, lib, vCb);
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
	},
	
	"checkMandatoryTemplateSchema": function (req, BL, lib, context, validator, ts, mCb) {
		let errors = [];
		let schema = require("../../schemas/template");
		
		context.template.name += (ts) ? " _ " + ts: "";
		
		let myTemplate = soajsUtils.cloneObj(context.template);
		delete myTemplate.expires;
		delete myTemplate._id;
		delete myTemplate.id;
		delete myTemplate.type;
		
		let status = validator.validate(myTemplate, schema);
		if (!status.valid) {
			status.errors.forEach(function (err) {
				errors.push({code: 173, msg: err.stack});
			});
		}

		let content = Object.keys(myTemplate.content);
        let deploy = [];

		if (myTemplate.content.deployments && myTemplate.content.deployments.repo) {
            for (let i = 0 ; i <  Object.keys(myTemplate.content.deployments.repo).length; i ++) {
                content.push("deployments.repo." +  Object.keys(myTemplate.content.deployments.repo)[i]);
            }
        }

        if (myTemplate.content.deployments && myTemplate.content.deployments.resources) {
            for (let i = 0 ; i <  Object.keys(myTemplate.content.deployments.resources).length; i ++) {
                content.push("deployments.resources." +  Object.keys(myTemplate.content.deployments.resources)[i]);
            }
        }

        deploy = Object.keys(myTemplate.deploy.database.pre).concat(Object.keys(myTemplate.deploy.database.steps), Object.keys(myTemplate.deploy.database.post), Object.keys(myTemplate.deploy.deployments.steps), Object.keys(myTemplate.deploy.deployments.pre), Object.keys(myTemplate.deploy.deployments.post));
		//check if entries in content exists in deploy
		async.forEach(content, (oneContent,cb) => {
			if (oneContent !== 'recipes' && oneContent !== 'deployments' && oneContent !== 'endpoints') {
                if (deploy.indexOf(oneContent) === -1 ) {
                    errors.push({code: 173, msg: `Invalid template, Must add a schema for <b>${oneContent}</b> in deploy object`, group: "General"});
					return cb();
                }
            }
            return cb()
		});
		//check if entries in deploy exists in content
        async.forEach(deploy, (oneDeploy, cb) => {
                if (content.indexOf(oneDeploy) === -1 ) {
                    errors.push({code: 173, msg: `Invalid template, Must add a schema for <b>${oneDeploy}</b> in content object`, group: "General"});
                    return cb();
                }
            return cb()
        });

        //there is a conflict in the schema
		if(errors && errors.length > 0){
			return mCb(errors);
		}
		
		return mCb(null, true);
	},
	
	"fetchDataFromDB": function(req, BL, context, lib, mCb) {
		let stack = [];
		//check ci recipes
		if (req.soajs.inputmaskData.ci) {
			let stepMethod = function (vCb) {
				helpers.ci("export", req, context, BL, lib, vCb);
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
	
	"populateTemplate": function(context){
		
		//fill ci recipes
		if(context.dbData.ci && context.dbData.ci.length > 0){
			if(!context.template.content.recipes){
				context.template.content.recipes = {};
			}
			context.template.content.recipes.ci = context.dbData.ci;
		}
		
		//fill catalog deployment recipes
		if(context.dbData.deployment && context.dbData.deployment.length > 0){
			if(!context.template.content.recipes){
				context.template.content.recipes = {};
			}
			context.template.content.recipes.deployments = context.dbData.deployment;
		}
		
		//fill endpoints recipes
		if(context.dbData.endpoints && context.dbData.endpoints.length > 0){
			context.template.content.endpoints = {
				data: context.dbData.endpoints
			};
		}
		
		//fill associated endpoints resources
		if(context.dbData.resources && Object.keys(context.dbData.resources).length > 0){
			if(!context.template.content.deployments){
				context.template.content.deployments = {};
			}
			context.template.content.deployments.resources = context.dbData.resources;
		}
	}
};

module.exports = helpers;