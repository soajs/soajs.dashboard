"use strict";

var hostsColl = "hosts";
var dockerColl = "docker";
var envColl = "environment";
var servicesColl = "services";
var daemonsColl = "daemons";
var gitColl = "git_accounts";
var staticColl = "staticContent";
var analyticsColl = "analytics";

var methods = {
	"getEnvironment": function (soajs, model, code, cb) {
		var opts = {
			collection: envColl,
			conditions: {code: code.toUpperCase()}
		};

		model.findEntry(soajs, opts, cb);
	},

	"getDashboardEnvironment": function (soajs, model, cb) {
		var opts = {
			collection: envColl,
			conditions: {code: "DASHBOARD"}
		};

		model.findEntry(soajs, opts, cb);
	},

	"updateDockerDeployerNodes": function (soajs, model, action, node, cb) {
		var opts = {
			collection: envColl,
			conditions: {},
			fields: {},
			options: {multi: true}
		};

		if (action === 'add') {
			opts.fields.$push = { 'deployer.container.docker.remote.nodes': node };
		}
		else if (action === 'remove') {
			opts.fields.$pull = { 'deployer.container.docker.remote.nodes': node };
		}

		model.updateEntry(soajs, opts, cb);
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

		if(soajs.inputmaskData.version){
			opts.conditions.version = soajs.inputmaskData.version;
		}

		model.distinctEntries(soajs, opts, cb);
	},

	"getEnvInfo": function (soajs, model,options, cb) {
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

	"getGitAccounts": function (soajs, model, repoName, cb) {
		var opts = {
			collection: gitColl,
			conditions: { "repos.name": repoName },
			fields: {
				provider: 1,
				domain: 1,
				token: 1,
				'repos.$': 1
			}
		};

		model.findEntry(soajs, opts, cb);
	},

	"getStaticContent": function (soajs, model, id, cb) {
		var opts = {
			collection: staticColl,
			conditions: { '_id': id }
		};

		model.findEntry(soajs, opts, cb);
	},

	/**
	 * ANALYTICS COLLECTION
	 */

	 "getEnvAnalyticsRecord": function (soajs, model, env, cb) {
		 var opts = {
			 collection: analyticsColl,
			 conditions: { 'json.env': env.toLowerCase() }
		 };

		 model.findEntry(soajs, opts, cb);
	 },

	 "updateAnalyticsRecord": function (soajs, model, env, update, cb) {
		 var opts = {
			 collection: analyticsColl,
			 conditions: { 'json.env': env.toLowerCase() },
			 fields: update
		 };

		model.updateEntry(soajs, opts, cb);
	},

	"getAnalyticsRecords": function (soajs, model, type, cb) {
		var opts = {
			collection: analyticsColl,
			conditions: { type: type }
		};

		model.findEntries(soajs, opts, cb);
	}
};

module.exports = methods;
