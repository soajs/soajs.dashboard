"use strict";
let request = require("request");
var async = require("async");
var modelName = 'mongo';

var deployer = require("soajs").drivers;

var lib = {
	initBLModel: function (BLModule, modelName, cb) {
		BLModule.init(modelName, cb);
	},
	removeCertificates: function (req, context, cb) {
		if(!context.template.deploy.certificates){
			return cb();
		}
		let project = context.template.gi.project ? context.template.gi.project.name : null;
		//get all certs of this env, async each to BL
		let opts = {};
		opts.collection = "fs.files";
		opts.conditions = {};
		context.BL.model.findEntries(req.soajs, opts, (error, certificates) => {
			if (error) {
				return cb(error);
			}
			
			async.eachSeries(certificates, (oneCertificate, fCb) => {
				if(!oneCertificate.metadata.env[context.template.gi.code.toUpperCase()]){
					return fCb();
				}
				req.soajs.inputmaskData = {
					env: context.template.gi.code.toUpperCase(),
					id: oneCertificate._id.toString(),
					driverName: oneCertificate.metadata.platform + ".remote"
				};
				if (project){
					req.soajs.inputmaskData.soajs_project = project;
				}
				context.BL.removeCert(context.config, req, {}, fCb);
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
			lib.initBLModel(require("../product/index.js"), modelName, (error, productBL) => {
				if (error) {
					return cb(error);
				}
				
				req.soajs.inputmaskData.id = context.template.productize._id;
				productBL.delete(context.config, req, {}, (error) => {
					if (error) {
						return cb(error);
					}
					if (context.template.productize.tenant) {
						tenantRemove();
					}
					else{
						return cb(null, true);
					}
				});
			});
		}
		
		function tenantRemove() {
			lib.initBLModel(require("../tenant/index.js"), modelName, (error, tenantBl) => {
				if (error) {
					return cb(error);
				}
				
				req.soajs.inputmaskData = {id : context.template.productize.tenant};
				tenantBl.delete(context.config, req, {}, cb);
			});
		}
	},
	
	removeService: function (req, context, serviceName, cb) {
		if (!context.template[serviceName] || !context.template[serviceName]._id) {
			return cb();
		}
		let project = context.template.gi.project ? context.template.gi.project.name : null;
		req.soajs.log.debug("Removing " + serviceName + " ...");
		lib.initBLModel(require("../cloud/services/index.js"), modelName, (error, servicesBL) => {
			if (error) {
				return cb(error);
			}
			
			req.soajs.inputmaskData = {
				env: context.template.gi.code,
				serviceId: context.template[serviceName]._id,
				mode: context.template[serviceName].mode
			};
			if (project){
				req.soajs.inputmaskData.soajs_project = project;
			}
			servicesBL.deleteService(context.config, req.soajs, deployer, cb);
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
		if (!context.template.nginx.recipe || typeof(context.template.nginx.recipe) !== 'string') {
			return cb();
		}
		
		lib.initBLModel(require("../catalog/index"), modelName, (error, catalogBL) => {
			if (error) {
				return cb(error);
			}
			
			req.soajs.inputmaskData.id = context.template.nginx.recipe;
			catalogBL.delete(context.config, req, cb);
		});
	},
	
	removeCluster: function (req, context, cb) {
		if (context.template.cluster && context.template.cluster.local) {
			if (context.template.cluster.serviceId) {
				lib.initBLModel(require("../cloud/services/index.js"), modelName, (error, servicesBL) => {
					if (error) {
						return cb(error);
					}
					
					req.soajs.inputmaskData = {
						env: context.template.gi.code.toUpperCase(),
						serviceId: context.template.cluster.serviceId,
						mode: (context.template.deploy.selectedDriver === "kubernetes") ? "deployment" : "replicated"
					};
					servicesBL.deleteService(context.config, req.soajs, deployer, (error) => {
						if (error) {
							return cb(error);
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
		}, cb);
	},
	
	redirectTo3rdParty: function (req, context, section, cb) {
		if(context.template[section] && context.template[section].wf && context.template[section].wf.rollback){
			
			let remoteStack =[];
			if(Array.isArray(context.template[section].wf.rollback)) {
				remoteStack = context.template[section].wf.rollback;
			}
			else if(typeof(context.template[section].wf.rollback) === 'object'){
				remoteStack.push(context.template[section].wf.rollback);
			}
			
			if(remoteStack.length === 0){
				return cb();
			}
			
			async.mapSeries(remoteStack, (oneStep, mCb) => {
				if(oneStep.recursive){
					lib.repeatCheckCall(req, context, oneStep, mCb)
				}
				else{
					lib.generateAndRunRequest(req, context, oneStep, mCb);
				}
			}, (error, response) => {
				if(error){
					return cb(error);
				}
				
				if(!context.template[section]._id){
					context.template[section]._id = {};
				}
				
				if(typeof(context.template[section]._id) ==='boolean'){
					return cb(null, true);
				}
				
				response.forEach((oneResponse) => {
					for(let f in oneResponse){
						context.template[section]._id[f] = oneResponse[f];
					}
				});
				
				return cb(null, true);
			});
		}
		else{
			return cb();
		}
	},
	
	repeatCheckCall : function (req, context, oneStep, callback){
		lib.generateAndRunRequest(req, context, oneStep, function(error, response){
			if(error){ return callback(error); }
			
			let valid = true;
			if(!response){
				valid = false;
			}
			else {
				for (let field in oneStep.recursive) {
					if (oneStep.recursive[field].type && Object.hasOwnProperty.call(response, field) && typeof(response[field]) !== oneStep.recursive[field].type) {
						valid = false;
					}
					else if (oneStep.recursive[field].value && Object.hasOwnProperty.call(response, field) !== oneStep.recursive[field].value) {
						valid = false;
					}
				}
			}
			if(valid){
				return callback(null, response);
			}
			else{
				setTimeout(() => {
					lib.repeatCheckCall(req, context, oneStep, callback);
				}, 10000);
			}
		});
	},
	
	generateAndRunRequest: function(req, context, options, cb){
		if(!options || !options.routeName || !options.method){
			return cb(new Error("Invalid or Missing information to redirect to 3rd party systems!"));
		}
		
		req.soajs.awareness.getHost('controller', function (host) {
			let opts = {
				"uri": 'http://' + host + ':' + req.soajs.registry.services.controller.port + options.routeName,
				"headers": {
					'Content-Type': 'application/json',
					'accept': 'application/json',
					'connection': 'keep-alive',
					'key': req.headers.key,
					'soajsauth': req.headers.soajsauth
				},
				"qs": {
					"access_token": req.query.access_token
				},
				"json": true
			};
			
			if(options.data){
				opts.body = options.data;
			}
			
			if(options.params && Object.keys(options.params).length > 0){
				opts.qs = Object.assign(opts.qs, options.params);
			}
			
			let project = context.template.gi.project ? context.template.gi.project.name : null;
			opts.qs.project = project;
			
			request[options.method](opts, (error, response, body) => {
				if (error) {
					return cb(error);
				}
				
				return !body.result ? cb(new Error(body.errors.details[0].message)) : cb(null, body.data);
			});
		});
	}
};

module.exports = lib;