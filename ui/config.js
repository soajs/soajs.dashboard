"use strict";

/**
 * Custom configuration values
 */
var mydomain = "soajs.org";
var protocol = window.location.protocol;
var themeToUse = "default";
var whitelistedDomain = ['localhost', '127.0.0.1', 'dashboard-api.' + mydomain];
var apiConfiguration = {
	domain: protocol + '//dashboard-api.' + mydomain,
	key: '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974'
};

var modules = {
	"develop":{
		"DASHBOARD":{
			services: 'modules/DASHBOARD/services/install.js',
			contentBuilder: 'modules/DASHBOARD/contentBuilder/install.js',
			staticContent: 'modules/DASHBOARD/staticContent/install.js',
			githubApp: 'modules/DASHBOARD/gitAccounts/install.js'
		}
	},
	"manage":{
		"DASHBOARD":{
			productization: 'modules/DASHBOARD/productization/install.js',
			multitenancy: 'modules/DASHBOARD/multitenancy/install.js',
			members: 'modules/DASHBOARD/members/install.js',
			settings: 'modules/DASHBOARD/settings/install.js'
		}
	},
	"deploy":{
		"DASHBOARD": {
			environments: 'modules/DASHBOARD/environments/install.js'
		}
	},
	"operate": {
		"DEV":{
			urac: 'modules/DEV/urac/install.js',
			contentManagement: 'modules/DEV/contentManagement/install.js'
		},
		"STG":{
			contentManagement: 'modules/STG/contentManagement/install.js'
		}
	},
	"common": {
		"DASHBOARD": {
			myAccount: 'modules/DASHBOARD/myAccount/install.js'
		}
	}
};
