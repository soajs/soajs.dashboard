"use strict";
var soajs = require('soajs');
var Mongo = soajs.mongo;

var dataMw = function(config) {
	this.mongo = null;
	this.config = config || {};

	//if not multitenant then, expect a db configuration from config
	//located at soajsService.db.config
	if(!this.config.db.multitenant) {
		var envCode = (process.env.SOAJS_ENV || "DEV");
		this.mongo = new Mongo(this.config.db.config[envCode]);
	}

	//build the context of the middleware
	this.context = {
		'db': {
			'collection': (this.config && this.config.db && this.config.db.collection) ? this.config.db.collection : this.this.config.db.collection,
			'options': (this.config && this.config.db && this.config.db.options) ? this.config.db.options : {},
			'condition': (this.config && this.config.db && this.config.db.condition) ? this.config.db.condition : {}
		},
		model: null
	};

	for(var operationName in this.config.mw) {
		if(this.config.mw.hasOwnProperty(operationName)) {
			if(!this.context.model) {
				this.context.model = {};
			}
			this.context.model[operationName] = this.config.mw[operationName].model || null;
		}
	}

	//initialize the supported functionality: list - get - delete - add - update
	var self = this;
	/*
	 The list functionality provides the ability to fetch records from the database.
	 it only requires that an error code value be present in the configuration
	 */
	this.list = {
		'initialize': function(req, res, next) {
			//if multitenant, on each request build a new mongo connection
			if(self.config.db.multitenant) {
				var tenantCode = req.soajs.session.getUrac().tenant.code;
				self.mongo = new Mongo(req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, self.config.serviceName, tenantCode));
			}
			//store an empty data object, the db info and the mongo instance, might be used by preExec and postExec
			req.soajs.dataMw = {"data": null, "db": self.context.db, "mongo": self.mongo};
			next();
		},

		'exec': function(req, res, next) {
			self.mongo.find(self.context.db.collection, self.context.db.condition || {}, self.context.db.options || {}, function(error, records) {
				if(error || !records) {
					if(self.config.db.multitenant) { self.mongo.closeDb(); }
					if(error) { req.soajs.log.error(error); }
					var msg = (error) ? error.message : self.config.errors[self.config.mw.list.code];
					return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.list.code, "msg": msg}));
				}
				req.soajs.dataMw.data = records;
				next();
			});
		},

		'response': function(req, res) {
			//if multitenant, on each request close the mongo connection
			if(self.config.db.multitenant) { self.mongo.closeDb(); }
			//return valid response
			return res.jsonp(req.soajs.buildResponse(null, req.soajs.dataMw.data));
		}
	};

	/*
	 The get functionality provides the ability to fetch one record from the database.
	 it only requires that an error code value be present in the configuration
	 */
	this.get = {
		'initialize': function(req, res, next) {
			//if multitenant, on each request build a new mongo connection
			if(self.config.db.multitenant) {
				var tenantCode = req.soajs.session.getUrac().tenant.code;
				self.mongo = new Mongo(req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, self.config.serviceName, tenantCode));
			}

			//id is needed, attempt to parse it to mongo ObjectId and added it to the condition, used in exec
			try {
				self.context.db.condition = {
					'_id': self.mongo.ObjectId(req.soajs.inputmaskData.id)
				};
			} catch(e) {
				return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.get.code, "msg": e.message}));
			}
			//store an empty data object, the db info and the mongo instance, might be used by preExec and postExec
			req.soajs.dataMw = {"data": null, "db": self.context.db, "mongo": self.mongo};
			next();
		},

		'exec': function(req, res, next) {
			self.mongo.findOne(self.context.db.collection, self.context.db.condition || {}, function(error, oneRecord) {
				if(error) {
					if(self.config.db.multitenant) { self.mongo.closeDb(); }
					if(error) { req.soajs.log.error(error); }
					var msg = (error) ? error.message : self.config.errors[self.config.mw.get.code];
					return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.get.code, "msg": msg}));
				}
				self.context.db.condition = {};
				req.soajs.dataMw.data = oneRecord;
				next();
			});
		},

		'response': function(req, res) {
			//if multitenant, on each request close the mongo connection
			if(self.config.db.multitenant) { self.mongo.closeDb(); }
			//return valid response
			return res.jsonp(req.soajs.buildResponse(null, req.soajs.dataMw.data));
		}
	};

	/*
	 The delete functionality provides the ability to flag one record in the database as deleted.
	 it only requires that an error code value be present in the configuration
	 */
	this.delete = {
		'initialize': function(req, res, next) {
			//if multitenant, on each request build a new mongo connection
			if(self.config.db.multitenant) {
				var tenantCode = req.soajs.session.getUrac().tenant.code;
				self.mongo = new Mongo(req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, self.config.serviceName, tenantCode));
			}

			//id is needed, attempt to parse it to mongo ObjectId and added it to the condition, used in exec
			try {
				self.context.db.condition = {
					'_id': self.mongo.ObjectId(req.soajs.inputmaskData.id)
				};
			} catch(e) {
				return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.get.code, "msg": e.message}));
			}

			//store an empty data object, the db info and the mongo instance, might be used by preExec and postExec
			req.soajs.dataMw = {"data": null, "db": self.context.db, "mongo": self.mongo};
			next();
		},

		'exec': function(req, res, next) {
			self.mongo.remove(self.context.db.collection, self.context.db.condition || {}, function(error) {
				if(error) {
					if(self.config.db.multitenant) { self.mongo.closeDb(); }
					if(error) { req.soajs.log.error(error); }
					var msg = (error) ? error.message : self.config.errors[self.config.mw.get.code];
					return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.get.code, "msg": msg}));
				}
				self.context.db.condition = {};
				next();
			});
		},

		'response': function(req, res) {
			//if multitenant, on each request close the mongo connection
			if(self.config.db.multitenant) { self.mongo.closeDb(); }
			//return valid response
			return res.jsonp(req.soajs.buildResponse(null, true));
		}
	};

	/*
	 The add functionality provides the ability to insert one record in the database.
	 it requires an error code value and a model to be present in the configuration
	 */
	this.add = {
		'initialize': function(req, res, next) {
			//add requires a model to be provided or it cannot function. throw error if no model found
			if(!self.context.model || !self.context.model.add) {
				var error = new Error("No model for add functionality was found, unable to proceed");
				return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.add.code, "msg": error.message}));
			}
			//store an empty data object, the db info and the mongo instance, might be used by preExec and postExec
			req.soajs.dataMw = {"data": {}, "db": self.context.db, "mongo": self.mongo};

			//if multitenant, on each request build a new mongo connection
			if(self.config.db.multitenant) {
				var tenantCode = req.soajs.session.getUrac().tenant.code;
				self.mongo = new Mongo(req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, self.config.serviceName, tenantCode));
			}
			next();
		},

		'exec': function(req, res, next) {
			try {
				//call the model and attempt to build the data object
				self.context.model.add(req.soajs, self.config, function(error, data) {
					if(error) { return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.add.code, "msg": error.message})); }

					var author;
					if(req.soajs.session) {
						author = req.soajs.session.getUrac().username;
					}

					req.soajs.dataMw.data = {
						"created": new Date().getTime(),
						"fields": data
					};
					if(author) {
						req.soajs.dataMw.data['author'] = author;
					}

					//execute insert
					self.mongo.insert(self.context.db.collection, req.soajs.dataMw.data, function(error) {
						if(error) {
							if(self.config.db.multitenant) { self.mongo.closeDb(); }
							return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.add.code, "msg": error.message}));
						}
						next();
					});
				});
			}
			catch(e) {
				if(self.mongo && self.config.db.multitenant) { self.mongo.closeDb(); }
				return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.add.code, "msg": e.message}));
			}
		},

		'response': function(req, res) {
			//if multitenant, on each request close the mongo connection
			if(self.config.db.multitenant) { self.mongo.closeDb(); }
			//return valid response
			return res.jsonp(req.soajs.buildResponse(null, true));
		}
	};

	/*
	 The update functionality provides the ability to modify one record in the database.
	 it requires an error code value and a model to be present in the configuration
	 */
	this.update = {
		'initialize': function(req, res, next) {
			//update requires a model to be provided or it cannot function. throw error if no model found
			if(!self.context.model || !self.context.model.update) {
				var error = new Error("No model for update functionality was found, unable to proceed");
				return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.update.code, "msg": error.message}));
			}

			//if multitenant, on each request build a new mongo connection
			if(self.config.db.multitenant) {
				var tenantCode = req.soajs.session.getUrac().tenant.code;
				self.mongo = new Mongo(req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, self.config.serviceName, tenantCode));
			}

			//id is needed, attempt to parse it to mongo ObjectId and added it to the condition, used in exec
			try {
				self.context.db.condition = {
					'_id': self.mongo.ObjectId(req.soajs.inputmaskData.id)
				};
			} catch(e) {
				return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.get.code, "msg": e.message}));
			}

			//store an empty data object, the db info and the mongo instance, might be used by preExec and postExec
			req.soajs.dataMw = {"data": {}, "db": self.context.db, "mongo": self.mongo};

			next();
		},

		'exec': function(req, res, next) {
			try {
				//call the model and attempt to build the data object
				self.context.model.update(req.soajs, self.config, function(error, data) {
					if(error) { return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.add.code, "msg": error.message})); }

					//create the options object for update
					if(!self.config.db.options || JSON.stringify(self.config.db.options) === "{}") {
						self.config.db.options = {'safe': true, 'upsert': false};
					}

					req.soajs.dataMw.data = data;
					req.soajs.dataMw.data['$set'].modified = new Date().getTime();

					//execute update
					self.mongo.update(self.context.db.collection, self.context.db.condition, req.soajs.dataMw.data, self.context.db.options, function(error) {
						if(error) {
							if(self.config.db.multitenant) { self.mongo.closeDb(); }
							return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.update.code, "msg": error.message}));
						}
						self.context.db.condition = {};
						next();
					});
				});
			}
			catch(e) {
				if(self.mongo && self.config.db.multitenant) { self.mongo.closeDb(); }
				return res.jsonp(req.soajs.buildResponse({"code": self.config.mw.update.code, "msg": e.message}));
			}
		},

		'response': function(req, res) {
			//if multitenant, on each request close the mongo connection
			if(self.config.db.multitenant) { self.mongo.closeDb(); }
			//return valid response
			return res.jsonp(req.soajs.buildResponse(null, true));
		}
	};
};

module.exports = dataMw;