"use strict";
var myAccountNav = [
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
		'id': 'myAccount',
		'label': 'My Account',
		'url': '#/myaccount',
		'icon': 'smile',
		'tplPath': 'modules/myAccount/directives/myAccount.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'userMenu': true,
		'private': true
	}
];