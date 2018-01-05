"use strict";
var async = require("async");

var statusUtils = require("./statusUtils");
var statusRollback = require("./statusRollback");

var statusChecker = {
	"startDeployment": function (req, BL, config, environmentRecord, template, cbMain) {
		if (!req.soajs.inputmaskData) {
			req.soajs.inputmaskData = {};
		}
		
		function updateTemplate(fCb) {
			BL.model.saveEntry(req.soajs, {collection: 'templates', record: template}, fCb);
		}
		
		let stack = {
			"uploadCertificates": function (fCb) {
				statusUtils.uploadCertificates(req, {BL, config, environmentRecord, template}, fCb);
			},
			//update
			"u1": updateTemplate,
			"productize": function (fCb) {
				statusUtils.productize(req, {BL, config, environmentRecord, template}, fCb);
			},
			//update
			"u2": updateTemplate,
			"handleCluster": function (fCb) {
				statusUtils.handleClusters(req, {BL, config, environmentRecord, template}, fCb);
			},
			//update
			"u3": updateTemplate,
			"deployServices": function (fCb) {
				async.series({
					"controller": function (vCb) {
						statusUtils.deployController(req, {BL, config, environmentRecord, template}, vCb);
					},
					"urac": function (vCb) {
						statusUtils.deployUrac(req, {BL, config, environmentRecord, template}, vCb);
					},
					"oauth": function (vCb) {
						statusUtils.deployOauth(req, {BL, config, environmentRecord, template}, vCb);
					}
				}, fCb);
			},
			//update
			"u4": updateTemplate,
			"deployNginx": function (fCb) {
				if (template.nginx.catalog) {
					statusUtils.deployNginx(req, {BL, config, environmentRecord, template}, fCb);
				}
				else {
					statusUtils.createNginxRecipe(req, {BL, config, environmentRecord, template}, (error) => {
						if (error) return fCb(error);
						
						statusUtils.deployNginx(req, {BL, config, environmentRecord, template}, fCb);
					});
				}
			},
			//update
			"u5": updateTemplate,
			"addUserAndGroup": function (fCb) {
				statusUtils.createUserAndGroup(req, {BL, config, environmentRecord, template}, fCb);
			},
			//update
			"u6": updateTemplate
		};
		
		async.series(stack, (error) => {
			if (error) {
				//trigger rollback
				req.soajs.log.error("Error Deploying Environment, check Deployment Status for Infomration.");
				template.error = error;
				updateTemplate((error) => {
					if (error) {
						req.soajs.log.error(error);
					}
					statusRollback.processRollback(req, {BL, config, environmentRecord, template})
				});
			}
		});
		
		return cbMain(null, true);
	},
	
	//update the template with machine ip and dns information as you move on where needed
	"checkProgress": function (req, BL, config, environmentRecord, template, cbMain) {
		let steps = {
			"createEnvironment": {
				"done": true,
				"id": environmentRecord._id.toString()
			},
			"uploadEnvCertificates": {
				"done": false,
				"id": null
			},
			"productize": {
				"done": false,
				"id": null
			},
			"deployCluster": {
				"done": false,
				"id": null
			},
			"deployController": {
				"done": false,
				"id": null
			},
			"deployUrac": {
				"done": false,
				"id": null
			},
			"deployoAuth": {
				"done": false,
				"id": null
			},
			"createNginxRecipe": {
				"done": false,
				"id": null
			},
			"deployNginx": {
				"done": false,
				"id": null
			},
			"user": {
				"done": false,
				"id": null
			}
		};
		
		if (template.deploy && template.deploy.certificates) {
			steps.uploadEnvCertificates.done = true;
			steps.uploadEnvCertificates.id = environmentRecord.code.toString();
		}
		
		if (template.controller && template.controller._id) {
			steps.deployController.done = true;
			steps.deployController.id = template.controller._id;
		}
		
		if (template.urac && template.urac._id) {
			steps.deployUrac.done = true;
			steps.deployUrac.id = template.urac._id;
		}
		
		if (template.oauth && template.oauth._id) {
			steps.deployoAuth.done = true;
			steps.deployoAuth.id = template.oauth._id;
		}
		
		if (template.productize && template.productize._id) {
			steps.productize.done = true;
			steps.productize.id = template.productize._id;
		}
		
		if (template.cluster && template.cluster._id) {
			steps.deployCluster.done = true;
			steps.deployCluster.id = template.cluster._id;
		}
		
		if (template.nginx && template.nginx.recipe) {
			steps.createNginxRecipe.done = true;
			steps.createNginxRecipe.id = template.nginx.recipe;
		}
		
		if (template.nginx && template.nginx._id) {
			steps.deployNginx.done = true;
			steps.deployNginx.id = template.nginx._id;
		}
		
		if (template.user) {
			steps.user.done = true;
		}
		
		if (!template.error) {
			let overallProgress = true;
			for (let stepName in steps) {
				if (!steps[stepName].done) {
					overallProgress = false;
				}
			}
			
			steps.overall = overallProgress;
		}
		else {
			steps.overall = false;
			steps.error = error;
		}
		
		
		return cbMain(null, steps);
	}
};

module.exports = statusChecker;