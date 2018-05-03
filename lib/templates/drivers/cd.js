"use strict";
let colName = 'catalogs';
const driver = {
	
	"check": function (req, context, lib, async, BL, callback) {
		//validate if ci schema is valid
		let template = context.template;
		let schema = context.config.schema.post["/catalog/recipes/add"].catalog.validation;
		let myValidator = new req.soajs.validator.Validator();
		
		//check if name exists
		if (template.content && template.content.recipes && template.content.recipes.deployment && template.content.recipes.deployment.length > 0) {
			let catalogs = template.content.recipes.deployment;
			async.eachSeries(catalogs, (oneCatalog, cb) => {
				let status = myValidator.validate(oneCatalog, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({code: 173, msg: `<b>${oneCatalog.name}</b>: ` + err.stack, group: "Catalog Deployment Recipes"})
					});
					return cb();
				}
				else {
					let opts = {
						conditions: {
							name: oneCatalog.name
						},
						collection: colName,
					};
					BL.model.countEntries(req.soajs, opts, function (error, count) {
						lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, () => {
							if (count && count === 1) {
								context.errors.push({
									"code": 967,
									"msg": `<b>${oneCatalog.name}</b> already exists => ${oneCatalog.name}`,
									'entry':{
										'name': oneCatalog.name,
										'type': 'catalogs'
									}
								})
							}
							async.series({
								"checkPorts": (mCb) => {
                                    if (oneCatalog.restriction && oneCatalog.restriction.deployment && oneCatalog.restriction.deployment[0] && oneCatalog.restriction.deployment[0] === 'vm') {
                                        return mCb();
                                    }

									if (oneCatalog.recipe.deployOptions && oneCatalog.recipe.deployOptions.ports && oneCatalog.recipe.deployOptions.ports.length > 0) {
										var type;
										var ports = oneCatalog.recipe.deployOptions.ports;
										
										async.each(ports, function (onePort, callback) {
											var temp;
											if (onePort.isPublished || onePort.published) {
												temp = onePort.published ? "nodeport" : "loadbalancer";
												if (!type) {
													type = temp;
												}
												else if (type !== temp) {
													context.errors.push({
														code: 173,
														msg: `<b>${oneCatalog.name}</b>: Invalid port schema provided!`,
														group: "Catalog Deployment Recipes"
													});
												}
											}
											
											//object.
											//if isPublished is set to false and published port is set delete published port
											if (!onePort.isPublished && onePort.published) {
												delete  onePort.published;
											}
											
											if (!onePort.published) {
												return callback();
											}
											if (onePort.published && onePort.published < 0 || onePort.published > 2767) {
												context.errors.push({
													code: 173,
													msg: `<b>${oneCatalog.name}</b>: The port chosen for Nginx is outside the range of valid exposed ports (0 , 2767)`,
													group: "Catalog Deployment Recipes"
												});
											}
											return callback();
										},mCb);
									} else {
										return mCb();
									}
								},
								"checkSourceCode": (mCb) => {
									if (oneCatalog.recipe.deployOptions.sourceCode) {
										if (oneCatalog.recipe.deployOptions.sourceCode.configuration) {
											if (!oneCatalog.recipe.deployOptions.sourceCode.configuration.label) {
												context.errors.push({
													code: 173,
													msg: `<b>${oneCatalog.name}</b>: Label under configuration repository is missing.`,
													group: "Catalog Deployment Recipes"
												})
											}
											if (oneCatalog.recipe.deployOptions.sourceCode.configuration.repo && !oneCatalog.recipe.deployOptions.sourceCode.configuration.branch) {
												context.errors.push({
													code: 173,
													msg: `<b>${oneCatalog.name}</b>: Branch under configuration repository is missing.`,
													group: "Catalog Deployment Recipes"
												})
											}
										}
										
										if (oneCatalog.recipe.deployOptions.sourceCode.custom) {
											// custom repos should only be available for resources of types: server
											let allowedTypes = ['server'];
											if (allowedTypes.indexOf(oneCatalog.recipe.deployOptions.sourceCode.custom.type) === -1) {
												context.errors.push({
													code: 173,
													msg: `<b>${oneCatalog.name}</b>: Type under custom repository must be server.`,
													group: "Catalog Deployment Recipes"
												})
											}
											
											if (!oneCatalog.recipe.deployOptions.sourceCode.custom.label) {
												context.errors.push({
													code: 173,
													msg: `<b>${oneCatalog.name}</b>: Label under custom repository is missing.`,
													group: "Catalog Deployment Recipes"
												})
											}
											
											if (!oneCatalog.recipe.deployOptions.sourceCode.custom.type) {
												context.errors.push({
													code: 173,
													msg: `<b>${oneCatalog.name}</b>: Type under custom repository is missing.`,
													group: "Catalog Deployment Recipes"
												})
											}
											
											if (oneCatalog.recipe.deployOptions.sourceCode.custom.repo && !oneCatalog.recipe.deployOptions.sourceCode.custom.branch) {
												context.errors.push({
													code: 173,
													msg: `<b>${oneCatalog.name}</b>: Branch under custom repository is missing.`,
													group: "Catalog Deployment Recipes"
												})
											}
										}
										return mCb();
									} else {
										return mCb();
									}
								},
								"checkVolumes": (mCb) => {
									if (oneCatalog.recipe && oneCatalog.recipe.deployOptions && oneCatalog.recipe.deployOptions.voluming && oneCatalog.recipe.deployOptions.voluming.length > 0) {
										async.forEach(oneCatalog.recipe.deployOptions.voluming, (oneVolume, vCb) => {
											if (oneVolume.docker && oneVolume.docker.volume && (!oneVolume.docker.volume.Type || oneVolume.docker.volume.Type === '')) {
												context.errors.push({
													code: 173,
													msg: `<b>${oneCatalog.name}</b>: Specify the type for docker volume(s)`,
													group: "Catalog Deployment Recipes"
												});
												return vCb();
											}
											return vCb();
										}, mCb);
									} else {
										return mCb();
									}
								}
							},cb);
						});
					});
					
				}
			}, callback);
		} else {
			return callback();
		}
	},
	
	"merge": function (req, context, lib, async, BL, callback) {
		
		if (req.soajs.inputmaskData.correction && req.soajs.inputmaskData.correction.catalogs) {
			req.soajs.inputmaskData.correction.catalogs.forEach((oneCatalogInput) => {
				
				if(context.template.content.recipes && context.template.content.recipes.deployment){
					context.template.content.recipes.deployment.forEach((oneTemplateCatalog) => {
						if (oneCatalogInput.old === oneTemplateCatalog.name) {
							oneTemplateCatalog.name = oneCatalogInput.new;
						}
					});
					
					//check the other dependent sections
					if (context.template.content.deployments) {
						//check in repos
						if (context.template.content.deployments.repo) {
							for (let oneRepo in context.template.content.deployments.repo) {
								if (context.template.content.deployments.repo[oneRepo].deploy) {
									if (context.template.content.deployments.repo[oneRepo].deploy.recipes) {
										if (context.template.content.deployments.repo[oneRepo].deploy.recipes.default === oneCatalogInput.old) {
											context.template.content.deployments.repo[oneRepo].deploy.recipes.default = oneCatalogInput.new;
										}
										if (context.template.content.deployments.repo[oneRepo].deploy.recipes.available &&
											Array.isArray(context.template.content.deployments.repo[oneRepo].deploy.recipes.available) &&
											context.template.content.deployments.repo[oneRepo].deploy.recipes.available.length > 0) {
											
											for (let i = 0; i < context.template.content.deployments.repo[oneRepo].deploy.recipes.available.length; i++) {
												if (context.template.content.deployments.repo[oneRepo].deploy.recipes.available[i] === oneCatalogInput.old) {
													context.template.content.deployments.repo[oneRepo].deploy.recipes.available[i] = oneCatalogInput.new;
												}
											}
										}
									}
								}
							}
						}
						
						//check in resources
						if (context.template.content.deployments.resources) {
							for (let oneResource in context.template.content.deployments.resources) {
								if (context.template.content.deployments.resources[oneResource].deploy) {
									if (context.template.content.deployments.resources[oneResource].deploy.recipes) {
										if (context.template.content.deployments.resources[oneResource].deploy.recipes.default === oneCatalogInput.old) {
											context.template.content.deployments.resources[oneResource].deploy.recipes.default = oneCatalogInput.new;
										}
										if (context.template.content.deployments.resources[oneResource].deploy.recipes.available &&
											Array.isArray(context.template.content.deployments.resources[oneResource].deploy.recipes.available) &&
											context.template.content.deployments.resources[oneResource].deploy.recipes.available.length > 0) {
											
											for (let i = 0; i < context.template.content.deployments.resources[oneResource].deploy.recipes.available.length; i++) {
												if (context.template.content.deployments.resources[oneResource].deploy.recipes.available[i] === oneCatalogInput.old) {
													context.template.content.deployments.resources[oneResource].deploy.recipes.available[i] = oneCatalogInput.new;
												}
											}
										}
									}
								}
							}
						}
					}
				}
			});
		}
		
		return callback();
	},
	
	"save": function (req, context, lib, async, BL, callback) {
		if (context.template.content && context.template.content.recipes && context.template.content.recipes.deployment && context.template.content.recipes.deployment.length > 0) {
			lib.initBLModel('catalog', (error, catalogModule) => {
				lib.checkReturnError(req, callback, {config: context.config, error: error, code: 600}, () => {
					let catalogs = context.template.content.recipes.deployment;
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
	},
	
	"export": function(req, context, lib, async, BL, callback){
		if (req.soajs.inputmaskData.deployment && req.soajs.inputmaskData.deployment.length > 0) {
			context.dbData.deployment = [];
			let deployment = req.soajs.inputmaskData.deployment;
			async.map(deployment, (oneCatalogId, cb) => {
				oneCatalogId = new BL.model.getDb(req.soajs).ObjectId(oneCatalogId);
				return cb(null, oneCatalogId);
			}, (error, ids)=> {
				//no error in this case
				
				BL.model.findEntries(req.soajs, {
					"collection": "catalogs",
					"conditions": {
						"_id": { "$in": ids }
					}
				}, (error, records) =>{
					let blackList = context.config.HA.blacklist;
					if (req.soajs.servicesConfig && req.soajs.servicesConfig.dashboard && req.soajs.servicesConfig.dashboard.HA && req.soajs.servicesConfig.dashboard.HA.blacklist) {
						blackList = req.soajs.servicesConfig.dashboard.HA.blacklist;
					}
					
					lib.checkReturnError(req, callback, {config: context.config, error: error, code: 600}, () => {
						async.map(records, (oneRecord, mCb) => {
							delete oneRecord._id;
							delete oneRecord.locked;
							delete oneRecord.v;
							delete oneRecord.ts;
							
							if(oneRecord.recipe && oneRecord.recipe.buildOptions && oneRecord.recipe.buildOptions.env){
								for(let env in oneRecord.recipe.buildOptions.env){
									if (blackList.indexOf(env.toLowerCase()) !== -1) {
										if(oneRecord.recipe.buildOptions.env[env].type === 'static'){
											oneRecord.recipe.buildOptions.env[env].value = "";
										}
										
										if(oneRecord.recipe.buildOptions.env[env].type === 'userInput'){
											oneRecord.recipe.buildOptions.env[env].default = "";
										}
									}
								}
							}
							
							context.dbData.deployment.push(oneRecord);
							return mCb();
						}, callback);
						
					});
				});
			});
		} else {
			return callback();
		}
	}
};

module.exports = driver;