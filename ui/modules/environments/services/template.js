'use strict';
var env_template = {
	"code": "",
	"domain": "",
	"port": 0,
	"profile": "",
	"description": "",
	"deployer": {
		"type": "",
		"selected": "",
		"docker": {
			"socket": {
				"socketPath": "/var/run/docker.sock"
			},
			"machine": {
				"host": "192.168.59.103",
				"port": 2376
			},
			"joyent": {
				"host": "us-east-1.docker.joyent.com",
				"port": 2376
			},
			"rackspace": {
				"host": "rackspace_host",
				"port": 2376
			}
		}
	},
	"services": {
		"controller": {
			"maxPoolSize": 100,
			"authorization": true,
			"requestTimeout": 30,
			"requestTimeoutRenewal": 0
		},
		"config": {
			"awareness": {
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