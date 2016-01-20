"use strict";
var accTranslation = {
	"login": {
		"ENG": "Login",
		"FRA": "Login"
	}
};

for (var attrname in accTranslation) {
	translation[attrname] = accTranslation[attrname];
}

var myAccountNav = [
	{
		'id': 'login',
		'label': translation.login[LANG],
		'url': '#/login',
		'guestMenu': true,
		'tplPath': 'modules/myAccount/directives/login.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js']
	},
	{
		'id': 'forgot_password',
		//'label': 'Forgot Password',
		'url': '#/forgotPw',
		'tplPath': 'modules/myAccount/directives/forgotPassword.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'reset_password',
		//'label': 'Reset Password',
		'url': '#/resetPassword',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'tplPath': 'modules/myAccount/directives/resetPassword.tmpl',
		'guestMenu': false
	},
	{
		'id': 'set_password',
		//'label': 'Set Password',
		'url': '#/setNewPassword',
		'tplPath': 'modules/myAccount/directives/setNewPassword.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'validate_email',
		//'label': 'Validate Change Email',
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
navigation = navigation.concat(myAccountNav);