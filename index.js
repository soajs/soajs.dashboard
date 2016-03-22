'use strict';
var request = require('request');
var soajs = require('soajs');
var Mongo = soajs.mongo;
var mongo = null;

var config = require('./config.js');
var environment = require('./lib/environment.js');
var product = require('./lib/product.js');
var tenant = require('./lib/tenant.js');
var host = require("./lib/host.js");
var github = require("./lib/github.js");
var services = require("./lib/services.js");
var daemons = require("./lib/daemons.js");
var staticContent = require('./lib/staticContent.js');
var cb = require("./lib/contentbuilder.js");

var service = new soajs.server.service({
	"oauth": false,
	"session": true,
	"security": true,
	"multitenant": true,
	"acl": true,
    "roaming": true,
	"config": config
});

function checkForMongo(req) {
	if(!mongo) {
		mongo = new Mongo(req.soajs.registry.coreDB.provision);
	}
}

function checkMyAccess(req, res, cb) {
	if(!req.soajs.session || !req.soajs.session.getUrac()) {
		return res.jsonp(req.soajs.buildResponse({"code": 601, "msg": config.errors[601]}));
	}
	var myTenant = req.soajs.session.getUrac().tenant;
	if(!myTenant || !myTenant.id) {
		return res.jsonp(req.soajs.buildResponse({"code": 608, "msg": config.errors[608]}));
	}
	else {
		req.soajs.inputmaskData.id = myTenant.id.toString();
		return cb();
	}
}

service.init(function() {
	/**
	 * Environments features
	 */
	service.post("/environment/add", function(req, res) {
		checkForMongo(req);
		environment.add(config, mongo, req, res);
	});
	service.get("/environment/delete", function(req, res) {
		checkForMongo(req);
		environment.delete(config, mongo, req, res);
	});
	service.post("/environment/update", function(req, res) {
		checkForMongo(req);
		environment.update(config, mongo, req, res);
	});
	service.get("/environment/list", function(req, res) {
		checkForMongo(req);
		environment.list(config, mongo, req, res);
	});
	service.post("/environment/key/update", function(req, res) {
		checkForMongo(req);
		environment.keyUpdate(config, mongo, req, res);
	});

	service.get("/environment/dbs/list", function(req, res) {
		checkForMongo(req);
		environment.listDbs(config, mongo, req, res);
	});
	service.get("/environment/dbs/delete", function(req, res) {
		checkForMongo(req);
		environment.deleteDb(config, mongo, req, res);
	});
	service.post("/environment/dbs/add", function(req, res) {
		checkForMongo(req);
		environment.addDb(config, mongo, req, res);
	});
	service.post("/environment/dbs/update", function(req, res) {
		checkForMongo(req);
		environment.updateDb(config, mongo, req, res);
	});

	service.post("/environment/dbs/updatePrefix", function(req, res) {
		checkForMongo(req);
		environment.updateDbsPrefix(config, mongo, req, res);
	});

	service.post("/environment/clusters/add", function(req, res) {
		checkForMongo(req);
		environment.addCluster(config, mongo, req, res);
	});
	service.get("/environment/clusters/delete", function(req, res) {
		checkForMongo(req);
		environment.deleteCluster(config, mongo, req, res);
	});
	service.post("/environment/clusters/update", function(req, res) {
		checkForMongo(req);
		environment.updateCluster(config, mongo, req, res);
	});
	service.get("/environment/clusters/list", function(req, res) {
		checkForMongo(req);
		environment.listClusters(config, mongo, req, res);
	});
	service.get("/environment/platforms/list", function (req, res) {
		checkForMongo(req);
		environment.listPlatforms(config, mongo, req, res);
	});
	service.post("/environment/platforms/cert/upload", function (req, res) {
		checkForMongo(req);
		environment.uploadCerts(config, mongo, req, res);
	});
	service.get("/environment/platforms/cert/delete", function (req, res) {
		checkForMongo(req);
		environment.removeCert(config, mongo, req, res);
	});
	service.post("/environment/platforms/cert/choose", function (req, res) {
		checkForMongo(req);
		environment.chooseExistingCerts(config, mongo, req, res);
	});
	service.post("/environment/platforms/driver/add", function (req, res) {
		checkForMongo(req);
		environment.addDriver(config, mongo, req, res);
	});
	service.post('/environment/platforms/driver/edit', function (req, res) {
		checkForMongo(req);
		environment.editDriver(config, mongo, req, res);
	});
	service.get("/environment/platforms/driver/delete", function (req, res) {
		checkForMongo(req);
		environment.deleteDriver(config, mongo, req, res);
	});
	service.post("/environment/platforms/driver/changeSelected", function (req, res) {
		checkForMongo(req);
		environment.changeSelectedDriver(config, mongo, req, res);
	});
	service.post("/environment/platforms/deployer/type/change", function (req, res) {
		checkForMongo(req);
		environment.changeDeployerType(config, mongo , req, res);
	});

	/**
	 * Products features
	 */
	service.post("/product/add", function(req, res) {
		checkForMongo(req);
		product.add(config, mongo, req, res);
	});
	service.get("/product/delete", function(req, res) {
		checkForMongo(req);
		product.delete(config, mongo, req, res);
	});
	service.post("/product/update", function(req, res) {
		checkForMongo(req);
		product.update(config, mongo, req, res);
	});
	service.get("/product/list", function(req, res) {
		checkForMongo(req);
		product.list(config, mongo, req, res);
	});
	service.get("/product/get", function(req, res) {
		checkForMongo(req);
		product.get(config, mongo, req, res);
	});

	service.get("/product/packages/get", function(req, res) {
		checkForMongo(req);
		product.getPackage(config, mongo, req, res);
	});
	service.get("/product/packages/list", function(req, res) {
		checkForMongo(req);
		product.listPackage(config, mongo, req, res);
	});
	service.post("/product/packages/add", function(req, res) {
		checkForMongo(req);
		product.addPackage(config, mongo, req, res);
	});
	service.post("/product/packages/update", function(req, res) {
		checkForMongo(req);
		product.updatePackage(config, mongo, req, res);
	});
	service.get("/product/packages/delete", function(req, res) {
		checkForMongo(req);
		product.deletePackage(config, mongo, req, res);
	});

	/**
	 * Tenants features
	 */
	service.post("/tenant/add", function(req, res) {
		checkForMongo(req);
		tenant.add(config, mongo, req, res);
	});
	service.get("/tenant/delete", function(req, res) {
		checkForMongo(req);
		tenant.delete(config, mongo, req, res);
	});
	service.get("/tenant/list", function(req, res) {
		checkForMongo(req);
		tenant.list(config, mongo, req, res);
	});
	service.post("/tenant/update", function(req, res) {
		checkForMongo(req);
		tenant.update(config, mongo, req, res);
	});
	service.get("/tenant/get", function(req, res) {
		checkForMongo(req);
		tenant.get(config, mongo, req, res);
	});

	service.get("/tenant/oauth/list", function(req, res) {
		checkForMongo(req);
		tenant.getOAuth(config, mongo, req, res);
	});
	service.post("/tenant/oauth/add", function(req, res) {
		checkForMongo(req);
		tenant.saveOAuth(config, 425, 'tenant OAuth add successful', mongo, req, res);
	});
	service.post("/tenant/oauth/update", function(req, res) {
		checkForMongo(req);
		tenant.saveOAuth(config, 426, 'tenant OAuth update successful', mongo, req, res);
	});
	service.get("/tenant/oauth/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteOAuth(config, mongo, req, res);
	});

	service.get("/tenant/oauth/users/list", function(req, res) {
		checkForMongo(req);
		tenant.getOAuthUsers(config, mongo, req, res);
	});
	service.get("/tenant/oauth/users/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteOAuthUsers(config, mongo, req, res);
	});
	service.post("/tenant/oauth/users/add", function(req, res) {
		checkForMongo(req);
		tenant.addOAuthUsers(config, mongo, req, res);
	});
	service.post("/tenant/oauth/users/update", function(req, res) {
		checkForMongo(req);
		tenant.updateOAuthUsers(config, mongo, req, res);
	});

	service.get("/tenant/application/list", function(req, res) {
		checkForMongo(req);
		tenant.listApplication(config, mongo, req, res);
	});
	service.post("/tenant/application/add", function(req, res) {
		checkForMongo(req);
		tenant.addApplication(config, mongo, req, res);
	});
	service.post("/tenant/application/update", function(req, res) {
		checkForMongo(req);
		tenant.updateApplication(config, mongo, req, res);
	});
	service.get("/tenant/application/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteApplication(config, mongo, req, res);
	});

	service.post("/tenant/acl/get", function(req, res) {
		checkForMongo(req);
		tenant.getTenantAcl(config, mongo, req, res);
	});
	service.post("/tenant/application/key/add", function(req, res) {
		checkForMongo(req);
		tenant.createApplicationKey(config, mongo, req, res);
	});
	service.get("/tenant/application/key/list", function(req, res) {
		checkForMongo(req);
		tenant.getApplicationKeys(config, mongo, req, res);
	});
	service.get("/tenant/application/key/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteApplicationKey(config, mongo, req, res);
	});

	service.get("/tenant/application/key/ext/list", function(req, res) {
		checkForMongo(req);
		tenant.listApplicationExtKeys(config, mongo, req, res);
	});
	service.post("/tenant/application/key/ext/add", function(req, res) {
		checkForMongo(req);
		tenant.addApplicationExtKeys(config, mongo, req, res);
	});
	service.post("/tenant/application/key/ext/update", function(req, res) {
		checkForMongo(req);
		tenant.updateApplicationExtKeys(config, mongo, req, res);
	});
	service.post("/tenant/application/key/ext/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteApplicationExtKeys(config, mongo, req, res);
	});

	service.post("/tenant/application/key/config/update", function(req, res) {
		checkForMongo(req);
		tenant.updateApplicationConfig(config, mongo, req, res);
	});
	service.get("/tenant/application/key/config/list", function(req, res) {
		checkForMongo(req);
		tenant.listApplicationConfig(config, mongo, req, res);
	});

	service.get("/key/get", function(req, res) {
		checkForMongo(req);
		tenant.extKeyGet(config, mongo, req, res);
	});

    service.get("/permissions/get", function(req, res) {
        checkForMongo(req);
        tenant.permissionsGet(config, mongo, req, res);
    });

    /**
     * Dashboard Keys
     */
    service.get("/tenant/db/keys/list", function(req, res){
        checkForMongo(req);
        tenant.listDashboardKeys(config, mongo, req, res);
    });

	/**
	 * Hosts features
	 */
	service.get("/hosts/list", function(req, res) {
		checkForMongo(req);
		host.list(config, mongo, req, res);
	});
	service.get("/hosts/delete", function(req, res) {
		checkForMongo(req);
		host.delete(config, mongo, req, res);
	});
	service.post("/hosts/maintenanceOperation", function(req, res) {
		checkForMongo(req);
		host.maintenanceOperation(config, mongo, req, res);
	});
	service.post("/hosts/deployController", function(req, res){
		checkForMongo(req);
		host.deployController(config, mongo, req, res);
	});

	service.post("/hosts/deployService", function(req, res){
		checkForMongo(req);
		host.deployService(config, mongo, req, res);
	});

	service.post("/hosts/deployDaemon", function (req, res) {
		checkForMongo(req);
		host.deployDaemon(config, mongo, req, res);
	});

	/**
	 * Github App features
	 */
	service.post("/github/login", function (req, res) {
		checkForMongo(req);
		github.login(mongo, config, req, res);
	});
	service.get("/github/logout", function (req, res) {
		checkForMongo(req);
		github.logout(mongo, config, req, res);
	});
	service.get("/github/accounts/list", function (req, res) {
		checkForMongo(req);
		github.listAccounts(mongo, config, req, res);
	});
	service.get("/github/getRepos", function (req, res) {
		checkForMongo(req);
		github.getRepos(mongo, config, req, res);
	});
	service.get("/github/getBranches", function (req, res) {
		checkForMongo(req);
		github.getBranches(mongo, config, req, res);
	});
	service.post("/github/repo/activate", function (req, res) {
		checkForMongo(req);
		github.activateRepo(mongo, config, req, res);
	});
	service.get('/github/repo/deactivate', function (req, res) {
		checkForMongo(req);
		github.deactivateRepo(mongo, config, req, res);
	});
	service.post('/github/repo/sync', function (req, res) {
		checkForMongo(req);
		github.syncRepo(mongo, config, req, res);
	});

	/**
	 * Services features
	 */
	service.post("/services/list", function(req, res) {
		checkForMongo(req);
		services.list(config, mongo, req, res);
	});
	service.post("/services/update", function(req, res) {
		checkForMongo(req);
		services.update(config, mongo, req, res);
	});

	service.post("/services/upload", function(req, res) {
		checkForMongo(req);
		services.upload(config, mongo, req, res);
	});

	/**
	 * Daemons features
	 */
	service.post("/daemons/list", function (req, res) {
		checkForMongo(req);
		daemons.list (config, mongo, req, res);
	});
	service.post("/daemons/add", function (req, res) {
		checkForMongo(req);
		daemons.add (config, mongo, req, res);
	});
	service.post("/daemons/update", function (req, res) {
		checkForMongo(req);
		daemons.update (config, mongo, req, res);
	});
	service.get("/daemons/delete", function (req, res) {
		checkForMongo(req);
		daemons.delete (config, mongo, req, res);
	});

	service.post("/daemons/groupConfig/list", function (req, res) {
		checkForMongo(req);
		daemons.listGroupConfig (config, mongo, req, res);
	});
	service.post("/daemons/groupConfig/add", function (req, res) {
		checkForMongo(req);
		daemons.addGroupConfig (config, mongo, req, res);
	});
	service.post("/daemons/groupConfig/update", function (req, res) {
		checkForMongo(req);
		daemons.updateGroupConfig (config, mongo, req, res);
	});
	service.get("/daemons/groupConfig/delete", function (req, res) {
		checkForMongo(req);
		daemons.deleteGroupConfig (config, mongo, req, res);
	});
	service.post("/daemons/groupConfig/serviceConfig/update", function (req, res) {
		checkForMongo(req);
		daemons.updateServiceConfig(config, mongo, req, res);
	});
	service.get("/daemons/groupConfig/serviceConfig/list", function (req, res) {
		checkForMongo(req);
		daemons.listServiceConfig(config, mongo, req, res);
	});
	service.post("/daemons/groupConfig/tenantExtKeys/update", function (req, res) {
		checkForMongo(req);
		daemons.updateTenantExtKeys(config, mongo, req, res);
	});
	service.get("/daemons/groupConfig/tenantExtKeys/list", function (req, res) {
		checkForMongo(req);
		daemons.listTenantExtKeys(config, mongo, req, res);
	});

	/**
	 * Static Content features
	 */
	service.post("/staticContent/list", function (req, res) {
		checkForMongo(req);
		staticContent.list(config, mongo, req, res);
	});
	service.post("/staticContent/add", function (req, res) {
		checkForMongo(req);
		staticContent.add(config, mongo, req, res);
	});
	service.post("/staticContent/update", function (req, res) {
		checkForMongo(req);
		staticContent.update(config, mongo, req, res);
	});
	service.get("/staticContent/delete", function (req, res) {
		checkForMongo(req);
		staticContent.delete(config, mongo, req, res);
	});

	/**
	 * Settings features
	 */
	service.post("/settings/tenant/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.update(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/get", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			environment.list(config, mongo, req, res, function(environments) {
				tenant.get(config, mongo, req, res, function(tenant) {
					return res.jsonp(req.soajs.buildResponse(null, {'tenant': tenant, 'environments': environments}));
				});
			});
		});
	});

	service.get("/settings/tenant/oauth/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.getOAuth(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/oauth/add", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.saveOAuth(config, 425, 'tenant OAuth add successful', mongo, req, res);
		});
	});
	service.post("/settings/tenant/oauth/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.saveOAuth(config, 426, 'tenant OAuth update successful', mongo, req, res);
		});
	});
	service.get("/settings/tenant/oauth/delete", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.deleteOAuth(config, mongo, req, res);
		});
	});

	service.get("/settings/tenant/oauth/users/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.getOAuthUsers(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/oauth/users/delete", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.deleteOAuthUsers(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/oauth/users/add", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.addOAuthUsers(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/oauth/users/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.updateOAuthUsers(config, mongo, req, res);
		});
	});

	service.get("/settings/tenant/application/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.listApplication(config, mongo, req, res);
		});
	});

	service.post("/settings/tenant/application/key/add", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.createApplicationKey(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/application/key/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.getApplicationKeys(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/application/key/delete", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.deleteApplicationKey(config, mongo, req, res);
		});
	});

	service.get("/settings/tenant/application/key/ext/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.listApplicationExtKeys(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/application/key/ext/add", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.addApplicationExtKeys(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/application/key/ext/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.updateApplicationExtKeys(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/application/key/ext/delete", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.deleteApplicationExtKeys(config, mongo, req, res);
		});
	});

	service.post("/settings/tenant/application/key/config/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.updateApplicationConfig(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/application/key/config/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.listApplicationConfig(config, mongo, req, res);
		});
	});

	/**
	 * content builder features
	 */
	service.get("/cb/list", function(req, res) {
		checkForMongo(req);
		cb.list(config, mongo, req, res);
	});
	service.get("/cb/get", function(req, res) {
		checkForMongo(req);
		cb.get(config, mongo, req, res);
	});
	service.get("/cb/listRevisions", function(req, res) {
		checkForMongo(req);
		cb.revisions(config, mongo, req, res);
	});
	service.post("/cb/add", function(req, res) {
		checkForMongo(req);
		cb.add(config, mongo, req, res);
	});
	service.post("/cb/update", function(req, res) {
		checkForMongo(req);
		cb.update(config, mongo, req, res);
	});

	/**
	 * Service Start
	 */
	service.start();
});