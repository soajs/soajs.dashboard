"use strict";
var fs = require("fs");
var async = require("async");
var unzip2 = require("unzip2");

let path = __dirname + "/uploads/";

const helpers = {
	
	ci: function (cmd, req, context, BL, lib, callback) {
		const ci = require("./drivers/ci");
		ci[cmd](req, context, lib, async, BL, callback);
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
	
	"cleanUp": function (fileName, mCb) {
		if (fileName) {
			fs.unlinkSync(path + fileName + ".zip");
		}
		return mCb();
	},
	
	"parse": function (context, fileName, mCb) {
		//if zip file, trigger parse
		try {
			fs.createReadStream(path + fileName + ".zip").pipe(unzip2.Extract({path: path})).on("close", () => {
				let JSONFile = require(path + fileName + ".js");
				context.template = JSONFile;
				return mCb(null, true);
			});
		}
		catch (e) {
			return mCb(e);
		}
	},
	
	"checkDuplicate": function (req, BL, context, lib, mCb) {
		let template = context.template;
		
		let stack = [];
		//check ci recipes
		if (template.content && template.content.recipes && template.content.recipes.ci) {
			let stepMethod = function (vCb) {
				helpers.ci("check", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
			};
			stack.push(stepMethod);
		}
		
		//check cd recipes
		if (template.content && template.content.recipes && template.content.recipes.deployment) {
			let stepMethod = function (vCb) {
				helpers.cd("check", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
			};
			stack.push(stepMethod);
		}
		
		//check endpoints & services
		if (template.content && template.content.endpoints) {
			let stepMethod = function (vCb) {
				helpers.endpoint("check", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
			};
			stack.push(stepMethod);
		}
		
		//check productization schemas
		if (template.content && template.content.productization) {
			let stepMethod = function (vCb) {
				helpers.productization("check", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
			};
			stack.push(stepMethod);
		}
		
		//check tenant schemas
		if (template.content && template.content.tenant) {
			let stepMethod = function (vCb) {
				helpers.tenant("check", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
			};
			stack.push(stepMethod);
		}
		
		//check activated repos
		if (template.content && template.content.deployments && template.content.deployment.repo) {
			let stepMethod = function (vCb) {
				helpers.repos("check", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
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
				helpers.ci("save", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
			};
			stack.push(stepMethod);
		}
		
		//check cd recipes
		if (template.content && template.content.recipes && template.content.recipes.deployment) {
			let stepMethod = function (vCb) {
				helpers.cd("save", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
			};
			stack.push(stepMethod);
		}
		
		//check endpoints & services
		if (template.content && template.content.endpoints) {
			let stepMethod = function (vCb) {
				helpers.endpoint("save", req, template, BL, lib, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return vCb();
				});
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
		delete context.template.content.recipes;
		delete context.template.content.endpoints;
		context.template.type = "_template";
		
		let method = (context.template._id) ? "saveEntry" : "insertEntry";
		BL.model[method](req.soajs, {"collection": "templates", "record": context.template}, mCb);
	},
	
	"mergeToTemplate": function (req, config, BL, context, lib, mCb) {
		//get the template from the database to rectify it
		BL.model.findEntry(req.soajs, {
			"collection": "templates",
			"conditions": {"_id": new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.data.id)}
		}, (error, template) => {
			lib.checkReturnError(req, mCb, {config: config, error: error, code: 600}, () => {
				context.template = template;
				
				let stack = [];
				//check ci recipes
				if (template.content && template.content.recipes && template.content.recipes.ci) {
					let stepMethod = function (vCb) {
						helpers.ci("merge", req, template, BL, lib, (error) => {
							if (error) {
								context.errors.push(error);
							}
							return vCb();
						});
					};
					stack.push(stepMethod);
				}
				
				//check cd recipes
				if (template.content && template.content.recipes && template.content.recipes.deployment) {
					let stepMethod = function (vCb) {
						helpers.cd("merge", req, template, BL, lib, (error) => {
							if (error) {
								context.errors.push(error);
							}
							return vCb();
						});
					};
					stack.push(stepMethod);
				}
				
				//check endpoints & services
				if (template.content && template.content.endpoints) {
					let stepMethod = function (vCb) {
						helpers.endpoint("merge", req, template, BL, lib, (error) => {
							if (error) {
								context.errors.push(error);
							}
							return vCb();
						});
					};
					stack.push(stepMethod);
				}
				
				//check activated repos
				if (template.content && template.content.deployments && template.content.deployment.repo) {
					let stepMethod = function (vCb) {
						helpers.repos("merge", req, template, BL, lib, (error) => {
							if (error) {
								context.errors.push(error);
							}
							return vCb();
						});
					};
					stack.push(stepMethod);
				}
				
				async.series(stack, mCb);
			});
		});
	},
	
	"checkMandatoryTemplateSchema": function (context, validator, mCb) {
		let errors = [];
		let schema = require("../../schemas/template");
		let status = validator.validate(context.template, schema);
		if (!status.valid) {
			status.errors.forEach(function (err) {
				errors.push({code: 173, msg: err.stack});
			});
		}
		return mCb(errors);
	}
};

module.exports = helpers;