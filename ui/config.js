"use strict";

/**
 * Custom configuration values
 */
var mydomain = "soajs.org";
var mydomainport = location.port;
if(mydomainport && mydomainport !== 80){
	mydomain += ":" + mydomainport;
}
var protocol = window.location.protocol;
var themeToUse = "default";
var whitelistedDomain = ['localhost', '127.0.0.1', 'dashboard-api.' + mydomain];
var apiConfiguration = {
	domain: protocol + '//dashboard-api.' + mydomain,
	key: 'd44dfaaf1a3ba93adc6b3368816188f96134dfedec7072542eb3d84ec3e3d260f639954b8c0bc51e742c1dff3f80710e3e728edb004dce78d82d7ecd5e17e88c39fef78aa29aa2ed19ed0ca9011d75d9fc441a3c59845ebcf11f9393d5962549'
};

var uiModuleDev = 'modules/dev';
var uiModuleStg = 'modules/stg';
var uiModuleProd = 'modules/prod';

var modules = {
	"develop": {
		"dashboard": {
			services: 'modules/dashboard/services/install.js',
			contentBuilder: 'modules/dashboard/contentBuilder/install.js',
			staticContent: 'modules/dashboard/staticContent/install.js',
			githubApp: 'modules/dashboard/gitAccounts/install.js',
			swaggerEditorApp: 'modules/dashboard/swaggerEditor/install.js'
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
			profile: uiModuleDev + '/profile/install.js',
			merchantProducts: uiModuleDev + '/merchantProducts/install.js',

			cart: 'modules/dev/shoppingCart/install.js',
			// order: 'modules/dev/order/install.js',
			catalogProfiles: 'modules/dev/catalogProfiles/install.js',
			// drivers: 'modules/dev/drivers/install.js',
			
			urac: 'modules/dev/urac/install.js',
			contentManagement: 'modules/dev/contentManagement/install.js'
		},
		"stg": {
			contentManagement: 'modules/stg/contentManagement/install.js'
		}
	},
	"common": {
		"dashboard": {
			myAccount: 'modules/dashboard/myAccount/install.js'
		}
	}
};
