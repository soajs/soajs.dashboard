"use strict";
const statusUtils = require("./statusUtils");

let predefinedSchemaSteps = {
	custom_registry: {
		validate: function(req, context, fCb){
			statusUtils.custom_registry(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.custom_registry(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.custom_registry(req, context, 'rollback', fCb);
		}
	},
	productization: {
		deploy: function(req, context, fCb){
			statusUtils.products(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.products(req, context, 'rollback', fCb);
		}
	},
	tenant: {
		deploy: function(req, context, fCb){
			statusUtils.tenants(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.tenants(req, context, 'rollback', fCb);
		}
	},
	secrets: {
		validate: function(req, context, fCb){
			statusUtils.secrets(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.secrets(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.secrets(req, context, 'rollback', fCb);
		}
	},
	repo: {
		validate: function(req, context, fCb){
			statusUtils.repos(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.repos(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.repos(req, context, 'rollback', fCb);
		}
	},
	resources: {
		validate: function(req, context, fCb){
			statusUtils.resources(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.resources(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.resources(req, context, 'rollback', fCb);
		}
	},
	infra:{
		validate: function(req, context, fCb){
			statusUtils.infra(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.infra(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.infra(req, context, 'rollback', fCb);
		}
	}
};

module.exports = predefinedSchemaSteps;
