"use strict";
var request = require("request");
var async = require("async");

function constructProxyRequest(req, domain, soajsauth, requestedRoute, res) {
	var myUri = req.headers['x-forwarded-proto'] + '://' + domain + requestedRoute;
	var requestConfig = {
		'uri': myUri,
		'method': req.method,
		'timeout': 1000 * 3600,
		'jar': false,
		'headers': req.headers
	};

	requestConfig.headers.soajsauth = soajsauth;
	if (req.query && Object.keys(req.query).length > 0) {
		requestConfig.qs = req.query;
	}

	req.soajs.log.debug(requestConfig);
	var proxy = request(requestConfig);
	proxy.on('error', function (error) {
		req.soajs.log.error(error);
		if(res){
			return res.json(req.soajs.buildResponse({"code": 901, "msg": error.message}));
		}
	});

	if (res) {
		proxy.pipe(res)
	}
	else {
		req.pipe(proxy);
	}
}

module.exports = {
	"go": function (config, mongo, req, res) {
		var sessionObj = req.soajs.session.getSERVICE();
		delete req.query.proxyRoute;

		if (sessionObj && sessionObj.envAuth) {
			sessionObj.envAuth[process.env.SOAJS_ENV.toLowerCase()] = req.headers.soajsauth;
			var allEnvs = Object.keys(sessionObj.envAuth);
			async.mapLimit(allEnvs, allEnvs.length, logoutRequest, function (error, response) {
				if (error) {
					req.soajs.log.error(error);
					return res.json(req.soajs.buildResponse({code: 901, msg: error.message}));
				}
				return res.json(req.soajs.buildResponse(null, response));
			});
		}
		else {
			return res.json(req.soajs.buildResponse(null, true));
		}

		function logoutRequest(oneEnvCode, cb) {
			var requestedEnv = oneEnvCode.toLowerCase();
			mongo.findOne("environment", {"code": requestedEnv.toUpperCase()}, {
				"domain": 1,
				"port": 1
			}, function (error, envRecord) {
				if (error) {
					return cb(error);
				}

				var domain = envRecord.domain + ":" + envRecord.port;
				if (requestedEnv === 'dashboard') {
					domain = "dashboard-api." + domain;
					constructProxyRequest(req, domain, sessionObj.envAuth[requestedEnv], "/urac/logout", res);
				}
				else {
					domain = "api." + domain;
					constructProxyRequest(req, domain, sessionObj.envAuth[requestedEnv], "/urac/logout");
				}
			});
		}
	}
};