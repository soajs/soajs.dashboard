"use strict";

var collName = "api_builder_passThroughs";
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
		let sanitizedVersion = {};
		if(record && record.versions && Object.keys(record.versions).length > 0){
			Object.keys(record.versions).forEach(function(key) {
				sanitizedVersion[soajsLib.version.unsanitize(key)] = record.versions[key];
				delete record.versions[key];
			});
			record.versions = sanitizedVersion;
			return cb(null, record);
		}
		else {
			return cb(null, record);
		}
	}
};

module.exports = methods;
