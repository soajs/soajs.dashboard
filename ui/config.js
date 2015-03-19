"use strict";
var themeToUse = "second";

var navigation = [
	{
		'id': 'login',
		'label': 'Login',
		'url': '#/login',
		'guestMenu': true, 
		'tplPath': 'modules/myAccount/directives/login.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js']
	},
	{
		'id': 'register',
		'label': 'Register',
		'url': '#/register',
		'tplPath': 'modules/myAccount/directives/register.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'guestMenu': true
	},
	{
		'id': 'forgot_password',
		'label': 'Forgot Password',
		'url': '#/forgotPw',
		'tplPath': 'modules/myAccount/directives/forgotPassword.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'reset_password',
		'label': 'Reset Password',
		'url': '#/resetPassword',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'tplPath': 'modules/myAccount/directives/resetPassword.tmpl',
		'guestMenu': false
	},
	{
		'id': 'set_password',
		'label': 'Set Password',
		'url': '#/setNewPassword',
		'tplPath': 'modules/myAccount/directives/setNewPassword.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'validate_join',
		'label': 'Validate Join Email',
		'url': '#/join/validate',
		'tplPath': 'modules/myAccount/directives/validate.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'validate_email',
		'label': 'Validate Change Email',
		'url': '#/changeEmail/validate',
		'tplPath': 'modules/myAccount/directives/validate.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'home',
		'label': 'Home',
		'url': '#/login',
		'tplPath': 'modules/myAccount/directives/login.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'footerMenu': true
	},
	{
		'id': 'help',
		'label': 'Help',
		'url': '#/help',
		'tplPath': 'modules/dashboard/directives/help.tmpl',
		'footerMenu': true
	},
	{
		'id': 'support',
		'label': 'Support',
		'url': '#/support',
		'tplPath': 'modules/dashboard/directives/support.tmpl',
		'footerMenu': true
	},
	{
		'id': 'privacy',
		'label': 'Privacy',
		'url': '#/privacy',
		'tplPath': 'modules/dashboard/directives/privacy.tmpl',
		'footerMenu': true
	},

	{
		'id': 'home',
		'label': 'Home',
		'url': '#/dashboard',
		'tplPath': 'modules/dashboard/directives/dashboard.tmpl',
		'scripts': ['modules/dashboard/controller.js'],
		'mainMenu': true,
		'private': true
	},
	{
		'id': 'myAccount',
		'label': 'My Account',
		'url': '#/myaccount',
		'tplPath': 'modules/myAccount/directives/myAccount.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'userMenu': true,
		'private': true
	},
	{
		'id': 'members',
		'label': 'Members',
		'url': '#/members',
		'tplPath': 'modules/members/directives/list.tmpl',
		'mainMenu': true,
		'scripts': ['modules/members/config.js', 'modules/members/controller.js'],
		'ancestor': ['Home']
	},

	{
		'id': 'environments',
		'label': 'Environments',
		'url': '#/environments',
		'tplPath': 'modules/environments/directives/list.tmpl',
		'mainMenu': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/controller.js'],
		'ancestor': ['Home']
	},

	{
		'id': 'productization',
		'label': 'Productization',
		'url': '#/productization',
		'tplPath': 'modules/productization/directives/list.tmpl',
		'mainMenu': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'productization_packages',
		'label': 'Edit Productization',
		'url': '#/productization/edit/:id',
		'tplPath': 'modules/productization/directives/edit.tmpl',
		'mainMenu': false,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js'],
		'ancestor': ['Home', 'Productization']
	},

	{
		'id': 'multi-tenancy',
		'label': 'Multi-Tenancy',
		'url': '#/multi-tenancy',
		'tplPath': 'modules/multitenancy/directives/list.tmpl',
		'mainMenu': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'multi-tenancy_applications',
		'label': 'Edit Tenant',
		'url': '#/multi-tenancy/edit/:id',
		'tplPath': 'modules/multitenancy/directives/edit.tmpl',
		'mainMenu': false,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js'],
		'ancestor': ['Home', 'Multi-Tenancy']
	},
	{
		'id': 'multi-tenancy_keys',
		'label': 'Edit Tenant Application',
		'url': '#/multi-tenancy/:id/application/:appId/keys',
		'tplPath': 'modules/multitenancy/directives/edit-application.tmpl',
		'mainMenu': false,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js'],
		'ancestor': ['Home', 'Multi-Tenancy', 'Edit Tenant']
	}
];

var whitelistedDomain = ['localhost', '127.0.0.1', 'api.soajs.org'];

var apiConfiguration = {
	domain: 'http://api.soajs.org',
	key: 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac'
};