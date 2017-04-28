'use strict';
var env_template = {
	"code": "",
	"domain": "",
	"profile": "",
	"description": "",
	"sensitive": false,
	//deployer object is added on the api level
	"services": {
		"controller": {
			"maxPoolSize": 100,
			"authorization": true,
			"requestTimeout": 30,
			"requestTimeoutRenewal": 0
		},
		"config": {
			"awareness": {
				"cacheTTL": 60 * 60* 1000, //1 hr
				"healthCheckInterval": 1000 * 5, // 5 seconds
				"autoRelaodRegistry": 1000 * 60 * 60, // 1 hr
				"maxLogCount": 5,
				"autoRegisterService": true
			},
			"agent": {
				"topologyDir": "/opt/soajs/"
			},
			"key": {
				"algorithm": 'aes256',
				"password": ''
			},
			"logger": { //ATTENTION: this is not all the properties for logger
				"src": true,
				"level": "debug"
			},
			"cors": {
				"enabled": true,
				"origin": '*',
				"credentials": 'true',
				"methods": 'GET,HEAD,PUT,PATCH,POST,DELETE',
				"headers": 'key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type',
				"maxage": 1728000
			},
			"oauth": {
				"grants": ['password', 'refresh_token'],
				"accessTokenLifetime": 3600,
				"refreshTokenLifetime": 1209600,
				"debug": false
			},
			"ports": {
				"controller": 4000,
				"maintenanceInc": 1000,
				"randomInc": 100
			},
			"cookie": {
				"secret": ""
			},
			"session": {
				"name": "soajsID",
				"secret": "",
				"proxy":"undefined",
				"cookie": {
					"path": '/',
					"httpOnly": true,
					"secure": false,
					//"domain": "",
					"maxAge": null
				},
				"resave": false,
				"saveUninitialized": false,
				"rolling": false,
				"unset": "keep"
			}
		}
	}
};
