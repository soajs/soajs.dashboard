'use strict';
var async = require("async");
var fs = require('fs');

var helpers = {
	searchForJob: function (jobName, jobs, cb) {
		var jobFound;
		var keys = Object.keys(jobs);
		async.each(keys, function (job, callback) {
			if (job === jobName) {
				jobFound = jobName;
			}
			return callback(null);
		}, function (err, result) {
			if (jobFound) {
				return cb(null, jobFound);
			}
			cb("Job not found");
		});
	},
	validateCronTime: function (soajs, criteria) {
		if (soajs.inputmaskData.type === 'interval') {
			criteria.type = 'interval';
			criteria.interval = soajs.inputmaskData.interval;
		}
		else if (soajs.inputmaskData.type === 'cron') {
			criteria.type = 'cron';
			criteria.cronConfig = {
				"timeZone": soajs.inputmaskData.timeZone,
				"cronTime": soajs.inputmaskData.cronTime
			};
		}
		else if (soajs.inputmaskData.type === 'cronJob') {
			criteria.type = 'cronJob';
			criteria.cronConfig = {
				"cronTime": soajs.inputmaskData.cronTime
			};
		}
		else if (soajs.inputmaskData.type === 'once') {
			criteria.type = 'cron';
			criteria.extra = 'once';

			var moment = require("moment-timezone");
			var x = moment.tz.zone(soajs.inputmaskData.timeZone);
			if (!x) {
				throw new Error("Invalid Timezone Provided!");
			}

			try {
				var cronTime = moment.tz(new Date(soajs.inputmaskData.cronTimeDate), soajs.inputmaskData.timeZone);
				var now = moment.tz(new Date(), soajs.inputmaskData.timeZone);

				if (isNaN(cronTime.toDate().getTime())) {
					throw new Error("Invalid Date Provided!");
				}

				if (now.toDate().getTime() >= cronTime.toDate().getTime()) {
					throw new Error("Date provided should be greater than now!");
				}

				criteria.cronConfig = {
					"timeZone": soajs.inputmaskData.timeZone,
					"cronTime": cronTime.toDate()
				};
			}
			catch (ed) {
				throw new Error(ed.message);
			}
		}

		if (criteria.type === 'cron') {
			var cronJob = require('cron').CronJob;
			try {
				new cronJob({
					cronTime: criteria.cronConfig.cronTime,
					timeZone: criteria.cronConfig.timeZone
				});
			} catch (ex) {
				throw new Error(ex.message);
			}
		}
	},

	checkIfGroupIsDeployed: function(config, record, req, BL, cloudBL, deployer, checkReturnError, mainCb, cb){
		//get all env codes
		//async each env code --> get services
		//if on service matches stop
		var opts = {
			collection: 'environment',
			fields: { 'code': 1 }
		};
		BL.model.findEntries(req.soajs, opts, function(error, envCodes){
			checkReturnError(req, mainCb, { config: config, error: error, code: 701 }, function () {
				async.eachSeries(envCodes, function(oneEnvCode, miniCb){
					//NOTE: need to get registry for environment, deployer depends on registry not environment record
					//NOTE: can't get registries without listing environments, no other way to get the list of available registries
					req.soajs.inputmaskData.env = oneEnvCode.code;
					cloudBL.listServices(config, req.soajs, deployer, function(error, services){
						checkReturnError(req, mainCb, { config: config, error: error, code: 795 }, function () {
							//check if a service is using this repo
							for(var i =0; i < services.length; i++){
								var match = false;
								var oneService = services[i];
								for(var j =0; j < oneService.env.length; j++){
									if(oneService.env[j].indexOf('SOAJS_DAEMON_GRP_CONF') !== -1){
										if(oneService.env[j].indexOf(record.daemonConfigGroup) !== -1){
											match = true;
											break;
										}
									}
								}
								if(match){
									break;
								}
							}
							if(match){
								return miniCb(true);
							}
							else{
								return miniCb(null, true);
							}
						});
					});
				}, function (error) {
					checkReturnError(req, mainCb, {
						config: config,
						error: error,
						code: 711
					}, function () {
						return cb();
					});
				});
			});
		});
	}
};

module.exports = helpers;
