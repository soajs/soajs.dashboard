"use strict";
var crypto = require('crypto');
var fs = require("fs");
var Docker = require('dockerode');
var utils = require("soajs/lib/utils");

var lib = {
	"getDeployer": function(deployerConfig) {
		var config = utils.cloneObj(deployerConfig);
		delete config.driver;
		if(config.socketPath){
			var docker = new Docker({socketPath : config.socketPath});
		}
		else{
			var docker = new Docker({
				host: config.host,
				port: config.port,
				ca: fs.readFileSync(__dirname + '/../certs/ca.pem'),
				cert: fs.readFileSync(__dirname + '/../certs/cert.pem'),
				key: fs.readFileSync(__dirname + '/../certs/key.pem')
			});
		}

		return docker;
	},

	"container": function(dockerInfo, action, cid, opts, cb) {
		var deployer = lib.getDeployer(dockerInfo);
		var container = deployer.getContainer(cid);
		container[action](opts || null, cb);
	},

	"generateUniqueId": function(len, cb) {
		var id = "";
		try {
			id = crypto.randomBytes(len).toString('hex');
			cb(null, id);
		} catch(err) {
			cb(err);
		}
	}

};
var deployer = {
	"createContainer": function(deployerConfig, params, cb) {
		var environment = params.env;
		var dockerImage = params.image;
		var profile = params.profile; //"/opt/soajs/FILES/profiles/single.js";
		var links = params.links; //["soajsData01:dataProxy01"]; || ["soajsData01:dataProxy01","soajsData02:dataProxy02","soajsData03:dataProxy03"];

		lib.generateUniqueId(8, function(err, uid) {
			if(err) { return cb(err); }

			var index = dockerImage.lastIndexOf("/");
			var containerName = "";
			if(index !== -1) {
				containerName = dockerImage.substr(index + 1);
			} else {
				containerName = dockerImage;
			}
			containerName = containerName + "_" + uid + "_" + environment;

			var env = [
				"SOAJS_ENV=" + environment,
				"SOAJS_PROFILE=" + profile
			];

			//used by gc service to pass new env params
			if(params.variables && Array.isArray(params.variables) && params.variables.length > 0) {
				env = env.concat(params.variables);
			}

			var port = null;
			if(params.port) {
				port = {};
				port[params.port + "/tcp"] = [{"HostPort": params.port}];
			}

			var deployer = lib.getDeployer(deployerConfig);
			deployer.createContainer({
				Image: dockerImage,
				name: containerName,
				"Env": env,
				"Tty": false,
				"Hostname": containerName,
				"HostConfig": {
					"Links": links,
					"PortBindings": port,
					"PublishAllPorts": true
				}
			}, function(err, container) {
				if(err) { return cb(err); }
				container.inspect(function(err, data) {
					if(err) { return cb(err); }
					return cb(null, data);
				});
			});
		});
	},

	"start": function(deployerConfig, cid, cb) {
		lib.container(deployerConfig, "start", cid, null, cb);
	},

	"stop": function(deployerConfig, cid, cb) {
		lib.container(deployerConfig, "stop", cid, null, cb);
	},

	"remove": function(deployerConfig, cid, cb) {
		lib.container(deployerConfig, "remove", cid, {"force": true}, cb);
	},

	"info": function(deployerConfig, cid, req, res) {
		var deployer = lib.getDeployer(deployerConfig);
		deployer.getContainer(cid).logs({
				stderr: true,
				stdout: true,
				timestamps: false,
				tail: 200
			},
			function(error, stream) {
				if(error) {
					req.soajs.log.error('logStreamContainer error: ', error);
					return res.json(req.soajs.buildResponse({"code": 601, "msg": error.message}));
				}
				else {
					var data = '';
					var chunk;
					stream.setEncoding('utf8');
					stream.on('readable', function() {
						var handle = this;
						while((chunk = handle.read()) != null) {
							data += chunk.toString("utf8");
						}
					});

					stream.on('end', function() {
						stream.destroy();
						var out = req.soajs.buildResponse(null, {'data': data });
						return res.json(out);
					})
				}
			});
	}
};
module.exports = deployer;