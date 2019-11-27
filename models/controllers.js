"use strict";

const collName = "controllers";
const async = require("async");
const soajsLib = require("soajs.core.libs");

let methods = {
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
	"unsanitize": function (record, cb) {
		if (record && record.data && record.data.services && Object.keys(record.data.services).length > 0) {
			async.each(record.data.services, function (service, callback) {
				if (service && service.versions && Object.keys(service.versions).length > 0) {
					let sanitizedVersion = {};
					Object.keys(service.versions).forEach(function (key) {
						sanitizedVersion[soajsLib.version.unsanitize(key)] = service.versions[key];
						delete service.versions[key];
					});
					service.versions = sanitizedVersion;
				}
				if (service && service.hosts && Object.keys(service.hosts).length > 0) {
					let sanitizedHostsVersion = {};
					Object.keys(service.hosts).forEach(function (key) {
						sanitizedHostsVersion[soajsLib.version.unsanitize(key)] = service.hosts[key];
						delete service.hosts[key];
					});
					service.hosts = sanitizedHostsVersion;
				}
				callback();
			}, function () {
				return cb(null, record);
			});
		} else {
			return cb(null, record);
		}
	}
};

module.exports = methods;
