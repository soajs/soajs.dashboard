/**
 * Created by nicolas on 10/19/16.
 */
'use strict';
var soajs = require("soajs");
var Mongo = soajs.mongo;
var mongo = null;

function checkForMongo(soajs, opts) {
    if (!mongo) {
        var database = opts.dbName;
        mongo = new Mongo(soajs.registry.coreDB.database);
    }
}

var model = {
    "validateId": function(soajs, cb){
        checkForMongo(soajs, opts);
        try{
            soajs.inputmaskData.id = mongo.ObjectId(soajs.inputmaskData.id);
            return cb(null, soajs.inputmaskData.id);
        }
        catch(e){
            return cb(e);
        }
    },

    "countEntries": function (soajs, opts, cb) {
        checkForMongo(soajs, opts);
        soajs.mongoDb.count(opts.collection, opts.conditions || {}, cb);
    },

    "findEntries": function (soajs, opts, cb) {
        checkForMongo(soajs, opts);
        soajs.mongoDb.find(opts.collection, opts.conditions || {}, opts.fields || null, opts.options || null, cb);
    },

    "findEntry": function (soajs, opts, cb) {
        checkForMongo(soajs, opts);
        soajs.mongoDb.findOne(opts.collection, opts.conditions || {}, opts.fields || null, opts.options || null, cb);
    },

    "saveEntry": function (soajs, opts, cb) {
        checkForMongo(soajs, opts);
        soajs.mongoDb.save(opts.collection, opts.record, cb);
    },

    "insertEntry": function (soajs, opts, cb) {
        checkForMongo(soajs, opts);
        soajs.mongoDb.insert(opts.collection, opts.record, cb);
    },

    "removeEntry": function (soajs, opts, cb) {
        checkForMongo(soajs, opts);
        soajs.mongoDb.remove(opts.collection, opts.conditions, cb);
    },

    "updateEntry": function (soajs, opts, cb) {
        checkForMongo(soajs, opts);
        soajs.mongoDb.update(opts.collection, opts.conditions, opts.fields, opts.options || {}, cb);
    }
};