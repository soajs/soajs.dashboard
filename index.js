'use strict';
var soajs = require('soajs');

var config = require('./config.js');
var environment = require('./lib/environment.js');
var product = require('./lib/product.js');
var tenant = require('./lib/tenant.js');

var hostBL = require("./lib/host.js");
var cloudServicesBL = require("./lib/cloud-services.js");
var cloudDeployBL = require("./lib/cloud-deploy.js");
var cloudNodesBL = require("./lib/cloud-nodes.js");
var cloudMaintenanceBL = require("./lib/cloud-maintenance.js");
var tenantBL = require("./lib/tenant.js");
var productBL = require('./lib/product.js');
var servicesBL = require("./lib/services.js");
var daemonsBL = require("./lib/daemons.js");
var staticContentBL = require('./lib/staticContent.js');
var gitAccountsBL = require("./lib/git.js");
var environmentBL = require('./lib/environment.js');
var cbBL = require("./lib/contentbuilder.js");
var swaggerBL = require("./lib/swagger.js");
var gitAccounts = require("./lib/git.js");
var daemons = require("./lib/daemons.js");
var staticContent = require('./lib/staticContent.js');
var cb = require("./lib/contentbuilder.js");

var dbModel = "mongo";

var service = new soajs.server.service(config);

function checkMyAccess(req, res, cb) {
	if (!req.soajs.session || !req.soajs.urac.getProfile()) {
		return res.jsonp(req.soajs.buildResponse({"code": 601, "msg": config.errors[601]}));
	}
	var myTenant = req.soajs.urac.getProfile().tenant;
	if (!myTenant || !myTenant.id) {
		return res.jsonp(req.soajs.buildResponse({"code": 608, "msg": config.errors[608]}));
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
			return res.json(req.soajs.buildResponse({"code": 407, "msg": config.errors[407]}));
		}
		else {
			return cb(BL);
		}
	});
}

service.init(function () {
	/**
	 * Environments features
	 */

	 /**
	 * Add a new environment
	 * @param {String} API route
	 * @param {Function} API middleware
	 */
	service.post("/environment/add", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.add(config, service, dbModel, req, res);
		});
	});

	/**
	* Delete an environment
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/environment/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.delete(config, req, res);
		});
	});

	/**
	* Update an existing environment
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/environment/update", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.update(config, req, res);
		});
	});

	/**
	* List all environments
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/environment/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});

	/**
	* Update environment tenant security key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/environment/key/update", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.keyUpdate(config, req, res);
		});
	});

	/**
	* List environment databases
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/environment/dbs/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.listDbs(config, req, res);
		});
	});

	/**
	* Delete environment database
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/environment/dbs/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.deleteDb(config, req, res);
		});
	});

	/**
	* Add environment database
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/environment/dbs/add", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.addDb(config, req, res);
		});
	});

	/**
	* Update environment database
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/environment/dbs/update", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.updateDb(config, req, res);
		});
	});

	/**
	* Update environment's database prefix
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/environment/dbs/updatePrefix", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.updateDbsPrefix(config, req, res);
		});
	});

	/**
	* Add environment cluster
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/environment/clusters/add", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.addCluster(config, req, res);
		});
	});

	/**
	* Delete environment cluster
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/environment/clusters/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.deleteCluster(config, req, res);
		});
	});

	/**
	* Update environment cluster
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/environment/clusters/update", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.updateCluster(config, req, res);
		});
	});

	/**
	* List environment clusters
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/environment/clusters/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.listClusters(config, req, res);
		});
	});

	/**
	* List enviornment platforms
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/environment/platforms/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.listPlatforms(config, req, res);
		});
	});

	/**
	* Upload platform certificate
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/environment/platforms/cert/upload", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.uploadCerts(config, req, res);
		});
	});

	/**
	* Delete platform certificate
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/environment/platforms/cert/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.removeCert(config, req, res);
		});
	});

	/**
	* Choose existing platform certificate
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/environment/platforms/cert/choose", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.chooseExistingCerts(config, req, res);
		});
	});

	/**
	* Change selected platform
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/environment/platforms/driver/changeSelected", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.changeSelectedDriver(config, req, res);
		});
	});

	/**
	* Change selected platform driver
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/environment/platforms/deployer/type/change", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.changeDeployerType(config, req, res);
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
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.add(config, req, res);
		});
	});

	/**
	* Delete an existing product
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/product/delete", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.delete(config, req, res);
		});
	});

	/**
	* Update an existing product
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/product/update", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.update(config, req, res);
		});
	});

	/**
	* List available products
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/product/list", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});

	/**
	* Get a specific product
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/product/get", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.get(config, req, res);
		});
	});

	/**
	* Get package of specific product
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/product/packages/get", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.getPackage(config, req, res);
		});
	});

	/**
	* List all product packages
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/product/packages/list", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.listPackage(config, req, res);
		});
	});

	/**
	* Add a new product package
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/product/packages/add", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.addPackage(config, req, res);
		});
	});

	/**
	* Update a product package
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/product/packages/update", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.updatePackage(config, req, res);
		});
	});

	/**
	* Delete a product package
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/product/packages/delete", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.deletePackage(config, req, res);
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
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.add(config, req, res);
		});
	});

	/**
	* Delete an existing tenant
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/tenant/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.delete(config, req, res);
		});
	});

	/**
	* List available tenants
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/tenant/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});

	/**
	* Update an existing tenant
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/tenant/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.update(config, req, res);
		});
	});

	/**
	* Get a specific tenant
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/tenant/get", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.get(config, req, res);
		});
	});

	/**
	* List tenant oauth configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/tenant/oauth/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.getOAuth(config, req, res);
		});
	});

	/**
	* Add new tenant oauth configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/tenant/oauth/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.saveOAuth(config, 425, 'tenant OAuth add successful', req, res);
		});
	});

	/**
	* Update existing oauth configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/tenant/oauth/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.saveOAuth(config, 426, 'tenant OAuth update successful', req, res);
		});
	});

	/**
	* Delete oauth configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/tenant/oauth/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteOAuth(config, req, res);
		});
	});

	/**
	* List tenant oauth users
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/tenant/oauth/users/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.getOAuthUsers(config, req, res);
		});
	});

	/**
	* Delete tenant oauth user
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/tenant/oauth/users/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteOAuthUsers(config, req, res);
		});
	});

	/**
	* Add new tenant oauth user
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/tenant/oauth/users/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.addOAuthUsers(config, req, res);
		});
	});

	/**
	* Update tenant oauth user
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/tenant/oauth/users/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.updateOAuthUsers(config, req, res);
		});
	});

	/**
	* List tenant applications
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/tenant/application/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.listApplication(config, req, res);
		});
	});

	/**
	* Add a new tenant application
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/tenant/application/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.addApplication(config, req, res);
		});
	});

	/**
	* Update an existing tenant application
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/tenant/application/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.updateApplication(config, req, res);
		});
	});

	/**
	* Delete a tenant application
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/tenant/application/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteApplication(config, req, res);
		});
	});

	/**
	* Get tenant ACL
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/tenant/acl/get", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.getTenantAcl(config, req, res);
		});
	});

	/**
	* Add a new application key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/tenant/application/key/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.createApplicationKey(config, service.provision, req, res);
		});
	});

	/**
	* List all tenant application keys
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/tenant/application/key/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.getApplicationKeys(config, req, res);
		});
	});

	/**
	* Delete application key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/tenant/application/key/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteApplicationKey(config, req, res);
		});
	});

	/**
	* List application external keys for a specific key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/tenant/application/key/ext/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.listApplicationExtKeys(config, req, res);
		});
	});

	/**
	* Add a new application external key for a specific key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/tenant/application/key/ext/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.addApplicationExtKeys(config, service.provision, service.registry, req, res);
		});
	});

	/**
	* Update an existing application external key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/tenant/application/key/ext/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.updateApplicationExtKeys(config, req, res);
		});
	});

	/**
	* Delete an existing application external key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/tenant/application/key/ext/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteApplicationExtKeys(config, req, res);
		});
	});

	/**
	* Update the service configuration for a specific key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/tenant/application/key/config/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.updateApplicationConfig(config, req, res);
		});
	});

	/**
	* List service configuration for a specific key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/tenant/application/key/config/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.listApplicationConfig(config, req, res);
		});
	});

	/**
	* Get an external key
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/key/get", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.extKeyGet(config, req, res);
		});
	});

	/**
	* Get user permissions
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/permissions/get", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.permissionsGet(config, req, res);
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
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.listDashboardKeys(config, req, res);
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
		initBLModel(req, res, hostBL, dbModel, function (BL) {
			BL.list(config, req.soajs, res);
		});
	});

	/**
	* Perform maintenance operation on a host deployed in manual mode
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/hosts/maintenanceOperation", function (req, res) {
		initBLModel(req, res, hostBL, dbModel, function (BL) {
			BL.maintenanceOperation(config, req.soajs, res);
		});
	});

	/**
	 * High Availability Cloud features
	 */

	 /**
 	* Get all available cluster nodes
 	* @param {String} API route
 	* @param {Function} API middleware
 	*/
	service.get("/cloud/nodes/list", function (req, res) {
		initBLModel(req, res, cloudNodesBL, dbModel, function (BL) {
			BL.listNodes(config, req.soajs, res);
		});
	});

	/**
	* Add a new cluster node
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/cloud/nodes/add", function (req, res) {
		initBLModel(req, res, cloudNodesBL, dbModel, function (BL) {
			BL.addNode(config, req.soajs, res);
		});
	});

	/**
	* Remove an existing cluster node
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/cloud/nodes/remove", function (req, res) {
		initBLModel(req, res, cloudNodesBL, dbModel, function (BL) {
			BL.removeNode(config, req.soajs, res);
		});
	});

	/**
	* Update the role or availability of an existing cluster node
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/cloud/nodes/update", function (req, res) {
		initBLModel(req, res, cloudNodesBL, dbModel, function (BL) {
			BL.updateNode(config, req.soajs, res);
		});
	});

	/**
	* List all services per environment deployed in container mode
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/cloud/services/list", function (req, res) {
		initBLModel(req, res, cloudServicesBL, dbModel, function (BL) {
			BL.listServices(config, req.soajs, res);
		});
	});

	/**
	* Deploy a new SOAJS service
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/cloud/services/soajs/deploy", function (req, res) {
		initBLModel(req, res, cloudDeployBL, dbModel, function (BL) {
			BL.deployService(config, req.soajs, service.registry, res);
		});
	});

	/**
	* Deploy a new custom service
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/cloud/services/custom/deploy", function (req, res) {
		initBLModel(req, res, cloudDeployBL, dbModel, function (BL) {
			BL.deployCustomService(config, req.soajs, res);
		});
	});

	/**
	* Redeploy a running service
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/cloud/services/redeploy", function (req, res) {
		initBLModel(req, res, cloudDeployBL, dbModel, function (BL) {
			BL.redeployService(config, req.soajs, res);
		});
	});

	/**
	* Scale an existing service deployment
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/cloud/services/scale", function (req, res) {
		initBLModel(req, res, cloudServicesBL, dbModel, function (BL) {
			BL.scaleService(config, req.soajs, res);
		});
	});

	/**
	* Delete an existing deployment
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/cloud/services/delete", function (req, res) {
		initBLModel(req, res, cloudServicesBL, dbModel, function (BL) {
			BL.deleteService(config, req.soajs, res);
		});
	});

	/**
	* Perform maintenance operations on services deployed in container mode
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/cloud/services/maintenance", function (req, res) {
		initBLModel(req, res, cloudMaintenanceBL, dbModel, function (BL) {
			BL.maintenance(config, req.soajs, res);
		});
	});

	/**
	* Get container logs
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/cloud/services/instances/logs", function (req, res) {
		initBLModel(req, res, cloudMaintenanceBL, dbModel, function (BL) {
			BL.streamLogs(config, req.soajs, res);
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
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.login(config, req, res);
		});
	});

	/**
	* Delete an existing git account
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/gitAccounts/logout", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.logout(config, req, res);
		});
	});

	/**
	* List all available git accounts
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/gitAccounts/accounts/list", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.listAccounts(config, req, res);
		});
	});

	/**
	* Get git account repositories
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/gitAccounts/getRepos", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.getRepos(config, req, res);
		});
	});

	/**
	* Get file content from a repository, restricted to YAML files
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/gitAccounts/getYaml", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.getFile(config, req, res);
		});
	});

	/**
	* Get repository barnches
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/gitAccounts/getBranches", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.getBranches(config, req, res);
		});
	});

	/**
	* Activate a repository
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/gitAccounts/repo/activate", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.activateRepo(config, req, res);
		});
	});

	/**
	* Deactivate a repository
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put('/gitAccounts/repo/deactivate', function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.deactivateRepo(config, req, res);
		});
	});

	/**
	* Sync an active repository
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put('/gitAccounts/repo/sync', function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.syncRepo(config, req, res);
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
		initBLModel(req, res, servicesBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});

	/**
	* Get all environments where a specific service is deployed
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/services/env/list", function (req, res) {
		initBLModel(req, res, hostBL, dbModel, function (BL) {
			BL.listHostEnv(config, req.soajs, res);
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
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});

	/**
	* List available daemon group configurations
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/daemons/groupConfig/list", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.listGroupConfig(config, req, res);
		});
	});

	/**
	* Add a new group configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/daemons/groupConfig/add", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.addGroupConfig(config, req, res);
		});
	});

	/**
	* Update an exiting daemon group configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/daemons/groupConfig/update", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.updateGroupConfig(config, req, res);
		});
	});

	/**
	* Delete a group configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.delete("/daemons/groupConfig/delete", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.deleteGroupConfig(config, req, res);
		});
	});

	/**
	* Update the service configuration of a specific group configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/daemons/groupConfig/serviceConfig/update", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.updateServiceConfig(config, req, res);
		});
	});

	/**
	* List service configurations per group configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/daemons/groupConfig/serviceConfig/list", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.listServiceConfig(config, req, res);
		});
	});

	/**
	* Update list of tenant external keys per group configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/daemons/groupConfig/tenantExtKeys/update", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.updateTenantExtKeys(config, req, res);
		});
	});

	/**
	* List tenant external keys per group configuration
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/daemons/groupConfig/tenantExtKeys/list", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.listTenantExtKeys(config, req, res);
		});
	});

	/**
	 * Static Content features
	 */

	 /**
 	* List available static content
 	* @param {String} API route
 	* @param {Function} API middleware
 	*/
	service.post("/staticContent/list", function (req, res) {
		initBLModel(req, res, staticContentBL, dbModel, function (BL) {
			BL.list(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.update(config, req, res);
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
			initBLModel(req, res, environmentBL, dbModel, function (BL) {
				BL.list(config, req, res, function (environments) {
					initBLModel(req, res, tenantBL, dbModel, function (BL1) {
						BL1.get(config, req, res, function (tenant) {
							return res.jsonp(req.soajs.buildResponse(null, {'tenant': tenant, 'environments': environments}));
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.getOAuth(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.saveOAuth(config, 425, 'tenant OAuth add successful', req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.saveOAuth(config, 426, 'tenant OAuth update successful', req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.deleteOAuth(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.getOAuthUsers(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.deleteOAuthUsers(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.addOAuthUsers(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.updateOAuthUsers(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.listApplication(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.createApplicationKey(config, service.provision, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.getApplicationKeys(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.deleteApplicationKey(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.listApplicationExtKeys(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.addApplicationExtKeys(config, service.provision, service.registry, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.updateApplicationExtKeys(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.deleteApplicationExtKeys(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.updateApplicationConfig(config, req, res);
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
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.listApplicationConfig(config, req, res);
			});
		});
	});

	/**
	 * content builder features
	 */

	/**
 	* List available content builders
 	* @param {String} API route
 	* @param {Function} API middleware
 	*/
	service.get("/cb/list", function (req, res) {
		initBLModel(req, res, cbBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});

	/**
	* Get a specific content builder
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/cb/get", function (req, res) {
		initBLModel(req, res, cbBL, dbModel, function (BL) {
			BL.get(config, req, res);
		});
	});

	/**
	* List revisions of a specific content builder
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.get("/cb/listRevisions", function (req, res) {
		initBLModel(req, res, cbBL, dbModel, function (BL) {
			BL.revisions(config, req, res);
		});
	});

	/**
	* Add a new content builder
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/cb/add", function (req, res) {
		initBLModel(req, res, cbBL, dbModel, function (BL) {
			BL.add(config, req, res);
		});
	});

	/**
	* Update an existing content builder
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.put("/cb/update", function (req, res) {
		initBLModel(req, res, cbBL, dbModel, function (BL) {
			BL.update(config, req, res);
		});
	});

	/**
	* Simulation api that mimics a service api behavior used by swagger feature.
	* Api takes a yaml input and simulate the imfv validation of a requested service API
	* @param {String} API route
	* @param {Function} API middleware
	*/
	service.post("/swagger/simulate", function (req, res) {
		initBLModel(req, res, swaggerBL, dbModel, function (BL) {
		 	BL.test(config, req, res);
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
		initBLModel(req, res, swaggerBL, dbModel, function (BL) {
			BL.generate(config, req, res);
		});
	});

	/**
	 * Service Start
	 */
	service.start();
});
