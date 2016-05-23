"use strict";
var loginConfig = {
	formConf: {
		'name': 'login',
		'label': translation.login[LANG],
		'msgs': {
			'footer': ''
		},
		'entries': [
			{
				'name': 'username',
				'label': translation.username[LANG],
				'type': 'text',
				'placeholder': translation.enterUsername[LANG],
				'value': '',
				'tooltip': translation.usernamesToolTip[LANG],
				'required': true
			},
			{
				'name': 'password',
				'label': translation.password[LANG],
				'type': 'password',
				'placeholder': translation.enterPassword[LANG],
				'value': '',
				'fieldMsg': ' <a href="#/forgotPw">' + translation.forgotYourPassword[LANG] + '</a>',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			}
		]
	}
};

var resetPwConfig = {
	formConf: {
		'name': 'resetPw',
		'label': translation.resetPassword[LANG],
		'msgs': {
			'header': translation.pleaseEnterNewPassword[LANG],
			'footer': ''
		},
		'entries': [
			{
				'name': 'password',
				'label': translation.newPassword[LANG],
				'type': 'password',
				'placeholder': translation.newPasswordPlaceholder[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			},
			{
				'name': 'confirmPassword',
				'label': translation.confirmPassword[LANG],
				'type': 'password',
				'placeholder': translation.confirmPasswordPlaceholder[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			}
		]

	}
};

var setPasswordConfig = {
	formConf: {
		'name': 'resetPw',
		'label': translation.setYourPassword[LANG],
		'entries': [
			{
				'name': 'password',
				'label': translation.password[LANG],
				'type': 'password',
				'placeholder': translation.enterPassword[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			},
			{
				'name': 'confirmPassword',
				'label': translation.confirmPassword[LANG],
				'type': 'password',
				'placeholder': translation.confirmPasswordPlaceholder[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			}
		]
	}
};

var forgetPwConfig = {
	formConf: {
		'name': 'forgotPw',
		'label': translation.forgotPassword[LANG],
		'msgs': {
			'header': translation.forgetPasswordMsgHeader[LANG],
			'footer': ''
		},
		'entries': [
			{
				'name': 'username',
				'label': translation.username[LANG] + ' /  ' + translation.email[LANG],
				'type': 'text',
				'placeholder': translation.enterUsernameEmail[LANG],
				'value': '',
				'tooltip': translation.enterUserNameEmailPasswordChange[LANG],
				'required': true
			}
		]

	}
};

var changePwConfig = {
	formConf: {
		'name': 'changePassword',
		'label': '',
		'entries': [
			{
				'name': 'oldPassword',
				'label': translation.oldPassword[LANG],
				'type': 'password',
				'placeholder': translation.EnterOldPassword[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			},
			{
				'name': 'password',
				'label': translation.newPassword[LANG],
				'type': 'password',
				'placeholder': translation.newPasswordPlaceholder[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			},
			{
				'name': 'confirmPassword',
				'label': translation.confirmPassword[LANG],
				'type': 'password',
				'placeholder': translation.confirmPasswordPlaceholder[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			}
		]
	}
};

var changeEmailConfig = {
	formConf: {
		'name': '',
		'label': '',
		'entries': [
			{
				'name': 'email',
				'label': translation.newEmail[LANG],
				'type': 'email',
				'placeholder': translation.enterEmail[LANG],
				'value': '',
				'tooltip': translation.emailToolTip[LANG],
				'required': true
			}
		]

	}
};

var registerConfig = {
	formConf: {
		'name': 'newProfile',
		'label': translation.register[LANG],
		'entries': [
			{
				'name': 'firstName',
				'label': translation.firstName[LANG],
				'type': 'text',
				'placeholder': translation.enterFirstName[LANG],
				'value': '',
				'tooltip': translation.enterFirstNameUser[LANG],
				'required': true
			},
			{
				'name': 'lastName',
				'label': translation.lastName[LANG],
				'type': 'text',
				'placeholder': translation.enterLastName[LANG],
				'value': '',
				'tooltip': translation.enterLastNameUser[LANG],
				'required': true
			},
			{
				'name': 'email',
				'label': translation.email[LANG],
				'type': 'email',
				'placeholder': translation.enterEmail[LANG],
				'value': '',
				'tooltip': translation.emailToolTip[LANG],
				'required': true
			},
			{
				'name': 'username',
				'label': translation.username[LANG],
				'type': 'text',
				'placeholder': translation.enterUsername[LANG],
				'value': '',
				'tooltip': translation.usernamesToolTip[LANG],
				'required': true
			},
			{
				'name': 'password',
				'label': translation.password[LANG],
				'type': 'password',
				'placeholder': translation.enterPassword[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			},
			{
				'name': 'confirmPassword',
				'label': translation.confirmPassword[LANG],
				'type': 'password',
				'placeholder': translation.confirmPasswordPlaceholder[LANG],
				'value': '',
				'tooltip': translation.passwordsToolTip[LANG],
				'required': true
			}
		]
	}
};

var profileConfig = {
	formConf: {
		'name': 'editProfile',
		'label': '',
		'instructions': ' instructions ',
		'entries': []
	}
};