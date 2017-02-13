'use strict';
var os = require("os");
var fs = require("fs");
var yamljs = require("yamljs");
var async = require('async');
var mkdirp = require("mkdirp");
var rimraf = require("rimraf");
var EasyZip = require('easy-zip').EasyZip;
var soajsUtils = require("soajs/lib/utils");

var colName = "services";

/**
 * function that returns an invalid api response if data.error exists
 * else it returns a callback and doesn't break the execution
 * @param req
 * @param res
 * @param data
 * @param cb
 * @returns {*}
 */
function checkIfError(req, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
	}
	else {
		if (cb) {
			return cb();
		}
	}
}

//zip a folder
function zipFolder(srcFolder, zipFilePath, callback) {
	try {
		var zip = new EasyZip();
		zip.zipFolder(srcFolder, function () {
			zip.writeToFile(zipFilePath);
			return callback(null, true);
		});
	}
	catch (e) {
		return callback(e);
	}
}

/**
 * function that maps the service information object to what the microservice config.js should contain
 * @param serviceInfo
 * @returns {{type: string, prerequisites: {cpu: string, memory: string}, swagger: boolean, dbs, serviceName, serviceGroup, serviceVersion, servicePort, requestTimeout, requestTimeoutRenewal, extKeyRequired, oauth, session, errors: {}, schema: {}}}
 */
function mapConfig(serviceInfo) {
	var config = {
		"type": "service",
		"prerequisites": {
			"cpu": " ",
			"memory": " "
		},
		"swagger": true,
		"dbs": serviceInfo.dbs,
		"models":{
			"path": __dirname + "/lib/model/",
			"name": ""
		},
		"serviceName": serviceInfo.serviceName,
		"serviceGroup": serviceInfo.serviceGroup,
		"serviceVersion": serviceInfo.serviceVersion,
		"servicePort": serviceInfo.servicePort,
		"requestTimeout": serviceInfo.requestTimeout,
		"requestTimeoutRenewal": serviceInfo.requestTimeoutRenewal,
		"extKeyRequired": serviceInfo.extKeyRequired,
		"injection": true,
		"oauth": serviceInfo.oauth,
		"session": serviceInfo.session,
		"errors": {},
		"schema": {}
	};
	
	var modelProps = Object.keys(serviceInfo.dbs[0]);
	if(modelProps.indexOf("mongo") !== -1){
		config.models.name = serviceInfo.dbs[0] = "mongo";
	}
	else {
		config.models.name = serviceInfo.dbs[0] = "es";
	}
	return config;
}

/**
 * funtion that validates that the yaml file content was parsed to a json object and contains the paths information
 * @param yamlJson
 */
function validateYamlContent (yamlJson) {
	if (typeof yamlJson !== 'object') {
		throw new Error("Yaml file was converted to a string");
	}
	
	if (!yamlJson.paths || Object.keys(yamlJson.paths).length === 0) {
		throw new Error("Yaml file is missing api schema");
	}
}

var BL = {
	model: null,
	/**
	 *
	 * Takes data from the request in the form of object containing data.imfv and data.input
	 * where data.input will be the parameters sent to api and data.imfv be the schema to check against.
	 * @param config {Object}
	 * @param req   {Object}
	 * @param res   {Object}
	 */
	"test": function (config, req, res) {
		var data = req.soajs.inputmaskData.data;
		var myValidator = new req.soajs.validator.Validator();
		var imfv = data.imfv;
		var errorCount = 0;
		var msg = [];
		
		Object.keys(imfv).forEach(function (key) {
			var val = imfv[key];
			
			// Validating the default value of the given instance
			if (val.default) {
				var status = myValidator.validate(val.default, val.validation);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						msg[errorCount] = err.stack.replace("instance", "Default value of " + key) + ".";
					});
					errorCount++;
				}
			}
			else {
				//if no source
				if (!val.source) {
					msg[errorCount] = key + " has no source";
					errorCount++;
				}
				else {
					//if invalid source format
					if (!Array.isArray(val.source)) {
						msg[errorCount] = key + " should have a source of type array";
						errorCount++;
					}
					else if (val.source.length === 0) {
						msg[errorCount] = key + " should have at least one source";
						errorCount++;
					}
				}
				
				//if mandatory and no input
				if (val.required && !data.input[key]) {
					// error the instance is required in imfv but not found in data
					msg[errorCount] = key + " is required" + ".";
					errorCount++;
				}
				
				//if input, check imfv schema
				if (data.input[key] && errorCount === 0) {
					delete val.validation.in;
					delete val.validation.id;
					delete val.validation.collectionFormat;
					delete val.validation.subtype;
					
					var status = myValidator.validate(data.input[key], val.validation);
					if (!status.valid) {
						status.errors.forEach(function (err) {
							msg[errorCount] = err.stack.replace("instance", key) + ".";
						});
						errorCount++;
					}
				}
			}
		});
		
		if (errorCount > 0) {
			return res.jsonp(req.soajs.buildResponse({"code": 850, "msg": JSON.stringify(msg)}, null));
		}
		else {
			return res.jsonp(req.soajs.buildResponse(null, imfv));
		}
	},
	
	/**
	 *
	 * Takes data from the request then:
	 * 1- checks if service name or port are already used by another activated service
	 * 2- validates and convert yaml to json and maps inputs
	 * 3- generates folder and files
	 * 4- cleans up generated folders and files
	 * 5- zip and return code
	 * @param config {Object}
	 * @param req   {Object}
	 * @param res   {Object}
	 */
	"generate": function (config, req, res) {
		var serviceInfo = req.soajs.inputmaskData.data.service;
		
		var tmplDir = __dirname + "/../swagger/tmpl/";
		var execDir = __dirname + "/../swagger/";
		var tempDir = execDir + "exec/" + serviceInfo.serviceName;
		
		var zipFileName = serviceInfo.serviceName + "_" + new Date().getTime();
		
		//global object in this function to hold data that is juggled between functions
		var context = {
			yaml: null,
			soajs: {
				config: {}
			}
		};
		
		/**
		 * check if service name or port are already taken
		 * @param cb
		 */
		function checkService(cb) {
			var opts = {};
			opts.collection = colName;
			opts.conditions = {
				$or: [
					{'port': serviceInfo.servicePort},
					{'name': serviceInfo.serviceName}
				]
			};
			
			BL.model.findEntry(req.soajs, opts, function (err, oneRecord) {
				checkIfError(req, res, {config: config, error: err, code: 600}, function () {
					checkIfError(req, res, {config: config, error: (oneRecord), code: 614}, function () {
						return cb(null, true);
					});
				});
			});
		}
		
		/**
		 * parse the yaml and generate a config.js content from it
		 * @param cb
		 * @returns {*}
		 */
		function validateYaml(cb) {
			var jsonAPISchema;
			
			try {
				jsonAPISchema = yamljs.parse(req.soajs.inputmaskData.data.yaml);
			}
			catch (e) {
				req.soajs.log.error(e);
				return res.json(req.soajs.buildResponse({"code": 851, "msg": config.errors[851]}));
			}
			
			try {
				validateYamlContent(jsonAPISchema);
			}
			catch (e) {
				return res.json(req.soajs.buildResponse({"code": 173, "msg": e.message}));
			}
			
			context.yaml = jsonAPISchema;
			context.soajs.config = mapConfig(serviceInfo);
			return cb(null, true);
		}
		
		/**
		 * generate the folders and files needed to create a new microservice
		 * @param cb
		 */
		function generateModule(cb) {
			/**
			 * Generate all the folders needed for the microservice
			 * @param mCb
			 */
			function buildDirectories(mCb) {
				var directories = [
					tempDir
				];
				
				async.eachSeries(directories, function (dirPath, mCb) {
					req.soajs.log.debug("creating directory:", dirPath);
					mkdirp(dirPath, mCb);
				}, function (error) {
					checkIfError(req, res, {config: config, error: error, code: 853}, function () {
						return mCb(null, true);
					});
				});
			}
			
			/**
			 * create and fill all the files needed for the microservice
			 * @param mCb
			 */
			function writeFiles(mCb) {
				var files = [
					//module files
					{file: tempDir + "/swagger.yml", data: req.soajs.inputmaskData.data.yaml},
					{file: tempDir + "/index.js", data: fs.readFileSync(tmplDir + "index.txt", "utf8")},
					{file: tempDir + "/travis.yml", data: fs.readFileSync(tmplDir + "travis.txt", "utf8")},
					{file: tempDir + "/.gitignore", data: fs.readFileSync(tmplDir + "gitignore.txt", "utf8")},
					{file: tempDir + "/GruntFile.js", data: fs.readFileSync(tmplDir + "grunt.txt", "utf8")},
					{
						file: tempDir + "/README.md",
						data: fs.readFileSync(tmplDir + "readme.txt", "utf8"),
						tokens: {
							service_name: serviceInfo.serviceName
						}
					},
					{
						file: tempDir + "/package.json",
						data: fs.readFileSync(tmplDir + "package.txt", "utf8"),
						tokens: {
							service_name: serviceInfo.serviceName,
							service_description: (context.yaml.info && context.yaml.info.description) ? context.yaml.info.description.replace(/(\r|\n)/g, "") : "",
							repo_version: (context.yaml.info && context.yaml.info.version) ? context.yaml.info.version : "",
							repo_location: (context.yaml.info && context.yaml.info.license && context.yaml.info.license.url) ? context.yaml.info.license.url : "",
							author_name: (context.yaml.info && context.yaml.info.contact && context.yaml.info.contact.name) ? context.yaml.info.contact.name : ""
						}
					},
					{
						file: tempDir + "/config.js",
						data: "\"use strict\";" + os.EOL + "module.exports = " + JSON.stringify(context.soajs.config, null, 2) + ";",
						tokens:{
							dirname: "__dirname"
						},
						purify: true
					}
				];
				
				//loop on all files and write them
				async.each(files, function (fileObj, mCb) {
					var data = soajsUtils.cloneObj(fileObj.data);
					
					//if tokens, replace all occurences with corresponding values
					if (fileObj.tokens) {
						for (var i in fileObj.tokens) {
							var regexp = new RegExp("%" + i + "%", "g");
							data = data.replace(regexp, fileObj.tokens[i]);
						}
					}
					if(fileObj.purify){
						data = data.replace(/\\"/g, '"').replace(/["]+/g, '"').replace(/"__dirname/g, '__dirname');
						data = data.replace(/("group": "\s+)/g, '"group": ""');
						//"__dirname + \"/lib/mw/_get.js\""
						//"__dirname + "/lib/mw/_get.js""
						//"__dirname + "/lib/mw/_get.js"
						//__dirname + "/lib/mw/_get.js"
					}
					req.soajs.log.debug("creating file:", fileObj.file);
					fs.writeFile(fileObj.file, data, "utf8", mCb);
				}, function (error) {
					checkIfError(req, res, {config: config, error: error, code: 854}, function () {
						return mCb(null, true);
					});
				});
			}
			
			//run the BL of this function
			buildDirectories(function () {
				writeFiles(function () {
					return cb(null, true);
				});
			});
		}
		
		/**
		 * remove the tmpDirectory generated
		 * @param cb
		 */
		function cleanUp(cb) {
			req.soajs.log.debug("zipping", tempDir + "/");
			req.soajs.log.debug("into", execDir + zipFileName + ".zip");
			
			zipFolder(tempDir + "/", execDir + zipFileName + ".zip", function (error) {
				checkIfError(req, res, {config: config, error: error, code: 852}, function () {
					rimraf(tempDir, function (error) {
						checkIfError(req, res, {config: config, error: error, code: 852}, function () {
							return cb(null, true);
						});
					});
				});
			});
		}
		
		//run the BL of this API
		checkService(function () {
			validateYaml(function () {
				generateModule(function () {
					cleanUp(function () {
						var stat = fs.statSync(execDir + zipFileName + ".zip");
						var readStream = fs.createReadStream(execDir + zipFileName + ".zip");
						
						//set the headers to applicaiton/zip and send the file in the response
						res.writeHead(200, {
							'Content-Type': "application/zip",
							'Content-Length': stat.size
						});
						readStream.pipe(res);
					});
				});
			});
		});
	}
};

/**
 * no need for a model or db connection for this api to work
 * @type {{init: module.exports.init}}
 */
module.exports = {
	"init": function (modelName, cb) {
		var modelPath;
		
		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		
		modelPath = __dirname + "/../models/" + modelName + ".js";
		
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