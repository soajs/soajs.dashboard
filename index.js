'use strict';
var soajs = require('soajs');
var config = require('./config.js');

var dashboardBL = {
	environment: {
		module: require("./lib/environment/index.js")
	},
	resources: {
		module: require("./lib/resources/index.js")
	},
	customRegistry: {
		module: require("./lib/customRegistry/index.js")
	},
	product: {
		module: require("./lib/product/index.js")
	},
	tenant: {
		module: require("./lib/tenant/index.js")
	},
	services: {
		module: require("./lib/services/index.js")
	},
	daemons: {
		module: require("./lib/daemons/index.js")
	},
	swagger: {
		module: require("./lib/swagger/index.js")
	},
	apiBuilder: {
		module: require("./lib/apiBuilder/index.js")
	},
	hosts: {
		module: require("./lib/hosts/index.js"),
		helper: require("./lib/hosts/helper.js")
	},
	catalog: {
		module: require("./lib/catalog/index.js")
	},
	ci: {
		module: require("./lib/ci/index.js"),
		driver: require('./utils/drivers/ci/index.js')
	},
	cd: {
		module: require("./lib/cd/index.js"),
		helper: require("./lib/cd/helper.js")
	},
	git: {
		module: require('./lib/git/index.js'),
		helper: require("./lib/git/helper.js"),
		driver: require('./utils/drivers/git/index.js'),
		model: require('./models/git.js')
	},
	cloud: {
		infra: {
			module: require("./lib/cloud/infra/index.js")
		},
		service: {
			module: require("./lib/cloud/services/index.js")
		},
		deploy: {
			module: require("./lib/cloud/deploy/index.js")
		},
		nodes: {
			module: require("./lib/cloud/nodes/index.js")
		},
		maintenance: {
			module: require("./lib/cloud/maintenance/index.js")
		},
		namespace: {
			module: require("./lib/cloud/namespaces/index.js")
		},
		autoscale: {
			module: require('./lib/cloud/autoscale/index.js')
		},
		metrics: {
			module: require('./lib/cloud/metrics/index.js')
		},
		secrets: {
			module: require('./lib/cloud/secrets/index.js')
		}
	},
	templates: {
		module: require("./lib/templates/index.js")
	}
};

var deployer = require("soajs").drivers;

var dbModel = "mongo";

var service = new soajs.server.service(config);

function checkMyAccess(req, res, cb) {
	if (!req.soajs.uracDriver || !req.soajs.uracDriver.getProfile()) {
		return res.jsonp(req.soajs.buildResponse({ "code": 601, "msg": config.errors[601] }));
	}
	var myTenant = req.soajs.uracDriver.getProfile().tenant;
	if (!myTenant || !myTenant.id) {
		return res.jsonp(req.soajs.buildResponse({ "code": 608, "msg": config.errors[608] }));
	}
	else {
		req.soajs.inputmaskData.id = myTenant.id.toString();
		return cb();
	}
}

function initBLModel(req, res, BLModule, modelName, cb) {
	BLModule.init(modelName, function (error, BL) {
		if (error) {
			req.soajs.log.error(error);
			return res.json(req.soajs.buildResponse({ "code": 407, "msg": config.errors[407] }));
		}
		else {
			return cb(BL);
		}
	});
}

function checkConnection(BL, req, res, cb) {
	if (!BL.model.initConnection(req.soajs)) {
		return res.json(req.soajs.buildResponse({ "code": 600, "msg": config.errors[600] }));
	}
	return cb();
}

service.init(function () {

	/**
	 * returns all templates that can be used to deploy an environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/templates", function (req, res) {
		initBLModel(req, res, dashboardBL.templates.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getTemplates(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * run upgrade process on old template schemas
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/templates/upgrade", function (req, res) {
		initBLModel(req, res, dashboardBL.templates.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.upgradeTemplates(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * remove a selected template by id
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/templates", function (req, res) {
		initBLModel(req, res, dashboardBL.templates.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteTemplate(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Upload a templated environment or post its correction inputs
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/templates/import", function(req, res) {
		initBLModel(req, res, dashboardBL.templates.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {

				//correct template
				if(req.soajs.inputmaskData && Object.keys(req.soajs.inputmaskData).length > 0){
					//correct the template inputs
					BL.correct(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				}
				//import new template
				else{
					//unzip file and process template first time
					BL.import(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				}
			});
		});
	});

	/**
	 * Generate and export a templated environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/templates/export", function (req, res) {
		initBLModel(req, res, dashboardBL.templates.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				if(req.soajs.inputmaskData.id){
					//download template
					BL.download(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				}
				else{
					//generate and download new template
					BL.export(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				}
			});
		});
	});

	/**
	 * Environments features
	 */

	/**
	 * Add a new environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/environment/add", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.add(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete an environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/environment/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.delete(config, req, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update an existing environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/environment/update", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.update(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List all environments
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/environment/list", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get a specific environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/environment", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.get(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get a specific environment Deployment Status
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/environment/status", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getDeploymentStatus(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update environment tenant security key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/environment/key/update", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.keyUpdate(config, soajs.core, req, res, function (error, data) {
					if (error) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					}
					else if (process.env.SOAJS_DEPLOY_HA) {
						initBLModel(req, res, dashboardBL.cloud.maintenance.module, dbModel, function (BL) {
							let env = req.soajs.inputmaskData.envCode;

							let controllerService;
							if (process.env.SOAJS_DEPLOY_HA === 'kubernetes') {
								controllerService = env.toLowerCase() + "-controller-v1";
							}
							else {
								controllerService = env.toLowerCase() + "-controller";
							}

							req.soajs.inputmaskData = {
								type: "service",
								serviceName: "controller",
								env: env,
								serviceId: controllerService,
								operation: "loadProvision"
							};
							BL.maintenance(config, req.soajs, deployer, function (error, result) {
								BL.model.closeConnection(req.soajs);
								if (error) {
									req.soajs.log.error(error);
								}
								return res.json(req.soajs.buildResponse(null, data));
							});
						});
					}
					else {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					}
				});
			});
		});
	});

	/**
	 * List environment databases
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/environment/dbs/list", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listDbs(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete environment database
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/environment/dbs/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteDb(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add environment database
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/environment/dbs/add", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addDb(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update environment database
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/environment/dbs/update", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateDb(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update environment's database prefix
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/environment/dbs/updatePrefix", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateDbsPrefix(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * return Profile of the current environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/environment/profile", function (req, res) {
		let provision = req.soajs.registry.coreDB.provision;
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			var switchedConnection = BL.model.switchConnection(req.soajs);
			if (switchedConnection) {
				if (typeof  switchedConnection === 'object' && Object.keys(switchedConnection).length > 0) {
					provision = switchedConnection;
				}
			}
			return res.json(req.soajs.buildResponse(null, provision));
		});
	});

	/**
	 * List resources
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/resources/list", function (req, res) {
        initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (serviceBL) {
            initBLModel(req, res, dashboardBL.resources.module, dbModel, function (BL) {
                checkConnection(BL, req, res, function () {
                    BL.listResources(config, req, res, serviceBL, function (error, data) {
                        BL.model.closeConnection(req.soajs);
                        return res.json(req.soajs.buildResponse(error, data));
                    });
                });
            });
        });
	});

	/**
	 * Get one resource
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/resources/get", function (req, res) {
		initBLModel(req, res, dashboardBL.resources.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getResource(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Upgrade Resources
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/resources/upgrade", function (req, res) {
		initBLModel(req, res, dashboardBL.resources.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.upgradeResources(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add new resource
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/resources/add", function (req, res) {
		initBLModel(req, res, dashboardBL.resources.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addResource(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete a resource
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/resources/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.resources.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteResource(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update a resource
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/resources/update", function (req, res) {
		initBLModel(req, res, dashboardBL.resources.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateResource(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get resources deploy configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/resources/config", function (req, res) {
		initBLModel(req, res, dashboardBL.resources.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Set resources deploy configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/resources/config/update", function (req, res) {
		initBLModel(req, res, dashboardBL.resources.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.setConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List custom registry entries
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/customRegistry/list", function (req, res) {
		initBLModel(req, res, dashboardBL.customRegistry.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get a custom registry entry
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/customRegistry/get", function (req, res) {
		initBLModel(req, res, dashboardBL.customRegistry.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.get(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add a custom registry entry
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/customRegistry/add", function (req, res) {
		initBLModel(req, res, dashboardBL.customRegistry.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.add(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update a custom registry entry
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/customRegistry/update", function (req, res) {
		initBLModel(req, res, dashboardBL.customRegistry.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.update(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Upgrade custom registry entries from old schema to new one
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/customRegistry/upgrade", function (req, res) {
		initBLModel(req, res, dashboardBL.customRegistry.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.upgrade(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete a custom registry entry
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/customRegistry/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.customRegistry.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.delete(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List enviornment platforms
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/environment/platforms/list", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listPlatforms(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update deployer configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/environment/platforms/deployer/update", function (req, res) {
		initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateDeployerConfig(config, req, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Products features
	 */

	/**
	 * Add a new product
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/product/add", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.add(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete an existing product
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/product/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.delete(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update an existing product
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/product/update", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.update(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List available products
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/product/list", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get a specific product
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/product/get", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.get(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get package of specific product
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/product/packages/get", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getPackage(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List all product packages
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/product/packages/list", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listPackage(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add a new product package
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/product/packages/add", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addPackage(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update a product package
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/product/packages/update", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updatePackage(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete a product package
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/product/packages/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.product.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deletePackage(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Tenants features
	 */

	/**
	 * Add a new tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/tenant/add", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.add(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete an existing tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/tenant/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.delete(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List available tenants
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/list", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update an existing tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/tenant/update", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.update(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get a specific tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/get", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.get(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List tenant oauth configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/oauth/list", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getOAuth(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add new tenant oauth configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/tenant/oauth/add", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.saveOAuth(config, 425, 'tenant OAuth add successful', req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update existing oauth configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/tenant/oauth/update", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.saveOAuth(config, 426, 'tenant OAuth update successful', req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete oauth configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/tenant/oauth/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteOAuth(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List tenant oauth users
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/oauth/users/list", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getOAuthUsers(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete tenant oauth user
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/tenant/oauth/users/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteOAuthUsers(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add new tenant oauth user
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/tenant/oauth/users/add", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addOAuthUsers(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update tenant oauth user
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/tenant/oauth/users/update", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateOAuthUsers(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List tenant applications
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/application/list", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listApplication(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add a new tenant application
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/tenant/application/add", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addApplication(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update an existing tenant application
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/tenant/application/update", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateApplication(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete a tenant application
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/tenant/application/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteApplication(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get tenant ACL
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/tenant/acl/get", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getTenantAcl(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add a new application key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/tenant/application/key/add", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.createApplicationKey(config, soajs.provision, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List all tenant application keys
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/application/key/list", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getApplicationKeys(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete application key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/tenant/application/key/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteApplicationKey(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List application external keys for a specific key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/application/key/ext/list", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listApplicationExtKeys(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add a new application external key for a specific key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/tenant/application/key/ext/add", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addApplicationExtKeys(config, soajs.core, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update an existing application external key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/tenant/application/key/ext/update", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateApplicationExtKeys(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete an existing application external key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/tenant/application/key/ext/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteApplicationExtKeys(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update the service configuration for a specific key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/tenant/application/key/config/update", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateApplicationConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List service configuration for a specific key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/application/key/config/list", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listApplicationConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Dashboard Keys
	 */

	/**
	 * List external keys with dashboard access
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/tenant/db/keys/list", function (req, res) {
		initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listDashboardKeys(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Hosts features
	 */

	/**
	 * List existing hosts in manual deployment mode
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/hosts/list", function (req, res) {
		initBLModel(req, res, dashboardBL.hosts.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req.soajs, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Perform maintenance operation on a host deployed in manual mode
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/hosts/awareness", function (req, res) {
		initBLModel(req, res, dashboardBL.hosts.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.awareness(config, req.soajs, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * High Availability Cloud features
	 */

	/**
	 * Get all available nodes
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cloud/nodes/list", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.nodes.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listNodes(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add a new node
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/cloud/nodes/add", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.nodes.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addNode(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Remove an existing node
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/cloud/nodes/remove", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.nodes.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.removeNode(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update the role or availability of an existing node
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/cloud/nodes/update", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.nodes.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateNode(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List all services per environment deployed in container mode
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cloud/services/list", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listServices(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Deploy a new SOAJS service
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/cloud/services/soajs/deploy", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.deploy.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deployService(config, req, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Deploy a plugin, such as heapster
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/cloud/plugins/deploy", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.deploy.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deployPlugin(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Check if resource is deployed
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cloud/resource", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.checkResource(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List all Vms deployed in a region
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cloud/vm/list", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listVMs(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Redeploy a running service
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/cloud/services/redeploy", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.deploy.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.redeployService(config, req, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Scale an existing service deployment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/cloud/services/scale", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.scaleService(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete an existing deployment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/cloud/services/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteService(config, req, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Perform maintenance operations on services deployed in container mode
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/cloud/services/maintenance", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.maintenance.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.maintenance(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get container logs
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cloud/services/instances/logs", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.maintenance.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.streamLogs(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Autoscale one or more services
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/cloud/services/autoscale", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.autoscale.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.set(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Configure environment autoscaling
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/cloud/services/autoscale/config", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.autoscale.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateEnvAutoscaleConfig(config, req.soajs, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List available namespaces
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cloud/namespaces/list", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.namespace.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete a namespace
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/cloud/namespaces/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.namespace.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.delete(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get Services Metrics
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cloud/metrics/services", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.metrics.module, dbModel, function (BL) {

			checkConnection(BL, req, res, function () {
				BL.getServicesMetrics(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get Nodes Metrics ( kubernetes only)
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cloud/metrics/nodes", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.metrics.module, dbModel, function (BL) {

			checkConnection(BL, req, res, function () {
				BL.getNodesMetrics(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Catalog Recipes features
	 */

	/**
	 * List catalogs
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/catalog/recipes/list", function (req, res) {
		initBLModel(req, res, dashboardBL.catalog.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add new catalog
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/catalog/recipes/add", function (req, res) {
		initBLModel(req, res, dashboardBL.catalog.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.add(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update a catalog
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/catalog/recipes/update", function (req, res) {
		initBLModel(req, res, dashboardBL.catalog.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.edit(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete a catalog
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/catalog/recipes/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.catalog.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.delete(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get a catalog
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/catalog/recipes/get", function (req, res) {
		initBLModel(req, res, dashboardBL.catalog.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.get(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Upgrade Catalog Recipes to latest versions
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/catalog/recipes/upgrade", function (req, res) {
		initBLModel(req, res, dashboardBL.catalog.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.upgrade(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Continuous Delivery Features
	 */

	/**
	 * Get a CD configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cd", function (req, res) {
		initBLModel(req, res, dashboardBL.cd.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getConfig(config, req, dashboardBL.cd.helper, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get Get Update Notification Ledger
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cd/updates", function (req, res) {
		initBLModel(req, res, dashboardBL.cd.module, dbModel, function (BL) {

			checkConnection(BL, req, res, function () {
				BL.getUpdates(config, req, deployer, dashboardBL.cd.helper, dashboardBL.cloud.service.module, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Save a CD configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/cd", function (req, res) {
		initBLModel(req, res, dashboardBL.cd.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.saveConfig(config, req, dashboardBL.cd.helper, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Pause CD in an environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/cd/pause", function (req, res) {
		initBLModel(req, res, dashboardBL.cd.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.pauseCD(config, req, dashboardBL.cd.helper, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Trigger CD deploy operation
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/cd/deploy", function (req, res) {
		initBLModel(req, res, dashboardBL.cd.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.cdDeploy(config, req, deployer, dashboardBL.cd.helper, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Take action based on ledger notification
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/cd/action", function (req, res) {
		initBLModel(req, res, dashboardBL.cd.module, dbModel, function (BL) {

			checkConnection(BL, req, res, function () {
				BL.cdAction(config, req, deployer, dashboardBL.cd.helper, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Lists the ledgers of a specific environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/cd/ledger", function (req, res) {
		initBLModel(req, res, dashboardBL.cd.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getLedger(config, req, dashboardBL.cd.helper, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});


	/**
	 * Marks records as read
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/cd/ledger/read", function (req, res) {
		initBLModel(req, res, dashboardBL.cd.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.markRead(config, req, dashboardBL.cd.helper, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});
	/**
	 * Continuous Integration features
	 */

	/**
	 * Get CI Accounts
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/ci", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listCIAccounts(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get CI providers
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/ci/providers", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listUniqueProviders(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Turn On/Off Repository CI
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/ci/status", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.toggleRepoStatus(config, req, dashboardBL.ci.driver, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Activate CI Provider
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/ci/provider", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.activateProvider(config, req, dashboardBL.ci.driver, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add CI Recipe
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/ci/recipe", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addRecipe(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Edit CI Recipe
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/ci/recipe", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addRecipe(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete CI Recipe
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/ci/recipe", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deleteRecipe(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Deactivate CI Provider
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/ci/provider", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deactivateProvider(config, req, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Download a CI recipe
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/ci/recipe/download", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.downloadRecipe(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Download CI provider script for CD
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/ci/script/download", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			BL.downloadScript(config, req, res);
		});
	});

	/**
	 * Get ci repository settings and environment variables
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/ci/settings", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getRepoSettings(config, req, dashboardBL.ci.driver, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update ci repository settings and environment variables
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/ci/settings", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateRepoSettings(config, req, dashboardBL.ci.driver, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.jsonp(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * get the content of the ci file from provider for this repo
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/ci/repo/remote/config", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			initBLModel(req, res, dashboardBL.git.module, dbModel, function (gitBL) {
				checkConnection(gitBL, req, res, function () {
					checkConnection(BL, req, res, function () {
						BL.getRepoYamlFile(config, req, dashboardBL.ci.driver, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, gitBL, function (error, data) {
							gitBL.model.closeConnection(req.soajs);
							BL.model.closeConnection(req.soajs);
							return res.jsonp(req.soajs.buildResponse(error, data));
						});
					});
				});
			});
		});
	});

	/**
	 * get the latest build of a repo per branch from a ci provider
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/ci/repo/builds", function (req, res) {
		initBLModel(req, res, dashboardBL.ci.module, dbModel, function (BL) {
			initBLModel(req, res, dashboardBL.git.module, dbModel, function (gitBL) {
				checkConnection(BL, req, res, function () {
					checkConnection(gitBL, req, res, function () {
						BL.getRepoBuilds(config, req, dashboardBL.ci.driver, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, gitBL, function (error, data) {
							BL.model.closeConnection(req.soajs);
							return res.jsonp(req.soajs.buildResponse(error, data));
						});
					});
				});
			});
		});
	});

	/**
	 * Git App features gitAccountsBL
	 */

	/**
	 * Add a new git account
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/gitAccounts/login", function (req, res) {
		initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.login(config, req, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete an existing git account
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/gitAccounts/logout", function (req, res) {
		initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.logout(config, req, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List all available git accounts
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/gitAccounts/accounts/list", function (req, res) {
		initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listAccounts(config, req, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get git account repositories
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/gitAccounts/getRepos", function (req, res) {
		initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getRepos(config, req, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get file content from a repository, restricted to YAML files
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/gitAccounts/getYaml", function (req, res) {
		initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {

			checkConnection(BL, req, res, function () {
				BL.getFile(config, req, dashboardBL.git.driver, deployer, dashboardBL.git.helper, dashboardBL.git.model, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});

	});

	/**
	 * Get repository barnches
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/gitAccounts/getBranches", function (req, res) {
		initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getBranches(config, req, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Activate a repository
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/gitAccounts/repo/activate", function (req, res) {
		initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.activateRepo(config, req, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Deactivate a repository
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put('/gitAccounts/repo/deactivate', function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (cloudBL) {
			initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.deactivateRepo(config, req, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, cloudBL, deployer, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Sync an active repository
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put('/gitAccounts/repo/sync', function (req, res) {
		initBLModel(req, res, dashboardBL.git.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.syncRepo(config, req, dashboardBL.git.driver, dashboardBL.git.helper, dashboardBL.git.model, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Services features
	 */

	/**
	 * List available services
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/services/list", function (req, res) {
		initBLModel(req, res, dashboardBL.services.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update service settings
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/services/settings/update", function (req, res) {
		initBLModel(req, res, dashboardBL.services.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateSettings(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get all environments where a specific service is deployed
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/services/env/list", function (req, res) {
		initBLModel(req, res, dashboardBL.hosts.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listHostEnv(config, req.soajs, deployer, dashboardBL.hosts.helper, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});
	/**
	 * Daemons features
	 */

	/**
	 * List available daemons
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/daemons/list", function (req, res) {
		initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List available daemon group configurations
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/daemons/groupConfig/list", function (req, res) {
		initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listGroupConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add a new group configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/daemons/groupConfig/add", function (req, res) {
		initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addGroupConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update an exiting daemon group configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/daemons/groupConfig/update", function (req, res) {
		initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateGroupConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete a group configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/daemons/groupConfig/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (cloudBL) {
			initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					checkConnection(cloudBL, req, res, function () {
						BL.deleteGroupConfig(config, req, res, cloudBL, deployer, function (error, data) {
							BL.model.closeConnection(req.soajs);
							cloudBL.model.closeConnection(req.soajs);
							return res.json(req.soajs.buildResponse(error, data));
						});
					});
				});
			});
		});
	});

	/**
	 * Update the service configuration of a specific group configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/daemons/groupConfig/serviceConfig/update", function (req, res) {
		initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateServiceConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List service configurations per group configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/daemons/groupConfig/serviceConfig/list", function (req, res) {
		initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listServiceConfig(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Update list of tenant external keys per group configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/daemons/groupConfig/tenantExtKeys/update", function (req, res) {
		initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateTenantExtKeys(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * List tenant external keys per group configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/daemons/groupConfig/tenantExtKeys/list", function (req, res) {
		initBLModel(req, res, dashboardBL.daemons.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.listTenantExtKeys(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Settings features
	 */

	/**
	 * Update logged in user's tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/settings/tenant/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.update(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Get current logged-in user's tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/settings/tenant/get", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.environment.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.list(config, req, res, function (error, environments) {
						// todo: check for error?
						BL.model.closeConnection(req.soajs);
						initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL1) {
							checkConnection(BL1, req, res, function () {
								BL1.get(config, req, res, function (error, tenant) {
									// todo: check for error?
									BL1.model.closeConnection(req.soajs);
									return res.jsonp(req.soajs.buildResponse(null, {
										'tenant': tenant,
										'environments': environments
									}));
								});
							});
						});
					});
				});
			});
		});
	});

	/**
	 * List current tenant's oauth configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/settings/tenant/oauth/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.getOAuth(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Add new oauth configuration for current tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/settings/tenant/oauth/add", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.saveOAuth(config, 425, 'tenant OAuth add successful', req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Update current tenant's oauth configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/settings/tenant/oauth/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.saveOAuth(config, 426, 'tenant OAuth update successful', req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Delete current tenant's oauth configuration
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/settings/tenant/oauth/delete", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.deleteOAuth(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * List current tenant's oauth users
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/settings/tenant/oauth/users/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.getOAuthUsers(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Delete current tenant's oauth user
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/settings/tenant/oauth/users/delete", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.deleteOAuthUsers(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Add a new oauth user for current tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/settings/tenant/oauth/users/add", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.addOAuthUsers(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Update current tennant oauth user
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/settings/tenant/oauth/users/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.updateOAuthUsers(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * List current tenant applications
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/settings/tenant/application/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.listApplication(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Add application key for current tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/settings/tenant/application/key/add", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.createApplicationKey(config, soajs.provision, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * List current tenant's keys
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/settings/tenant/application/key/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.getApplicationKeys(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Delete current tenant's application key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/settings/tenant/application/key/delete", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.deleteApplicationKey(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * List external keys of current tenant
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/settings/tenant/application/key/ext/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.listApplicationExtKeys(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Add external key to current tenant's application
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/settings/tenant/application/key/ext/add", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.addApplicationExtKeys(config, soajs.core, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Update external key of current tenant's application
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/settings/tenant/application/key/ext/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.updateApplicationExtKeys(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Delete external key of current tenant's application
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/settings/tenant/application/key/ext/delete", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.deleteApplicationExtKeys(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Update service configuration of current tenant's key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.put("/settings/tenant/application/key/config/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.updateApplicationConfig(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * List service configuration of current tenant's key
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/settings/tenant/application/key/config/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, dashboardBL.tenant.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.listApplicationConfig(config, req, res, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * Simulation api that mimics a service api behavior used by swagger feature.
	 * Api takes a yaml input and simulate the imfv validation of a requested service API
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/swagger/simulate", function (req, res) {
		initBLModel(req, res, dashboardBL.swagger.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.test(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Swagger generate service API
	 * Api takes service information and yaml code as service api schema
	 * attempts to communicate remote git repo
	 * if no errors are found in neither code nor git communication
	 * it generates a folder schema for the service and pushes it to the remote api repo
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/swagger/generate", function (req, res) {
		initBLModel(req, res, dashboardBL.swagger.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.generate(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Generate Service from data saved in db
	 */
	service.post("/swagger/generateExistingService", function (req, res) {
		initBLModel(req, res, dashboardBL.swagger.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.generateExistingService(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * api builder apis
	 */

	service.get("/apiBuilder/list", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.get("/apiBuilder/get", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.get(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.get("/apiBuilder/publish", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.publish(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.get("/apiBuilder/getResources", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getResources(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.post("/apiBuilder/add", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.add(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.post("/apiBuilder/authentication/update", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.authenticationUpdate(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.post("/apiBuilder/convertSwaggerToImfv", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.convertSwaggerToImfv(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.post("/apiBuilder/convertImfvToSwagger", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.convertImfvToSwagger(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.put("/apiBuilder/edit", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.edit(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.put("/apiBuilder/updateSchemas", function (req, res) {
		initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateSchemas(config, req, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	service.delete("/apiBuilder/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.service.module, dbModel, function (cloudBL) {
			initBLModel(req, res, dashboardBL.apiBuilder.module, dbModel, function (BL) {
				checkConnection(BL, req, res, function () {
					BL.delete(config, req, res, cloudBL, deployer, function (error, data) {
						BL.model.closeConnection(req.soajs);
						return res.json(req.soajs.buildResponse(error, data));
					});
				});
			});
		});
	});

	/**
	 * List secrets
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/secrets/list", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.secrets.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Add a new secret
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/secrets/add", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.secrets.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.add(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get one secret
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.get("/secrets/get", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.secrets.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.get(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Delete a secret
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.delete("/secrets/delete", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.secrets.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.delete(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Infra Providers
	 */

	/**
	 * List activated Infra Providers
	 */
	service.get("/infra", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.list(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Activate new infra provider
	 */
	service.post("/infra", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.activate(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * modify infra provider connection settings
	 */
	service.put("/infra", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.modify(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * deactivate infra provider
	 */
	service.delete("/infra", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.deactivate(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get cluster information from Infra Provider
	 */
	service.get("/infra/cluster", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.getCluster(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Get cluster information from Infra Provider
	 */
	service.post("/infra/cluster/scale", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.scaleCluster(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * delete deployment from infra provider
	 */
	service.delete("/infra/deployment", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.removeDeployment(config, req, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * delete template from infra provider
	 */
	service.delete("/infra/template", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.removeTemplate(config, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * add template from infra provider
	 */
	service.post("/infra/template", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.addTemplate(config, req.soajs, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * upload template for infra provider to remote infra cloud CDN
	 */
	service.post("/infra/template/upload", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.uploadTemplate(config, req, req.soajs, deployer, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * download template from infra provider remote cloud CDN
	 */
	service.get("/infra/template/download", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.downloadTemplate(config, req.soajs, deployer, res, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * update template from infra provider
	 */
	service.put("/infra/template", function (req, res) {
		initBLModel(req, res, dashboardBL.cloud.infra.module, dbModel, function (BL) {
			checkConnection(BL, req, res, function () {
				BL.updateTemplate(config, req.soajs, function (error, data) {
					BL.model.closeConnection(req.soajs);
					return res.json(req.soajs.buildResponse(error, data));
				});
			});
		});
	});

	/**
	 * Service Start
	 */
	service.start();
});
