'use strict';
var fs = require("fs");
var request = require("request");
var colName = "hosts";

function pad(d) {
	return (d < 10) ? '0' + d.toString() : d.toString();
}

module.exports = {

	"deployController": function(config, mongo, req, res) {
		//from profile name, construct profile path and equivalently soajsData01....
		mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			//build the regFile path
			var regFile = req.soajs.inputmaskData.profile;
			//check if path actually exists
			if(!fs.existsSync(regFile)) {
				return res.json(req.soajs.buildResponse({"code": 610, "msg": config.errors[610]}));
			}

			//fetch how many servers are in the profile
			var mongoList = [];
			var profile = require(regFile);
			//todo: this is hardcoded for now, needs to become dynamic
			for(var i = 0; i < profile.servers.length; i++) {
				mongoList.push("soajsData" + pad(i + 1));
			}

			var dockerParams = {
				"env": req.soajs.inputmaskData.envCode,
				"profile": regFile,
				"number": req.soajs.inputmaskData.nodesNumber,
				"mongo": mongoList
			};
			console.log(dockerParams);
			//todo: call api here and pass the object

			return res.json(req.soajs.buildResponse(null, true));
		});
	},

	"deployNginx": function(config, mongo, req, res) {
		//from envCode, load env, get port and domain
		mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }


			var dockerParams = {
				"env": req.soajs.inputmaskData.envCode,
				"port": envRecord.port,
				"domain": envRecord.services.config.session.cookie.domain,
				"controllers": req.soajs.inputmaskData.containerNames
			};
			console.log(dockerParams);
			//todo: call api here and pass the object

			return res.json(req.soajs.buildResponse(null, true));
		});
	},

	"deployService": function(config, mongo, req, res) {

		if(!req.soajs.inputmaskData.image && !req.soajs.inputmaskData.gcName){
			return res.json(req.soajs.buildResponse({"code": 613, "msg": config.errors[613]}));
		}

		if(req.soajs.inputmaskData.image && req.soajs.inputmaskData.gcName) {
			return res.json(req.soajs.buildResponse({"code": 612, "msg": config.errors[612]}));
		}

		if(req.soajs.inputmaskData.image) {
			mongo.findOne("services", {"image": req.soajs.inputmaskData.image}, function(error, imageRecord) {
				if(error) { return res.json(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

				if(!imageRecord) { return res.json(req.soajs.buildResponse({"code": 611, "msg": config.errors[611]})); }

				req.soajs.inputmaskData.serviceName = imageRecord.name;
				proceed(false);
			});
		}

		if(req.soajs.inputmaskData.gcName) {
			mongo.findOne("gc", {"name": req.soajs.inputmaskData.gcName, "v": req.soajs.inputmaskData.gcVersion}, function(error, gcRecord) {
				if(error) { return res.json(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

				if(!gcRecord) { return res.json(req.soajs.buildResponse({"code": 703, "msg": config.errors[703]})); }

				proceed(true);
			});
		}

		function proceed(gcService) {
			//from profile name, construct profile path and equivalently soajsData01....
			//if gc info, check if gc exists before proceeding
			mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function(err, envRecord) {
				if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

				//build the regFile path
				var regFile = req.soajs.inputmaskData.profile;
				//check if path actually exists
				if(!fs.existsSync(regFile)) {
					return res.json(req.soajs.buildResponse({"code": 610, "msg": config.errors[610]}));
				}

				//fetch how many servers are in the profile
				var mongoList = [];
				var profile = require(regFile);
				//todo: this is hardcoded for now, need to become dynamic
				for(var i = 0; i < profile.servers.length; i++) {
					mongoList.push("soajsData" + pad(i + 1));
				}

				var dockerParams = {
					"env": req.soajs.inputmaskData.envCode,
					"profile": regFile,
					"mongo": mongoList
				};
				if(gcService) {
					dockerParams.serviceName = req.soajs.inputmaskData.gcName;
					dockerParams.serviceVersion = req.soajs.inputmaskData.gcVersion;
				}
				else {
					dockerParams.image = req.soajs.inputmaskData.image;
				}
				console.log(dockerParams);
				//todo: call api here and pass the object

				return res.json(req.soajs.buildResponse(null, true));
			});
		}
	},

	"list": function(config, mongo, req, res) {
		mongo.find(colName, {env: req.soajs.inputmaskData.env.toLowerCase()}, function(err, records) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			return res.jsonp(req.soajs.buildResponse(null, records));
		});
	},

	"delete": function(config, mongo, req, res) {
		mongo.remove(colName, {env: req.soajs.inputmaskData.env.toLowerCase(), name: req.soajs.inputmaskData.name, ip: req.soajs.inputmaskData.ip}, function(err, records) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			return res.jsonp(req.soajs.buildResponse(null, "host delete successfull."));
		});
	},

	"maintenanceOperation": function(config, mongo, req, res) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toLowerCase();

		if(req.soajs.inputmaskData.operation === 'awarenessStat' && req.soajs.inputmaskData.serviceName !== 'controller') {
			return res.jsonp(req.soajs.buildResponse({"code": 602, "msg": config.errors[602]}));
		}

		if(req.soajs.inputmaskData.operation === 'loadProvision' && req.soajs.inputmaskData.serviceName === 'controller') {
			return res.jsonp(req.soajs.buildResponse({"code": 602, "msg": config.errors[602]}));
		}

		//check that the given service has the given port in services collection
		if(req.soajs.inputmaskData.serviceName === 'controller') {
			//check that the given service has the given host in hosts collection
			doMaintenance();
		}
		else {
			mongo.findOne('services', {'name': req.soajs.inputmaskData.serviceName, 'port': req.soajs.inputmaskData.servicePort}, function(error, record) {
				if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }
				if(!record) { return res.jsonp(req.soajs.buildResponse({"code": 604, "msg": config.errors[604]})); }

				//check that the given service has the given host in hosts collection
				checkServiceHost();
			});
		}

		function checkServiceHost() {
			mongo.findOne(colName, {'env': req.soajs.inputmaskData.env, "name": req.soajs.inputmaskData.serviceName, "ip": req.soajs.inputmaskData.serviceHost}, function(error, record) {
				if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }
				if(!record) { return res.jsonp(req.soajs.buildResponse({"code": 605, "msg": config.errors[605]})); }

				//perform maintenance operation
				doMaintenance();
			});
		}

		function doMaintenance() {
			switch(req.soajs.inputmaskData.operation) {
				case 'startHost':
				case 'stopHost':
					//todo: complete the below from docker api
					return res.jsonp(req.soajs.buildResponse(null, {'response': true}));
					break;
				case 'infoHost':
					//todo: complete the below from docker api
					var response = {
						"name": req.soajs.inputmaskData.serviceName,
						"ip": req.soajs.inputmaskData.serviceHost,
						"port": req.soajs.inputmaskData.servicePort,
						"hostname": req.soajs.inputmaskData.serviceName + "_" + req.soajs.inputmaskData.env,
						"cpu": "20%",
						"memory": "2048M",
						"status": "running"
					};
					return res.jsonp(req.soajs.buildResponse(null, response));
					break;
				default:
					req.soajs.inputmaskData.servicePort = req.soajs.inputmaskData.servicePort + 1000;
					var maintenanceURL = "http://" + req.soajs.inputmaskData.serviceHost + ":" + req.soajs.inputmaskData.servicePort;
					maintenanceURL += "/" + req.soajs.inputmaskData.operation;
					request.get(maintenanceURL, function(error, response, body) {
						if(error) {
							return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]}));
						}
						else {
							return res.jsonp(req.soajs.buildResponse(null, JSON.parse(body)));
						}
					});
					break;
			}
		}
	}
};