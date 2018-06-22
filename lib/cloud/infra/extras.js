'use strict';

const async = require("async");

const utils = require("../../../utils/utils.js");
const infraColName = 'infra';

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

const extras = {

    /**
	 * Get extra components for an infra provider
	 * @param  {Object} 	config
	 * @param  {Object} 	req
	 * @param  {Object} 	soajs
	 * @param  {Object} 	BL
	 * @param  {Object} 	deployer
	 * @param  {Function} 	cbMain
	 * @return {void}
	 */
	getExtras: (config, req, soajs, BL, deployer, cbMain) => {
		function getEnvironment(cb) {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.envCode.toUpperCase(), (error, envRecord) => {
				checkIfError(soajs, cb, {config: config, error: error || !envRecord, code: 600}, cb);
			});
		}

		function getInfra(cb) {
			BL.model.validateId(soajs, (error) => {
				checkIfError(soajs, cb, { config, error, code: 490 }, () => {
					let opts = {
						collection: infraColName,
						conditions: { _id: soajs.inputmaskData.id, technologies: { $in: ['vm'] } }
					};
					BL.model.findEntry(soajs, opts, (error, infraRecord) => {
						checkIfError(soajs, cb, { config, error: error || !infraRecord, code: 600 }, () => {
							return cb(null, infraRecord);
						});
					});
				});
			});
		}

		function getExtraComponents(info, cb) {
			if(!soajs.inputmaskData.extras || (Array.isArray(soajs.inputmaskData.extras) && soajs.inputmaskData.extras.length === 0)) {
				soajs.inputmaskData.extras = config.infraExtrasList;
			}

			let output = {};
			async.each(soajs.inputmaskData.extras, (oneExtra, callback) => {
				let mapping = config.extrasFunctionMapping[oneExtra];
				let options = {
					soajs: soajs,
					infra: info.getInfra,
					registry: info.getEnvironment,
					params: {
						group: soajs.inputmaskData.envCode.toLowerCase()
					}
				};
                if(soajs.inputmaskData.region) {
                    options.params.region = soajs.inputmaskData.region;
                }
				if(mapping.specialInput) {
					options.params = Object.assign(options.params, mapping.specialInput);
				}

				deployer.execute({
					type: 'infra',
					name: info.getInfra.name,
					technology: soajs.inputmaskData.technology || 'vm'
				}, mapping.functionName, options, (error, response) => {
                    if(error) {
                        // do not stop execution if one of the extras returned an error, return empty array instead
                        soajs.log.error(error);
                        response = [];
                    }
					output[oneExtra] = response;
					return callback();
				});
			}, () => {
                //no error to be handled
				return cb(null, output);
			});
		}

		async.auto({
			getEnvironment,
			getInfra,
			getExtraComponents: ['getEnvironment', 'getInfra', getExtraComponents]
		}, (error, results) => {
			checkIfError(soajs, cbMain, { config, error, code: 600 }, () => {
				return cbMain(null, results.getExtraComponents);
			});
		});
	}

};

module.exports = extras;
