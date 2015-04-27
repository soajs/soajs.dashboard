var testConsole = {
  log: function() {
    if (process.env.SHOW_LOGS==='true'){
      console.log.apply(this, arguments);
    }
  }
};


var request = require("request");
var urac;

module.exports = {
	requireModule : function (path) {  
		return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../') + path);
	},
	requester: function(method, params, cb) {
	  var requestOptions = {
	    'uri': params.uri,
	    'json': params.body || true
	  };
	  if(params.headers) requestOptions.headers = params.headers;
	  if(params.authorization) requestOptions.headers.authorization = params.authorization;
	  if(params.qs) requestOptions.qs = params.qs;
	  if(params.form !== undefined) requestOptions.form = params.form;

	  testConsole.log('===========================================================================');
	  testConsole.log('==== URI     :', params.uri);
	  testConsole.log('==== REQUEST :', JSON.stringify(requestOptions));
	  request[method](requestOptions, function(err, response, body) {
	    testConsole.log('==== RESPONSE:', JSON.stringify(body));
	    return cb(err, body,response);
	  });
	},

	startUrac: function(soajs, mongo, utils, cb) {
		var tenantConfig = {
			"name": 'DBTN_urac',
			"prefix": "",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": null,
			"URLParam": {
				"connectTimeoutMS": 0,
				"socketTimeoutMS": 0,
				"maxPoolSize": 5,
				"w": 1,
				"wtimeoutMS": 0,
				"slaveOk": true
			},
			"extraParam": {
				"db": {
					"native_parser": true
				},
				"server": {
					"auto_reconnect": true
				}
			},
			'store': {},
			"collection": "sessions",
			'stringify': false,
			'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
		};
		var uracMongo = new mongo(tenantConfig);

		var config = {
			"serviceName": "urac",
			"servicePort": 4001,
			"errors": {
				"401": "error logging in try again"
			},
			"schema": {
				"/logout": {
					"_apiInfo": {
						"l": "Logout"
					}
				},
				"/login": {
					"_apiInfo": {
						"l": "Login"
					},
					"username": {
						"required": true,
						"source": ['body.username'],
						"validation": {"type": "string"}
					},
					"password": {
						"required": true,
						"source": ['body.password'],
						"validation": {"type": "string"}
					}
				}
			}
		};
		urac = new soajs.server.service({
			"oauth": false,
			"session": true,
			"security": true,
			"multitenant": true,
			"acl": true,
			"bodyParser": true,
			"methodOverride": true,
			"cookieParser": true,
			"logger": true,
			"inputmask": true,
			"config": config
		});

		urac.init(function() {
			urac.get("/logout", function(req, res) {
				req.soajs.session.clearURAC(function(err) {
					res.json(req.soajs.buildResponse(null, true));
				});
			});

			urac.post("/login", function(req, res) {
				var criteria = {'username': req.soajs.inputmaskData['username'], 'status': 'active'};
				console.log(criteria);
				uracMongo.findOne("users", criteria, function(err, record) {
					if(record) {
						var cloneRecord = utils.cloneObj(record);
						delete cloneRecord.password;
						req.soajs.session.setURAC(record, function(err) {
							if(err) {
								return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": config.errors[401]}));
							}

							if(cloneRecord.config && cloneRecord.config.packages) {
								delete cloneRecord.config.packages;
							}
							if(cloneRecord.config && cloneRecord.config.keys) {
								delete cloneRecord.config.keys;
							}
							return res.jsonp(req.soajs.buildResponse(null, cloneRecord));
						});
					} else {
						return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": config.errors[401]}));
					}
				});
			});

			urac.start(function() {
				setTimeout(function() {
					cb();
				}, 500);
			});
		});
	},

	stopUrac: function(cb) {
		urac.stop(cb);
	}
};