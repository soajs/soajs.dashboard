'use strict';
const fs = require("fs");
const async = require("async");
const formidable = require('formidable');

const helper = require("./helper");

let modelName = "mongo";
const externalModules = {
	ci: {
		module: require("../ci/index")
	},
	catalog: {
		module: require("../catalog/index")
	},
	endpoint: {
		module: require("../apiBuilder/index")
	}
};

const lib = {
	initBLModel: function (module, cb) {
		externalModules[module].module.init(modelName, cb);
	},
	
	checkReturnError: function (req, mainCb, data, cb) {
		if (data.error) {
			if (typeof (data.error) === 'object') {
				req.soajs.log.error(data.error);
			}
			return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
		} else {
			if (cb) {
				return cb();
			}
		}
	}
};

const BL = {
	
	"import": (config, req, res, cbMain) => {
		let context = {
			errors : [],
			config: config
		};
		
		/**
		 * 1- unzip the file
		 * 2- parse the file
		 * 3- check mandatory
		 * 4- check duplicates
		 * 5- save file
		 */
		async.series({
			"parse": (mCb) => {
				let form = new formidable.IncomingForm();
				form.encoding = 'utf-8';
				form.keepExtensions = true;
				
				//unzip and parse the json file, assign it to the context.template if ok
				helper.parse(req, form, context, mCb);
			},
			"checkMandatory": (mCb) => {
				//check that the template has the minimum required schema before proceeding
				let validator = new req.soajs.validator.Validator();
				helper.checkMandatoryTemplateSchema(req, BL, lib, context, validator, mCb);
			},
			"checkDuplicates": (mCb) => {
				helper.checkDuplicate(req, BL, context, lib, () =>{
					if(context.errors && context.errors.length > 0){
						
						let now = new Date();
						let expires = new Date(now);
						expires.setSeconds(expires.getSeconds() + (7 * 24 * 3600));
						
						context.template.expires = expires;
						context.template.type = '_import';
						BL.model.insertEntry(req.soajs, {
							collection: 'templates',
							record: context.template
						}, (error, record) =>{
							lib.checkReturnError(req, mCb, {config: config, error: error, code: 600 }, ()=> {
								//inject template id as part of the error response
								context.template.id = record[0]._id;
								context.errors.unshift({"id": context.template.id.toString()});
								return mCb(context.errors);
							});
						});
					}
					return mCb(null, true);
				});
			},
			"save": (mCb) => {
				/*
					1 - save ci
					2 - save cd
					3 - save endpoints
					3.1 - publish endpoints
					4 - create deployment template
					4.1 - save deployment template
				 */
				
				//save information
				async.series({
					"saveContent": (vCb) =>{
						helper.saveContent(req, BL, context, lib, vCb);
					},
					"generateDeploymentTemplate": (vCb) =>{
						helper.generateDeploymentTemplate(req, config, BL, context, lib, vCb);
					}
				}, (error) =>{
					return mCb(error);
				});
			}
		}, (error) => {
			helper.cleanUp(context.fileName, () => {
				return cbMain(error);
			});
		});
	},
	
	"correct": (config, req, res, cbMain) => {
		let context = {
			errors : [],
			config: config
		};
		
		/**
		 * 1- unzip the file
		 * 2- parse the file
		 * 3- check mandatory
		 * 4- check duplicates
		 * 5- save file
		 */
		async.series({
			"validateInputs": (mCb) => {
				if(!req.soajs.inputmaskData || !req.soajs.inputmaskData.id || !req.soajs.inputmaskData.correction || typeof(req.soajs.inputmaskData.correction) !== 'object'){
					return mCb({"code": 173, "msg": "Invalid Inputs provided to correct the previously imported template!"});
				}
				return mCb();
			},
			"merge": (mCb) => {
				//unzip and parse the json file, assign it to the context.template if ok
				helper.mergeToTemplate(req, config, BL, context, lib, mCb);
			},
			"checkMandatory": (mCb) => {
				//check that the template has the minimum required schema before proceeding
				let validator = new req.soajs.validator.Validator();
				helper.checkMandatoryTemplateSchema(req, BL, lib, context, validator, mCb);
			},
			"checkDuplicates": (mCb) => {
				helper.checkDuplicate(req, BL, context, lib, () =>{
					if(context.errors && context.errors.length > 0){
						BL.model.saveEntry(req.soajs, {
							collection: 'templates',
							record: context.template
						}, (error) =>{
							lib.checkReturnError(req, mCb, {config: config, error: error, code: 600 }, ()=> {
								//inject template id as part of the error response
								context.errors.unshift({"id": context.template._id.toString()});
								return mCb(context.errors);
							});
						});
					}
					return mCb(null, true);
				});
			},
			"save": (mCb) => {
				/*
					1 - save ci
					2 - save cd
					3 - save endpoints
					3.1 - publish endpoints
					4 - create deployment template
					4.1 - save deployment template
				 */
				
				//save information
				async.series({
					"saveContent": (vCb) =>{
						helper.saveContent(req, BL, context, lib, vCb);
					},
					"generateDeploymentTemplate": (vCb) =>{
						helper.generateDeploymentTemplate(req, config, BL, context, lib, vCb);
					}
				}, (error) =>{
					return mCb(error);
				});
			}
		}, (error) => {
			return cbMain(error);
		});
	},
	
	"export": (config, req, res, cbMain) => {}
	
};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;
		
		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		
		modelPath = __dirname + "/../../models/" + modelName + ".js";
		return requireModel(modelPath, cb);
		
		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel(filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}
				
				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
