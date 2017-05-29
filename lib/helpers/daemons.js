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
	}
};

module.exports = helpers;