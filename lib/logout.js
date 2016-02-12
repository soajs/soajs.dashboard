"use strict";
var request = require("request");
var async = require("async");
var soajsCore = require("soajs/modules/soajs.core");

module.exports = {
	"go": function (config, mongo, req, res) {
		var sessionObj = req.soajs.session.getSERVICE();
		delete req.query.proxyRoute;

		if (sessionObj && sessionObj.envAuth) {
			sessionObj.envAuth[process.env.SOAJS_ENV.toLowerCase()] = req.headers.soajsauth;
			var allEnvs = Object.keys(sessionObj.envAuth);
			async.mapLimit(allEnvs, allEnvs.length, logoutRequest);
		}
		else {
			return res.json(req.soajs.buildResponse(null, true));
		}

		function logoutRequest(oneEnvCode) {
			var requestedEnv = oneEnvCode.toLowerCase();
			if (requestedEnv === process.env.SOAJS_ENV.toLowerCase()) {
				constructProxyRequest(req, requestedEnv, sessionObj.envAuth[requestedEnv], "/urac/logout", res);
			}
			else {
				constructProxyRequest(req, requestedEnv, sessionObj.envAuth[requestedEnv], "/urac/logout");
			}
		}

		function constructProxyRequest(req, envCode, soajsauth, requestedRoute, res) {
			if(envCode === process.env.SOAJS_ENV.toLowerCase()){
				req.soajs.awareness.getHost('controller', function (host) {
					var myUri = req.headers['x-forwarded-proto'] + '://' + host + ':' + req.soajs.registry.services.controller.port + requestedRoute;
					step2(myUri)
				});
			}
			else{
				req.soajs.awarenessEnv.getHost(envCode,function(host){
					soajsCore.registry.loadByEnv({
						"envCode": envCode
					}, function (err, reg) {
						if(err){
							req.soajs.log.error(error);
						}
						else{
							var port = reg.services.controller.port;
							var myUri = req.headers['x-forwarded-proto'] + '://' + host + ':' + port + requestedRoute;
							step2(myUri)
						}
					});
				});
			}

			function step2(myUri){
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

				//req.soajs.log.debug(requestConfig);
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
		}
	}
};