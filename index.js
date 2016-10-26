'use strict';
var request = require('request');
var soajs = require('soajs');
var Mongo = soajs.mongo;
var mongo = null;

var config = require('./config.js');
var environment = require('./lib/environment.js');
var product = require('./lib/product.js');
var tenant = require('./lib/tenant.js');

var hostBL = require("./lib/host.js");
var tenantBL = require("./lib/tenant.js");
var productBL = require('./lib/product.js');
var servicesBL = require("./lib/services.js");
var daemonsBL = require("./lib/daemons.js");
var staticContentBL = require('./lib/staticContent.js');
var gitAccountsBL = require("./lib/git.js");
var environmentBL = require('./lib/environment.js');

var gitAccounts = require("./lib/git.js");
var services = require("./lib/services.js");
var daemons = require("./lib/daemons.js");
var staticContent = require('./lib/staticContent.js');
var cb = require("./lib/contentbuilder.js");

var dbModel = "mongo";

var servicesCollectionName = 'services';
var daemonsCollectionName = 'daemons';
var staticContentCollectionName = 'staticContent';
var groupConfigCollectionName = 'daemon_grpconf';
var environmentCollectionName = 'environment';
var gridfsCollectionName = 'fs.files';
var tenantCollectionName = 'tenants';
var productsCollectionName = 'products';
var dashExtKeysCollectionName = 'dashboard_extKeys';
var hostsCollectionName = 'hosts';
var oauthUracCollectionName = 'oauth_urac';
var gitAccountsCollectionName = 'git_accounts';
var dockerCollectionName = 'docker';
var gcCollectionName = 'gc';

var service = new soajs.server.service(config);
function checkForMongo(req) {
	if (!mongo) {
		mongo = new Mongo(req.soajs.registry.coreDB.provision);

		//services
		mongo.ensureIndex(servicesCollectionName, {port: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {'src.owner': 1, 'src.repo': 1}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {name: 1, port: 1, 'src.owner': 1, 'src.repo': 1}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {gcId: 1}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {name: 1, gcId: 1}, errorLogger);
		mongo.ensureIndex(servicesCollectionName, {port: 1, gcId: 1}, errorLogger);

		//daemons
		mongo.ensureIndex(daemonsCollectionName, {name: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(daemonsCollectionName, {port: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(daemonsCollectionName, {name: 1, port: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(daemonsCollectionName, {'src.owner': 1, 'src.repo': 1}, errorLogger);
		mongo.ensureIndex(daemonsCollectionName, {name: 1, port: 1, 'src.owner': 1, 'src.repo': 1}, errorLogger);

		//staticContent
		mongo.ensureIndex(staticContentCollectionName, {name: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(staticContentCollectionName, {'src.owner': 1, 'src.repo': 1}, errorLogger);
		mongo.ensureIndex(staticContentCollectionName, {name: 1, 'src.owner': 1, 'src.repo': 1}, errorLogger);

		//daemon_grpconf
		mongo.ensureIndex(groupConfigCollectionName, {daemon: 1}, errorLogger);
		mongo.ensureIndex(groupConfigCollectionName, {name: 1}, errorLogger);

		//environment
		mongo.ensureIndex(environmentCollectionName, {locked: 1}, errorLogger);

		//fs.files
		mongo.ensureIndex(gridfsCollectionName, {filename: 1}, {unique: true}, errorLogger);
		mongo.ensureIndex(gridfsCollectionName, {filename: 1, 'metadata.type': 1}, errorLogger);
		mongo.ensureIndex(gridfsCollectionName, {'metadata.type': 1}, errorLogger);
		mongo.ensureIndex(gridfsCollectionName, {'metadata.env': 1}, errorLogger);

		//tenants
		mongo.ensureIndex(tenantCollectionName, {_id: 1, locked: 1}, errorLogger);
		mongo.ensureIndex(tenantCollectionName, {name: 1}, errorLogger);
		mongo.ensureIndex(tenantCollectionName, {type: 1}, errorLogger);
		mongo.ensureIndex(tenantCollectionName, {'application.keys.extKeys.env': 1}, errorLogger);

		//products
		mongo.ensureIndex(productsCollectionName, {code: 1, "packages.code": 1}, errorLogger);

		//dashboard_extKeys
		mongo.ensureIndex(dashExtKeysCollectionName, {env: 1}, errorLogger);
		mongo.ensureIndex(dashExtKeysCollectionName, {code: 1, env: 1}, errorLogger);
		mongo.ensureIndex(dashExtKeysCollectionName, {code: 1, key: 1, env: 1}, errorLogger);

		//hosts
		mongo.ensureIndex(hostsCollectionName, {_id: 1, locked: 1}, errorLogger);
		mongo.ensureIndex(hostsCollectionName, {env: 1, name: 1, hostname: 1}, errorLogger);
		mongo.ensureIndex(hostsCollectionName, {env: 1, name: 1, ip: 1, hostname: 1}, errorLogger);
		mongo.ensureIndex(hostsCollectionName, {env: 1, type: 1, running: 1}, errorLogger);

		//oauth_urac
		mongo.ensureIndex(oauthUracCollectionName, {tId: 1, _id: 1}, errorLogger);
		mongo.ensureIndex(oauthUracCollectionName, {tId: 1, userId: 1, _id: 1}, errorLogger);

		//git_accounts
		mongo.ensureIndex(gitAccountsCollectionName, {_id: 1, 'repos.name': 1}, errorLogger);
		mongo.ensureIndex(gitAccountsCollectionName, {'repos.name': 1}, errorLogger);
		mongo.ensureIndex(gitAccountsCollectionName, {owner: 1, provider: 1}, errorLogger);

		//docker
		mongo.ensureIndex(dockerCollectionName, {cid: 1}, errorLogger);
		mongo.ensureIndex(dockerCollectionName, {env: 1, hostname: 1}, errorLogger);
		mongo.ensureIndex(dockerCollectionName, {env: 1, cid: 1}, errorLogger);
		mongo.ensureIndex(dockerCollectionName, {env: 1, running: 1}, errorLogger);
		mongo.ensureIndex(dockerCollectionName, {env: 1, type: 1, running: 1}, errorLogger);

		//gc
		mongo.ensureIndex(gcCollectionName, {name: 1}, errorLogger);
		mongo.ensureIndex(gcCollectionName, {_id: 1, refId: 1, v: 1}, errorLogger);
	}

	function errorLogger(error) {
		if (error) {
			return req.soajs.log.error(error);
		}
	}
}

function checkMyAccess(req, res, cb) {
	if (!req.soajs.session || !req.soajs.session.getUrac()) {
		return res.jsonp(req.soajs.buildResponse({"code": 601, "msg": config.errors[601]}));
	}
	var myTenant = req.soajs.session.getUrac().tenant;
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
	service.post("/environment/add", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.add(config, req, res);
		});
	});
	service.get("/environment/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.delete(config, req, res);
		});
	});
	service.post("/environment/update", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.update(config, req, res);
		});
	});
	service.get("/environment/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});
	service.post("/environment/key/update", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.keyUpdate(config, req, res);
		});
	});

	service.get("/environment/dbs/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.listDbs(config, req, res);
		});
	});
	service.get("/environment/dbs/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.deleteDb(config, req, res);
		});
	});
	service.post("/environment/dbs/add", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.addDb(config, req, res);
		});
	});
	service.post("/environment/dbs/update", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.updateDb(config, req, res);
		});
	});

	service.post("/environment/dbs/updatePrefix", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.updateDbsPrefix(config, req, res);
		});
	});

	service.post("/environment/clusters/add", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.addCluster(config, req, res);
		});
	});
	service.get("/environment/clusters/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.deleteCluster(config, req, res);
		});
	});
	service.post("/environment/clusters/update", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.updateCluster(config, req, res);
		});
	});
	service.get("/environment/clusters/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.listClusters(config, req, res);
		});
	});
	service.get("/environment/platforms/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.listPlatforms(config, req, res);
		});
	});
	service.post("/environment/platforms/cert/upload", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.uploadCerts(config, req, res);
		});
	});
	service.get("/environment/platforms/cert/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.removeCert(config, req, res);
		});
	});
	service.post("/environment/platforms/cert/choose", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.chooseExistingCerts(config, req, res);
		});
	});
	service.post("/environment/platforms/driver/changeSelected", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.changeSelectedDriver(config, req, res);
		});
	});
	service.post("/environment/platforms/deployer/type/change", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.changeDeployerType(config, req, res);
		});
	});
	service.post("/environment/nginx/cert/upload", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.uploadCerts(config, req, res);
		});
	});
	service.get("/environment/nginx/cert/list", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.listNginxCerts(config, req, res);
		});
	});
	service.get("/environment/nginx/cert/delete", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.removeNginxCert(config, req, res);
		});
	});
	service.post("/environment/nginx/cert/choose", function (req, res) {
		initBLModel(req, res, environmentBL, dbModel, function (BL) {
			BL.chooseExistingNginxCerts(config, req, res);
		});
	});

	/**
	 * Products features
	 */
	service.post("/product/add", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.add(config, req, res);
		});
	});
	service.get("/product/delete", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.delete(config, req, res);
		});
	});
	service.post("/product/update", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.update(config, req, res);
		});
	});
	service.get("/product/list", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});
	service.get("/product/get", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.get(config, req, res);
		});
	});

	service.get("/product/packages/get", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.getPackage(config, req, res);
		});
	});
	service.get("/product/packages/list", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.listPackage(config, req, res);
		});
	});
	service.post("/product/packages/add", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.addPackage(config, req, res);
		});
	});
	service.post("/product/packages/update", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.updatePackage(config, req, res);
		});
	});
	service.get("/product/packages/delete", function (req, res) {
		initBLModel(req, res, productBL, dbModel, function (BL) {
			BL.deletePackage(config, req, res);
		});
	});

	/**
	 * Tenants features
	 */
	service.post("/tenant/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.add(config, req, res);
		});
	});

	service.get("/tenant/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.delete(config, req, res);
		});
	});

	service.get("/tenant/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});

	service.post("/tenant/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.update(config, req, res);
		});
	});

	service.get("/tenant/get", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.get(config, req, res);
		});
	});

	service.get("/tenant/oauth/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.getOAuth(config, req, res);
		});
	});

	service.post("/tenant/oauth/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.saveOAuth(config, 425, 'tenant OAuth add successful', req, res);
		});
	});

	service.post("/tenant/oauth/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.saveOAuth(config, 426, 'tenant OAuth update successful', req, res);
		});
	});

	service.get("/tenant/oauth/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteOAuth(config, req, res);
		});
	});

	service.get("/tenant/oauth/users/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.getOAuthUsers(config, req, res);
		});
	});

	service.get("/tenant/oauth/users/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteOAuthUsers(config, req, res);
		});
	});

	service.post("/tenant/oauth/users/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.addOAuthUsers(config, req, res);
		});
	});

	service.post("/tenant/oauth/users/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.updateOAuthUsers(config, req, res);
		});
	});

	service.get("/tenant/application/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.listApplication(config, req, res);
		});
	});

	service.post("/tenant/application/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.addApplication(config, req, res);
		});
	});

	service.post("/tenant/application/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.updateApplication(config, req, res);
		});
	});

	service.get("/tenant/application/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteApplication(config, req, res);
		});
	});

	service.post("/tenant/acl/get", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.getTenantAcl(config, req, res);
		});
	});

	service.post("/tenant/application/key/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.createApplicationKey(config, service.provision, req, res);
		});
	});

	service.get("/tenant/application/key/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.getApplicationKeys(config, req, res);
		});
	});

	service.get("/tenant/application/key/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteApplicationKey(config, req, res);
		});
	});

	service.get("/tenant/application/key/ext/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.listApplicationExtKeys(config, req, res);
		});
	});

	service.post("/tenant/application/key/ext/add", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.addApplicationExtKeys(config, service.provision, service.registry, req, res);
		});
	});

	service.post("/tenant/application/key/ext/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.updateApplicationExtKeys(config, req, res);
		});
	});

	service.post("/tenant/application/key/ext/delete", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.deleteApplicationExtKeys(config, req, res);
		});
	});

	service.post("/tenant/application/key/config/update", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.updateApplicationConfig(config, req, res);
		});
	});

	service.get("/tenant/application/key/config/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.listApplicationConfig(config, req, res);
		});
	});

	service.get("/key/get", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.extKeyGet(config, req, res);
		});
	});

	service.get("/permissions/get", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.permissionsGet(config, req, res);
		});
	});

	/**
	 * Dashboard Keys
	 */
	service.get("/tenant/db/keys/list", function (req, res) {
		initBLModel(req, res, tenantBL, dbModel, function (BL) {
			BL.listDashboardKeys(config, req, res);
		});
	});

	/**
	 * Hosts features
	 */
	service.get("/hosts/list", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.list(config, req.soajs, res);
		});
	});
	service.get("/hosts/nginx/list", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.listNginx(config, req.soajs, res);
		});
	});

	service.post("/hosts/nginx/redeploy", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.redeployNginx(config, req.soajs, res);
		});
	});

	service.get("/hosts/delete", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.delete(config, req.soajs, res);
		});
	});
	service.post("/hosts/maintenanceOperation", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.maintenanceOperation(config, req.soajs, res);
		});
	});
	service.post("/hosts/deployController", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			if(req.soajs.inputmaskData.haService) {
				req.soajs.customData = {
					type: 'controller'
				};
				BL.deployService(config, req.soajs, res);
			}
			else {
				BL.deployController(config, req.soajs, res);
			}
		});
	});
	service.post("/hosts/deployNginx", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.nginx(config, req.soajs, true, res);
		});
	});
	service.post("/hosts/updateNginx", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.nginx(config, req.soajs, false, res);
		});
	});
	service.post("/hosts/deployService", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.deployService(config, req.soajs, res);
		});
	});
	service.post("/hosts/deployDaemon", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.deployDaemon(config, req.soajs, res);
		});
	});
	service.get("/hosts/container/logs", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.getContainerLogs(config, req.soajs, res);
		});
	});
	service.get("/hosts/container/delete", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.deleteContainer(config, req.soajs, res);
		});
	});
	service.get("/hosts/container/zombie/list", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.getContainersNoHost(config, req.soajs, res);
		});
	});
	service.get("/hosts/container/zombie/delete", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.deleteContainer(config, req.soajs, res);
		});
	});

	/**
	 * High Availability Cloud features
	 */
	service.get("/hacloud/nodes/list", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.listNodes(config, req.soajs, res);
		});
	});
	service.post("/hacloud/nodes/add", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.addNode(config, req.soajs, res);
		});
	});
	service.get("/hacloud/nodes/remove", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.removeNode(config, req.soajs, res);
		});
	});
	service.post("/hacloud/nodes/update", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.updateNode(config, req.soajs, res);
		});
	});

	service.post("/hacloud/services/scale", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.scaleHAService(config, req.soajs, res);
		});
	});
	service.get("/hacloud/services/delete", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.deleteHAService(config, req.soajs, res);
		});
	});

	service.get("/hacloud/services/instances/logs", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.streamLogs(config, req.soajs, res);
		});
	});

	/**
	 * Analytics Features
	 */
	service.get("/analytics/check", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.checkAnalytics(config, req.soajs, res);
		});
	});

	service.post("/analytics/activate", function (req, res) {
		initBLModel(req, res, hostBL, "host", function (BL) {
			BL.activateAnalytics(config, req.soajs, res);
		});
	});

	/**
	 * Github App features
	 */
	service.post("/gitAccounts/login", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.login(config, req, res);
		});
	});
	service.get("/gitAccounts/logout", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.logout(config, req, res);
		});
	});
	service.get("/gitAccounts/accounts/list", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.listAccounts(config, req, res);
		});
	});
	service.get("/gitAccounts/getRepos", function (req, res) {
		checkForMongo(req);
		gitAccounts.getRepos(mongo, config, req, res);
	});
	service.get("/gitAccounts/getBranches", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.getBranches(config, req, res);
		});
	});
	service.post("/gitAccounts/repo/activate", function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.activateRepo(config, req, res);
		});
	});
	service.get('/gitAccounts/repo/deactivate', function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.deactivateRepo(config, req, res);
		});
	});
	service.post('/gitAccounts/repo/sync', function (req, res) {
		initBLModel(req, res, gitAccountsBL, dbModel, function (BL) {
			BL.syncRepo(config, req, res);
		});
	});

	/**
	 * Services features
	 */
	service.post("/services/list", function (req, res) {
		initBLModel(req, res, servicesBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});
	/**
	 * Daemons features
	 */
	service.post("/daemons/list", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});
	service.post("/daemons/groupConfig/list", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.listGroupConfig(config, req, res);
		});
	});
	service.post("/daemons/groupConfig/add", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.addGroupConfig(config, req, res);
		});
	});
	service.post("/daemons/groupConfig/update", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.updateGroupConfig(config, req, res);
		});
	});
	service.get("/daemons/groupConfig/delete", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.deleteGroupConfig(config, req, res);
		});
	});
	service.post("/daemons/groupConfig/serviceConfig/update", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.updateServiceConfig(config, req, res);
		});
	});
	service.get("/daemons/groupConfig/serviceConfig/list", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.listServiceConfig(config, req, res);
		});
	});
	service.post("/daemons/groupConfig/tenantExtKeys/update", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.updateTenantExtKeys(config, req, res);
		});
	});
	service.get("/daemons/groupConfig/tenantExtKeys/list", function (req, res) {
		initBLModel(req, res, daemonsBL, dbModel, function (BL) {
			BL.listTenantExtKeys(config, req, res);
		});
	});
	/**
	 * Static Content features
	 */
	service.post("/staticContent/list", function (req, res) {
		initBLModel(req, res, staticContentBL, dbModel, function (BL) {
			BL.list(config, req, res);
		});
	});

	/**
	 * Settings features
	 */
	service.post("/settings/tenant/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.update(config, req, res);
			});
		});
	});
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

	service.get("/settings/tenant/oauth/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.getOAuth(config, req, res);
			});
		});
	});
	service.post("/settings/tenant/oauth/add", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.saveOAuth(config, 425, 'tenant OAuth add successful', req, res);
			});
		});
	});
	service.post("/settings/tenant/oauth/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.saveOAuth(config, 426, 'tenant OAuth update successful', req, res);
			});
		});
	});
	service.get("/settings/tenant/oauth/delete", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.deleteOAuth(config, req, res);
			});
		});
	});

	service.get("/settings/tenant/oauth/users/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.getOAuthUsers(config, req, res);
			});
		});
	});
	service.get("/settings/tenant/oauth/users/delete", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.deleteOAuthUsers(config, req, res);
			});
		});
	});
	service.post("/settings/tenant/oauth/users/add", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.addOAuthUsers(config, req, res);
			});
		});
	});
	service.post("/settings/tenant/oauth/users/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.updateOAuthUsers(config, req, res);
			});
		});
	});

	service.get("/settings/tenant/application/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.listApplication(config, req, res);
			});
		});
	});

	service.post("/settings/tenant/application/key/add", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.createApplicationKey(config, service.provision, req, res);
			});
		});
	});
	service.get("/settings/tenant/application/key/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.getApplicationKeys(config, req, res);
			});
		});
	});
	service.get("/settings/tenant/application/key/delete", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.deleteApplicationKey(config, req, res);
			});
		});
	});

	service.get("/settings/tenant/application/key/ext/list", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.listApplicationExtKeys(config, req, res);
			});
		});
	});
	service.post("/settings/tenant/application/key/ext/add", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.addApplicationExtKeys(config, service.provision, service.registry, req, res);
			});
		});
	});
	service.post("/settings/tenant/application/key/ext/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.updateApplicationExtKeys(config, req, res);
			});
		});
	});
	service.post("/settings/tenant/application/key/ext/delete", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.deleteApplicationExtKeys(config, req, res);
			});
		});
	});

	service.post("/settings/tenant/application/key/config/update", function (req, res) {
		checkMyAccess(req, res, function () {
			initBLModel(req, res, tenantBL, dbModel, function (BL) {
				BL.updateApplicationConfig(config, req, res);
			});
		});
	});
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
	service.get("/cb/list", function (req, res) {
		checkForMongo(req);
		cb.list(config, mongo, req, res);
	});
	service.get("/cb/get", function (req, res) {
		checkForMongo(req);
		cb.get(config, mongo, req, res);
	});
	service.get("/cb/listRevisions", function (req, res) {
		checkForMongo(req);
		cb.revisions(config, mongo, req, res);
	});
	service.post("/cb/add", function (req, res) {
		checkForMongo(req);
		cb.add(config, mongo, req, res);
	});
	service.post("/cb/update", function (req, res) {
		checkForMongo(req);
		cb.update(config, mongo, req, res);
	});

	/**
	 * Service Start
	 */
	service.start();
});
