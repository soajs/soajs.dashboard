"use strict";
/**
 * Custom configuration values
 */

var mydomain = "soajs.org";

//detect domain
if(location && location.host){
	var customDomain = location.host.split(".");
	customDomain = customDomain[customDomain.length-2] + "." + customDomain[customDomain.length-1];
	mydomain = customDomain;
}

//detect port
var mydomainport = 80;
if (location && location.port && location.port !== 80) {
	mydomainport = mydomainport;
}
mydomain += ":" + mydomainport;

//set the api domain
var mydomainAPI = "dashboard-api";
if(customSettings && customSettings.api && customSettings.api !== ''){
	mydomainAPI = customSettings.api;
}

//set the key
var myKey = "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974";
if(customSettings && customSettings.key && customSettings.key !== ''){
	myKey = customSettings.key;
}

var titlePrefix = "SOAJS";
var themeToUse = "default";
var whitelistedDomain = ['localhost', '127.0.0.1', mydomainAPI + '.' + mydomain];
var apiConfiguration = {
	domain: window.location.protocol + '//' + mydomainAPI + '.' + mydomain,
	key: myKey
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
