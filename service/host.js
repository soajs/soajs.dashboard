'use strict';
var colName = "hosts";
var request = require("request");

module.exports = {
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

	//todo: complete the below from docker api
	"add": function(config, mongo, req, res) {
		var response = [];
		for(var i = 0; i < req.soajs.inputmaskData.number; i++) {
			response.push({
				'ip': '127.0.0.1',
				'controllers': [
					{
						'ip': '127.0.0.1',
						'port': '4000'
					}
				]
			})
		}
		return res.jsonp(req.soajs.buildResponse(null, response));
	},

	//todo: complete the cases of the switch inside this method
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