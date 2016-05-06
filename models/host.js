"use strict";

var hostsColl = "hosts";
var dockerColl = "docker";
var envColl = "environment";

var model = {
	"getEnvironment": function (mongo, code, cb) {
		mongo.findOne(envColl, {code: code.toUpperCase()}, cb);
	},

	/**
	 * DOCKER COLLECTION
	 */
	"getContainers": function (mongo, env, type, running, cb) {
		var condition = {
			"env": env.toLowerCase(),
			"type": type
		};
		if (running) {
			condition.running = running;
		}
		mongo.find(dockerColl, condition, cb);
	},

	"findOneContainer": function (mongo, env, hostname, cb) {
		var condition = {
			"env": env.toLowerCase(),
			"hostname": hostname + "_" + env.toLowerCase()
		};
		mongo.findOne(dockerColl, condition, cb);
	},

	"removeContainer": function (mongo, env, hostname, cb) {
		var condition = {
			"env": env.toLowerCase(),
			"hostname": hostname + "_" + env.toLowerCase()
		};
		mongo.remove(dockerColl, condition, cb);
	},

	"insertContainer": function (mongo, record, cb) {
		record.hostname = record.hostname.replace("/", "");
		mongo.insert(dockerColl, record, cb);
	},

	"udpateContainer": function (mongo, containerId, data, cb) {
		mongo.update(dockerColl, {"cid": containerId}, {'$set': {"info": data}}, {
			multi: false,
			upsert: false,
			safe: true
		}, cb);
	},

	/**
	 * HOSTS COLLECTION
	 */
	"getHosts": function (mongo, env, type, cb) {
		var condition = {
			"env": env.toLowerCase()
		};

		if (type && type !== '') {
			condition["name"] = type;
		}
		mongo.find(hostsColl, condition, cb);
	},

	"getOneHost": function (mongo, env, type, ip, hostname, cb) {
		var condition = {
			"env": env.toLowerCase(),
			"name": type
		};

		if (ip && ip !== '') {
			condition["ip"] = ip;
		}

		if (hostname && hostname !== '') {
			condition["hostname"] = hostname;
		}

		mongo.findOne(hostsColl, condition, cb);
	},

	"removeHost": function (mongo, env, type, ip, cb) {
		var condition = {
			"env": env.toLowerCase()
		};

		if (type && type !== '') {
			condition["name"] = type;
		}

		if (ip && ip !== '') {
			condition["ip"] = ip;
		}
		mongo.remove(hostsColl, condition, cb);
	},

	"insertHost": function (mongo, record, cb) {
		record.hostname = record.hostname.replace("/", "");
		mongo.insert(hostsColl, record, cb);
	}
};

module.exports = model;