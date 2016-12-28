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
	 * DOCKER COLLECTION
	 */
	"getContainers": function (soajs, model, env, type, running, cb) {
		var opts = {
			collection: dockerColl,
			conditions: {
				"env": env.toLowerCase(),
				"recordType": "container"
			}
		};

		if (type) {
			opts.conditions["$or"] = [
				{"type": type},
				{"type": type + "_" + env.toLowerCase()}
			];
		}

		if (running) {
			opts.conditions.running = running;
		}

		model.findEntries(soajs, opts, cb);
	},

	"getServiceType": function (soajs, model, options, cb) {
		var opts = {
			collection: dockerColl,
			conditions: {
				env: options.env.toLowerCase(),
				serviceName: options.serviceName
			},
			fields: { type: 1 }
		};

		model.findEntry(soajs, opts, cb);
	},

	"getOneContainer": function (soajs, model, env, hostname, cb) {
		var opts = {
			collection: dockerColl,
			conditions: {
				"env": env.toLowerCase(),
				"$or": [
					{"hostname": hostname},
					{"hostname": hostname + "_" + env.toLowerCase()},
					{"cid": hostname}
				]
			}
		};

		model.findEntry(soajs, opts, cb);
	},

	"getContainerByTask": function (soajs, model, env, taskName, cb) {
		var opts = {
			collection: dockerColl,
			conditions: {
				env: env.toLowerCase(),
				taskName: taskName
			}
		};

		model.findEntry(soajs, opts, cb);
	},

	"removeContainerByTask": function (soajs, model, env, taskName, cb) {
		var opts = {
			collection: dockerColl,
			conditions: {
				env: env.toLowerCase(),
				taskName: taskName
			}
		};

		model.removeEntry(soajs, opts, cb);
	},

	"insertContainer": function (soajs, model, record, cb) {
		record.hostname = record.hostname.replace("/", "");

		var opts = {
			collection: dockerColl,
			record: record
		};

		model.insertEntry(soajs, opts, cb);
	},

	"insertContainers": function (soajs, model, records, cb) {
		var opts = {
			collection: dockerColl,
			record: records
		};

		model.insertEntry(soajs, opts, cb);
	},

	"listNodes": function (soajs, model, criteria, cb) {
		criteria.recordType = 'node';
		var opts = {
			collection: dockerColl,
			conditions: criteria
		};

		model.findEntries(soajs, opts, cb);
	},

	"getOneNode": function (soajs, model, criteria, cb) {
		criteria.recordType = 'node';
		var opts = {
			collection: dockerColl,
			conditions: criteria
		};

		model.findEntry(soajs, opts, cb);
	},

	"addNode": function (soajs, model, data, cb) {
		data.recordType = 'node';
		var opts = {
			collection: dockerColl,
			record: data
		};

		model.insertEntry(soajs, opts, cb);
	},

	"removeNode": function (soajs, model, criteria, cb) {
		criteria.recordType = 'node';
		var opts = {
			collection: dockerColl,
			conditions: criteria
		};

		model.removeEntry(soajs, opts, cb);
	},

	"updateNode": function (soajs, model, criteria, update, cb) {
		criteria.recordType = 'node';
		var opts = {
			collection: dockerColl,
			conditions: criteria,
			fields: update
		};

		model.updateEntry(soajs, opts, cb);
	},

	"getServiceContainers": function (soajs, model, criteria, cb) {
		criteria.recordType = 'container';
		criteria.env = criteria.env.toLowerCase();
		var opts = {
			collection: dockerColl,
			conditions: criteria
		};

		model.findEntries(soajs, opts, cb);
	},

	"removeServiceContainers": function (soajs, model, criteria, cb) {
		criteria.recordType = 'container';
		var opts = {
			collection: dockerColl,
			conditions: criteria
		};

		model.removeEntry(soajs, opts, cb);
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

	"removeHost": function (soajs, model, env, type, ip, cb) {
		var opts = {
			collection: hostsColl,
			conditions: {
				"env": env.toLowerCase()
			}
		};

		if (type && type !== '') {
			opts.conditions.name = type;
		}

		if (ip && ip !== '') {
			opts.conditions.ip = ip;
		}

		model.removeEntry(soajs, opts, cb);
	},

	"removeHostByTask": function (soajs, model, env, task, cb) {
		var opts = {
			collection: hostsColl,
			conditions: {
				env: env.toLowerCase(),
				serviceHATask: task
			}
		};

		model.removeEntry(soajs, opts, cb);
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

	"removeServiceHosts": function (soajs, model, criteria, cb) {
		var opts = {
			collection: hostsColl,
			conditions: criteria
		};

		model.removeEntry(soajs, opts, cb);
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
