'use strict';
var soajs = require('soajs');
var Mongo = soajs.mongo;

var config = require('./config.js');

var environment = require('./environment.js');
var product = require('./product.js');
var tenant = require('./tenant.js');

var mongo = null;

var service = new soajs.server.service({
  "oauth": false,
  "session": true,
  "security": true,
  "multitenant": true,
  "acl": true,
  "config": config});

function checkForMongo(req){
	if(!mongo) {
		mongo = new Mongo(req.soajs.registry.coreDB.provision);
	}
}

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

service.post("/tenant/add", function(req, res) {
	checkForMongo(req);
  tenant.add(config, mongo, req, res);
});
service.get("/tenant/delete", function(req, res) {
	checkForMongo(req);
  tenant.delete(config, mongo, req, res);
});
service.post("/tenant/update", function(req, res) {
	checkForMongo(req);
  tenant.update(config, mongo, req, res);
});
service.get("/tenant/list", function(req, res) {
	checkForMongo(req);
  tenant.list(config, mongo, req, res);
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

service.get("/tenant/oauth/users/list", function(req, res){
	checkForMongo(req);
	tenant.getOAuthUsers(config, mongo, req, res);
});

service.get("/tenant/oauth/users/delete", function(req, res){
	checkForMongo(req);
	tenant.deleteOAuthUsers(config, mongo, req, res);
});

service.post("/tenant/oauth/users/add", function(req, res){
	checkForMongo(req);
	tenant.addOAuthUsers(config, mongo, req, res);
});

service.post("/tenant/oauth/users/update", function(req, res){
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

service.post("/services/list", function(req, res) {
	checkForMongo(req);
	var servicesColName = 'services';
	var serviceNames = req.soajs.inputmaskData.serviceNames;
	var criteria={};
	if(serviceNames){
		criteria = {'name': {$in: serviceNames}};
	}

	mongo.find(servicesColName, criteria ,function(err, records) {
		if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }
		var myRec=[];
		records.forEach(function(oneRecord) {
			myRec.push({
				name: oneRecord.name, apis: oneRecord.apis
			});
		});

		return res.jsonp(req.soajs.buildResponse(null, myRec));
	});

});

service.start();