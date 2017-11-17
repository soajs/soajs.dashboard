"use strict";

var hostsColl = "hosts";
var controllesColl = "controllers";
var envColl = "environment";
var servicesColl = "services";
var daemonsColl = "daemons";

var methods = {
	"getEnvironment": function (soajs, model, code, cb) {
		var opts = {
			collection: envColl,
			conditions: { code: code.toUpperCase() }
		};
		
		model.findEntry(soajs, opts, cb);
	},
	
	/**
	 * HOSTS COLLECTION
	 */
	"getHosts": function (soajs, model, env, type, cb) {
		var opts = {
			collection: hostsColl,
			conditions: {
				"env": env.toLowerCase()
			}
		};
		
		if (type && type !== '') {
			opts.conditions["name"] = type;
		}
		
		model.findEntries(soajs, opts, cb);
	},
	
	"getHostEnv": function (soajs, model, cb) {
		var opts = {
			collection: hostsColl,
			conditions: {
				'name': soajs.inputmaskData.service
			},
			fields: 'env'
		};
		if (soajs.inputmaskData.version) {
			opts.conditions.version = soajs.inputmaskData.version;
		}
		
		model.distinctEntries(soajs, opts, cb);
	},
	
	"getEnvInfo": function (soajs, model, options, cb) {
		var opts = {
			collection: envColl,
			conditions: {
				'code': {
					$in: options.envList
				}
			},
			fields: {
				'_id': 0,
				'code': 1,
				'apiPrefix': 1,
				'domain': 1
			}
		};
		
		model.findEntries(soajs, opts, cb);
	},
	
	"getOneHost": function (soajs, model, env, type, ip, hostname, cb) {
		var opts = {
			collection: hostsColl,
			conditions: {
				"env": env.toLowerCase(),
				"name": type
			}
		};
		
		if (ip && ip !== '') {
			opts.conditions["ip"] = ip;
		}
		
		if (hostname && hostname !== '') {
			opts.conditions["hostname"] = hostname;
		}
		
		model.findEntry(soajs, opts, cb);
	},
	
	"getService": function (soajs, model, condition, cb) {
		var opts = {
			collection: servicesColl,
			conditions: condition
		};
		
		model.findEntry(soajs, opts, cb);
	},
	
	"getDaemon": function (soajs, model, condition, cb) {
		var opts = {
			collection: daemonsColl,
			conditions: condition
		};
		
		model.findEntry(soajs, opts, cb);
	},
	
	/**
	 * Controller COLLECTION
	 */
	"getControllers": function (soajs, model, env, cb) {
		var opts = {
			collection: controllesColl,
			conditions: {
				"env": env.toLowerCase()
			}
		};
		
		model.findEntries(soajs, opts, cb);
	},
	
};

module.exports = methods;
