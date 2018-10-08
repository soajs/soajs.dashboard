"use strict";

let colName = "environment";

const config = require("../../config.js");

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object') {
			req.soajs.log.error(data.error);
		}
		if (!data.config) {
			data.config = config;
		}
		let message = data.config.errors[data.code];
		if (!message && data.error.message) {
			message = data.error.message;
		}
		return mainCb({"code": data.code, "msg": message});
	} else {
		if (cb) {
			return cb();
		}
	}
}

const databaseModule = {
	
	/**
	 * Lock the environment to a cloud provider
	 * @param config
	 * @param req
	 * @param BL
	 * @param cbMain
	 */
	"lockEnvToCloudProvider": (config, req, BL, cbMain) => {
		let opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.envCode.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, (err, envRecord) => {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 405
			}, () => {
				envRecord.restriction = {};
				
				envRecord.restriction[req.soajs.inputmaskData.infraId] = {};
				envRecord.restriction[req.soajs.inputmaskData.infraId][req.soajs.inputmaskData.region] = {
					network: req.soajs.inputmaskData.network
				};
				if (req.soajs.inputmaskData.extras) {
					for (let i in req.soajs.inputmaskData.extras) {
						let label = (i === 'groups') ? 'group' : i;
						envRecord.restriction[req.soajs.inputmaskData.infraId][req.soajs.inputmaskData.region][label] = req.soajs.inputmaskData.extras[i];
					}
				}
				
				opts = {};
				opts.collection = colName;
				opts.record = envRecord;
				BL.model.saveEntry(req.soajs, opts, (err) => {
					checkReturnError(req, cbMain, {
						config: config,
						error: err,
						code: 600
					}, () => {
						return cbMain(null, true);
					});
				});
			});
		});
	},
	
	/**
	 * remove the lock of an environment from a cloud provider
	 * @param config
	 * @param req
	 * @param BL
	 * @param cbMain
	 */
	"unlockEnvToCloudProvider": (config, req, BL, cbMain) => {
		/**
		 * workflow:
		 * 1- check that the environment has no deployed container clusters at the cloud provider
		 * 2- check that the environment has no vm layers created or onboarded at the cloud provider
		 * 3- remove the lock
		 */
		let opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.envCode.toUpperCase()};
		opts.fields = {
			"$unset": {
				"restriction": ""
			}
		};
		opts.options = {
			safe: true,
			multi: false,
			upsert: false
		};
		BL.model.updateEntry(req.soajs, opts, (err) => {
			checkReturnError(req, cbMain, {
				config: config,
				error: err,
				code: 600
			}, () => {
				return cbMain(null, true);
			});
		});
	}
};

module.exports = databaseModule;