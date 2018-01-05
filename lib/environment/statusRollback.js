"use strict";

var async = require("async");
var modelName = 'mongo';

var deployer = require("soajs").drivers;

function initBLModel(BLModule, modelName, cb) {
	BLModule.init(modelName, cb);
}

var lib = {
	removeCertificates: function (req, context, cb) {
		//get all certs of this env, async each to BL
		let opts = {};
		opts.collection = "fs.files";
		opts.conditions = {};
		context.BL.model.findEntries(req.soajs, opts, (error, certificates) => {
			if (error) {
				req.soajs.log.error(error);
				return cb();
			}
			
			async.each(certificates, (oneCertificate, fCb) => {
				req.soajs.inputmaskData = {
					env: context.template.code.toLowerCase(),
					id: oneCertificate._id.toString(),
					driverName: oneCertificate.metadata.platform + ".remote"
				};
				context.BL.model.removeCert(context.config, req, {}, (error) => {
					if (error) {
						req.soajs.log.error(error);
					}
					return fCb();
				});
			}, cb);
		});
	},
	
	removeProduct: function (req, context, cb) {
		if (context.template.productize._id) {
			productRemove();
		}
		else if (context.template.productize.tenant) {
			tenantRemove();
		}
		else return cb();
		
		function productRemove() {
			initBLModel(require("../product/index.js"), modelName, (error, productBL) => {
				if (error) {
					req.soajs.log.error(error);
					return cb();
				}
				
				req.soajs.inputmaskData.id = context.template.productize._id;
				productBL.delete(context.config, req, {}, (error) => {
					if (error) {
						req.soajs.log.error(error);
					}
					if (context.template.productize.tenant) {
						tenantRemove();
					}
				});
			});
		}
		
		function tenantRemove() {
			initBLModel(require("../product/index.js"), modelName, (error, tenantBl) => {
				if (error) {
					req.soajs.log.error(error);
					return cb();
				}
				
				req.soajs.inputmaskData.id = context.template.productize.tenant;
				tenantBl.delete(context.config, req, {}, (error) => {
					if (error) {
						req.soajs.log.error(error);
					}
					return cb();
				});
			});
		}
	},
	
	removeService: function (req, context, serviceName, cb) {
		if (!context.template[serviceName] || !context.template[serviceName]._id) {
			return cb();
		}
		
		initBLModel(require("../cloud/services/index.js"), modelName, (error, servicesBL) => {
			if (error) {
				req.soajs.log.error(error);
				return cb();
			}
			
			req.soajs.inputmaskData = {
				env: context.template.gi.code,
				serviceId: context.template[serviceName]._id,
				mode: context.template[serviceName].mode
			};
			
			servicesBL.deleteService(context.config, req.soajs, deployer, (error) => {
				if (error) {
					req.soajs.log.error(error);
				}
				return cb();
			});
		});
	},
	
	removeController: function (req, context, cb) {
		lib.removeService(req, context, 'controller', cb);
	},
	
	removeUrac: function (req, context, cb) {
		lib.removeService(req, context, 'urac', cb);
	},
	
	removeOauth: function (req, context, cb) {
		lib.removeService(req, context, 'controller', cb);
	},
	
	removeNginx: function (req, context, cb) {
		lib.removeService(req, context, 'nginx', cb);
	},
	
	removeCatalog: function (req, context, cb) {
		if (!context.template.nginx.recipe) {
			return cb();
		}
		
		initBLModel(require("../catalog/index"), modelName, (error, catalogBL) => {
			if (error) {
				req.soajs.log.error(error);
				return cb();
			}
			
			req.soajs.inputmaskData.id = context.template.nginx.recipe;
			catalogBL.delete(context.config, req, (error) => {
				if (error) {
					req.soajs.log.error(error);
				}
				return cb();
			})
		});
	},
	
	removeCluster: function (req, context, cb) {
		if (context.template.cluster && context.template.cluster.local) {
			if (context.template.cluster.serviceId) {
				initBLModel(require("../cloud/services/index.js"), modelName, (error, servicesBL) => {
					if (error) {
						req.soajs.log.error(error);
						return cb();
					}
					
					req.soajs.inputmaskData = {
						env: context.template.gi.code.toUpperCase(),
						serviceId: context.template.cluster.serviceId,
						mode: (context.template.deploy.selectedDriver === "kubernetes") ? "deployment" : "replicated"
					};
					servicesBL.deleteService(context.config, req.soajs, deployer, (error) => {
						if (error) {
							req.soajs.log.error(error);
						}
						lib.deleteResource(req, context, cb);
					});
				});
			}
			else {
				lib.deleteResource(req, context, cb);
			}
		}
		else if (context.template.cluster && context.template.cluster.external) {
			lib.deleteResource(req, context, cb);
		}
		else return cb();
	},
	
	deleteResource: function (req, context, cb) {
		context.BL.model.removeEntry(req.soajs, {
			collection: 'resources',
			conditions: {
				"env": context.template.gi.code.toUpperCase(),
				"id": context.template.cluster._id
			}
		}, (error) => {
			if (error) {
				req.soajs.log.error(error);
			}
			return cb();
		});
	},
	
	redirectTo3rdParty: function (req, context, section, cb) {
	
	}
};

module.exports = lib;