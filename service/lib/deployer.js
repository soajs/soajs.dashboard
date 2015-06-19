"use strict";
var fs = require("fs");
var Docker = require('dockerode');
var crypto = require('crypto');

var lib = {
	"getDocker": function(dockerInfo) {
		var docker = new Docker({
			host: dockerInfo.host,
			port: dockerInfo.port,
			ca: fs.readFileSync('../certs/ca.pem'),
			cert: fs.readFileSync('../certs/cert.pem'),
			key: fs.readFileSync('../certs/key.pem')
		});
		return docker;
	},

	"container": function(dockerInfo, action, cid, opts, req, res, cb) {
		var docker = lib.getDocker(dockerInfo);
		var container = docker.getContainer(cid);
		container[action](opts || null, function(err, data) {

			//only remove container will require a cb
			//remove container, if success, remove db entry
			if(cb && typeof(cb) === 'function') {
				return cb(err, data);
			}
			else {
				if(err) {
					return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err.message}));
				}
				return res.json(req.soajs.buildResponse(null, data));
			}
		});
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
	"createContainer": function(dockerInfo, params, cb) {
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
			if(params.env && Array.isArray(params.env) && params.env.length > 0){
				env = env.concat(params.env);
			}

			var docker = lib.getDocker(dockerInfo);
			docker.createContainer({
				Image: dockerImage,
				name: containerName,
				"Env": env,
				"Tty": false,
				"Hostname": containerName,
				"HostConfig": {
					"Links": links,
					"PortBindings": null,
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

	"start": function(dockerInfo, cid, req, res) {
		lib.container(dockerInfo, "start", cid, null, req, res);
	},

	"stop": function(dockerInfo, cid, req, res) {
		lib.container(dockerInfo, "stop", cid, null, req, res);
	},

	"remove": function(dockerInfo, cid, req, res, cb) {
		lib.container(dockerInfo, "remove", cid, {"force": true}, req, res, cb);
	},

	"info": function(dockerInfo, cid, req, res) {
		var docker = lib.getDocker(dockerInfo);
		docker.getContainer(cid).logs({
				stderr: true,
				stdout: true,
				timestamps: false,
				tail: 200
			},
			function(error, stream) {
				if(error) {
					req.soajs.log.error('logStreamContainer error: ', error);
					res.status(601).send(error);
				}
				else {
					var data = '';
					var chunk;
					stream.setEncoding('utf8');
					stream.on('readable', function() {
						while((chunk = stream.read()) != null) {
							data += chunk;
						}
					});
					stream.on('end', function() {
						stream.destroy();
						res.status(200).send(data);
					})
				}
			});
	}
};
module.exports = deployer;