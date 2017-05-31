"use strict";

function getGitDriver (config, cbMain, cb) {
	var gitDriver;
	var path = __dirname + "/" + config.provider + ".js";
	try {
		gitDriver = require(path);
	}
	catch (e) {
		gitDriver = null;
	}
	if (!gitDriver) {
		return cbMain({ code: 778, message: 'Git driver does not exist' });
	}
	var helper = getGitHelperDriver({ provider: config.provider });
	gitDriver.helper = helper;
	return cb(gitDriver);
}

function getGitHelperDriver (config) {
	var helper;
	
	try {
		helper = require(__dirname + "/helpers/" + config.provider + ".js");
	}
	catch (e) {
		helper = null;
	}
	
	return helper;
}

var git = {
	
	"login": function (soajs, data, model, options, cb) {
		getGitDriver({ provider: options.provider }, cb, function (driver) {
			driver.login(soajs, data, model, options, cb);
		});
	},
	
	"logout": function (soajs, data, model, options, cb) {
		getGitDriver({ provider: options.provider }, cb, function (driver) {
			driver.logout(soajs, data, model, options, cb);
		});
	},
	
	"getRepos": function (soajs, data, model, options, cb) {
		getGitDriver({ provider: options.provider }, cb, function (driver) {
			driver.getRepos(soajs, data, model, options, cb);
		});
	},
	
	"getBranches": function (soajs, data, model, options, cb) {
		getGitDriver({ provider: options.provider }, cb, function (driver) {
			driver.getBranches(soajs, data, model, options, cb);
		});
	},
	
	"getJSONContent": function (soajs, data, model, options, cb) {
		getGitDriver({ provider: options.provider }, cb, function (driver) {
			driver.getJSONContent(soajs, data, model, options, cb);
		});
	},
	
	"getAnyContent": function (soajs, data, model, options, cb) {
		getGitDriver({ provider: options.provider }, cb, function (driver) {
			driver.getAnyContent(soajs, data, model, options, cb);
		});
	}
};

module.exports = git;
