"use strict";
var crypto = require('crypto');

function getDeployer(config) {
    var deployerDriver = require("./" + config.driver.type + "/" + config.driver.driver + ".js");
    return deployerDriver;
}

var deployer = {
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

    "getServiceComponents": function (soajs, deployerConfig, options, model, cb) {
        var deployer = getDeployer(deployerConfig);
        deployer.getServiceComponents(soajs, deployerConfig, options, model, cb);
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
