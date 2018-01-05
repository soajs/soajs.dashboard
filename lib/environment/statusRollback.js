"use strict";

var async = require("async");
var modelName = 'mongo';

var deployer = require("soajs").drivers;

function initBLModel(BLModule, modelName, cb) {
	BLModule.init(modelName, cb);
}

var lib = {
	processRollback: function (req, context) {
		if (!req.soajs.inputmaskData) {
			req.soajs.inputmaskData = {};
		}
		
		function updateTemplate(fCb) {
			context.BL.model.saveEntry(req.soajs, {collection: 'templates', record: context.template}, fCb);
		}
		
		let stack = {
			"removeServices": function (fCb) {
				async.series({
					"nginx": function (vCb) {
						lib.removeNginx(req, context, vCb);
					},
					"nginxRecipe": function (vCb) {
						lib.removeCatalog(req, context, vCb);
					},
					"controller": function (vCb) {
						lib.removeController(req, context, vCb);
					},
					"urac": function (vCb) {
						lib.removeUrac(req, context, vCb);
					},
					"oauth": function (vCb) {
						lib.removeOauth(req, context, vCb);
					}
				}, () => {
					delete context.template.nginx._id;
					delete context.template.nginx.recipe;
					delete context.template.controller._id;
					delete context.template.urac._id;
					delete context.template.oauth._id;
					return fCb();
				});
			},
			//update
			"u1": updateTemplate,
			"removeClusterAndResource": function (fCb) {
				async.series({
					"cluster": function (vCb) {
						lib.removeCluster(req, context, vCb);
					}
				}, () => {
					delete context.template.cluster.serviceId;
					delete context.template.cluster._id;
					return fCb();
				});
			},
			//update
			"u2": updateTemplate,
			"removeProduct": function (fCb) {
				lib.removeProduct(req, context, () => {
					delete context.template.productize._id;
					delete context.template.productize.tenant;
					delete context.template.productize.extKey;
					return fCb();
				});
			},
			//update
			"u3": updateTemplate,
			"removeCertificates": function (fCb) {
				lib.removeCertificates(req, context, () => {
					delete context.template.deploy.certificates;
					return fCb();
				});
			},
			//update
			"u5": updateTemplate
		};
		setTimeout(() => {
			async.series(stack, () => {
				req.soajs.log.info("Rollback Deploy Environment" + context.template.code.toUpperCase() + " completed.");
			});
		}, 5000);
	},
	
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
			if (context.template.cluster.serviceId && context.template.cluster.serviceId.id) {
				
				initBLModel(require("../cloud/services/index.js"), modelName, (error, servicesBL) => {
					if (error) {
						req.soajs.log.error(error);
						return cb();
					}
					
					req.soajs.inputmaskData = {
						env: context.template.gi.code.toUpperCase(),
						serviceId: context.template.cluster.serviceId.id,
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
				"id": context.template.cluster.clusterId
			}
		}, (error) => {
			if (error) {
				req.soajs.log.error(error);
			}
			return cb();
		});
	}
};

module.exports = lib;