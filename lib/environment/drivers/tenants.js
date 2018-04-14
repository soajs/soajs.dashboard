"use strict";
const provision = require("soajs").provision;
const soajsCore = require("soajs").core;

function updateOauth(req, context, oneTenantInput, tenantRecord, tenantsModule, callback){
	if(oneTenantInput.oauth && Object.keys(oneTenantInput.oauth).length > 0){
		req.soajs.log.debug(`oAuth configuration found, updating tenant...`);
		req.soajs.inputmaskData = {
			id: tenantRecord._id.toString(),
			secret: oneTenantInput.oauth.secret,
			redirectURI: oneTenantInput.oauth.redirectURI
		};
		tenantsModule.saveOAuth(context.config, 425, 'tenant OAuth add successful', req, {}, callback);
	}
	else{
		req.soajs.log.debug(`No oAuth configuration found`);
		return callback();
	}
}

function addApplication(req, context, async, lib, oneApplicationInput, tenantRecord, tenantsModule, callback){
	req.soajs.log.debug(`Creating Tenant Application ...`);
	req.soajs.inputmaskData = {
		id: tenantRecord._id.toString(),
		productCode: oneApplicationInput.product,
		packageCode: oneApplicationInput.package.split("_")[1],
		description: oneApplicationInput.description,
		_TTL: oneApplicationInput._TTL
	};
	if(oneApplicationInput.acl){
		let newAcl = {};
		newAcl[context.environmentRecord.code.toLowerCase()] = oneApplicationInput.acl;
		req.soajs.inputmaskData.acl = newAcl
	}
	
	tenantsModule.addApplication(context.config, req, {}, (error, appInfo) =>{
		lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, () => {
			let keys = oneApplicationInput.keys || [];
			async.eachSeries(keys, (oneKey, kCb) => {
				addKey(req, context, async, lib, tenantsModule, tenantRecord, appInfo, oneKey, kCb);
			}, (error) =>{
				lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, callback);
			});
		});
	});
}

function addKey(req, context, async, lib, tenantsModule, tenantRecord, appInfo, oneKeyInput, callback){
	req.soajs.log.debug("Creating new Key for tenant", tenantRecord.code);
	req.soajs.inputmaskData = {
		id: tenantRecord._id.toString(),
		appId: appInfo.appId
	};
	tenantsModule.createApplicationKey(context.onfig, provision, req, {}, (error, appInfo) =>{
		lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, () => {
			
			addApplicationConfig(req, context, tenantsModule, tenantRecord, appInfo, oneKeyInput, (error) => {
				lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, () => {
					let extKeys = oneKeyInput.extKeys || [];
					async.eachSeries(extKeys, (oneExtKeyInput, exCb) => {
						addExtKey(req, context, tenantsModule, tenantRecord, appInfo, oneExtKeyInput, (error) =>{
							lib.checkReturnError(req, exCb, {error: error, code: (error && error.code) ? error.code: 600}, exCb);
						});
					}, (error) =>{
						lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, callback);
					});
				});
			});
		});
	});
}

function addExtKey(req, context, tenantsModule, tenantRecord, appInfo, oneExtKeyInput, callback){
	req.soajs.log.debug("Creating new EXT Key for tenant", tenantRecord.code);
	req.soajs.inputmaskData = {
		id: tenantRecord._id.toString(),
		appId: appInfo.appId,
		key: appInfo.key,
		env: context.environmentRecord.code,
		dashboardAccess: oneExtKeyInput.dashboardAccess,
		extKeyEnv: context.environmentRecord.code,
		device: oneExtKeyInput.device,
		geo: oneExtKeyInput.geo,
		expDate: oneExtKeyInput.expDate
	};
	tenantsModule.addApplicationExtKeys(context.config, soajsCore, req, {}, callback);
}

function addApplicationConfig(req, context, tenantsModule, tenantRecord, appInfo, oneKeyInput, callback){
	req.soajs.log.debug("Creating application configuration for tenant", tenantRecord.code);
	req.soajs.inputmaskData = {
		id: tenantRecord._id.toString(),
		appId: appInfo.appId,
		key: appInfo.key,
		envCode: context.environmentRecord.code,
		config: oneKeyInput.config || {}
	};
	
	//still missing value for protocol and for port!
	//iza fi resource w type server w category nginx w fi custom w ilo ports w certs, fik trakib el port w el protocol
	//then replace %domain% with value
	
	if(req.soajs.inputmaskData.config && req.soajs.inputmaskData.config.urac && req.soajs.inputmaskData.config.urac.link && typeof(req.soajs.inputmaskData.config.urac.link) === 'object'){
		let domain;
		let port = 80;
		let protocol = "http";
		
		//construct the domain and sitePrefix from the registry
		if(context.environmentRecord.domain){
			domain = context.environmentRecord.domain;
			if(context.environmentRecord.sitePrefix){
				domain = context.environmentRecord.sitePrefix + "." + domain;
			}
		}
		
		//check for ports and protocol in resources inputs
		if(domain && context.template && context.template.deploy && context.template.deploy.deployments){
			//find out if nginx has https turned on and/or an exposed port value
			for(let group in context.template.deploy.deployments){
				for(let step in context.template.deploy.deployments[group]){
					if(step.indexOf("deployments.resources") !== -1 &&  context.template.deploy.deployments[group][step].imfv){
						let input = context.template.deploy.deployments[group][step].imfv[0];
						
						//if nginx resource
						if(input && input.type ==='server' && input.category === 'nginx' && input.deploy){
							if(input.deploy.options && input.deploy.options.custom){
								
								//check if https is turned on or not
								if(input.deploy.options.custom.secrets && input.deploy.options.custom.secrets.length > 0){
									input.deploy.options.custom.secrets.forEach((oneSecret) => {
										if(oneSecret.type === 'certificate'){
											protocol = "https";
										}
									});
								}
								
								//protocol has been detected, get corresponding port
								if(input.deploy.options.custom.ports && input.deploy.options.custom.ports.length > 0){
									input.deploy.options.custom.ports.forEach((onePort) => {
										if(onePort.name === protocol){
											port = onePort.port
										}
									});
								}
								
							}
						}
					}
				}
			}
		}
		
		//update the config entries with domain value
		if(domain){
			domain = protocol + "://" + domain + ":" + port;
			for(let link in req.soajs.inputmaskData.config.urac.link){
				req.soajs.inputmaskData.config.urac.link[link] = req.soajs.inputmaskData.config.urac.link[link].replace("%domain%", domain);
			}
		}
	}
	
	tenantsModule.updateApplicationConfig(context.config, req, {}, callback);
}

const tenants = {
	validate: function (req, context, lib, async, BL, modelName, callback) {
		
		if (!context.template.content.tenant || !context.template.content.tenant.data || !Array.isArray(context.template.content.tenant.data) || context.template.content.tenant.data.length === 0) {
			//this deployment entry is not found in the template content
			context.errors.push({code: 172, msg: `The template does not support deploying Tenants`});
			return callback();
		}
		
		// force ui readonly on tenants for now
		context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath] = {
			"ui":{
				"readOnly": true
			}
		};
		
		return callback();
	},
	
	deploy: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Tenants have been previously created`);
				return callback(null, true);
			}
		}
		
		req.soajs.log.debug(`Creating Tenants Entries ...`);
		lib.initBLModel(BL.tenants.module, modelName, (error, tenantsModule) => {
			lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
				req.soajs.inputmaskData = {};
				
				let entries =[];
				context.template.content.tenant.data.forEach((oneEntry) => {
					entries.push(oneEntry);
				});
				
				//there is nothing to do
				if(entries.length === 0){
					req.soajs.log.debug("No Tenants found.");
					return callback();
				}
				
				async.mapSeries(entries, (oneTenantInput, fCb) => {
					
					//check if this entry was previously processed
					if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
						if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data){
							context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data.forEach((oneData) =>{
								if(oneData.name === oneTenantInput.code){
									req.soajs.log.debug("Tenant entry already created", oneTenantInput.code);
									return fCb({"name": oneTenantInput.code});
								}
							});
						}
					}
					
					//process entry
					req.soajs.inputmaskData.code = oneTenantInput.code;
					tenantsModule.get(context.config, req, {}, (error, tenantRecord) =>{
						lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
							//tenant found
							if(tenantRecord){
								req.soajs.log.debug(`Tenant found, checking oauth settings ...`);
								//check oauth
								updateOauth(req, context, oneTenantInput, tenantRecord, tenantsModule, (error) => {
									lib.checkReturnError(req, fCb, {error: error, code: error && error.code ? error.code : 600}, () => {
										req.soajs.log.debug(`Tenant found, checking applications...`);
										let applications = oneTenantInput.applications || [];
										async.eachSeries(applications, (oneApplicationInput, vCb) => {
											let appFound;
											for(let i = tenantRecord.applications.length -1; i >= 0; i--) {
												if (tenantRecord.applications[i].package === oneApplicationInput.package) {
													appFound = tenantRecord.applications[i];
												}
											}
											//application found, update its content
											if(appFound){
												req.soajs.log.debug(`application found, checking keys ...`);
												let appInfo ={};
												appInfo.appId = appFound.appId.toString();
												
												//check the keys
												let keys = oneApplicationInput.keys || [];
												
												async.eachSeries(keys, (oneKeyInput, kCb) => {
													let keyFound;
													appFound.keys.forEach((oneKey) =>{
														if(oneKey.key === oneKeyInput.key){
															keyFound = oneKey;
														}
													});
													
													//key found, update its config and create new ext keys
													if(keyFound){
														req.soajs.log.debug(`key found, checking extkeys and application configuration ...`);
														appInfo.key = keyFound.key;
														
														//update key configuration
														addApplicationConfig(req, context, tenantsModule, tenantRecord, appInfo, oneKeyInput, (error) => {
															lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
																
																//add ext keys
																let extKeys = oneKeyInput.extKeys || [];
																async.eachSeries(extKeys, (oneExtKeyInput, exCb) => {
																	addExtKey(req, context, tenantsModule, tenantRecord, appInfo, oneExtKeyInput, exCb);
																}, kCb);
															});
														});
													}
													//key not found, create new one with config and ext keys
													else{
														addKey(req, context, async, lib, tenantsModule, tenantRecord, appInfo, oneKeyInput, kCb);
													}
												}, vCb);
											}
											//application not found, create new one
											else{
												addApplication(req, context, async, lib, oneApplicationInput, tenantRecord, tenantsModule, vCb);
											}
										}, (error) =>{
											lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
												return fCb(null, {name: tenantRecord.code});
											});
										});
									});
								});
							}
							else{
								req.soajs.log.debug(`Tenant not found, creating tenant ...`);
								req.soajs.inputmaskData = {
									code: oneTenantInput.code,
									name: oneTenantInput.name,
									type: oneTenantInput.type || "client",
									tag: oneTenantInput.tag || "",
									description: oneTenantInput.description
								};
								tenantsModule.add(context.config, req, {}, (error, tenantId) => {
									lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
										req.soajs.inputmaskData = {};
										req.soajs.inputmaskData.id = tenantId.id;
										tenantsModule.get(context.config, req, {}, (error, tenantRecord) =>{
											lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
												
												//check oauth
												updateOauth(req, context, oneTenantInput, tenantRecord, tenantsModule, (error) => {
													lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
														
														//add applications
														let applications = oneTenantInput.applications || [];
														async.eachSeries(applications, (oneApplicationInput, vCb) => {
															addApplication(req, context, async, lib, oneApplicationInput, tenantRecord, tenantsModule, vCb);
														}, (error) =>{
															lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
																return fCb(null, {name: tenantRecord.code});
															});
														});
													});
												});
											});
										});
									});
								});
							}
						});
					});
				}, (error, finalResponse) => {
					//generate final response and update template
					lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, () => {
						context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {
							"done": true,
							"data": finalResponse
						};
						return callback(null, true);
					});
				});
			});
		});
	},
	
	rollback: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status) {
			if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done) {
				req.soajs.log.debug(`Rolling back tenants created`);
				
				lib.initBLModel(BL.tenants.module, modelName, (error, tenantsModule) => {
					lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
						req.soajs.inputmaskData = {};
						
						let entries = [];
						context.template.content.tenant.data.forEach((oneEntry) => {
							entries.push(oneEntry);
						});
						
						//there is nothing to do
						if (entries.length === 0) {
							req.soajs.log.debug("No Tenants to remove.");
							return callback();
						}
						
						async.mapSeries(entries, (oneTenantInput, fCb) => {
							//process entry
							req.soajs.inputmaskData.code = oneTenantInput.code;
							tenantsModule.get(context.config, req, {}, (error, tenantRecord) => {
								lib.checkReturnError(req, fCb, {
									error: error,
									code: (error && error.code) ? error.code : 600
								}, () => {
									//tenant found
									if (tenantRecord) {
										req.soajs.log.debug(`Tenant found, checking applications...`);
										
										for (let i = tenantRecord.applications.length - 1; i >= 0; i--) {
											oneTenantInput.applications.forEach((oneApplicationInput) => {
												if (tenantRecord.applications[i].package === oneApplicationInput.package) {
													
													for (let key = tenantRecord.applications[i].keys.length - 1; key >= 0; key--) {
														let oneKey = tenantRecord.applications[i].keys[key];
														//remove config based on env
														delete oneKey.config[context.environmentRecord.code.toLowerCase()];
														
														//remove all ext keys based on env
														for (let extKey = oneKey.extKeys.length - 1; extKey >= 0; extKey--) {
															if (oneKey.extKeys[extKey].env === context.environmentRecord.code.toUpperCase()) {
																oneKey.extKeys.splice(extKey, 1);
															}
														}
														//remove key if no more ext keys
														if (oneKey.extKeys.length === 0) {
															tenantRecord.applications[i].keys.splice(key, 1);
														}
													}
													//if no more keys, remove application
													if (tenantRecord.applications[i].keys.length === 0) {
														tenantRecord.applications.splice(i, 1);
													}
												}
											});
										}
										//if no more application, remove tenant
										if (tenantRecord.applications.length === 0) {
											BL.model.removeEntry(req.soajs, {
												collection: 'tenants',
												conditions: {
													code: tenantRecord.code
												}
											}, (error) => {
												if (error) {
													req.soajs.log.error(error);
												}
												return fCb(null, true);
											});
										}
										
										//update tenant record in database
										else {
											BL.model.saveEntry(req.soajs, {
												collection: 'tenants',
												record: tenantRecord
											}, (error) => {
												if (error) {
													req.soajs.log.error(error);
												}
												return fCb(null, true);
											});
										}
									}
									else {
										return fCb(null, true);
									}
								});
							});
						}, () => {
							req.soajs.log.debug(`Tenants rollback completed ...`);
							return callback(null, true);
						});
					});
				});
			}
			else {
				return callback(null, true);
			}
		}
		else {
			return callback(null, true);
		}
	}
};

module.exports = tenants;