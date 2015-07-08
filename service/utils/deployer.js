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
    var deployerDriver = require("./drivers/" + config.driver + ".js");
    return deployerDriver;
}

var deployer = {
    "createContainer": function (deployerConfig, params, cb) {
        var environment = params.env;
        var dockerImage = params.image;
        var profile = params.profile; //"/opt/soajs/FILES/profiles/single.js";
        var links = params.links; //["soajsData01:dataProxy01"]; || ["soajsData01:dataProxy01","soajsData02:dataProxy02","soajsData03:dataProxy03"];

        generateUniqueId(8, function (err, uid) {
            if (err) {
                return cb(err);
            }

            var index = dockerImage.lastIndexOf("/");
            var containerName = "";
            if (index !== -1) {
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
            if (params.variables && Array.isArray(params.variables) && params.variables.length > 0) {
                env = env.concat(params.variables);
            }

            var port = null;
            if (params.port) {
                port = {};
                port["" + params.port + "/tcp"] = [{"HostPort": "" + params.port}];
            }

            var deployer = getDeployer(deployerConfig);
            deployer.createContainer(deployerConfig, {
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
            }, cb);
        });
    },

    "start": function (deployerConfig, cid, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.start(deployerConfig, cid, cb);
    },

    "stop": function (deployerConfig, cid, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.stop(deployerConfig, cid, cb);
    },

    "remove": function (deployerConfig, cid, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.remove(deployerConfig, cid, cb);
    },

    "info": function (deployerConfig, cid, req, res) {
        var deployer = getDeployer(deployerConfig);
        deployer.info(deployerConfig, cid, req, res);
    }
};
module.exports = deployer;