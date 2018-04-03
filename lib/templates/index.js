'use strict';
var fs = require("fs");
var async = require("async");
var formidable = require('formidable');

var helper = require("./helper");

var BL = {
	
	"import": (config, req, cbMain) => {
		
		async.auto({
			"parse": (mCb) => {
				//if zip file, trigger parse
				var form = new formidable.IncomingForm();
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
							//unzip the file and parse it
							//use unzip2 to extrac the file then JSON.parse
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
				
				}
				//else return mCb
				else{
					return mCb();
				}
			},
			"checkDuplicates": ["parse", "merge", (info, mCb) => {
				//check ci recipes
				
				//check cd recipes
				
				//check endpoints & services
				
				//check productization schemas
				
				//check tenant schemas
				
				//check activated repos
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
