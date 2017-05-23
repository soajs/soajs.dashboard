"use strict";

var gitRepo = null;
var gitBranch = null;

var authKey = process.env.SOAJS_CD_AUTH_KEY;
var deployToken = process.env.SOAJS_CD_DEPLOY_TOKEN;
var dashboardDomain = process.env.SOAJS_CD_DASHBOARD_DOMAIN;
var dashboardProtocol = process.env.SOAJS_CD_DASHBOARD_PROTOCOL || 'https';
var dashboardPort = process.env.SOAJS_CD_DASHBOARD_PORT || '443';
var dashboardAPIRoute= process.env.SOAJS_CD_API_ROUTE;


var config = null;
var request = require("request");

var utils = {
    "init": function (cb){
        console.log("Initializing CD script");
        //check the build environment
        if(process.env.TRAVIS){
            console.log("Travis build environment detected");

            if(!process.env.TRAVIS_REPO_SLUG || !process.env.TRAVIS_BRANCH){
                console.log("Could not find Travis environment variables (Repo Slug | branch). Aborting");
                process.exit(0);
            }

            gitRepo = process.env.TRAVIS_REPO_SLUG.split("/")[1];
            gitBranch = process.env.TRAVIS_BRANCH;
        }
        else if(process.env.DRONE){
            console.log("Drone build environment detected");

            if(!process.env.DRONE_REPO_NAME || !process.env.DRONE_REPO_BRANCH){
                console.log("Could not find Drone environment variables (Repo name | branch). Aborting");
                process.exit(0);
            }

            gitRepo = process.env.DRONE_REPO_NAME;
            gitBranch = process.env.DRONE_REPO_BRANCH;
        }
        else {
            console.log("Could not find any build environment. Aborting...");
            process.exit(0);
        }

        //Check if required envs are set
        console.log("Checking if required environment variables are set")
        //check auth env variables
        if(!authKey || !deployToken){
            console.log("Error: Missing AUTH env variables. Aborting...");
            process.exit(0);
        }
        //check dashboard env variables
        if(!dashboardDomain || !dashboardAPIRoute){
            console.log("Error: Missing DASHBOARD environment variables. Aborting...");
            process.exit(0);
        }

        console.log("Launching CD call...");
        utils.createRequest(function(params){
            request.post(params, cb);
        });
    },

    "createRequest": function(cb) {
        var params = {};

        params.uri = dashboardProtocol + "://" + dashboardDomain + ":" + dashboardPort +
            dashboardAPIRoute + "?deploy_token=" + deployToken;

        params.headers = {
            "key" : authKey,
            "Content-Type": "application/json"
        }

        try {
            config = require("./config.js");
        }catch(e) {
            console.log("Could not find a config file. Disregarding checks for services.");
        }

        params.body = {
            "repo" : gitRepo,
            "branch": gitBranch
        };
        //if not a multi repo
        if(config && config.type && config.type !== "multi" && config.serviceName){
            params.body.services = [{"serviceName": config.serviceName}];
            if(config.serviceVersion) {
                params.body.services[0].serviceVersion = config.serviceVersion;

            }
        }

        else if(config && config.type === "multi"){

            //loop over each service to add its
            var services = [];
            config.folders.forEach(function(service){
                var serviceConfigPath = "./" + service + "/config.js";
                var serviceConfig = require(serviceConfigPath);
                //construct each service option
                var oneService = {
                  "serviceName": serviceConfig.serviceName
                };

                if(serviceConfig.serviceVersion){
                    oneService.serviceVersion = serviceConfig.serviceVersion;
                }
                services.push(oneService);
            });
            params.body.services = services;
        }
        return cb(params);
    }
};


utils.init(function(err,response,body){

});

