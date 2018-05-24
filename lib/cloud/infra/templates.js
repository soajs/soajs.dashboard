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
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {
							config: config,
							error: InfraRecord.templates.indexOf('local') === -1,
							code: 492
						}, function () {
							
							let options = {
								collection: "templates",
								record: {
									"type": "_infra",
									"infra": InfraRecord._id.toString(),
									"location": "local",
									"deletable": true,
									"name": soajs.inputmaskData.template.name,
									"description": soajs.inputmaskData.template.description,
									"content": soajs.inputmaskData.template.content
								}
							};
							
							if (soajs.inputmaskData.template.inputs) {
								options.record.inputs = soajs.inputmaskData.template.inputs;
							}
							if (soajs.inputmaskData.template.display) {
								options.record.display = soajs.inputmaskData.template.display;
							}
							if (soajs.inputmaskData.template.technology) {
								options.record.technology = soajs.inputmaskData.template.technology;
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
							templateRecord.inputs = soajs.inputmaskData.template.inputs;
							templateRecord.display = soajs.inputmaskData.template.display;
							templateRecord.technology = soajs.inputmaskData.template.technology;
							
							//missing tags
							
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
							let filesToDownload = [soajs.inputmaskData.templateId];
							
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
										if (oneFile.type === 'inputsAndDisplay' && oneFile.template === soajs.inputmaskData.templateId) {
											filesToDownload.push(oneFile.id);
										}
									});
									
									//used mapSeries to avoid overlapping file content
									async.mapSeries(filesToDownload, function (oneFile, callback) {
										options.params = {
											id: oneFile
										};
										
										deployer.execute({
											'type': 'infra',
											'driver': InfraRecord.name,
											'technology': 'cluster'
										}, 'downloadFile', options, (error, response) => {
											if (error) {
												return callback(error);
											}
											
											//collect the content from the read stream
											let data = '';
											response.stream.on('data', function(chunk) {
												data += chunk;
											});
											response.stream.on('end', function() {
												return callback(null, {
													fileName: oneFile,
													data: data
												});
											});
											response.stream.on('error', function(error) {
												return callback(error);
											});
										});
									}, function(error, downloadedFiles) {
										checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
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
										});
									});
								});
							});
						});
					});
				});
			});
		});
	}
};

module.exports = infraTemplatesModule;