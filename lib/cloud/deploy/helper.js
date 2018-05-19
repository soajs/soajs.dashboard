'use strict';
var async = require("async");
var utils = require("../../../utils/utils.js");

var colls = {
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	staticContent: 'staticContent',
	catalog: 'catalogs',
	resources: 'resources',
	environment: 'environment'
};

var helpers = {

	/**
	 * Get activated git record from data store
	 *
	 * @param {Object} soajs
	 * @param {Object} repo
	 * @param {Callback Function} cb
	 */
	getGitRecord: function (soajs, repo, BL, cb) {
		var opts = {
			collection: colls.git,
			conditions: {'repos.name': repo},
			fields: {
				provider: 1,
				owner: 1,
				domain: 1,
				token: 1,
				'repos.$': 1
			}
		};
		BL.model.findEntry(soajs, opts, cb);
	},
	
	/**
	 * Get environment record and extract cluster information from it
	 *
	 * @param {Object} soajs
	 * @param {Object} BL
	 * @param {Function} cb
	 */
	getDashDbInfo: function (soajs, BL, cb) {
		let envRecord = soajs.registry;
		let data;
		
		let cluster = envRecord.coreDB.provision;
		data = {
			mongoDbs: cluster.servers,
			mongoCred: cluster.credentials,
			clusterInfo: cluster,
			prefix: envRecord.coreDB.provision.prefix
		};
		
		var switchedConnection = BL.model.switchConnection(soajs);
		if (switchedConnection) {
			if (typeof  switchedConnection === 'object' && Object.keys(switchedConnection).length > 0) {
				data.prefix = switchedConnection.prefix;
				data.mongoCred = switchedConnection.credentials;
				data.mongoDbs = switchedConnection.servers;
				data.clusterInfo = switchedConnection;
			}
		}
		
		return cb(null, data);
	},
	
	
};

module.exports = helpers;
