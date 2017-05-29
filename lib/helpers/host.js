'use strict';
var fs = require("fs");
var async = require("async");
var utils = require('../../utils/utils.js');

var helpers = {
	/**
	 * Get the tenant that have external keys in each environment.
	 * @param {Object} soajs
	 * @param {Object} output
	 * @param {Function} cb
	 * @returns {*}
	 */
	getTenants: function (soajs, output, model, cb) {
		/**
		 * Check if the user has access to list tenants
		 * @returns {*|{result, error}|{result}}
		 */
		function checkACL (soajs) {
			var ACL;
			var myGroup;
			if (soajs.uracDriver) {
				ACL = soajs.uracDriver.getAcl();
				myGroup = soajs.uracDriver.getProfile().groups;
			}
			
			if (!ACL) {
				if (soajs.tenant.application.acl_all_env && Object.keys(soajs.tenant.application.acl_all_env).length > 0) {
					ACL = soajs.tenant.application.acl_all_env[ 'dashboard' ];
				}
				else if (soajs.tenant.application.acl && Object.keys(soajs.tenant.application.acl).length > 0) {
					ACL = soajs.tenant.application.acl;
				}
				else if (soajs.tenant.application.package_acl_all_env && Object.keys(soajs.tenant.application.package_acl_all_env).length > 0) {
					ACL = soajs.tenant.application.package_acl_all_env[ 'dashboard' ];
				}
				else {
					if (soajs.tenant.application.package_acl && Object.keys(soajs.tenant.application.package_acl).length > 0) {
						ACL = soajs.tenant.application.package_acl;
					}
				}
			}
			
			if (!ACL) {
				return false;
			}
			return _api.checkPermission(ACL[ 'dashboard' ], myGroup, "/tenant/list", "get");
		}
		
		/**
		 * Object that provides methods to check if the requested API is accessible or not
		 * @type {{checkPermission: checkPermission, checkAccess: checkAccess}}
		 * @private
		 */
		var _api = {
			"checkPermission": function (system, myGroup, route, method) {
				if (system && system[ method ] && Object.keys(system[ method ]).length > 0) {
					if (Object.hasOwnProperty(system[ method ], 'access') || Object.hasOwnProperty.call(system[ method ], 'apis') || Object.hasOwnProperty.call(system[ method ], 'apisRegExp') || Object.hasOwnProperty.call(system[ method ], 'apisPermission')) {
						system = system[ method ];
					}
				}
				var api = system && system.apis ? system.apis[ route ] : null;
				if (!api && system && system.apisRegExp && Object.keys(system.apisRegExp).length) {
					for (var jj = 0; jj < system.apisRegExp.length; jj++) {
						if (system.apisRegExp[ jj ].regExp && route.match(system.apisRegExp[ jj ].regExp)) {
							api = system.apisRegExp[ jj ];
						}
					}
				}
				
				if (system && 'restricted' === system.apisPermission) {
					if (!api)
						return false;
					return _api.checkAccess(api.access, myGroup);
				}
				if (!api)
					return true;
				
				return _api.checkAccess(api.access, myGroup);
			},
			
			"checkAccess": function (apiAccess, myGroup) {
				if (!apiAccess)
					return true;
				
				if (apiAccess instanceof Array) {
					if (!myGroup)
						return false;
					
					for (var ii = 0; ii < myGroup.length; ii++) {
						if (apiAccess.indexOf(myGroup[ ii ]) !== -1)
							return true;
					}
					return false;
				}
				else
					return true;
			}
		};
		
		if (checkACL(soajs)) {
			var envCodes = Object.keys(output);
			async.each(envCodes, function (oneEnvCode, mCb) {
				var opts = {
					"collection": "tenants",
					"condition": {
						'applications.keys.extKeys.env': oneEnvCode.toUpperCase()
					}
				};
				model.findEntries(soajs, opts, function (error, tenants) {
					if (error) {
						return mCb(error);
					}
					
					if (tenants.length === 0) {
						return mCb(null);
					}
					
					output[ oneEnvCode ][ 'tenants' ] = [];
					
					tenants.forEach(function (oneTenant) {
						oneTenant.applications.forEach(function (oneApp) {
							oneApp.keys.forEach(function (oneKey) {
								oneKey.extKeys.forEach(function (oneExtKey) {
									if (oneExtKey.env === oneEnvCode.toUpperCase()) {
										output[ oneEnvCode ][ 'tenants' ].push({
											code: oneTenant.code,
											package: oneApp.package,
											extKey: oneExtKey.extKey
										});
									}
								});
							});
						});
					});
					return mCb(null);
				});
			}, cb);
		}
		else {
			return cb();
		}
	},
	
	buildDeployerOptions: function (envRecord, soajs, model) {
		var BL = {
			model: model
		};
		utils.buildDeployerOptions(envRecord, soajs, BL);
	}
};

module.exports = helpers;