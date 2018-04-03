'use strict';
var fs = require("fs");
var async = require("async");
var formidable = require('formidable');

var helper = require("./helper");

var lib = {
    initBLModel: function (BLModule, modelName, cb) {
        BLModule.init(modelName, cb);
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

var BL = {
	
	"import": (config, req, cbMain) => {
		let errors = [];

		async.auto({
			"parse": (mCb) => {
				//if zip file, trigger parse
				var form = new formidable.IncomingForm();

				//todo: check that this is how you can identify enno fi form walla la2
				if(form){
					form.encoding = 'utf-8';
					form.keepExtensions = true;
					
					form.onPart = function (part) {
						if (!part.filename) return form.handlePart(part);
						
						var writestream = gfs.createWriteStream({
							filename: part.filename
						});
						
						part.pipe(writestream);
						writestream.on('close', function (file) {
                            /**
							 * 1- unzip the file and parse it
							 * 2- return mCb(null, template);
                             */
						});
					};
					form.parse(req);
				}
				//else return mCb
				else{
					return mCb();
				}
			},
			"merge": (mCb) => {
				//if req.soajs.inputmaskData, trigger merge
				if(req.soajs.inputmaskData && req.soajs.inputmaskData.id && req.soajs.inputmaskData.correction){
					/*
					 1- load the template from database based on : req.soajs.inputmaskData.id
					 2- for each entry in the template call its driver and send the req.soajs.inputmaskData so that it merges the fixes
					 3- return mCb(null, template);
					 */


				}
				//else return mCb
				else{
					return mCb();
				}
			},
			"checkMandatory": ["parse", "merge", (info, mCb) => {
                /**
				 * check that the template has the minimum required schema before proceeding
				 * return mcB(null, template);
                 */
				return mCb();
			}],
			"checkDuplicates": ["checkMandatory", (info, mCb) => {

                /**
				 * received json object via info.merge
                 */
                let template = info.checkMandatory;

                let stack = [];
                //check ci recipes
                if(template.content && template.content.recipes && template.content.recipes.ci){
                	let stepMethod = function(vCb){
                    	helper.ci("check", req, template, BL, lib, (error) =>{
                    		if(error){
								errors.push(error);
							}
							return vCb();
						});
					};
                	stack.push(stepMethod);
				}

				//check cd recipes
                if(template.content && template.content.recipes && template.content.recipes.deployment){

                }

				//check endpoints & services
                if(template.content && template.content.endpoints){

                }

				//check productization schemas
                if(template.content && template.content.productization){

                }

				//check tenant schemas
                if(template.content && template.content.tenant){

                }

				//check activated repos
                if(template.content && template.content.deployments && template.content.deployment.repo){

                }

                async.series(stack, ()=> {
                	if(errors){
						//stop the execution and return the array of errors
						//also return the json to fix

					}
					else{
                		return mCb();
					}
				});
			}],
			"save": ["checkDuplicates", (mCb) => {
				//save information
				/*
					1 - save ci
					2 - save cd
					3 - save endpoints
					3.1 - publish endpoints
					4 - create deployment template
					4.1 - save deployment template
				 */

                helper.ci("saveCiRecipe", function(error) {
                    if (error) {
                        // push to array
                    }
                })
			}]
		}, (error) => {
			//clean up
		});
	}
	
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
