"use strict";

let supportedTTLValues = [6, 12, 24, 48, 72, 96, 120, 144, 168];
function calculateTTL(input) {
	let TTL = input;
	if(TTL >= 3600000){
		TTL = TTL / (3600 * 1000);
	}
	
	if(supportedTTLValues.indexOf(TTL) === -1){
		TTL = 168;
	}
	TTL = TTL * 3600 * 1000;
	return TTL;
}

function addPackage(req, context, productRecord, onePackageInput, productsModule, vCb){
	req.soajs.log.debug(`Creating package...`);
	let newAcl = {};
	newAcl[context.environmentRecord.code.toLowerCase()] = onePackageInput.acl;
	
	req.soajs.inputmaskData = {
		id: productRecord._id.toString(),
		name: onePackageInput.name,
		description: onePackageInput.description,
		_TTL: calculateTTL(onePackageInput._TTL),
		code: onePackageInput.code,
		acl: newAcl
	};
	productsModule.addPackage(context.config, req, {}, vCb);
}

const products = {
	validate: function (req, context, lib, async, BL, modelName, callback) {
		
		if (!context.template.content.productization || !context.template.content.productization.data || !Array.isArray(context.template.content.productization.data) || context.template.content.productization.data.length === 0) {
			//this deployment entry is not found in the template content
			context.errors.push({code: 172, msg: `The template does not support deploying Products`});
			return callback();
		}
		
		// force ui readonly on productization for now
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
				req.soajs.log.debug(`Products have been previously created`);
				return callback(null, true);
			}
		}
		
		req.soajs.log.debug(`Checking Products Entries ...`);
		lib.initBLModel(BL.products.module, modelName, (error, productsModule) => {
			lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
				let entries =[];
				context.template.content.productization.data.forEach((oneEntry) => {
					entries.push(oneEntry);
				});
				
				//there is nothing to do
				if(entries.length === 0){
					req.soajs.log.debug("No Products to create.");
					return callback();
				}
				
				req.soajs.log.debug("Creating Products entries.");
				async.mapSeries(entries, (oneProductInput, fCb) => {
					
					//check if this entry was previously processed
					if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
						if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data){
							context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data.forEach((oneData) =>{
								if(oneData.name === oneProductInput.code){
									req.soajs.log.debug("Product entry already created", oneProductInput.code);
									return fCb({"name": oneProductInput.code});
								}
							});
						}
					}
					
					req.soajs.log.debug("Checking Product entry", oneProductInput.code);
					//process entry
					req.soajs.inputmaskData = {};
					req.soajs.inputmaskData.productCode = oneProductInput.code;
					productsModule.get(context.config, req, {}, (error, productRecord) =>{
						lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
							//product found
							if(productRecord){
								req.soajs.log.debug(`Products found, checking packages...`);
								//check packages
								async.eachSeries(oneProductInput.packages, (onePackageInput, vCb) => {
									
									if(onePackageInput.code.indexOf("_") !== -1){
										onePackageInput.code = onePackageInput.code.split("_")[1];
									}
									
									req.soajs.inputmaskData ={
										productCode : oneProductInput.code,
										packageCode: oneProductInput.code + "_" + onePackageInput.code
									};
									productsModule.getPackage(context.config, req, {}, (error, packageRecord) =>{
										lib.checkReturnError(req, vCb, {error: (error && (!error.code || error.code !== 461)), code: (error && error.code ) ? error.code: 600}, () => {
											//package found
											if(packageRecord){
												req.soajs.log.debug(`Package found, updating ACL...`);
												let newAcl = packageRecord.acl;
												newAcl[context.environmentRecord.code.toLowerCase()] = onePackageInput.acl;
												
												req.soajs.inputmaskData = {
													id: productRecord._id.toString(),
													name: packageRecord.name,
													description: packageRecord.description,
													_TTL: calculateTTL(packageRecord._TTL),
													code: onePackageInput.code,
													acl: newAcl
												};
												productsModule.updatePackage(context.config, req, {}, vCb);
											}
											else{
												addPackage(req, context, productRecord, onePackageInput, productsModule, vCb);
											}
										});
									});
								}, (error) =>{
									lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
										return fCb(null, {name: productRecord.code});
									});
								});
							}
							else{
								req.soajs.log.debug(`Products not found, creating product ...`);
								req.soajs.inputmaskData = {
									code: oneProductInput.code,
									name: oneProductInput.name,
									description: oneProductInput.description
								};
								productsModule.add(context.config, req, {}, (error, productId) => {
									lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
										req.soajs.inputmaskData = {};
										req.soajs.inputmaskData.id = productId;
										productsModule.get(context.config, req, {}, (error, productRecord) =>{
											lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
												//add packages
												async.eachSeries(oneProductInput.packages, (onePackageInput, vCb) => {
													addPackage(req, context, productRecord, onePackageInput, productsModule, vCb);
												}, (error) =>{
													lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
														return fCb(null, {name: productRecord.code});
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
					req.soajs.log.debug(`Products deployment completed ...`);
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
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Rolling back Products created`);
				
				lib.initBLModel(BL.products.module, modelName, (error, productsModule) => {
					lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
						
						let entries =[];
						context.template.content.productization.data.forEach((oneEntry) => {
							entries.push(oneEntry);
						});
						
						//there is nothing to do
						if(entries.length === 0){
							req.soajs.log.debug("No Products to rollback.");
							return callback();
						}
						
						async.mapSeries(entries, (oneProductInput, fCb) => {
							
							req.soajs.log.debug("Checking Product entry", oneProductInput.code);
							//process entry
							req.soajs.inputmaskData.productCode = oneProductInput.code;
							productsModule.get(context.config, req, {}, (error, productRecord) =>{
								lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
									//product found
									if(productRecord){
										req.soajs.log.debug(`Products found, checking packages...`);
										
										//remove package with acl related to this environment
										for(let i = productRecord.packages.length -1; i >= 0; i--){
											delete productRecord.packages[i].acl[context.environmentRecord.code.toLowerCase()];
											
											//if acl is empty, remove package
											if(Object.keys(productRecord.packages[i].acl).length === 0){
												productRecord.packages.splice(i, 1);
											}
										}
										
										//if no more package, remove product
										if(productRecord.packages.length === 0){
											productsModule.model.removeEntry(req.soajs, {
												collection: 'products',
												conditions: {
													code: productRecord.code
												}
											}, (error) =>{
												if(error){
													req.soajs.log.error(error);
												}
												return fCb(null, true);
											});
										}
										
										//update product record in database
										else{
											productsModule.model.saveEntry(req.soajs, {
												collection: 'products',
												record: productRecord
											}, (error) =>{
												if(error){
													req.soajs.log.error(error);
												}
												return fCb(null, true);
											});
										}
									}
									else{
										return fCb(null, true);
									}
								});
							});
						}, () => {
							req.soajs.log.debug(`Products rollback completed ...`);
							return callback(null, true);
						});
					});
				});
			}
			else{
				return callback(null, true);
			}
		}
		else{
			return callback(null, true);
		}
	}
};

module.exports = products;