"use strict";

var collName = "products";
const async = require("async");
const soajsLib = require("soajs.core.libs");

var methods = {
	"findEntries": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.findEntries(soajs, opts, (err, records) => {
			if (err) {
				return cb(err);
			}
			if (records.length === 0) {
				return cb(null, records);
			}
			async.map(records, function (record, callback) {
				methods.unsanitize(record, callback);
			}, cb);
		});
	},
	"findEntry": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.findEntry(soajs, opts, (err, record) => {
			if (err) {
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
	
	"sanitize": function (acl, cb) {
		async.eachOf(acl, function (env, envKey, call) {
			async.eachOf(env, function (service, serviceKey, callback) {
				let sanitizedVersion = {};
				Object.keys(service).forEach(function (key) {
					sanitizedVersion[soajsLib.version.sanitize(key)] = service[key];
					delete service[key];
				});
				acl[envKey][serviceKey] = sanitizedVersion;
				callback();
			}, call);
		}, cb);
	},
	"unsanitize": function (record, cb) {
		async.parallel([
				function (callback) {
					if (record.scope && record.scope.acl && Object.keys(record.scope.acl > 0)) {
						let scope = record.scope.acl;
						santizeAcl(scope, () => {
							record.scope.acl = scope;
							return callback();
						});
					} else {
						return callback();
					}
					
				},
				function (callback) {
					if (record.packages && Object.keys(record.packages > 0)) {
						loopThroupProduct(record, callback);
					} else {
						return callback();
					}
				}
			],
			function () {
				return cb(null, record);
			});
		
		
		function santizeAcl(acl, cb) {
			async.eachOf(acl, function (env, envKey, call) {
				async.eachOf(env, function (service, serviceKey, callback) {
					let sanitizedVersion = {};
					Object.keys(service).forEach(function (key) {
						sanitizedVersion[soajsLib.version.unsanitize(key)] = service[key];
						delete service[key];
					});
					acl[envKey][serviceKey] = sanitizedVersion;
					callback();
				}, call);
			}, cb);
		}
		
		function loopThroupProduct(record, cb) {
			async.each(record.packages, function (pack, call) {
				if (pack.acl && Object.keys(pack.acl > 0)) {
					let acl = pack.acl;
					santizeAcl(pack.acl, () => {
						pack.acl = acl;
						return call();
					});
				} else {
					return call();
				}
			}, cb);
		}
	}
};

module.exports = methods;
