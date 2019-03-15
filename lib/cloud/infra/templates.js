'use strict';
const fs = require("fs");
const async = require("async");
const formidable = require('formidable');
const EasyZip = require('easy-zip').EasyZip;

const utils = require("../../../utils/utils.js");
let colName = "infra";

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

function validateId(soajs, BL, cb) {
	BL.model.validateId(soajs, cb);
}

const infraTemplatesModule = {

	/**
	 * retrieves the templates from the database
	 * @param soajs
	 * @param config
	 * @param BL
	 * @param oneInfra
	 * @param cbMain
	 * @returns {*}
	 */
	"getLocalTemplates": (soajs, config, BL, oneInfra, cbMain) => {
		if (!oneInfra.templatesTypes || oneInfra.templatesTypes.indexOf('local') === -1) {
			return cbMain();
		}

		oneInfra.templates = [];
		let opts = {
			collection: "templates",
			conditions: {
				"type": "_infra",
				"infra": oneInfra._id.toString()
			}
		};
		BL.model.findEntries(soajs, opts, function (error, records) {
			checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
				async.map(records, function(oneRecord, callback) {
					if(oneRecord.inputs && typeof(oneRecord.inputs) === 'string') {
						oneRecord.inputs = JSON.parse(oneRecord.inputs);
					}
					if(oneRecord.display && typeof(oneRecord.display) === 'string') {
						oneRecord.display = JSON.parse(oneRecord.display);
					}
					if(oneRecord.imfv && typeof(oneRecord.imfv) === 'string') {
						oneRecord.imfv = JSON.parse(oneRecord.imfv);
					}
					return callback(null, oneRecord);
				}, function(error, updatedResponse) {
					oneInfra.templates = updatedResponse;
					return cbMain();
				});
			});
		});
	},

	/**
	 * retrieves the templates from the remote infra provider
	 * @param soajs
	 * @param config
	 * @param BL
	 * @param oneInfra
	 * @param deployer
	 * @param options
	 * @param cbMain
	 * @returns {*}
	 */
	"getRemoteTemplates": (soajs, config, BL, oneInfra, deployer, options, cbMain) => {
		if (!oneInfra.templatesTypes || oneInfra.templatesTypes.indexOf('external') === -1) {
			return cbMain();
		}

		oneInfra.templates = [];
		//get resion api info by calling deployer
		deployer.execute({
			'type': 'infra',
			'driver': oneInfra.name,
			'technology': 'cluster'
		}, 'getFiles', options, (error, templates) => {
			checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
				if(!templates || templates.length === 0){
					return cbMain();
				}

                let templateInputs = {}, templatesContent = {};
				async.eachSeries(templates, (oneTemplate, fCb) => {
                    options.params = {id: oneTemplate.id};
                    deployer.execute({
                        'type': 'infra',
                        'driver': oneInfra.name,
                        'technology': 'cluster'
                    }, 'downloadFile', options, (error, response) => {
                        checkIfError(soajs, fCb, {
                            config: config,
                            error: error,
                            code: 600
                        }, function () {
                            if (oneTemplate.type && oneTemplate.type === 'inputsAndDisplay') {
                                if(typeof(response.content) === 'object'){
                                    templateInputs[oneTemplate.tags.template] = response.content;
                                }
                                else{
                                    try{
                                        templateInputs[oneTemplate.tags.template] = JSON.parse(response.content);
                                    }
                                    catch(e){
                                        soajs.log.error(e);
                                    }
                                }
                            }
                            else if(oneTemplate.type && oneTemplate.type === 'template') {
								templatesContent[oneTemplate.name] = response.content;
                            }
                            return fCb();
                        });
                    });
				}, (error) => {
					checkIfError(soajs, cbMain, {
						config: config,
						error: error,
						code: (error && error.code) ? error.code : 600
					}, () => {
						async.each(templates, (oneTemplate, lCb) => {
							if (oneTemplate.type && oneTemplate.type === 'template') {
								let myTemplate = {
									_id: oneTemplate.id,
									name: oneTemplate.name,
									description: oneTemplate.description,
									location: "external",
									driver: oneTemplate.driver,
									technology: oneTemplate.technology,
									tags: oneTemplate.tags
								};

                                if(soajs.inputmaskData.fullTemplate && templatesContent[oneTemplate.name]) {
                                    myTemplate.content = templatesContent[oneTemplate.name];
                                    if(typeof myTemplate.content === 'object'){
                                        myTemplate.content = JSON.stringify(myTemplate.content);
                                    }
                                }
								
								if(templateInputs && templateInputs[oneTemplate.id]){
									myTemplate.inputs = templateInputs[oneTemplate.id].inputs;
									if(typeof myTemplate.inputs === 'string'){
										myTemplate.inputs = JSON.parse(myTemplate.inputs);
									}
									myTemplate.display = templateInputs[oneTemplate.id].display;
									if(typeof myTemplate.display === 'string'){
										myTemplate.display = JSON.parse(myTemplate.display);
									}
									myTemplate.imfv = templateInputs[oneTemplate.id].imfv;
									if(typeof myTemplate.imfv === 'string'){
										myTemplate.imfv = JSON.parse(myTemplate.imfv);
									}
								}

								oneInfra.templates.push(myTemplate);

							}
							return lCb();
						}, cbMain);
					});
				});
			});
		});
	},

	/**
	 * removes an infra as code template from the database
	 * @param config
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	"removeTemplate": function (config, soajs, BL, deployer, cbMain) {
		//validate id
		validateId(soajs, BL, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {

						try {
							let options = {
								collection: "templates",
								conditions: {
									"type": "_infra",
									"_id": new BL.model.getDb(soajs).ObjectId(soajs.inputmaskData.templateId),
									"infra": InfraRecord._id.toString()
								}
							};

							//only works with local templates
							BL.model.removeEntry(soajs, options, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
									return cbMain(null, true);
								});
							});
						}
						catch (e) {
							if (e.message === 'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters') {
								let options = {
									soajs: soajs,
									env: process.env.SOAJS_ENV.toLowerCase(),
									model: BL.model
								};
								options.infra = InfraRecord;

								options.params = {
									id: soajs.inputmaskData.templateId
								};

								//get resion api info by calling deployer
								deployer.execute({
									'type': 'infra',
									'driver': InfraRecord.name,
									'technology': 'cluster'
								}, 'deleteFile', options, (error) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
										// return cbMain(null, true);

										//get files from bucket
										deployer.execute({
											'type': 'infra',
											'driver': InfraRecord.name,
											'technology': 'cluster'
										}, 'getFiles', options, (error, files) => {
											checkIfError(soajs, cbMain, {
												config: config,
												error: error,
												code: 600
											}, function () {
												//loop over files and find the complimentary (if any) to be deleted
												async.each(files, function(oneFile, callback) {
													if (oneFile.type === "inputsAndDisplay" && oneFile.template === soajs.inputmaskData.templateName) {
														let compOptions = options;
														compOptions.params.id = oneFile.id;

														deployer.execute({
															'type': 'infra',
															'driver': InfraRecord.name,
															'technology': 'cluster'
														}, 'deleteFile', compOptions, (error) => {
															return callback(error);
														});
													}
													else {
														return callback();
													}
												}, function (error) {
													checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
														return cbMain(null, true);
													});
												});
											});
										});
									});
								});
							}
							else {
								return cbMain({code: 173, msg: e.message});
							}
						}
					});
				});
			});
		});
	},

	/**
	 * stores a new infra as code template locally in the database for the given infra provider
	 * @param config
	 * @param soajs
	 * @param BL
	 * @param cbMain
	 */
	"addTemplate": function (config, soajs, BL, cbMain) {
		//validate id
		validateId(soajs, BL, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err || !InfraRecord, code: 600}, function () {
						checkIfError(soajs, cbMain, {
							config: config,
							error: !InfraRecord.templates || InfraRecord.templates.indexOf('local') === -1,
							code: 492
						}, function () {

							let opts2 = {
								collection: "templates",
								conditions: {
									name: soajs.inputmaskData.template.name,
									type: "_infra",
									infra: InfraRecord._id.toString()
								}
							};

							//search collection for template with same name
							BL.model.countEntries(soajs, opts2, function (err, count) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
									//return error that template with same name already exists in case count is !== 0
									checkIfError(soajs, cbMain, {config: config, error: count !== 0, code: 480}, function () {

										let options = {
											collection: "templates",
											record: {
												"type": "_infra",
												"infra": InfraRecord._id.toString(),
												"location": "local",
												"deletable": true,
												"textMode": soajs.inputmaskData.template.textMode,
												"driver": soajs.inputmaskData.template.driver,
												"technology": soajs.inputmaskData.template.technology,
												"name": soajs.inputmaskData.template.name,
												"description": soajs.inputmaskData.template.description,
												"content": soajs.inputmaskData.template.content
											}
										};
										
										options.record.inputs = '[]';
										if (soajs.inputmaskData.template.inputs) {
											if(typeof soajs.inputmaskData.template.inputs !== 'string'){
												soajs.inputmaskData.template.inputs = JSON.stringify(soajs.inputmaskData.template.inputs);
											}
											options.record.inputs = soajs.inputmaskData.template.inputs;
										}
										
										options.record.display = '{}';
										if (soajs.inputmaskData.template.display) {
											if(typeof soajs.inputmaskData.template.display !== 'string'){
												soajs.inputmaskData.template.display = JSON.stringify(soajs.inputmaskData.template.display);
											}
											options.record.display = soajs.inputmaskData.template.display;
										}
										
										options.record.imfv= '{}';
										if (soajs.inputmaskData.template.imfv) {
											if(typeof soajs.inputmaskData.template.imfv !== 'string'){
												soajs.inputmaskData.template.imfv = JSON.stringify(soajs.inputmaskData.template.imfv);
											}
											options.record.imfv = soajs.inputmaskData.template.imfv;
										}
										
										if (soajs.inputmaskData.template.tags) {
											options.record.tags = soajs.inputmaskData.template.tags;
										}

										BL.model.insertEntry(soajs, options, function (err) {
											checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
												return cbMain(null, true);
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	},

	/**
	 * update an infra as code template that is stored locally
	 * @param config
	 * @param soajs
	 * @param BL
	 * @param cbMain
	 */
	"updateTemplate": function (config, soajs, BL, cbMain) {
		//validate id
		validateId(soajs, BL, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get provider record
				let opts = {
					collection: 'templates',
					conditions: {
						type: '_infra',
						infra: {$exists: true},
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, templateRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {
							config: config,
							error: templateRecord.location !== 'local',
							code: 493
						}, function () {

							templateRecord.name = soajs.inputmaskData.template.name;
							templateRecord.description = soajs.inputmaskData.template.description;
							templateRecord.content = soajs.inputmaskData.template.content;
							
							if(soajs.inputmaskData.template.inputs && typeof soajs.inputmaskData.template.inputs !== 'string'){
								soajs.inputmaskData.template.inputs = JSON.stringify(soajs.inputmaskData.template.inputs);
							}
							if(soajs.inputmaskData.template.display && typeof soajs.inputmaskData.template.display !== 'string'){
								soajs.inputmaskData.template.display = JSON.stringify(soajs.inputmaskData.template.display);
							}
							if(soajs.inputmaskData.template.imfv && typeof soajs.inputmaskData.template.imfv !== 'string'){
								soajs.inputmaskData.template.imfv = JSON.stringify(soajs.inputmaskData.template.imfv);
							}
							templateRecord.inputs = soajs.inputmaskData.template.inputs || '[]';
							templateRecord.display = soajs.inputmaskData.template.display || '{}';
							templateRecord.imfv = soajs.inputmaskData.template.imfv || '{}';
							
							templateRecord.driver = soajs.inputmaskData.template.driver;
							templateRecord.technology = soajs.inputmaskData.template.technology;
							templateRecord.textMode = soajs.inputmaskData.template.textMode;
							templateRecord.tags = soajs.inputmaskData.template.tags;

							let options = {
								collection: 'templates',
								record: templateRecord
							};
							BL.model.saveEntry(soajs, options, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
									return cbMain(null, true);
								});
							});
						});
					});
				});
			});
		});
	},

	/**
	 * Uploads a template to the remote infra provider CDN
	 * @param config
	 * @param req
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	"uploadTemplate": function (config, req, soajs, BL, deployer, cbMain) {
		let form = new formidable.IncomingForm();
		form.encoding = 'utf-8';
		form.keepExtensions = true;

		//validate id
		req.soajs.inputmaskData = {id: req.query.id};
		validateId(soajs, BL, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {
							config: config,
							error: InfraRecord.templates.indexOf('external') === -1,
							code: 494
						}, function () {
							let getFilesOptions = {
								soajs: soajs,
								env: process.env.SOAJS_ENV.toLowerCase(),
								model: BL.model
							};
							getFilesOptions.infra = InfraRecord;

							deployer.execute({
								'type': 'infra',
								'driver': InfraRecord.name,
								'technology': 'cluster'
							}, 'getFiles', getFilesOptions, (error, templates) => {
								checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
									let foundSameName = false;
									//check if template with same name already exists
									templates.forEach((oneTemplate) => {
										if (oneTemplate.name === req.query.name) {
											foundSameName = true;
										}
									});
									
									checkIfError(soajs, cbMain, {config: config, error: (foundSameName && req.query.action !== 'edit'), code: 480}, function () {

										let options = {
											soajs: soajs,
											env: process.env.SOAJS_ENV.toLowerCase(),
											model: BL.model
										};
										options.infra = InfraRecord;


										try {
											form.onPart = function (part, fileSize) {
												if (!part) {
													return cbMain({code: 172, msg: "No Uploaded File Detected in request !"});
												}

												if (!part.filename) return form.handlePart(part);

												let tempfilepath = __dirname + "/" + part.filename + "-" + new Date().getTime();
												let writeStream = fs.createWriteStream(tempfilepath);

												part.pipe(writeStream);

												writeStream.on('error', function (error) {
													return cb({code: 600, msg: error.toString()});
												});

												//once file is written, unzip it and parse it
												writeStream.on('close', function () {

													let readFileStream = fs.createReadStream(tempfilepath);
													let stat = fs.statSync(tempfilepath);

													options.params = {
														name: req.query.name || part.filename,
														description: req.query.description || '',
														contenttype: part.mime,
														size: stat.size,
														stream: readFileStream,
													};

													if (req.query.tags) {
														options.params.tags = req.query.tags;
													}

													deployer.execute({
														'type': 'infra',
														'driver': InfraRecord.name,
														'technology': 'cluster'
													}, 'uploadFile', options, (error) => {
														checkIfError(soajs, cbMain, {
															config: config,
															error: error,
															code: 600
														}, function () {
															fs.unlinkSync(tempfilepath);
															return cbMain(null, true);
														});
													});
												});

											};
											form.parse(req);
										}
										catch (e) {
											return cbMain({code: 173, msg: e.toString()});
										}
									});
								});
							});
						});
					});
				});
			});
		});
	},

	/**
	 * Method that generates a file from the posted body inputs and sends it to the cloostro driver to store it on remote location
	 * @param config
	 * @param req
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	"uploadTemplateInputsFile": function (config, req, soajs, BL, deployer, cbMain) {
		//validate id
		req.soajs.inputmaskData.id = req.query.id;
		validateId(soajs, BL, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {
							config: config,
							error: InfraRecord.templates.indexOf('external') === -1,
							code: 494
						}, function () {

							let options = {
								soajs: soajs,
								env: process.env.SOAJS_ENV.toLowerCase(),
								model: BL.model
							};
							options.infra = InfraRecord;

							let x = {};

							//check if there are any inputs or display options and add them to the temp object x
							if (req.soajs.inputmaskData.inputs && Object.keys(req.soajs.inputmaskData.inputs).length > 0) {
								x.inputs = req.soajs.inputmaskData.inputs;
							}

							if (req.soajs.inputmaskData.display && Object.keys(req.soajs.inputmaskData.display).length > 0) {
								x.display = req.soajs.inputmaskData.display;
							}

							if (req.soajs.inputmaskData.imfv && Object.keys(req.soajs.inputmaskData.imfv).length > 0) {
								x.imfv = req.soajs.inputmaskData.imfv;
							}

							//stringify object X to write onto file
							let inputsAndDisplay = JSON.stringify(x, null, 2);

							if (inputsAndDisplay && inputsAndDisplay.length > 0) {
								let complimentaryFilePath = __dirname + "/" + req.soajs.inputmaskData.name + "-" + new Date().getTime() + "__comp";

								fs.writeFile(complimentaryFilePath, inputsAndDisplay, (error) => {
									//error while writing complimentary file
									if (error) {
										return cbMain(error);
									}

									//complimentary file created successfully and can be uploaded
									let compFileStream = fs.createReadStream(complimentaryFilePath);
									let compFileStat = fs.statSync(complimentaryFilePath);
									let compOptions = options;

									//TODO: double check to make sure this is correct
									compOptions.params = {
										name: ('comp__' + req.soajs.inputmaskData.name),
										description: '',
										contenttype: 'application/octet-stream',
										size: compFileStat.size,
										stream: compFileStream
									};

									compOptions.params.tags = JSON.stringify({
										"type": "inputsAndDisplay",
										"template": req.soajs.inputmaskData.name
									});

									deployer.execute({
										'type': 'infra',
										'driver': InfraRecord.name,
										'technology': 'cluster'
									}, 'uploadFile', compOptions, (error) => {
										checkIfError(soajs, cbMain, {
											config: config,
											error: error,
											code: 600
										}, function () {
											fs.unlinkSync(complimentaryFilePath);
											return cbMain(null, true);
										});
									});
								});
							}
						});
					});
				});
			});
		});
	},

	/**
	 * Downloads a template from the remote infra provider CDN
	 * @param config
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param res
	 * @param cbMain
	 */
	"downloadTemplate": function (config, soajs, BL, deployer, res, cbMain) {

		//validate id
		validateId(soajs, BL, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {config: config, error: InfraRecord.templates.indexOf('external') === -1, code: 494}, function () {
							//array of files to download from infra provider
							let filesToDownload = [];

							let options = {
								soajs: soajs,
								env: process.env.SOAJS_ENV.toLowerCase(),
								model: BL.model
							};
							options.infra = InfraRecord;

							//get files from infra provider and search for complimentary file (if any)
							deployer.execute({
								'type': 'infra',
								'driver': InfraRecord.name,
								'technology': 'cluster'
							}, 'getFiles', options, (error, files) => {
								checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
									//loop over files and the complimentary file (if any) to be compressed together with the template file
									files.forEach(oneFile => {
										if(oneFile.type === 'template' && oneFile.id === soajs.inputmaskData.templateId) {
											filesToDownload.push(oneFile);
										}
										else if (oneFile.type === 'inputsAndDisplay' && oneFile.template === soajs.inputmaskData.templateId) {
											filesToDownload.push(oneFile);
										}
									});

									checkIfError(soajs, cbMain, {config: config, error: filesToDownload.length === 0, code: 482}, function () {
										//used mapSeries to avoid overlapping file content
										async.mapSeries(filesToDownload, function (oneFile, callback) {
											options.params = {
												id: oneFile.id
											};

											deployer.execute({
												'type': 'infra',
												'driver': InfraRecord.name,
												'technology': 'cluster'
											}, 'downloadFile', options, (error, response) => {
												if (error) {
													return callback(error);
												}

												return callback(null, {
													fileName: oneFile.id,
													data: response.content,
													record: oneFile
												});
											});
										}, function(error, downloadedFiles) {
											checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
												if(soajs.inputmaskData.returnRawData) {
													// return only the template record with all complimentary data, do not compress and stream
													let rawOutput = infraTemplatesModule.buildTemplateRawRecord(soajs, downloadedFiles);
													checkIfError(soajs, cbMain, {config: config, error: rawOutput.error || !rawOutput.record, code: 498}, function () {
														return cbMain(null, rawOutput.record);
													});
												}
												else {
													let zip = new EasyZip();

													downloadedFiles.forEach(oneFile => {
														zip.file(oneFile.fileName, oneFile.data);
													});
													if (process.env.SOAJS_DEPLOY_TEST) {
														return cbMain();
													}
													else {
														BL.model.closeConnection(soajs);
														zip.writeToResponse(res, 'template.zip');
													}
												}
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	},

	/**
	 * Build a template record using downloaded files from CDN
	 * @param soajs
	 * @param downloadedFiles
	 * @return {Object}
	 */
	buildTemplateRawRecord: function(soajs, downloadedFiles) {
		let output = {
			record: {},
			error: null
		};

		downloadedFiles.forEach((oneFile) => {
			if(oneFile.fileName === soajs.inputmaskData.templateId && oneFile.record) {
				output.record._id = oneFile.record.id;
				output.record.name = oneFile.record.name;
				output.record.description = oneFile.record.description;
				output.record.location = 'external';
				output.record.driver = oneFile.record.driver;
				output.record.technology = oneFile.record.technology;
				output.record.tags = oneFile.record.tags;
				output.record.content = oneFile.data;
			}
			else if(oneFile.fileName === `comp__${soajs.inputmaskData.templateId}`) {
				try {
					oneFile.data = JSON.parse(oneFile.data);
				}
				catch(e) {
					output.error = e;
				}

				if(oneFile.data.inputs) output.record.inputs = JSON.stringify(oneFile.data.inputs);
				if(oneFile.data.display) output.record.display = JSON.stringify(oneFile.data.display);
				if(oneFile.data.imfv) output.record.imfv = JSON.stringify(oneFile.data.imfv);
			}
		});
		return output;
	}
};

module.exports = infraTemplatesModule;
