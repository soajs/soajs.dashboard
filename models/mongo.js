/**
 * Created by nicolas on 10/19/16.
 */
'use strict';
var soajsCore = require("soajs");
var Mongo = soajsCore.mongo;
var mongoObj = null;

var soajsUtils = soajsCore.utils;

var servicesCollectionName = 'services';
var daemonsCollectionName = 'daemons';
var groupConfigCollectionName = 'daemon_grpconf';
var environmentCollectionName = 'environment';
var gridfsCollectionName = 'fs.files';
var tenantCollectionName = 'tenants';
var productsCollectionName = 'products';
var hostsCollectionName = 'hosts';
var oauthUracCollectionName = 'oauth_urac';
var gitAccountsCollectionName = 'git_accounts';
var gcCollectionName = 'gc';
var resourcesCollection = 'resources';
var customRegCollection = 'custom_registry';

var firstRun = true;
var lib = {
	"initConnection": function (soajs) {
		function errorLogger(error) {
			if (error) {
				return soajs.log.error(error);
			}
		}
		var provision = {
			name: soajs.registry.coreDB.provision.name,
			prefix: soajs.registry.coreDB.provision.prefix,
			servers: soajs.registry.coreDB.provision.servers,
			credentials: soajs.registry.coreDB.provision.credentials,
			streaming: soajs.registry.coreDB.provision.streaming,
			URLParam: soajs.registry.coreDB.provision.URLParam,
			extraParam: soajs.registry.coreDB.provision.extraParam
		};
		if (process.env.SOAJS_SAAS && soajs.servicesConfig && soajs.servicesConfig.SOAJS_COMPANY) {
			if (Array.isArray(soajs.servicesConfig.SOAJS_COMPANY)) {
				if (soajs.inputmaskData.project) {
					if (soajs.servicesConfig.SOAJS_COMPANY.indexOf(soajs.inputmaskData.project) !== -1) {
						provision.prefix = soajs.inputmaskData.project + '_';
					}
				} else {
					// error
					return false;
				}
			}

		}
		soajs.mongoDb = new Mongo(provision);
		if (firstRun) {
			//services
			if (!mongoObj) {
				mongoObj = new Mongo(soajs.registry.coreDB.provision);

				mongoObj.createIndex(servicesCollectionName, { port: 1 }, { unique: true }, errorLogger);
				mongoObj.createIndex(servicesCollectionName, { 'src.owner': 1, 'src.repo': 1 }, errorLogger);
				mongoObj.createIndex(servicesCollectionName, {
					name: 1,
					port: 1,
					'src.owner': 1,
					'src.repo': 1
				}, errorLogger);
				mongoObj.createIndex(servicesCollectionName, { gcId: 1 }, errorLogger);
				mongoObj.createIndex(servicesCollectionName, { name: 1, gcId: 1 }, errorLogger);
				mongoObj.createIndex(servicesCollectionName, { port: 1, gcId: 1 }, errorLogger);

				//daemons
				mongoObj.createIndex(daemonsCollectionName, { name: 1 }, { unique: true }, errorLogger);
				mongoObj.createIndex(daemonsCollectionName, { port: 1 }, { unique: true }, errorLogger);
				mongoObj.createIndex(daemonsCollectionName, { name: 1, port: 1 }, { unique: true }, errorLogger);
				mongoObj.createIndex(daemonsCollectionName, { 'src.owner': 1, 'src.repo': 1 }, errorLogger);
				mongoObj.createIndex(daemonsCollectionName, {
					name: 1,
					port: 1,
					'src.owner': 1,
					'src.repo': 1
				}, errorLogger);

				//daemon_grpconf
				mongoObj.createIndex(groupConfigCollectionName, { daemon: 1 }, errorLogger);
				mongoObj.createIndex(groupConfigCollectionName, { name: 1 }, errorLogger);

				//environment
				mongoObj.createIndex(environmentCollectionName, { locked: 1 }, errorLogger);

				//fs.files
				// mongoObj.createIndex(gridfsCollectionName, {filename: 1}, {unique: true}, errorLogger);
				mongoObj.createIndex(gridfsCollectionName, { filename: 1, 'metadata.type': 1 }, errorLogger);
				mongoObj.createIndex(gridfsCollectionName, { 'metadata.type': 1 }, errorLogger);
				mongoObj.createIndex(gridfsCollectionName, { 'metadata.env': 1 }, errorLogger);

				//tenants
				mongoObj.createIndex(tenantCollectionName, { _id: 1, locked: 1 }, errorLogger);
				mongoObj.createIndex(tenantCollectionName, { name: 1 }, errorLogger);
				mongoObj.createIndex(tenantCollectionName, { type: 1 }, errorLogger);
				mongoObj.createIndex(tenantCollectionName, { 'application.keys.extKeys.env': 1 }, errorLogger);

				//products
				mongoObj.createIndex(productsCollectionName, { code: 1, "packages.code": 1 }, errorLogger);

				//hosts
				if (!process.env.SOAJS_DEPLOY_HA) {
					mongoObj.createIndex(hostsCollectionName, { _id: 1, locked: 1 }, errorLogger);
					mongoObj.createIndex(hostsCollectionName, { env: 1, name: 1, hostname: 1 }, errorLogger);
					mongoObj.createIndex(hostsCollectionName, { env: 1, name: 1, ip: 1, hostname: 1 }, errorLogger);
					mongoObj.createIndex(hostsCollectionName, { env: 1, type: 1, running: 1 }, errorLogger);
				}

				//oauth_urac
				mongoObj.createIndex(oauthUracCollectionName, { tId: 1, _id: 1 }, errorLogger);
				mongoObj.createIndex(oauthUracCollectionName, { tId: 1, userId: 1, _id: 1 }, errorLogger);

				//git_accounts
				mongoObj.createIndex(gitAccountsCollectionName, { _id: 1, 'repos.name': 1 }, errorLogger);
				mongoObj.createIndex(gitAccountsCollectionName, { 'repos.name': 1 }, errorLogger);
				mongoObj.createIndex(gitAccountsCollectionName, { owner: 1, provider: 1 }, errorLogger);

				//gc
				mongoObj.createIndex(gcCollectionName, { name: 1 }, errorLogger);
				mongoObj.createIndex(gcCollectionName, { _id: 1, refId: 1, v: 1 }, errorLogger);

				//resources
				mongoObj.createIndex(customRegCollection, { name: 1, type: 1, category: 1 }, errorLogger); //compound index, includes {name: 1}, {name: 1, type: 1}
				mongoObj.createIndex(resourcesCollection, { created: 1, shared: 1, sharedEnv: 1 }, errorLogger); //compound index, includes {created: 1}, {created: 1, shared: 1}

				//custom registry
				mongoObj.createIndex(customRegCollection, { name: 1, created: 1 }, errorLogger); //compound index, includes {name: 1}
				mongoObj.createIndex(customRegCollection, { created: 1, shared: 1, sharedEnv: 1 }, errorLogger); //compound index, includes {created: 1}, {created: 1, shared: 1}
			}
			firstRun = false;
		}
		
		return true;
	},
	/**
	 * Close the mongo connection
	 * @param {SOAJS Object} soajs
	 */
	"closeConnection": function (soajs) {
		if (soajs.mongoDb) {
			soajs.mongoDb.closeDb();
		}
	},
	
	"checkForMongo": function (soajs) {
		if (!soajs.mongoDb) {
			lib.initConnection(soajs);
		}
	},
	
	"getDb": function (soajs) {
		lib.checkForMongo(soajs);
		return soajs.mongoDb;
	},
	
	"generateId": function (soajs) {
		lib.checkForMongo(soajs);
		return new soajs.mongoDb.ObjectId();
	},
	
	"validateId": function (soajs, cb) {
		lib.checkForMongo(soajs);
		if (!soajs.inputmaskData.id) {
			soajs.log.error('No id provided');
			
			if (cb) {
				return cb('no id provided');
			}
			else {
				return null;
			}
		}
		
		try {
			soajs.inputmaskData.id = soajs.mongoDb.ObjectId(soajs.inputmaskData.id);
			return ((cb) ? cb(null, soajs.inputmaskData.id) : soajs.inputmaskData.id);
		}
		catch (e) {
			if (cb) {
				return cb(e);
			}
			else {
				soajs.log.error('Exception thrown while trying to get object id for ' + soajs.inputmaskData.id);
				soajs.log.error(e);
				return null;
			}
		}
	},
	
	"validateCustomId": function (soajs, id, cb) {
		lib.checkForMongo(soajs);
		try {
			id = soajs.mongoDb.ObjectId(id);
			return ((cb) ? cb(null, id) : id);
		}
		catch (e) {
			if (cb) {
				return cb(e);
			}
			else {
				soajs.log.error('Exception thrown while trying to get object id for ' + id);
				soajs.log.error(e);
				return null;
			}
		}
	},
	
	"countEntries": function (soajs, opts, cb) {
		lib.checkForMongo(soajs);
		soajs.mongoDb.count(opts.collection, opts.conditions || {}, cb);
	},
	
	"findEntries": function (soajs, opts, cb) {
		lib.checkForMongo(soajs);
		soajs.mongoDb.find(opts.collection, opts.conditions || {}, opts.fields || null, opts.options || null, cb);
	},
	
	"findEntry": function (soajs, opts, cb) {
		lib.checkForMongo(soajs);
		soajs.mongoDb.findOne(opts.collection, opts.conditions || {}, opts.fields || null, opts.options || null, cb);
	},
	
	"saveEntry": function (soajs, opts, cb) {
		lib.checkForMongo(soajs);
		soajs.mongoDb.save(opts.collection, opts.record, opts.versioning || false, cb);
	},
	
	"insertEntry": function (soajs, opts, cb) {
		lib.checkForMongo(soajs);
		soajs.mongoDb.insert(opts.collection, opts.record, opts.versioning || false, cb);
	},
	
	"removeEntry": function (soajs, opts, cb) {
		lib.checkForMongo(soajs);
		soajs.mongoDb.remove(opts.collection, opts.conditions, cb);
	},
	
	"updateEntry": function (soajs, opts, cb) {
		lib.checkForMongo(soajs);
		soajs.mongoDb.update(opts.collection, opts.conditions, opts.fields, opts.options || {}, opts.versioning || false, cb);
	},
	
	"distinctEntries": function (soajs, opts, cb) {
		lib.checkForMongo(soajs);
		soajs.mongoDb.distinct(opts.collection, opts.fields, opts.conditions, cb);
	}
};
module.exports = lib;
