"use strict";

//both variables should be equivalent to the databases list in the registry
var database = "myDatabase";
var collection = 'myCollection';

var lib = {
	/**
	 * function that sets the default values if needed
	 * @param opts {Object}
	 */
	"defaults": function (opts) {
		if (!opts.database) {
			opts.database = database
		}
		if (!opts.collection) {
			opts.collection = collection
		}
		if (!Object.hasOwnProperty.call(opts, 'versioning')) {
			opts.versioning = false;
		}
	},

	/**
	 * Function that attempts to create a mongo Object id from second parameter
	 * @param soajs {Object}
	 * @param id {String}
	 * @returns {*}
	 */
	"object_Id": function (soajs, id) {
		var myId;
		try {
			myId = soajs.mongo.knowledgebase.ObjectId(id);
			return myId;
		}
		catch (e) {
			soajs.log.error(id);
			soajs.log.error(e);
			throw e;
		}
	},

	/**
	 * function that executes find in mongo
	 * @param soajs {Object}
	 * @param opts {Object}
	 * @param cb {Function}
	 */
	"findEntries": function (soajs, opts, cb) {
		lib.defaults(opts);
		soajs.mongo[opts.database].find(opts.collection, opts.condition || {}, opts.fields || null, opts.options || null, cb);
	},

	/**
	 * function that executes count in mongo
	 * @param soajs {Object}
	 * @param opts {Object}
	 * @param cb {Function}
	 */
	"countEntries": function (soajs, opts, cb) {
		lib.defaults(opts);
		soajs.mongo[opts.database].count(opts.collection, opts.condition || {}, cb);
	},

	/**
	 * function that executes find one in mongo
	 * @param soajs {Object}
	 * @param opts {Object}
	 * @param cb {Function}
	 */
	"findEntry": function (soajs, opts, cb) {
		lib.defaults(opts);
		soajs.mongo[opts.database].findOne(opts.collection, opts.condition || {}, opts.fields || {}, cb);
	},

	/**
	 * function that inserts one or an array of records
	 * @param soajs {Object}
	 * @param opts {Object}
	 * @param cb {Function}
	 */
	"insertEntries": function (soajs, opts, cb) {
		lib.defaults(opts);
		soajs.mongo[opts.database].insert(opts.collection, opts.record, opts.versioning || false, cb);
	},

	/**
	 * function that saves one mongo record back in the database
	 * @param soajs {Object}
	 * @param opts {Object}
	 * @param cb {Function}
	 */
	"saveEntry": function (soajs, opts, cb) {
		lib.defaults(opts);
		soajs.mongo[opts.database].save(opts.collection, opts.record, opts.versioning || false, cb);
	},

	/**
	 * function that updates one or multiple records in mongo database
	 * @param soajs {Object}
	 * @param opts {Object}
	 * @param cb {Function}
	 */
	"updateEntries": function (soajs, opts, cb) {
		lib.defaults(opts);
		soajs.mongo[opts.database].update(opts.collection, opts.condition, opts.updatedFields, opts.options || {}, opts.versioning || false, cb);
	},

	/**
	 * function that deletes one ore multiple records in mongo database
	 * @param soajs {Object}
	 * @param opts {Object}
	 * @param cb {Function}
	 */
	"deleteEntries": function (soajs, opts, cb) {
		lib.defaults(opts);
		soajs.mongo[opts.database].remove(opts.collection, opts.condition, cb);
	},

	/**
	 * function that executes find in mongo and pipes the output to a stream
	 * @param soajs {Object}
	 * @param opts {Object}
	 * @param cb {Function}
	 */
	"findStream": function (soajs, opts, cb) {
		lib.defaults(opts);
		soajs.mongo[opts.database].findStream(opts.collection, opts.condition, cb);
	}
};

module.exports = lib;