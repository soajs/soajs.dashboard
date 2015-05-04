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

	"maintenanceOperation": function(config, mongo, req, res) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toLowerCase();

		if(req.soajs.inputmaskData.operation === 'awarenessStat' && req.soajs.inputmaskData.serviceName !== 'controller') {
			return res.jsonp(req.soajs.buildResponse({"code": 602, "msg": config.errors[602]}));
		}

		if(req.soajs.inputmaskData.operation === 'loadProvision' && req.soajs.inputmaskData.serviceName === 'controller') {
			return res.jsonp(req.soajs.buildResponse({"code": 602, "msg": config.errors[602]}));
		}

		//check that the given service has the given port in services collection
		if(req.soajs.inputmaskData.serviceName === 'controller'){
			//check that the given service has the given host in hosts collection
			doMaintenance();
		}
		else{
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
		}
	}
};