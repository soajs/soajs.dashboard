"use strict";

/**
 * Custom configuration values
 */
var titlePrefix = "SOAJS";
var mydomain = "soajs.org";
var mydomainport = location.port;
if (mydomainport && mydomainport !== 80) {
	mydomain += ":" + mydomainport;
}
var protocol = window.location.protocol;
var themeToUse = "default";
var whitelistedDomain = ['localhost', '127.0.0.1', 'dashboard-api.' + mydomain];
var apiConfiguration = {
	domain: protocol + '//dashboard-api.' + mydomain,
	key: '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974'
};

var SOAJSRMS = ['soajs.controller','soajs.urac','soajs.oauth','soajs.dashboard','soajs.prx','soajs.gcs'];

var uiModuleDev = 'modules/dev';
var uiModuleStg = 'modules/stg';
var uiModuleProd = 'modules/prod';
var uiModuleQa = 'modules/qa';

var modules = {
	"develop": {
		"dashboard": {
			services: 'modules/dashboard/services/install.js',
			contentBuilder: 'modules/dashboard/contentBuilder/install.js',
			githubApp: 'modules/dashboard/gitAccounts/install.js',
			swaggerEditorApp: 'modules/dashboard/swaggerEditor/install.js',
			catalogs: 'modules/dashboard/catalogs/install.js',
			ci: 'modules/dashboard/ci/install.js',
			cd: 'modules/dashboard/cd/install.js'
		}
	},
	"manage": {
		"dashboard": {
			productization: 'modules/dashboard/productization/install.js',
			multitenancy: 'modules/dashboard/multitenancy/install.js',
			members: 'modules/dashboard/members/install.js',
			settings: 'modules/dashboard/settings/install.js'
		}
	},
	"deploy": {
		"dashboard": {
			environments: 'modules/dashboard/environments/install.js'
		}
	},
	"operate": {
		"dev": {
			urac: uiModuleDev + '/urac/install.js',
			contentManagement: uiModuleDev + '/contentManagement/install.js'
		},
		"qa": {
			urac: uiModuleQa + '/urac/install.js',
			contentManagement: uiModuleQa + '/contentManagement/install.js'
		},
		"stg": {
			urac: uiModuleStg + '/urac/install.js',
			contentManagement: uiModuleStg + '/contentManagement/install.js'
		},
		"prod": {
			urac: uiModuleProd + '/urac/install.js',
			contentManagement: uiModuleProd + '/contentManagement/install.js'
		}
	},
	"common": {
		"dashboard": {
			myAccount: 'modules/dashboard/myAccount/install.js'
		}
	}
};

var whitelistedRepos = [
	'soajs/soajs.examples',
	'soajs/soajs.jsconf',
	'soajs/soajs.artifact',
	'soajs/soajs.quick.demo',
	'soajs/soajs.nodejs.express',
	'soajs/soajs.nodejs.hapi',
	'soajs/soajs.java.jaxrs_jersey'
];
