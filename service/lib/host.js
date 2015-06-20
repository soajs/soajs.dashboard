'use strict';
var fs = require("fs");
var request = require("request");
var colName = "hosts";
var deployer = require("./deployer.js");

function pad(d) {
	return (d < 10) ? '0' + d.toString() : d.toString();
}

module.exports = {

	"deployController": function(config, mongo, req, res) {
		//from profile name, construct profile path and equivalently soajsData01....
		mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			//fetch how many servers are in the profile
			var list = [];
			var regFile = req.soajs.inputmaskData.profile;
			var profile = require(regFile);

			//todo: this is hardcoded for now, needs to become dynamic
			for(var i = 0; i < profile.servers.length; i++) {
				list.push("soajsData:dataProxy" + pad(i + 1));
			}

			var dockerParams = {
				"image": "local/controller",
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"profile": regFile,
				"links": list
			};

			var deployerConfig = envRecord.deployer[envRecord.deployer.selected];
			deployer.createContainer(deployerConfig, dockerParams, function(error, data) {
				if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }

				deployer.start(deployerConfig, data.Id, function(error) {
					if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }

					setTimeout(function() {
						registerNewHost(data, envRecord);
					}, 2000);
				});
			});
		});

		function registerNewHost(data, envRecord) {
			//get the ip of the host from hosts
			mongo.findOne(colName, {"env": req.soajs.inputmaskData.envCode.toLowerCase(), "name": "controller", "hostname": data.Config.Hostname}, function(error, hostRecord) {
				if(error) { return res.json(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

				//insert into docker collection
				var document = {
					"ip": hostRecord.ip,
					"cid": data.Id,
					"env": hostRecord.env.toLowerCase(),
					"hostname": data.Config.Hostname
				};
				mongo.insert("docker", document, function(error) {
					if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }
					return res.json(req.soajs.buildResponse(null, {"ip": hostRecord.ip, 'hostname': hostRecord.name}));
				});
			});
		}
	},

	"deployNginx": function(config, mongo, req, res) {
		//from envCode, load env, get port and domain
		mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			var dockerParams = {
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"image": "local/nginxapi",
				"port": envRecord.port,
				"variables": [
					"SOAJS_NX_NBCONTROLLER=" + req.soajs.inputmaskData.containerNames.length,
					"SOAJS_NX_APIPORT=" + envRecord.port,
					"SOAJS_NX_APIDOMAIN=" + envRecord.services.config.session.cookie.domain //mydomain.com
				],
				"links": req.soajs.inputmaskData.containerNames
			};

			var deployerConfig = envRecord.deployer[envRecord.deployer.selected];
			deployer.createContainer(deployerConfig, dockerParams, function(error, data) {
				if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }

				deployer.start(deployerConfig, data.Id, function(error) {
					if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }

					setTimeout(function() {
						return res.json(req.soajs.buildResponse(null, true));
					}, 2000);
				});
			});
		});
	},

	"deployService": function(config, mongo, req, res) {
		//from profile name, construct profile path and equivalently soajsData01....
		//if gc info, check if gc exists before proceeding
		mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			//build the regFile path
			var regFile = req.soajs.inputmaskData.profile;

			//fetch how many servers are in the profile
			var links = [];
			var profile = require(regFile);

			//todo: this is hardcoded for now, need to become dynamic
			for(var i = 0; i < profile.servers.length; i++) {
				links.push("soajsData:dataproxy" + pad(i + 1));
			}

			var dockerParams = {
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"profile": regFile,
				"links": links,
				"image": req.soajs.inputmaskData.image
			};

			var serviceName;
			if(req.soajs.inputmaskData.gcName) {
				dockerParams.variables = [
					"SOAJS_GC_NAME=" + req.soajs.inputmaskData.gcName,
					"SOAJS_GC_VERSION=" + req.soajs.inputmaskData.gcVersion
				];
				serviceName = req.soajs.inputmaskData.gcName;
			}
			else {
				serviceName = req.soajs.inputmaskData.name;
			}

			var deployerConfig = envRecord.deployer[envRecord.deployer.selected];
			deployer.createContainer(deployerConfig, dockerParams, function(error, data) {
				if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }
				deployer.start(deployerConfig, data.Id, function(error) {
					if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }
					//get the ip of the host from hosts
					setTimeout(function() {
						registerHost(data, serviceName, envRecord);
					}, 2000);
				});
			});
		});

		function registerHost(data, serviceName, envRecord) {
			mongo.findOne(colName, {"env": req.soajs.inputmaskData.envCode.toLowerCase(), "name": serviceName, "hostname": data.Config.Hostname}, function(error, hostRecord) {
				if(error || !hostRecord) { return res.json(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

				console.log(data);
				var document = {
					"ip": hostRecord.ip,
					"cid": data.Id,
					"env": hostRecord.env,
					"hostname": data.Config.Hostname
				};
				mongo.insert("docker", document, function(error) {
					if(error) { return res.json(req.soajs.buildResponse({"code": 615, "msg": config.errors[615]})); }

					mongo.find(colName, {"env": hostRecord.env, "name": "controller"}, function(error, controllers) {
						if(error) { return res.json(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }
						return res.json(req.soajs.buildResponse(null, {"ip": hostRecord.ip, 'hostname': hostRecord.hostname, "controllers": controllers}));
					});
				});
			});
		}
	},

	"list": function(config, mongo, req, res) {
		mongo.find(colName, {env: req.soajs.inputmaskData.env.toLowerCase()}, function(err, hosts) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			mongo.find('docker', {env: req.soajs.inputmaskData.env.toLowerCase()}, function(err, containers) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

				hosts.forEach(function(oneHost) {
					containers.forEach(function(oneContainer) {
						if(oneHost.ip === oneContainer.ip && oneHost.hostname === oneContainer.hostname) {
							oneHost.cid = oneContainer.cid;
						}
					});
				});
				return res.jsonp(req.soajs.buildResponse(null, hosts));
			});
		});
	},

	"delete": function(config, mongo, req, res) {
		mongo.findOne("environment", {code: req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

			var dockerColCriteria = {
				'env': req.soajs.inputmaskData.env.toLowerCase(),
				"ip": req.soajs.inputmaskData.ip,
				'hostname': req.soajs.inputmaskData.hostname,
				"docker.ip": envRecord.docker.local.ip,
				"docker.port": envRecord.docker.local.port
			};

			mongo.findOne('docker', dockerColCriteria, function(error, response) {
				if(error) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

				if(response && response.cid) {
					var deployerConfig = envRecord.deployer[envRecord.deployer.selected];
					deployer.remove(deployerConfig, response.cid, function(error) {
						if(error) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

						else {
							mongo.remove('docker', {'_id': response._id}, function(err) {
								if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

								removeFromHosts();
							});
						}
					});
				}
				else {
					removeFromHosts();
				}
			});
		});

		function removeFromHosts() {
			var hostCriteria = {
				'env': req.soajs.inputmaskData.env.toLowerCase(),
				'name': req.soajs.inputmaskData.name,
				'ip': req.soajs.inputmaskData.ip
			};
			mongo.remove(colName, hostCriteria, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }
				return res.jsonp(req.soajs.buildResponse(null, "host delete successfull."));
			});
		}
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
				"ip": req.soajs.inputmaskData.serviceHost,
				"hostname": req.soajs.inputmaskData.hostname
			};

			switch(req.soajs.inputmaskData.operation) {
				case 'startHost':
					mongo.findOne("environment", {code: req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
						if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

						mongo.findOne("docker", criteria, function(error, response) {
							if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }

							var deployerConfig = envRecord.deployer[envRecord.deployer.selected];
							deployer.start(deployerConfig, response.cid, function(error) {
								if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }
								return res.jsonp(req.soajs.buildResponse(null, true));
							});
						});
					});
					break;
				case 'stopHost':
					mongo.findOne("environment", {code: req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
						if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

						mongo.findOne("docker", criteria, function(error, response) {
							if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }

							var deployerConfig = envRecord.deployer[envRecord.deployer.selected];
							deployer.stop(deployerConfig, response.cid, function(error) {
								if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }
								return res.jsonp(req.soajs.buildResponse(null, true));
							});
						});
					});
					break;
				case 'infoHost':
					mongo.findOne("environment", {code: req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
						if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }

						mongo.findOne("docker", criteria, function(error, response) {
							if(error) { return res.jsonp(req.soajs.buildResponse({"code": 603, "msg": config.errors[603]})); }

							var deployerConfig = envRecord.deployer[envRecord.deployer.selected];
							deployer.info(deployerConfig, response.cid, req, res);
						});
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