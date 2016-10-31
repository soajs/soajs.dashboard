/**
 * Created by nicolas on 10/19/16.
 */
'use strict';
var soajs = require("soajs");
var Mongo = soajs.mongo;
var mongo = null;

function checkForMongo(soajs) {
    if (!mongo) {
        mongo = new Mongo(soajs.registry.coreDB.provision);
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
    }
};
