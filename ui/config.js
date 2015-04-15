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
		'private': true,
		'tracker': true
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
		'tracker': true,
		'scripts': ['modules/members/member/config.js', 'modules/members/member/controller.js', 'modules/members/group/config.js', 'modules/members/group/controller.js' ],
		'ancestor': ['Home']
	},
	{
		'id': 'environments',
		'label': 'Environments',
		'url': '#/environments',
		'tplPath': 'modules/environments/directives/list.tmpl',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/controller.js'],
		'ancestor': ['Home']
	},

	{
		'id': 'productization',
		'label': 'Productization',
		'url': '#/productization',
		'tplPath': 'modules/productization/directives/list.tmpl',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'multi-tenancy',
		'label': 'Multi-Tenancy',
		'url': '#/multi-tenancy',
		'tplPath': 'modules/multitenancy/directives/list.tmpl',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'multi-tenancy_applications',
		'label': 'Edit Tenant',
		'url': '#/multi-tenancy/edit/:id',
		'tplPath': 'modules/multitenancy/directives/edit.tmpl',
		'mainMenu': false,
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js'],
		'ancestor': ['Home', 'Multi-Tenancy']
	},
	{
		'id': 'multi-tenancy_keys',
		'label': 'Edit Tenant Application',
		'url': '#/multi-tenancy/:id/application/:appId/keys',
		'tplPath': 'modules/multitenancy/directives/edit-application.tmpl',
		'mainMenu': false,
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js'],
		'ancestor': ['Home', 'Multi-Tenancy']
	}
];

var whitelistedDomain = ['localhost', '127.0.0.1', 'dashboard-api.soajs.org'];

var apiConfiguration = {
	domain: 'http://dashboard-api.soajs.org',
	key: '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974'
};