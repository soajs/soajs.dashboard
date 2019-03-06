"use strict";

var collName = "cicd";
const async = require("async");
const soajsLib = require("soajs.core.libs");

var methods = {
	"findEntries": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.findEntries(soajs, opts, (err, records)=>{
			if (err){
				return cb(err);
			}
			if (records.length === 0){
				return cb(null, records);
			}
			async.map(records, function(record, callback) {
				methods.unsanitize(record, callback);
			}, cb);
		});
	},
	"findEntry": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.findEntry(soajs, opts, (err, record)=>{
			if (err){
				return cb(err);
			}
			methods.unsanitize(record, cb);
		});
	},
	"removeEntry": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.removeEntry(soajs, opts, cb);
	},
	"updateEntry": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.updateEntry(soajs, opts, cb);
	},
	"unsanitize": function (record, cb) {
		if(record && record.type === "cd" && Object.keys(record).length > 0){
			Object.keys(record).forEach(function(env) {
				if (env && env !== "_id" && record[env] && typeof record[env] === "object" && Object.keys(record[env]).length > 0){
					Object.keys(record[env]).forEach(function(service) {
						if (service && service !== "controller"
							&& typeof record[env][service] === "object"
							&& Object.keys(record[env][service]).length > 0){
							let sanitizedVersion = {};
							Object.keys(record[env][service]).forEach(function(version) {
								sanitizedVersion[soajsLib.version.unsanitize(version)] =  record[env][service][version];
								delete record[env][service][version];
							});
							record[env][service] = sanitizedVersion;
						}
					});
				}
			});
			return cb(null, record);
		}
		else {
			return cb(null, record);
		}
	}
};

module.exports = methods;
