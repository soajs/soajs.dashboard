"use strict";

const driver = {
	
	"check": function (req, context, lib, async, BL, callback) {
		//validate if ci schema is valid
		let template = context.template;
		
		//todo: talk to etienne to get the schema
		let imfv = context.config.schema.post["/ci/recipe"];
		let schema = {
			type: 'object',
			properties: {
				provider: imfv.provider,
				name: imfv.name,
				recipe: imfv.recipe
			}
		};
		
		let myValidator = new req.soajs.validator.Validator();
		
		//check if name exists
		if (template.content && template.content.endpoints && template.content.endpoints.data && template.content.endpoints.data.length > 0) {
			let endpoints = template.content.endpoints.data;
			async.eachSeries(endpoints, (oneEndpoint, cb) => {
				
				async.series({
					"validateSchema": (mCb) => {
						let status = myValidator.validate(oneEndpoint, schema);
						if (!status.valid) {
							let errors = [];
							status.errors.forEach(function (err) {
								errors.push({code: 173, msg: err.stack})
							});
							return mCb(errors);
						}
						return mCb(null, true);
					},
					"checkDuplicate": (mCb) => {
						let opts = {
							conditions: {
								$or: [
									{serviceName: oneEndpoint.serviceName},
									{servicePort: oneEndpoint.servicePort}
								]
							},
							collection: "api_builder_endpoints",
						};
						
						BL.model.countEntries(req.soajs, opts, function (error, count) {
							lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, () => {
								if (count && count === 1) {
									return mCb({
										"code": 173,
										"msg": `An entry with the same name or port a endpoint ${oneEndpoint.serviceName} already exists => ${oneEndpoint.serviceName}`
									});
								}
								return mCb(null, true);
							});
						});
					},
					"checkServicesConflict": (mCb) => {
						let opts = {
							conditions: {
								$or: [
									{name: oneEndpoint.serviceName},
									{port: oneEndpoint.servicePort}
								]
							},
							collection: "services",
						};
						
						BL.model.countEntries(req.soajs, opts, function (error, count) {
							lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, () => {
								if (count && count === 1) {
									return mCb({
										"code": 173,
										"msg": `A service in the API Catalog has the same name or port value as endpoint ${oneEndpoint.serviceName} => ${oneEndpoint.serviceName}`
									});
								}
								return mCb(null, true);
							});
						});
					}
				}, (error) => {
					if (error) {
						context.errors.push(error);
					}
					return cb(null, true);
				});
				
			}, callback);
		} else {
			return callback();
		}
	},
	
	"save": function (req, context, lib, async, BL, callback) {
		if (context.content && context.content.recipes && context.content.recipes.deployment && context.content.recipes.deployment.length > 0) {
			lib.initBLModel('catalog', (error, catalogModule) => {
				lib.checkReturnError(req, callback, {config: context.config, error: error, code: 600}, () => {
					let catalogs = context.content.recipes.deployment;
					async.eachSeries(catalogs, (oneCatalog, cb) => {
						req.soajs.inputmaskData = {};
						req.soajs.inputmaskData.catalog = oneCatalog;
						catalogModule.add(context.config, req, (error) => {
							lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, cb);
						});
					}, callback);
				});
			});
		} else {
			return callback();
		}
	}
	
};

module.exports = driver;