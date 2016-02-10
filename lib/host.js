'use strict';
var fs = require("fs");
var request = require("request");
var colName = "hosts";
var deployer = require("../utils/deployer.js");

function pad(d) {
    return (d < 10) ? '0' + d.toString() : d.toString();
}

function checkIfError(req, res, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && data.error.message) {
            req.soajs.log.error(data.error);
        }

        return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        if (cb) return cb();
    }
}

function deployNginx(config, mongo, req, res) {
    //from envCode, load env, get port and domain
    mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
        checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
            req.soajs.log.debug("checking for old nginx container for environment: " + envRecord.code);
            var condition = {
                "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                "hostname": "nginx_" + req.soajs.inputmaskData.envCode.toLowerCase()
            };
            mongo.findOne("docker", condition, function (error, oldNginx) {
                checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                    if (oldNginx) {
                        removeOldNginx(oldNginx, envRecord);
                    }
                    else {
                        req.soajs.log.debug("NO old Nginx container found, building new nginx...");
                        rebuildNginx(envRecord);
                    }
                });
            });
        });
    });

    function removeOldNginx(oldNginx, envRecord) {
        var condition = {
            "env": req.soajs.inputmaskData.envCode.toLowerCase(),
            "hostname": "nginx_" + req.soajs.inputmaskData.envCode.toLowerCase()
        };
        req.soajs.log.debug("Old Nginx container found, removing nginx ...");
        mongo.remove("docker", condition, function (err) {
            checkIfError(req, res, {config: config, error: err, code: 600}, function () {
                deployer.remove(oldNginx.deployer, oldNginx.cid, mongo, function (error) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        req.soajs.log.debug("Old Nginx container removed, building new nginx...");
                        rebuildNginx(envRecord);
                    });
                });
            });
        });
    }

    function getRunningControllers(cb) {
        var condition = {
            "env": req.soajs.inputmaskData.envCode.toLowerCase(),
            "running": true,
            "type": "controller"
        };
        mongo.find("docker", condition, function (error, controllers) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                //no controllers found, no need to proceed
                if (!controllers || (controllers && controllers.length === 0)) {
                    req.soajs.log.debug("No controllers found for environment: " + req.soajs.inputmaskData.envCode + ". No need to proceed.");
                    return res.json(req.soajs.buildResponse(null, true));
                }
                else {
	                condition = {
		                "env": req.soajs.inputmaskData.envCode.toLowerCase(),
		                "name": "controller"
	                };
	                mongo.find("hosts", condition, function(error, hostsData){
		                checkIfError(req, res, {config: config, error: error, code: 600}, function () {

			                controllers.forEach(function(oneController){
				               hostsData.forEach(function(oneHostData){
					              if(oneController.hostname === oneHostData.hostname){
						              oneController.ip = oneHostData.ip;
					              }
				               });
			                });
                            return cb(controllers);
		                });
	                });
                }
            });
        });
    }

    function rebuildNginx(envRecord) {
        var links = [], ctrls = [];
        getRunningControllers(function (controllers) {
            for (var i = 0; i < controllers.length; i++) {
                links.push(controllers[i].hostname + ":controllerProxy0" + (i + 1));
	            ctrls.push(controllers[i].ip);
            }

            var dockerParams = {
                "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                "name": "nginxapi",
                "image": config.images.nginx,
                "port": envRecord.port,
                "variables": [
	                "SOAJS_NX_HOSTIP=" + ctrls,
                    "SOAJS_NX_NBCONTROLLER=" + links.length,
                    "SOAJS_NX_APIPORT=" + envRecord.port,
                    "SOAJS_NX_APIDOMAIN=api." + envRecord.domain //mydomain.com
                ],
                "Binds": [
                    config.workDir + "soajs/FILES:/opt/soajs/FILES"
                ],
                "links": links,
                "Cmd": [
                    'bash',
                    '-c',
                    'cd /opt/soajs/FILES/scripts/; ./runNginx.sh'
                ]
            };

            var deployerConfig = envRecord.deployer;
            var driver = deployerConfig.selected.split(".");
            deployerConfig = deployerConfig[driver[0]][driver[1]][driver[2]];
            deployerConfig.driver = {
                'type': envRecord.deployer.type,
                'driver': 'docker'
            };
	        deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '').replace(/\./, " - ");
            req.soajs.log.debug("Calling create nginx container with params:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
            deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
                checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                    req.soajs.log.debug("Nginx Container Created, starting container with params:", JSON.stringify(deployerConfig), JSON.stringify(data));
                    deployer.start(deployerConfig, data.Id, mongo, function (error) {
                        checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                            req.soajs.log.debug("Nginx Container started. Saving nginx container information in docker collection.");
                            var document = {
                                "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                                "cid": data.Id,
                                "hostname": "nginx_" + req.soajs.inputmaskData.envCode.toLowerCase(),
                                "deployer": deployerConfig
                            };
                            mongo.insert("docker", document, function (error) {
                                checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                                    return res.json(req.soajs.buildResponse(null, true));
                                });
                            });
                        });
                    });
                });
            });

        });
    }
}

//todo: remove zombie containers
//todo: when deploying env for first time, loop and turn off all old containers

module.exports = {

    "deployController": function (config, mongo, req, res) {
        checkIfError(req, res, {config: config, error: req.soajs.inputmaskData.envCode.toLowerCase() === 'dashboard', code: 750}, function () {
            //from profile name, construct profile path and equivalently soajsData01....
            mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
                checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
                    checkIfError(req, res, {config: config, error: envRecord.deployer.type === 'manual', code: 618}, function () {
                        //fetch how many servers are in the profile
                        var regFile = envRecord.profile;

                        var dockerParams = {
                            "image": config.images.services,
                            "name": "controller",
                            "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                            "profile": regFile,
                            "variables": [
                                "SOAJS_SRV_AUTOREGISTERHOST=false",
                                "NODE_ENV=production"
                            ],
                            "Binds": [
                                config.workDir + "soajs/open_source/services/controller:/opt/soajs/node_modules/controller",
                                config.workDir + "soajs/FILES:/opt/soajs/FILES"
                            ],
                            "Cmd": [
                                'bash',
                                '-c',
                                'cd /opt/soajs/node_modules/controller/; npm install; node .'
                            ]
                        };

                        if (req.soajs.inputmaskData.variables && req.soajs.inputmaskData.variables.length > 0) {
                            dockerParams.variables = dockerParams.variables.concat(req.soajs.inputmaskData.variables);
                        }
                        deployControllers(0, req.soajs.inputmaskData.number, envRecord, dockerParams, function () {
                            deployNginx(config, mongo, req, res);
                        });
                    });
                });
            });
        });

        function deployControllers(counter, max, envRecord, dockerParams, cb) {
            var deployerConfig = envRecord.deployer;
            var driver = deployerConfig.selected.split(".");
            deployerConfig = deployerConfig[driver[0]][driver[1]][driver[2]]; //need to add manual OR cloud here, if cloud, need to go further one level to get configs
            deployerConfig.driver = {
                'type': envRecord.deployer.type,
                'driver': 'docker'
            };
	        deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '').replace(/\./, " - ");
            req.soajs.log.debug("Calling create controller container:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
            deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
                checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                    req.soajs.log.debug("Controller Container Created, starting container:", JSON.stringify(deployerConfig), JSON.stringify(data));
                    deployer.start(deployerConfig, data.Id, mongo, function (error, data) {
                        checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                            req.soajs.log.debug("Controller Container started, saving information in core_provision");
                            registerNewHost(data, deployerConfig, function () {
                                counter++;
                                if (counter === max) {
                                    return cb();
                                }
                                else {
                                    deployControllers(counter, max, envRecord, dockerParams, cb);
                                }
                            });
                        });
                    });
                });
            });
        }

        function registerNewHost(data, deployerConfig, cb) {
            //get the ip of the host from hosts
            //insert into docker collection
            var document = {
                "cid": data.Id,
                "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                "hostname": data.Name || data.name, //data.Config.Hostname,
                "running": true,
                "type": "controller",
                "deployer": deployerConfig
            };
            mongo.insert("docker", document, function (error) {
                checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                    var newHost = {
                        "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                        "name": "controller",
                        "ip": data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode].IPAddress,
                        "hostname": data.Name || data.name //data.Config.Hostname
                    };
                    mongo.insert(colName, newHost, function (error) {
                        checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                            return cb();
                        });
                    });
                });
            });
        }
    },

    "deployService": function (config, mongo, req, res) {
        var serviceName, serviceOrig;
        //from profile name, construct profile path and equivalently soajsData01....
        //if gc info, check if gc exists before proceeding
        mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
            checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
                checkIfError(req, res, {config: config, error: envRecord.deployer.type === 'manual', code: 618}, function () {
                    //build the regFile path
                    var regFile = envRecord.profile;

                    serviceOrig = serviceName = req.soajs.inputmaskData.name;
                    if (req.soajs.inputmaskData.gcName) {
                        serviceName = req.soajs.inputmaskData.gcName;
                        serviceOrig = 'gcs';
                    }
                    var folderPath = config.workDir + "soajs/open_source/services/" + serviceOrig;

                    mongo.findOne("services", {"name": serviceName}, function (err, serviceRecord) {
                        checkIfError(req, res, {config: config, error: err || !serviceRecord, code: 600}, function () {
                            if(serviceRecord.custom){ folderPath = serviceRecord.custom; }

                            var dockerParams = {
                                "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                                "name": serviceName,
                                "profile": regFile,
                                "image": config.images.services,
                                "variables": [],
                                "Binds": [
                                    folderPath + ":/opt/soajs/node_modules/" + serviceName,
                                    config.workDir + "soajs/FILES:/opt/soajs/FILES"
                                ],
                                "Cmd": [
                                    'bash',
                                    '-c',
                                    'cd /opt/soajs/node_modules/' + serviceName + '/; npm install; node .'
                                ]
                            };

                            if (req.soajs.inputmaskData.gcName) {
                                dockerParams.variables = [
                                    "SOAJS_GC_NAME=" + req.soajs.inputmaskData.gcName,
                                    "SOAJS_GC_VERSION=" + req.soajs.inputmaskData.gcVersion,
                                    "SOAJS_ENV_WORKDIR=" + config.workDir
                                ];
                            }

                            dockerParams.variables.push("SOAJS_SRV_AUTOREGISTERHOST=false");
                            dockerParams.variables.push("NODE_ENV=production");

                            if (req.soajs.inputmaskData.variables && req.soajs.inputmaskData.variables.length > 0) {
                                dockerParams.variables = dockerParams.variables.concat(req.soajs.inputmaskData.variables);
                            }

                            var deployerConfig = envRecord.deployer;
                            var driver = deployerConfig.selected.split(".");
                            deployerConfig = deployerConfig[driver[0]][driver[1]][driver[2]];
                            deployerConfig.driver = {
                                'type': envRecord.deployer.type,
                                'driver': 'docker'
                            };
                            deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '').replace(/\./, " - ");
                            req.soajs.log.debug("Calling create service container with params:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
                            deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
                                checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                                    req.soajs.log.debug("Service Container Created, starting container with params:", JSON.stringify(deployerConfig), JSON.stringify(data));
                                    deployer.start(deployerConfig, data.Id, mongo, function (error, data) {
                                        checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                                            req.soajs.log.debug("Service Container started, saving information in core_provision");
                                            //get the ip of the host from hosts
                                            registerHost(data, deployerConfig);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        function registerHost(data, deployerConfig) {
            var document = {
                "cid": data.Id,
                "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                "hostname": data.Name || data.name, //Config.Hostname,
                "type": "service",
                "running": true,
                "deployer": deployerConfig
            };
            mongo.insert("docker", document, function (error) {
                checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                    var newHost = {
                        "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                        "name": serviceName,
                        "ip": data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode].IPAddress,
                        "hostname": data.Name || data.name //data.Config.Hostname
                    };
                    mongo.insert(colName, newHost, function (error) {
                        checkIfError(req, res, {config: config, error: error, code: 615}, function () {
                            mongo.find(colName, {
                                "env": req.soajs.inputmaskData.envCode.toLowerCase(),
                                "name": "controller"
                            }, function (error, controllers) {
                                checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                    //return res.json(req.soajs.buildResponse(null, {"ip": hostRecord.ip, 'hostname': data.Config.Hostname, "controllers": controllers}));
                                    return res.json(req.soajs.buildResponse(null, {
                                        'cid': data.Id,
                                        'hostname': data.Name || data.name, //data.Config.Hostname,
                                        "ip": newHost.ip,
                                        "controllers": controllers
                                    }));
                                });
                            });
                        });
                    });
                });
            });
        }
    },

    "list": function (config, mongo, req, res) {
        mongo.findOne("environment", {code: req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
            checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
                mongo.find(colName, {env: req.soajs.inputmaskData.env.toLowerCase()}, function (err, hosts) {
                    checkIfError(req, res, {config: config, error: err, code: 600}, function () {
                        mongo.find('docker', {env: req.soajs.inputmaskData.env.toLowerCase()}, function (err, containers) {
                            checkIfError(req, res, {config: config, error: err, code: 600}, function () {
                                hosts.forEach(function (oneHost) {
                                    containers.forEach(function (oneContainer) {
                                        if (oneHost.hostname === oneContainer.hostname) {
                                            oneHost.cid = oneContainer.cid;
                                        }
                                    });
                                });
                                return res.jsonp(req.soajs.buildResponse(null, {'hosts': hosts, 'deployer': envRecord.deployer, 'profile': envRecord.profile}));
                            });
                        });
                    });
                });
            });
        });
    },

    "delete": function (config, mongo, req, res) {
        var dockerColCriteria = {
            'env': req.soajs.inputmaskData.env.toLowerCase(),
            'hostname': req.soajs.inputmaskData.hostname
        };

        var rebuildNginx = false;
        mongo.findOne("environment", {code: req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
            checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
                if (envRecord.deployer.type === 'manual') {
                    removeFromHosts();
                }
                else {
                    removeDockerRecord();
                }
            });
        });

        function removeDockerRecord() {
            mongo.findOne('docker', dockerColCriteria, function (error, response) {
                checkIfError(req, res, {config: config, error: error || !response, code: 600}, function () {
                    if (response.type === 'controller') {
                        rebuildNginx = true;
                    }

                    var deployerConfig = response.deployer;
                    deployer.remove(deployerConfig, response.cid, mongo, function (error) {
                        checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                            mongo.remove('docker', {'_id': response._id}, function (err) {
                                checkIfError(req, res, {config: config, error: err, code: 600}, function () {
                                    removeFromHosts();
                                });
                            });
                        });
                    });
                });
            });
        }

        function removeFromHosts() {
            var hostCriteria = {
                'env': req.soajs.inputmaskData.env.toLowerCase(),
                'name': req.soajs.inputmaskData.name,
                'ip': req.soajs.inputmaskData.ip
            };
            mongo.remove(colName, hostCriteria, function (err) {
                checkIfError(req, res, {config: config, error: err, code: 600}, function () {
                    if (rebuildNginx) {
                        req.soajs.log.debug("Deleted controller container, rebuilding Nginx ....");
                        req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.env.toUpperCase();
                        deployNginx(config, mongo, req, res);
                    }
                    else {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    }
                });
            });
        }
    },

    "maintenanceOperation": function (config, mongo, req, res) {
        req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toLowerCase();
        checkIfError(req, res, {config: config, error: req.soajs.inputmaskData.operation === 'awarenessStat' && req.soajs.inputmaskData.serviceName !== 'controller', code: 602}, function () {
            checkIfError(req, res, {config: config, error: req.soajs.inputmaskData.operation === 'loadProvision' && req.soajs.inputmaskData.serviceName === 'controller', code: 602}, function () {
                //check that the given service has the given port in services collection
                if (req.soajs.inputmaskData.serviceName === 'controller') {
                    checkServiceHost();
                }
                else {
                    mongo.findOne('services', {
                        'name': req.soajs.inputmaskData.serviceName,
                        'port': req.soajs.inputmaskData.servicePort
                    }, function (error, record) {
                        checkIfError(req, res, {config: config, error: error, code: 603}, function () {
                            if (!record) {
                                mongo.findOne('daemons', {
                                    'name': req.soajs.inputmaskData.serviceName,
                                    'port': req.soajs.inputmaskData.servicePort
                                },function (error, record) {
                                    checkIfError(req, res, {config: config, error: error, code: 603}, function () {
                                        checkIfError(req, res, {config: config, error: !record, code: 604}, function () {
                                            checkServiceHost();
                                        });
                                    });
                                });
                            }
                            else {
                                //check that the given service has the given host in hosts collection
                                checkServiceHost();
                            }
                        });
                    });
                }
            });
        });

        function checkServiceHost() {
            var condition = {
                'env': req.soajs.inputmaskData.env.toLowerCase(),
                "name": req.soajs.inputmaskData.serviceName
            };
            if (req.soajs.inputmaskData.ip) {
                condition.ip = req.soajs.inputmaskData.serviceHost;
            }
            else {
                condition.hostname = req.soajs.inputmaskData.hostname;
            }
            mongo.findOne(colName, condition, function (error, record) {
                checkIfError(req, res, {config: config, error: error, code: 603}, function () {
                    checkIfError(req, res, {config: config, error: !record, code: 605}, function () {
                        //perform maintenance operation
                        doMaintenance(record);
                    });
                });
            });
        }

        function doMaintenance(oneHost) {
            var criteria = {
                'env': req.soajs.inputmaskData.env.toLowerCase(),
                "hostname": req.soajs.inputmaskData.hostname
            };

            mongo.findOne('environment', {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
                checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
                    checkIfError(req, res, {config: config, error: req.soajs.inputmaskData.operation === 'hostLogs' && envRecord.deployer.type === 'manual', code: 619}, function () {
                        switch (req.soajs.inputmaskData.operation) {
                            case 'hostLogs':
                                mongo.findOne("docker", criteria, function (error, response) {
                                    checkIfError(req, res, {config: config, error: error, code: 603}, function () {
                                        var deployerConfig = response.deployer;
                                        deployer.info(deployerConfig, response.cid, req, res, mongo);
                                    });
                                });
                                break;
                            default:
                                req.soajs.inputmaskData.servicePort = req.soajs.inputmaskData.servicePort + 1000;
                                var maintenanceURL = "http://" + oneHost.ip + ":" + req.soajs.inputmaskData.servicePort;
                                maintenanceURL += "/" + req.soajs.inputmaskData.operation;
                                request.get(maintenanceURL, function (error, response, body) {
                                    checkIfError(req, res, {config: config, error: error, code: 603}, function () {
                                        return res.jsonp(req.soajs.buildResponse(null, JSON.parse(body)));
                                    });
                                });
                                break;
                        }
                    });
                });
            });
        }
    }
};