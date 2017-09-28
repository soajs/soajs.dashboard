"use strict";
/**
 * Custom configuration values
 */

var mydomain = "soajs.org";

//detect domain
if(location && location.host){
	var customDomain = location.host;
	customDomain = customDomain.split(":")[0];
	customDomain = customDomain.split(".");
	customDomain = customDomain[customDomain.length-2] + "." + customDomain[customDomain.length-1];
	mydomain = customDomain;
}

//detect port
var mydomainport = 80;
if (location && location.port && parseInt(location.port) !== 80) {
	mydomainport = location.port;
}
mydomain += ":" + mydomainport;

//set the api domain
var mydomainAPI = "dashboard-api";
if(customSettings && customSettings.api && customSettings.api !== ''){
	mydomainAPI = customSettings.api;
}

//set the key
var myKey = "d44dfaaf1a3ba93adc6b3368816188f9481bf65ad90f23756391e85d754394e0ee45923e96286f55e60a98efe825af3ef9007121c7baaa49ec8ea3ac9159a4bfc56c87674c94625b36b468c75d58158e0c9df0b386d7f591fbf679eb611d02bf";
if(customSettings && customSettings.key && customSettings.key !== ''){
	myKey = customSettings.key;
}

var protocol = window.location.protocol;
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
      cd: 'modules/dashboard/cd/install.js',
      gcatalogs: 'modules/dashboard/gc-catalogs/install.js'

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
			environments: 'modules/dashboard/environments/install.js',
			resources: 'modules/dashboard/resources/install.js'
		}
	},
	"operate": {
		"dev": {
			urac: uiModuleDev + '/urac/install.js',
			contentManagement: uiModuleDev + '/contentManagement/install.js',
      aggregation: 'modules/dev/aggregation/install.js'
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
