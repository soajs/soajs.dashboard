'use strict';
var fs = require("fs");
var request = require("request");
var colName = "hosts";
var deployer = require("./deployer.js");

function pad(d) {
	return (d < 10) ? '0' + d.toString() : d.toString();
}

//todo: move this to registry when done and update the mapping below
var dockerInfo = {
	'host': '192.168.59.103',
	'port': 2376
};

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

			//todo: update docker collection
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
			var links = [];
			var profile = require(regFile);

			//todo: this is hardcoded for now, need to become dynamic
			for(var i = 0; i < profile.servers.length; i++) {
				links.push("soajsData" + pad(i + 1) + ":dataproxy" + pad(i + 1));
			}

			var dockerParams = {
				"env": req.soajs.inputmaskData.envCode,
				"profile": regFile,
				"links": links,
				"image": req.soajs.inputmaskData.image
			};

			var serviceName;
			if(req.soajs.inputmaskData.gcName) {
				dockerParams.env = [
					"SOAJS_GC_NAME=" + req.soajs.inputmaskData.gcName,
					"SOAJS_GC_VERSION=" + req.soajs.inputmaskData.gcVersion
				];
				serviceName = req.soajs.inputmaskData.gcName;
			}
			else {
				serviceName = req.soajs.inputmaskData.name;
			}

			deployer.createContainer(dockerInfo, dockerParams, function(error, data) {
				if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }

				//todo: remove this when done
				console.log("response from createcontainer");
				console.log(data);

				//get the ip of the host from hosts
				mongo.findOne(colName, {"env":req.soajs.inputmaskData.envCode, "name": serviceName, "hostname": data.Config.Hostname}, function(error, hostRecord){
					if(error){ return res.json(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

					//insert into docker collection
					var document = {
						"ip": hostRecord.ip,
						"cid": data.Id,
						"env": hostRecord.env,
						"hostname": hostRecord.name
					};
					mongo.insert("docker", document, function(error) {
						if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }
						return res.json(req.soajs.buildResponse(null, {"ip": data.ip, 'hostname': data.hostname}));
					});
				});
			});
		});
	},

	"list": function(config, mongo, req, res) {
		mongo.find(colName, {env: req.soajs.inputmaskData.env.toLowerCase()}, function(err, records) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			return res.jsonp(req.soajs.buildResponse(null, records));
		});
	},

	"delete": function(config, mongo, req, res) {
		var dockerColCriteria = {
			'env': req.soajs.inputmaskData.env.toLowerCase(),
			"ip": req.soajs.inputmaskData.ip,
			'hostname': req.soajs.inputmaskData.hostname
		};
		mongo.findOne('docker', dockerColCriteria, function(error, response) {
			if(error) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			deployer.remove(dockerInfo, response.cid, req, res, function(error) {
				if(error) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

				else {
					mongo.remove('docker', {'_id': response._id}, function(err) {
						if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

						var hostCriteria = {
							'env': req.soajs.inputmaskData.env.toLowerCase(),
							'name': req.soajs.inputmaskData.name,
							'ip': req.soajs.inputmaskData.ip
						};
						mongo.remove(colName, hostCriteria, function(err) {
							if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }
							return res.jsonp(req.soajs.buildResponse(null, "host delete successfull."));
						});
					});
				}
			});
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
			mongo.findOne(colName, {'env': req.soajs.inputmaskData.env.toLowerCase(), "name": req.soajs.inputmaskData.serviceName, "ip": req.soajs.inputmaskData.serviceHost}, function(error, record) {
				if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }
				if(!record) { return res.jsonp(req.soajs.buildResponse({"code": 605, "msg": config.errors[605]})); }

				//perform maintenance operation
				doMaintenance();
			});
		}

		function doMaintenance() {
			var criteria = {
				'env': req.soajs.inputmaskData.env.toLowerCase(),
				"ip": req.soajs.inputmaskData.ip,
				"hostname": req.soajs.inputmaskData.hostname
			};

			switch(req.soajs.inputmaskData.operation) {
				case 'startHost':
					mongo.findOne("docker", criteria, function(error, response) {
						if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }

						deployer.start(dockerInfo, response.cid, req, res);
					});
				case 'stopHost':
					mongo.findOne("docker", criteria, function(error, response) {
						if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }

						deployer.stop(dockerInfo, response.cid, req, res);
					});
					break;
				case 'infoHost':
					mongo.findOne("docker", criteria, function(error, response) {
						if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }

						deployer.info(dockerInfo, response.cid, req, res);
					});
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