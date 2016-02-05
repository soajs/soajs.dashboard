"use strict";
var request = require("request");
var async = require("async");

function constructProxyRequest(req, domain, soajsauth, requestedRoute, cb) {
	var requestConfig = {
		'uri': req.headers['x-forwarded-proto'] + '://' + domain + requestedRoute,
		'json': true,
		'headers': {
			'Content-Type': 'application/json',
			'accept': 'application/json',
			'connection': 'keep-alive',
			'key': req.headers.key,
			'soajsauth': soajsauth
		}
	};

	for (var f in req.headers) {
		if (!requestConfig.headers[f]) {
			requestConfig.headers[f] = req.headers[f];
		}
	}

	if (req.query && Object.keys(req.query).length > 0) {
		requestConfig.qs = req.query;
	}

	if (req.body && Object.keys(req.body).length > 0) {
		requestConfig.body = req.body;
	}

	console.log(requestConfig);
	request[req.method.toLowerCase()](requestConfig, function (error, response, body) {
		return cb(error, body);
	});
}

module.exports = {
	"redirect": function (config, mongo, req, res) {
		var sessionObj = req.soajs.session.getSERVICE();
		var requestedRoute;
		if (sessionObj && sessionObj.envAuth) {
			requestedRoute = req.query.proxyRoute;
			delete req.query.proxyRoute;

			if (req.soajs.inputmaskData.__env) {
				var requestedEnv = req.soajs.inputmaskData.__env.toLowerCase();
				makeRequest(requestedEnv, function (error, response) {
					if (error) {
						req.soajs.log.error(error);
						return res.json(req.soajs.buildResponse({code: 900, msg: error.message}));
					}
					return res.json(req.soajs.buildResponse(null, response));
				});
			}
			else {
				//forward to all envs....
				sessionObj.envAuth[process.env.SOAJS_ENV.toLowerCase()] = req.headers.soajsauth;
				var allEnvs = Object.keys(sessionObj.envAuth);
				async.mapLimit(allEnvs, allEnvs.length, makeRequest, function (error, response) {
					if (error) {
						req.soajs.log.error(error);
						return res.json(req.soajs.buildResponse({code: 900, msg: error.message}));
					}
					return res.json(req.soajs.buildResponse(null, response));
				});
			}
		}
		else {
			return res.json(req.soajs.buildResponse(null, true));
		}

		function makeRequest(oneEnvCode, cb) {
			var requestedEnv = oneEnvCode.toLowerCase();

			mongo.findOne("environment", {"code": requestedEnv.toUpperCase()}, {"domain": 1, "port": 1}, function(error, envRecord){
				if(error){
					return cb(error);
				}

				var domain = envRecord.domain + ":" + envRecord.port;
				constructProxyRequest(req, domain, sessionObj.envAuth[requestedEnv], requestedRoute, cb);
			});
		}
	}
};