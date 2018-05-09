'use strict';

var fs = require("fs");
var async = require('async');
var hash = require('object-hash');

var utils = require("../../../utils/utils.js");

var envsCollection = 'environment';

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
	
	model: null,
	
	/**
	 * Turn on/off or update autoscaler for a deployment
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   deployer
	 * @param  {Function} cb
	 *
	 */
	set: function (config, soajs, deployer, cb) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cb, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cb, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {
					var validUpdate = (envRecord.deployer.type === 'container');
					if (validUpdate) {
						validUpdate = validUpdate && (envRecord.deployer.selected && envRecord.deployer.selected.split('.')[1] === 'kubernetes');
					}
					checkIfError(soajs, cb, {config: config, error: !validUpdate, code: 987}, function () {
						var options = utils.buildDeployerOptions(envRecord, soajs, BL);
						checkIfError(soajs, cb, {config: config, error: !options, code: 600}, function () {
							if (soajs.inputmaskData.action === 'update') {
								update(soajs.inputmaskData.services, deployer, options, cb);
							}
							else if (soajs.inputmaskData.action === 'turnOff') {
								turnOff(soajs.inputmaskData.services, deployer, options, cb);
							}
						});
					});
				});
			});
		});
		
		function update(services, deployer, options, cb) {
			async.each(services, function (oneService, callback) {
				var autoscaleOptions = Object.assign({}, options);
				autoscaleOptions.params = {id: oneService.id};
				deployer.execute({
					'type': 'container',
					'driver': options.strategy
				}, 'getAutoscaler', autoscaleOptions, (error, autoscaler) => {
					if (error) return callback(error);
					
					autoscaleOptions.params = {
						id: oneService.id,
						type: oneService.type,
						min: soajs.inputmaskData.autoscaler.replicas.min,
						max: soajs.inputmaskData.autoscaler.replicas.max,
						metrics: soajs.inputmaskData.autoscaler.metrics
					};
					if (!autoscaler || !autoscaler.replicas || !(autoscaler.replicas.min && autoscaler.replicas.max)) {
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'createAutoscaler', autoscaleOptions, callback);
					}
					else {
						if (!compareAutoscalerConfigs(soajs.inputmaskData.autoscaler, autoscaler)) {
							deployer.execute({
								'type': 'container',
								'driver': options.strategy
							}, 'updateAutoscaler', autoscaleOptions, callback);
						}
						else {
							return callback(null, true);
						}
					}
				});
			}, cb);
		}
		
		function turnOff(services, deployer, options, cb) {
			async.each(services, function (oneService, callback) {
				var autoscaleOptions = Object.assign({}, options);
				autoscaleOptions.params = {id: oneService.id};
				deployer.execute({
					'type': 'container',
					'driver': options.strategy
				}, 'getAutoscaler', autoscaleOptions, (error, autoscaler) => {
					if (error) return callback(error);
					
					if (!autoscaler || !autoscaler.replicas || !(autoscaler.replicas.min && autoscaler.replicas.max)) {
						return callback(null, true);
					}
					deployer.execute({
						'type': 'container',
						'driver': options.strategy
					}, 'deleteAutoscaler', autoscaleOptions, callback);
				});
			}, cb);
		}
		
		function compareAutoscalerConfigs(newAutoscale, serviceAutoscale) {
			return (hash(newAutoscale) === hash(serviceAutoscale));
		}
	},
	
	/**
	 * Set/Update environment autoscale configuration
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Function} cb
	 *
	 */
	updateEnvAutoscaleConfig: function (config, soajs, cb) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			checkIfError(soajs, cb, {config: config, error: error, code: 600}, function () {
				checkIfError(soajs, cb, {config: config, error: !envRecord, code: 402}, function () {
					var validUpdate = (envRecord.deployer.type === 'container');
					if (validUpdate) {
						validUpdate = validUpdate && (envRecord.deployer.selected && envRecord.deployer.selected.split('.')[1] === 'kubernetes')
					}
					checkIfError(soajs, cb, {config: config, error: !validUpdate, code: 987}, function () {
						var selected = envRecord.deployer.selected.split('.');
						if (!envRecord.deployer[selected[0]]) envRecord.deployer[selected[0]] = {};
						if (!envRecord.deployer[selected[0]][selected[1]]) envRecord.deployer[selected[0]][selected[1]] = {};
						if (!envRecord.deployer[selected[0]][selected[1]][selected[2]]) envRecord.deployer[selected[0]][selected[1]][selected[2]] = {};
						envRecord.deployer[selected[0]][selected[1]][selected[2]].autoscale = soajs.inputmaskData.autoscale;
						
						var opts = {
							collection: envsCollection,
							record: envRecord
						};
						BL.model.saveEntry(soajs, opts, function (error) {
							checkIfError(soajs, cb, {config: config, error: error, code: 600}, function () {
								return cb(null, true);
							});
						});
					});
				});
			});
		});
	}
};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;
		
		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		
		modelPath = __dirname + "/../../../models/" + modelName + ".js";
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
