"use strict";
var crypto = require('crypto');

function generateUniqueId(len, cb) {
    var id = "";
    try {
        id = crypto.randomBytes(len).toString('hex');
        cb(null, id);
    } catch (err) {
        cb(err);
    }
}

function getDeployer(config) {
    var deployerDriver = require("./" + config.driver.type + "/" + config.driver.driver + ".js");
    return deployerDriver;
}

var deployer = {
    "createContainer": function (deployerConfig, params, mongo, cb) {
        var name = params.name;
        var environment = params.env;
        var dockerImage = params.image;
        var profile = params.profile;
        var links = params.links;

        generateUniqueId(8, function (err, uid) {
            if (err) {
                return cb(err);
            }

            var containerName = name + "_" + uid + "_" + environment;

            var env = [
                "SOAJS_ENV=" + environment,
                "SOAJS_PROFILE=" + profile
            ];

            //used by gc service to pass new env params
            if (params.variables && Array.isArray(params.variables) && params.variables.length > 0) {
                env = env.concat(params.variables);
            }

            var port = null;
            if (params.port) {
                port = {};
                port["" + params.port + "/tcp"] = [{"HostPort": "" + params.port}];
            }

            deployerConfig.envCode = environment;

            var deployer = getDeployer(deployerConfig);
            var options = {
                Image: dockerImage,
                name: containerName,
                "Env": env,
                "Tty": false,
                "Hostname": containerName,
                "HostConfig": {
	                "PortBindings": port,
                    "PublishAllPorts": true
                }
            };

            if (deployerConfig.config.HostConfig.NetworkMode) {
                options.HostConfig.NetworkMode = deployerConfig.config.HostConfig.NetworkMode;
            }

            if (deployerConfig.config.MachineName) {
                options.Env.concat("constraint:node==" + deployerConfig.config.MachineName);
            }

	        if(links && Array.isArray(links) && links.length > 0){
		        options.HostConfig.Links = links;
	        }

            if (params.Cmd) {
                options.Cmd = params.Cmd;
            }
            if (params.Binds) {
                options.HostConfig.Binds = params.Binds;
            }
            if(params.Volumes){
                options.Volumes = params.Volumes;
            }
            deployer.createContainer(deployerConfig, options, mongo, cb);
        });
    },

    "start": function (deployerConfig, cid, mongo, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.start(deployerConfig, cid, mongo, cb);
    },

    "remove": function (deployerConfig, cid, mongo, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.remove(deployerConfig, cid, mongo, cb);
    },

    "info": function (deployerConfig, cid, req, res, mongo) {
        var deployer = getDeployer(deployerConfig);
        deployer.info(deployerConfig, cid, req, res, mongo);
    }
};
module.exports = deployer;