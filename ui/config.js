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
		'id': 'home',
		'label': 'Home',
		'url': '#/dashboard',
		'tplPath': 'modules/dashboard/directives/dashboard.tmpl',
		'scripts': ['modules/dashboard/controller.js'],
		'icon': 'home',
		'mainMenu': true,
		'private': true,
		'tracker': true
	},
	{
		'id': 'myAccount',
		'label': 'My Account',
		'url': '#/myaccount',
		'icon': 'smile',
		'tplPath': 'modules/myAccount/directives/myAccount.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'userMenu': true,
		'private': true
	},
	{
		'id': 'members',
		'label': 'Members',
		'checkPermission':{
			'service':'urac',
			'route':'/admin/listUsers'
		},
		'url': '#/members',
		'tplPath': 'modules/members/directives/list.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/members/member/config.js', 'modules/members/member/controller.js', 'modules/members/group/config.js', 'modules/members/group/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'user-acl',
		'label': 'User ACL',
		'checkPermission':{
			'service':'urac',
			'route':'/admin/editUser'
		},
		'url': '#/members/:uId/editUserAcl',
		'tplPath': 'modules/members/directives/editUserAcl.tmpl',
		'tracker': true,
		'scripts': ['modules/members/member/config.js', 'modules/members/member/controller.js', 'modules/members/group/config.js', 'modules/members/group/controller.js'],
		'ancestor': ['Home', 'Members']
	},
	{
		'id': 'environments',
		'checkPermission':{
			'service':'dashboard',
			'route':'/environment/list'
		},
		'label': 'Environments',
		'url': '#/environments',
		'tplPath': 'modules/environments/directives/list.tmpl',
		'icon': 'earth',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'oneEnvironment',
		'label': 'Environments',
		'checkPermission':{
			'service':'dashboard',
			'route':'/environment/list'
		},
		'url': '#/environments/environment/:id?',
		'tplPath': 'modules/environments/directives/edit.tmpl',
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'services',
		'label': 'Services',
		'checkPermission':{
			'service':'dashboard',
			'route':'/services/list'
		},
		'url': '#/services',
		'tplPath': 'modules/services/directives/list.tmpl',
		'icon': 'tree',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/services/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'productization',
		'label': 'Productization',
		'checkPermission':{
			'service':'dashboard',
			'route':'/product/list'
		},
		'url': '#/productization',
		'tplPath': 'modules/productization/directives/list.tmpl',
		'icon': 'list',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'product-acl',
		'label': 'Edit Package ACL',
		'checkPermission':{
			'service':'dashboard',
			'route':'/product/update'
		},
		'url': '#/productization/:pid/editAcl/:code',
		'tplPath': 'modules/productization/directives/editAcl.tmpl',
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js'],
		'ancestor': ['Home', 'Productization']
	},
	{
		'id': 'multi-tenancy',
		'label': 'Multi-Tenancy',
		'checkPermission':{
			'service':'dashboard',
			'route':'/tenant/list'
		},
		'url': '#/multi-tenancy',
		'tplPath': 'modules/multitenancy/directives/list.tmpl',
		'icon': 'tree',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'tenant-app-acl',
		'label': 'Edit Application ACL',
		'checkPermission':{
			'service':'dashboard',
			'route':'/tenant/update'
		},
		'url': '#/multi-tenancy/:tId/editAcl/:appId',
		'tplPath': 'modules/multitenancy/directives/editAcl.tmpl',
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