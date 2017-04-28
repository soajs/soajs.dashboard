/**
 * Created by nicolas on 10/19/16.
 */
'use strict';
var Mongo = require("soajs").mongo;
var mongo = null;

var servicesCollectionName = 'services';
var daemonsCollectionName = 'daemons';
var staticContentCollectionName = 'staticContent';
var groupConfigCollectionName = 'daemon_grpconf';
var environmentCollectionName = 'environment';
var gridfsCollectionName = 'fs.files';
var tenantCollectionName = 'tenants';
var productsCollectionName = 'products';
var hostsCollectionName = 'hosts';
var oauthUracCollectionName = 'oauth_urac';
var gitAccountsCollectionName = 'git_accounts';
var gcCollectionName = 'gc';
var analyticsCollection = "analytics";

function checkForMongo(soajs) {
    if (!mongo) {
        mongo = new Mongo(soajs.registry.coreDB.provision);

        //services
		mongo.ensureIndex(servicesCollectionName, {port: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {'src.owner': 1, 'src.repo': 1}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {name: 1, port: 1, 'src.owner': 1, 'src.repo': 1}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {gcId: 1}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {name: 1, gcId: 1}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {port: 1, gcId: 1}, errorLogger);

		//daemons
		mongo.ensureIndex(daemonsCollectionName, {name: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(daemonsCollectionName, {port: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(daemonsCollectionName, {name: 1, port: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(daemonsCollectionName, {'src.owner': 1, 'src.repo': 1}, errorLogger);
		mongo.ensureIndex(daemonsCollectionName, {name: 1, port: 1, 'src.owner': 1, 'src.repo': 1}, errorLogger);

		//staticContent
		mongo.ensureIndex(staticContentCollectionName, {name: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(staticContentCollectionName, {'src.owner': 1, 'src.repo': 1}, errorLogger);
		mongo.ensureIndex(staticContentCollectionName, {name: 1, 'src.owner': 1, 'src.repo': 1}, errorLogger);

		//daemon_grpconf
		mongo.ensureIndex(groupConfigCollectionName, {daemon: 1}, errorLogger);
		mongo.ensureIndex(groupConfigCollectionName, {name: 1}, errorLogger);

		//environment
		mongo.ensureIndex(environmentCollectionName, {locked: 1}, errorLogger);

		//fs.files
		// mongo.ensureIndex(gridfsCollectionName, {filename: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(gridfsCollectionName, {filename: 1, 'metadata.type': 1}, errorLogger);
		mongo.ensureIndex(gridfsCollectionName, {'metadata.type': 1}, errorLogger);
		mongo.ensureIndex(gridfsCollectionName, {'metadata.env': 1}, errorLogger);

		//tenants
		mongo.ensureIndex(tenantCollectionName, {_id: 1, locked: 1}, errorLogger);
		mongo.ensureIndex(tenantCollectionName, {name: 1}, errorLogger);
		mongo.ensureIndex(tenantCollectionName, {type: 1}, errorLogger);
		mongo.ensureIndex(tenantCollectionName, {'application.keys.extKeys.env': 1}, errorLogger);

		//products
		mongo.ensureIndex(productsCollectionName, {code: 1, "packages.code": 1}, errorLogger);

		//hosts
	    if (!process.env.SOAJS_DEPLOY_HA) {
		    mongo.ensureIndex(hostsCollectionName, {_id: 1, locked: 1}, errorLogger);
		    mongo.ensureIndex(hostsCollectionName, {env: 1, name: 1, hostname: 1}, errorLogger);
		    mongo.ensureIndex(hostsCollectionName, {env: 1, name: 1, ip: 1, hostname: 1}, errorLogger);
		    mongo.ensureIndex(hostsCollectionName, {env: 1, type: 1, running: 1}, errorLogger);
	    }
	    
		//oauth_urac
		mongo.ensureIndex(oauthUracCollectionName, {tId: 1, _id: 1}, errorLogger);
		mongo.ensureIndex(oauthUracCollectionName, {tId: 1, userId: 1, _id: 1}, errorLogger);

		//git_accounts
		mongo.ensureIndex(gitAccountsCollectionName, {_id: 1, 'repos.name': 1}, errorLogger);
		mongo.ensureIndex(gitAccountsCollectionName, {'repos.name': 1}, errorLogger);
		mongo.ensureIndex(gitAccountsCollectionName, {owner: 1, provider: 1}, errorLogger);

		//gc
		mongo.ensureIndex(gcCollectionName, {name: 1}, errorLogger);
		mongo.ensureIndex(gcCollectionName, {_id: 1, refId: 1, v: 1}, errorLogger);
		
		//analytics
	    mongo.ensureIndex(analyticsCollection, {id: 1}, errorLogger);
    }

    function errorLogger(error) {
		if (error) {
			return soajs.log.error(error);
		}
	}
}

module.exports = {
    "getDb": function(soajs) {
        checkForMongo(soajs);
        return mongo;
    },

    "generateId": function (soajs) {
        checkForMongo(soajs);
        return new mongo.ObjectId();
    },

    "validateId": function(soajs, cb){
        checkForMongo(soajs);
        try{
            soajs.inputmaskData.id = mongo.ObjectId(soajs.inputmaskData.id);
            return ((cb) ? cb(null, soajs.inputmaskData.id) : soajs.inputmaskData.id);
        }
        catch(e){
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
        checkForMongo(soajs);
        try {
            id = mongo.ObjectId(id);
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
        checkForMongo(soajs);
        mongo.count(opts.collection, opts.conditions || {}, cb);
    },

    "findEntries": function (soajs, opts, cb) {
        checkForMongo(soajs);
        mongo.find(opts.collection, opts.conditions || {}, opts.fields || null, opts.options || null, cb);
    },

    "findEntry": function (soajs, opts, cb) {
        checkForMongo(soajs);
        mongo.findOne(opts.collection, opts.conditions || {},  opts.fields || null, opts.options || null, cb);
    },

    "saveEntry": function (soajs, opts, cb) {
        checkForMongo(soajs);
        mongo.save(opts.collection, opts.record, cb);
    },

    "insertEntry": function (soajs, opts, cb) {
        checkForMongo(soajs);
        mongo.insert(opts.collection, opts.record, opts.versioning || false, cb);
    },

    "removeEntry": function (soajs, opts, cb) {
        checkForMongo(soajs);
        mongo.remove(opts.collection, opts.conditions, cb);
    },

    "updateEntry": function (soajs, opts, cb) {
        checkForMongo(soajs);
        mongo.update(opts.collection, opts.conditions, opts.fields, opts.options || {}, opts.versioning || false, cb);
    },
	
	"distinctEntries": function(soajs, opts, cb){
    	checkForMongo(soajs);
    	mongo.distinct(opts.collection, opts.fields, opts.conditions, cb);
	}
};
