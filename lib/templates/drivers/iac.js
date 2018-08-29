"use strict";
let colName = 'templates';
let soajsUtils = require('soajs.core.libs').utils;
const templates = require('../../cloud/infra/templates');
const fs = require('fs');
const driver = {

	"check": function (req, context, lib, async, BL, callback) {
		//validate if iac schema is valid
		let template = context.template;
        let deployer = context.deployer;
		let schema = {
			'type': 'object',
			"properties": {
				"soajs_project": {
					"source": ['query.soajs_project'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				'name': {
					'required': true,
					'type': 'string'
				},
				'infra': {
					'type': 'object',
					'required': true,
					'properties': {
						'name': {
							"required": true,
							"type": "string"
						}
					}
				},
				'location': {
					'required': true,
					'type': 'string'
				},
				'description': {
					'required': false,
					'type': 'string'
				},
				'content': {
					'required': false,
					'type': 'string'
				},
				'inputs': {
					'required': false,
					'type': 'array'
				},
				'display': {
					'required': false,
					'type': 'object'
				},
				'imfv': {
					'required': false,
					'type': 'object'
				},
				'driver': {
					'type': 'string',
					'required': true
				},
				'technology': {
					'required': true,
					'type': 'string'
				},
				'tags': {
					'required': false,
					'type': 'object'
				},
				'textMode': {
					'required': false,
					'type': 'boolean'
				}
			},
		};

		let myValidator = new req.soajs.validator.Validator();

		//validate template schema and check if provider and template already exist
		if (template.content && template.content.iac && template.content.iac.data && template.content.iac.data.length > 0) {
			let iac = template.content.iac.data;
			async.eachSeries(iac, (oneRecipe, cb) => {

				//validate template schema
				let status = myValidator.validate(oneRecipe, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({
							code: 173,
							msg: `<b>${oneRecipe.name}</b>: ` + err.stack,
							group: "Infra As Code Template"
						})
					});
					return cb();
				}
				else {
					let opts = {
						conditions: {
							type: '_infra',
							name: oneRecipe.name,
							driver: oneRecipe.driver,
							technology: oneRecipe.technology
						},
						collection: colName,
					};
					let opt = {
						collection: "infra",
						conditions: {
							name: oneRecipe.infra.name
						}
					};

					//check for duplicates
					async.parallel({

						//if template is store locally in the database
						'checkLocal': (sCb) => {
							if (oneRecipe.location === 'local') {
								BL.model.countEntries(req.soajs, opts, function (error, count) {
									lib.checkReturnError(req, sCb, {
										config: context.config,
										error: error,
										code: 600
									}, () => {
										if (count && count !== 0) {
											context.errors.push({
												"code": 967,
												"msg": `<b>${oneRecipe.name}</b> already exists for provider <b>${oneRecipe.infra.name}</b> => ${oneRecipe.infra.name}/${oneRecipe.name}`,
												'entry': {
													'name': oneRecipe.name,
													'provider': oneRecipe.infra.name,
													'type': 'iac',
													'conflict': 'name'
												}
											})
										}
										sCb();
									});
								});
							} else {
								sCb();
							}
						},

						//check if provider exists based on driver name
						'checkProvider': (sCb) => {
							BL.model.countEntries(req.soajs, opt, function (error, infraCount) {
								lib.checkReturnError(req, sCb, {
									config: context.config,
									error: error,
									code: 600
								}, () => {
									if (infraCount === 0) {
										context.errors.push({
											"code": 967,
											"msg": `Provider: <b>${oneRecipe.infra.name}</b> not found => ${oneRecipe.infra.name}/${oneRecipe.name}`,
											'entry': {
												'name': oneRecipe.name,
												'provider': oneRecipe.infra.name,
												'type': 'iac',
												'conflict': 'provider'
											}
										})
									}
									sCb();
								})
							});
						},

						//if template is stored remotely on the cloud provider cdn
						'checkExternal': (sCb) => {
							if (oneRecipe.location === 'external') {
								let opt = {
									collection: 'infra',
									conditions: {
										name: oneRecipe.infra.name
									}
								};
								BL.model.findEntries(req.soajs, opt, function (err, InfraRecord) {
									lib.checkReturnError(req, sCb, {
										config: context.config,
										error: err,
										code: 600
									}, function () {
                                        let copiedIMFV = soajsUtils.cloneObj(req.soajs.inputmaskData);
                                        async.forEach(InfraRecord, (oneInfra, iCb) => {
                                            req.soajs.inputmaskData = soajsUtils.cloneObj(copiedIMFV);
                                            let getFilesOptions = {
                                                soajs: req.soajs,
                                                env: process.env.SOAJS_ENV.toLowerCase(),
                                                model: BL.model
                                            };
                                            getFilesOptions.infra = oneInfra;
                                            deployer.execute({
                                                'type': 'infra',
                                                'driver': oneInfra.name,
                                                'technology': 'cluster'
                                            }, 'getFiles', getFilesOptions, (error, templates) => {

                                                req.soajs.inputmaskData = soajsUtils.cloneObj(copiedIMFV);
                                                lib.checkReturnError(req, iCb, {
                                                    config: context.config,
                                                    error: error,
                                                    code: 600
                                                }, function () {
                                                    let foundSameName = false;
                                                    templates.forEach((oneTemplate) => {
                                                        if (oneTemplate.name === oneRecipe.name) {
                                                            foundSameName = true;
                                                        }
                                                    });
                                                    if (foundSameName) {
                                                        context.errors.push({
                                                            "code": 967,
                                                            "msg": `<b>${oneRecipe.name}</b> already exists for provider <b>${oneRecipe.infra.name}</b> => ${oneRecipe.infra.name}/${oneRecipe.name}`,
                                                            'entry': {
                                                                'name': oneRecipe.name,
                                                                'provider': oneRecipe.infra.name,
                                                                'type': 'iac',
                                                                'conflict': 'name'
                                                            }
                                                        })
                                                    }
                                                    iCb();
                                                })
                                            })
                                        }, sCb);
                                    });
                                });
							} else {
								sCb();
							}
						}
						,
					}, cb);
				}
			}, callback);
		} else {
			return callback();
		}
	},

	"merge": function (req, context, lib, async, BL, callback) {
		if (req.soajs.inputmaskData.correction && req.soajs.inputmaskData.correction.iac) {
			req.soajs.inputmaskData.correction.iac.forEach((oneIacInput) => {
				if (context.template.content && context.template.content.iac && context.template.content.iac.data && context.template.content.iac.data.length > 0) {
					context.template.content.iac.data.forEach((oneIacRecipe) => {
						if (oneIacInput.old === oneIacRecipe.name) {
							if (oneIacInput.new && oneIacInput.new !== undefined) {
								oneIacRecipe.name = oneIacInput.new;
							}
							if (oneIacInput.provider && oneIacInput.provider !== undefined) {
								oneIacRecipe.infra.name = oneIacInput.provider;
							}
						}
					});
				}
			});
		}
		return callback();
	},

	"save": function (req, context, lib, async, BL, callback) {
        let deployer = context.deployer;
		if (context.template.content && context.template.content.iac && context.template.content.iac.data && context.template.content.iac.data.length > 0) {
			lib.initBLModel('iac', (error, iacModel) => {
				lib.checkReturnError(req, callback, {config: context.config, error: error, code: 600}, () => {
					let iac = context.template.content.iac.data;
					let opts = {
						collection: 'infra'
					};
					//find the infra provider of this template
					BL.model.findEntries(req.soajs, opts, (error, infraRecords) => {
						lib.checkReturnError(req, callback, {config: context.config, error: error, code: 600}, () => {
							async.eachSeries(iac, (oneRecipe, cb) => {
								async.forEach(infraRecords, (oneProvider, lCb) => {
									//if template is locate, use module to store in soajs console
									if (oneRecipe.location === 'local') {
										if (oneProvider.name === oneRecipe.infra.name) {
											req.soajs.inputmaskData = {};
											req.soajs.inputmaskData.template = oneRecipe;
											req.soajs.inputmaskData.id = oneProvider._id.toString();
											iacModel.addTemplate(context.config, req.soajs, (error) => {
												lib.checkReturnError(req, lCb, {
													config: context.config,
													error: error,
													code: 600
												}, () => {
													lCb();
												});
											});
										} else {
											lCb();
										}
									}
									//if template is external, call cloostro and send template to cloud provider cdn
									else if (oneRecipe.location === 'external') {
										if (oneProvider.name === oneRecipe.infra.name) {

											let tempfilepath = __dirname + "/" + oneRecipe.name + "-" + new Date().getTime();

											let myRecipe = soajsUtils.cloneObj(oneRecipe);
											delete myRecipe.inputs;
											delete myRecipe.imfv;
											delete myRecipe.display;
											delete myRecipe.location;
											delete myRecipe.infra;
											myRecipe.type = 'template';

											fs.writeFile(tempfilepath, JSON.stringify(myRecipe, null, 2), (err) => {
												if (err) {
													return callback({code: 600, msg: err.toString()});
												}

												let readFileStream = fs.createReadStream(tempfilepath);
												let stat = fs.statSync(tempfilepath);
												let options = {
													infra: oneProvider,
												};
												options.params = {
													name: myRecipe.name,
													description: myRecipe.description || '',
													contenttype: 'application/octet-stream',
													size: stat.size,
													stream: readFileStream,
												};

												options.params.tags = {
													"driver": myRecipe.driver,
													'technology': myRecipe.technology,
													'type': myRecipe.type
												};
                                                let copiedIMFV = soajsUtils.cloneObj(req.soajs.inputmaskData);
                                                req.soajs.inputmaskData = soajsUtils.cloneObj(copiedIMFV);
												deployer.execute({
													'type': 'infra',
													'driver': oneProvider.name,
													'technology': 'cluster'
												}, 'uploadFile', options, (error) => {
													lib.checkReturnError(req, lCb, {
														config: context.config,
														error: error,
														code: 600
													}, function () {
                                                        req.soajs.inputmaskData = soajsUtils.cloneObj(copiedIMFV);
														fs.unlinkSync(tempfilepath);
														if (oneRecipe.inputs) {
															req.query = {};
															req.soajs.inputmaskData = {};
															req.query.id = oneProvider._id.toString();
															req.soajs.inputmaskData.name = myRecipe.name;

															if (oneRecipe.inputs && oneRecipe.inputs.length > 0) {
																req.soajs.inputmaskData.inputs = oneRecipe.inputs;
															}
															if (oneRecipe.display && Object.keys(oneRecipe.display).length > 0) {
																req.soajs.inputmaskData.display = oneRecipe.display;
															}
															if (oneRecipe.imfv && Object.keys(oneRecipe.imfv).length > 0) {
																req.soajs.inputmaskData.imfv = oneRecipe.imfv;
															}
                                                            let copiedIMFV = soajsUtils.cloneObj(req.soajs.inputmaskData);
                                                            req.soajs.inputmaskData = soajsUtils.cloneObj(copiedIMFV);
															iacModel.uploadTemplateInputsFile(context.config, req, req.soajs, deployer, (error) => {
																lib.checkReturnError(req, lCb, {
																	config: context.config,
																	error: error,
																	code: 600
																}, () => {
                                                                    req.soajs.inputmaskData = soajsUtils.cloneObj(copiedIMFV);
																	lCb();
																});
															});
														} else {
															lCb();
														}
													});
												});
											});
										} else {
											lCb();
										}
									}
									else {
										lCb();
									}
								}, cb);
							}, callback);
						});
					});
				});
			});
		} else {
			return callback();
		}
	},

	"export": function (req, context, lib, async, BL, callback) {
		let deployer = context.deployer;
		context.dbData.iac = [];
		async.series({
			//if template is local, fetch it from the database
			'checkIacLocal': (rCb) => {
				if (req.soajs.inputmaskData.iac && req.soajs.inputmaskData.iac.length > 0) {
					let iac = req.soajs.inputmaskData.iac;
					async.map(iac, (oneIacId, cb) => {
						try {
							oneIacId = new BL.model.getDb(req.soajs).ObjectId(oneIacId);
							return cb(null, oneIacId);
						}
						catch (e) {
							return cb(e);
						}
					}, (error, ids) => {
						lib.checkReturnError(req, rCb, {
							config: context.config,
							error: error,
							code: 600
						}, () => {

							if (ids && ids.length > 0) {
								BL.model.findEntries(req.soajs, {
									"collection": "templates",
									"conditions": {"type": "_infra", "_id": {"$in": ids}}
								}, (error, records) => {
									lib.checkReturnError(req, rCb, {
										config: context.config,
										error: error,
										code: 600
									}, () => {
										async.map(records, (oneRecord, mCb) => {
											let id = new BL.model.getDb(req.soajs).ObjectId(oneRecord.infra);
											BL.model.findEntries(req.soajs, {
												"collection": "infra",
												"conditions": {"_id": id}
											}, (error, provider) => {
												lib.checkReturnError(req, mCb, {
													config: context.config,
													error: error,
													code: 600
												}, () => {
													delete oneRecord._id;
													delete oneRecord.sha;
													delete oneRecord.locked;
													delete oneRecord.type;
													delete oneRecord.deletable;
													oneRecord.infra = {
														name: provider[0].name
													};
													context.dbData.iac.push(oneRecord);
													return mCb();
												});
											});
										}, rCb);
									});
								});
							}
							else {
								rCb();
							}
						});
					});
				}
				else {
					rCb();
				}
			},

			//if template is local, fetch it from the cloud provider cdn
			'checkIacExternal': (rCb) => {
				if (req.soajs.inputmaskData.external && req.soajs.inputmaskData.external && req.soajs.inputmaskData.external.iac && req.soajs.inputmaskData.external.iac.length > 0) {
					let external = req.soajs.inputmaskData.external.iac;
					async.forEach(external, (oneExternal, eCb) => {
						let opt = {
							collection: 'infra',
							conditions: {
								name: oneExternal.split('__')[1] // name of infra
							}
						};
						//get the infra of this template
						BL.model.findEntries(req.soajs, opt, function (err, InfraRecord) {
							lib.checkReturnError(req, eCb, {
								config: context.config,
								error: err,
								code: 600
							}, function () {
								async.forEach(InfraRecord, (oneInfra, iCb) => {
									let myInfra = soajsUtils.cloneObj(oneInfra);
									myInfra.templatesTypes = soajsUtils.cloneObj(myInfra.templates);
									let options = {
										soajs: req.soajs,
										env: process.env.SOAJS_ENV.toLowerCase(),
										model: BL.model
									};
									options.infra = myInfra;
									req.soajs.inputmaskData.fullTemplate = true;
                                    let copiedIMFV = soajsUtils.cloneObj(req.soajs.inputmaskData);
                                    req.soajs.inputmaskData = soajsUtils.cloneObj(copiedIMFV);
									templates.getRemoteTemplates(req.soajs, context.config, {}, myInfra, deployer, options, () => {
                                        req.soajs.inputmaskData = soajsUtils.cloneObj(copiedIMFV);
										if (myInfra.templates && myInfra.templates.length > 0) {
											async.forEach(myInfra.templates, (oneTemplate, tCb) => {
												if (oneTemplate.name === oneExternal.split('__')[0]) {
													delete oneTemplate._id;
													oneTemplate.type = '_infra';
													oneTemplate.location = 'external';
													oneTemplate.infra = {
														name: oneInfra.name
													};
													context.dbData.iac.push(oneTemplate);
													tCb();
												} else {
													tCb();
												}
											}, iCb);
										} else {
											iCb();
										}
									});
								}, eCb);
							});
						});
					}, rCb);
				} else {
					rCb();
				}
			}
		}, callback);
	}
};

module.exports = driver;
