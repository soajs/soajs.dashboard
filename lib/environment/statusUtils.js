"use strict";
const fs = require("fs");
const path = require("path");
const request = require("request");
const async = require("async");
const config = require("../../config.js");

let modelName = 'mongo';

const BL = {
	customRegistry: {
		module: require("../customRegistry/index.js")
	},
	products: {
		module: require("../product/index.js")
	},
	tenants: {
		module: require("../tenant/index.js")
	},
	cd: {
		module: require("../cd/index.js"),
		helper: require("../cd/helper.js")
	},
	resources: {
		module: require("../resources/index.js")
	},
	cloud: {
		deploy: {
			module: require("../cloud/deploy/index.js")
		},
		secrets: {
			module: require('../cloud/secrets/index.js')
		},
		services: {
			module: require('../cloud/services/index.js')
		}
	}
};

const lib = {
	initBLModel: function (BLModule, modelName, cb) {
		BLModule.init(modelName, cb);
	},
	
	checkReturnError: function (req, mainCb, data, cb) {
		if (data.error) {
			if (typeof (data.error) === 'object') {
				req.soajs.log.error(data.error);
			}
			if (!data.config){
				data.config = config;
			}
			let msg = data.error.msg || data.error.message;
			if(!msg){
				msg = data.config.errors[data.code];
			}
			return mainCb({"code": data.code, "msg": msg});
		} else {
			if (cb) {
				return cb();
			}
		}
	},
	
	/**
	 * Template implementation methods
	 */
	
	custom_registry: function (req, context, cmd, callback) {
		const customReg = require("./drivers/customReg");
		customReg[cmd](req, context, lib, async, BL, modelName, callback);
	},
	
	products: function(req, context, cmd, callback){
		const products = require("./drivers/products");
		products[cmd](req, context, lib, async, BL, modelName, callback);
	},
	
	tenants: function(req, context, cmd, callback){
		const tenants = require("./drivers/tenants");
		tenants[cmd](req, context, lib, async, BL, modelName, callback);
	},
	
	secrets: function(req, context, cmd, callback){
		const secrets = require("./drivers/secrets");
		secrets[cmd](req, context, lib, async, BL, modelName, callback);
	},
	
	repos: function(req, context, cmd, callback){
		const secrets = require("./drivers/repos");
		secrets[cmd](req, context, lib, async, BL, modelName, callback);
	},
	
	resources: function(req, context, cmd, callback){
		const resources = require("./drivers/resources");
		resources[cmd](req, context, lib, async, BL, modelName, callback);
	},
	
	thirdPartStep: function(req, context, cmd, callback){
		const infra = require("./drivers/infra");
		infra[cmd](req, context, lib, async, BL, modelName, callback);
	}
};

module.exports = lib;