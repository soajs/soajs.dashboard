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
    "createContainer": function (soajs, deployerConfig, params, model, cb) {
        var name = params.name;
        var environment = params.env;
        var dockerImage = params.image;
        //var profile = params.profile;
        var links = params.links;

        generateUniqueId(8, function (err, uid) {
            if (err) {
                return cb(err);
            }

            var containerName = name + "_" + uid + "_" + environment;

            var env = [
                "SOAJS_ENV=" + environment
            ];

            //used by gc service to pass new env params
            if (params.variables && Array.isArray(params.variables) && params.variables.length > 0) {
                env = env.concat(params.variables);
            }

            var port = null;
            if (params.exposedPort) {
                port = {};
                port["80/tcp"] = [{"HostPort": "" + params.exposedPort}];
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
                    // "PublishAllPorts": true //todo: enable this when https is supported
                }
            };

	        if(port){
		        options.HostConfig["PortBindings"] = port;
	        }
            else {
                options.HostConfig.PublishAllPorts = true;
            }

            if (deployerConfig.config && deployerConfig.config.HostConfig && deployerConfig.config.HostConfig.NetworkMode) {
                options.HostConfig.NetworkMode = deployerConfig.config.HostConfig.NetworkMode;
            }

            if (deployerConfig.config && deployerConfig.config.MachineName) {
                options.Env.concat("constraint:node==" + deployerConfig.config.MachineName);
            }

	        if(links && Array.isArray(links) && links.length > 0){
		        options.HostConfig.Links = links;
	        }

            if (params.Cmd) {
                options.Cmd = params.Cmd;
            }
            deployer.createContainer(soajs, deployerConfig, options, model, cb);
        });
    },

    "start": function (soajs, deployerConfig, cid, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.start(soajs, deployerConfig, cid, model, cb);
    },

	"exec": function (soajs, deployerConfig, cid, model, opts, cb) {
		var deployer = getDeployer(deployerConfig);
		deployer.exec(soajs, deployerConfig, cid, model, opts, cb);
	},

	"restart": function (soajs, deployerConfig, cid, model, cb) {
		var deployer = getDeployer(deployerConfig);
		deployer.restart(soajs, deployerConfig, cid, model, cb);
	},

    "remove": function (soajs, deployerConfig, cid, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.remove(soajs, deployerConfig, cid, model, cb);
    },

    "info": function (soajs, deployerConfig, cid, res, model) {
        var deployer = getDeployer(deployerConfig);
        deployer.info(soajs, deployerConfig, cid, res, model);
    },

    "addNode": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.addNode(soajs, deployerConfig, options, model, cb);
    },

    "removeNode": function (soajs, deployerConfig, options, model, cb, backgroundCB) {
        var deployer = getDeployer(deployerConfig);
        deployer.removeNode(soajs, deployerConfig, options, model, cb, backgroundCB);
    },

    "updateNode": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.updateNode(soajs, deployerConfig, options, model, cb);
    },

    "deployHAService": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.deployHAService(soajs, deployerConfig, options, model, cb);
    },

    "scaleHAService": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.scaleHAService(soajs, deployerConfig, options, model, cb);
    },

    "inspectHAService": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.inspectHAService(soajs, deployerConfig, options, model, cb);
    },

    "inspectHATask": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.inspectHATask(soajs, deployerConfig, options, model, cb);
    },

    "deleteHAService": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.deleteHAService(soajs, deployerConfig, options, model, cb);
    },

    "inspectContainer": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.inspectContainer(soajs, deployerConfig, options, model, cb);
    },

    "getContainerLogs": function (soajs, deployerConfig, options, model, res) {
        var deployer = getDeployer(deployerConfig);
        deployer.getContainerLogs(soajs, deployerConfig, options, model, res);
    }
};

module.exports = deployer;
