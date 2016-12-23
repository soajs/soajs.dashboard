"use strict";
var accTranslation = {
	"myAccount": {
		"ENG": "My Account",
		"FRA": "My Account"
	},
	//controller
	"changeEmail": {
		"ENG": "Change Email",
		"FRA": "Changer l'e-mail"
	},
	"successMsgChangeEmail": {
		"ENG": "A link will be sent to your new email address to validate the change.",
		"FRA": "A link will be sent to your new email address to validate the change."
	},
	"changePassword": {
		"ENG": "Change Password",
		"FRA": "Changer le mot de passe"
	},
	"errorMessageChangePassword": {
		"ENG": "Your password and confirm password fields do not match!",
		"FRA": "Your password and confirm password fields do not match!"
	},
	"successMsgChangePassword": {
		"ENG": "Password Updated Successfully.",
		"FRA": "Mot de passe Updated Successfully."
	},
	"editProfile": {
		"ENG": "Edit Profile",
		"FRA": "Edit Profile"
	},
	"errorInvalidProfileJsonObject": {
		"ENG": "Error: Invalid Profile Json object",
		"FRA": "Error: Invalid Profile Json object"
	},
	"profileUpdatedSuccessfully": {
		"ENG": "Profile Updated Successfully.",
		"FRA": "Profile Updated Successfully."
	},
	"JSONObjectRepresentingYourProfile": {
		"ENG": "JSON object representing your profile",
		"FRA": "JSON object representing your profile"
	},
	"fillYourAdditionalProfileInformation": {
		"ENG": "Fill in your additional profile information",
		"FRA": "Fill in your additional profile information"
	},
	"youNeedToLoginFirst": {
		"ENG": "You need to Login first",
		"FRA": "You need to Login first"
	},
	"yourEmailValidatedChangedSuccessfully": {
		"ENG": "Your email was validated and changed successfully.",
		"FRA": "Your email was validated and changed successfully."
	},
	"youAreAlreadyLoggedIn": {
		"ENG": "You are already logged in.",
		"FRA": "You are already logged in."
	},
	"resetLinkSentYourEmailAddress": {
		"ENG": "A reset link has been sent to your email address.",
		"FRA": "A reset link has been sent to your email address."
	},
	"youAlreadyLoggedInLogOutFirst": {
		"ENG": "You are already logged in. Log out first",
		"FRA": "You are already logged in. Log out first"
	},
	"passwordSetSuccessfully": {
		"ENG": "Password was set successfully.",
		"FRA": "Mot de passe was set successfully."
	},
	"yourPasswordReset": {
		"ENG": "Your password was reset.",
		"FRA": "Your Mot de passe was reset."
	},
	//directives
	//forgotPassword
	"goBackToLogin": {
		"ENG": "Go Back to Login",
		"FRA": "Go Back to Login"
	},
	//myAccount
	"changEmail": {
		"ENG": "Change Email",
		"FRA": "Change Email"
	},
	//config
	"enterPassword": {
		"ENG": "Enter Password",
		"FRA": "Votre Mot de passe"
	},
	"forgotYourPassword": {
		"ENG": "Forgot your password?",
		"FRA": "Forgot your Mot de passe?"
	},
	"resetPassword": {
		"ENG": "Reset Password",
		"FRA": "Reset Mot de passe"
	},
	"pleaseEnterNewPassword": {
		"ENG": "Please enter a new password",
		"FRA": "Please enter a nouveau mot de passe"
	},
	"newPassword": {
		"ENG": "New Password",
		"FRA": "New Mot de passe"
	},
	"setYourPassword": {
		"ENG": "Set your Password",
		"FRA": "Fixer votre Mot de passe"
	},
	"forgotPassword": {
		"ENG": "Forgot Password",
		"FRA": "Oublié le mot de passe"
	},
	"forgetPasswordMsgHeader": {
		"ENG": "Please enter your account email address or username to reset your password",
		"FRA": "Please enter your account email address or username to reset your Mot de passe"
	},
	"enterUsernameEmail": {
		"ENG": "Enter Username or E-mail",
		"FRA": "Enter Username or E-mail"
	},
	"enterUserNameEmailPasswordChange": {
		"ENG": "Enter your Username or E-mail to ask for a password change",
		"FRA": "Enter your Username or E-mail to ask for a Mot de passe change"
	},
	"oldPassword": {
		"ENG": "Old Password",
		"FRA": "Ancien Mot de passe"
	},
	"EnterOldPassword": {
		"ENG": "Enter your Old Password",
		"FRA": "Entrer votre ancien Mot de passe"
	},
	"newEmail": {
		"ENG": "New Email",
		"FRA": "New Email"
	},
	"register": {
		"ENG": "Register",
		"FRA": "Register"
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
		'tplPath': 'modules/dashboard/myAccount/directives/login.tmpl',
		'scripts': ['modules/dashboard/myAccount/config.js', 'modules/dashboard/myAccount/controller.js']
	},
	{
		'id': 'forgot_password',
		//'label': 'Forgot Password',
		'url': '#/forgotPw',
		'tplPath': 'modules/dashboard/myAccount/directives/forgotPassword.tmpl',
		'scripts': ['modules/dashboard/myAccount/config.js', 'modules/dashboard/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'reset_password',
		//'label': 'Reset Password',
		'url': '#/resetPassword',
		'scripts': ['modules/dashboard/myAccount/config.js', 'modules/dashboard/myAccount/controller.js'],
		'tplPath': 'modules/dashboard/myAccount/directives/resetPassword.tmpl',
		'guestMenu': false
	},
	{
		'id': 'set_password',
		//'label': 'Set Password',
		'url': '#/setNewPassword',
		'tplPath': 'modules/dashboard/myAccount/directives/setNewPassword.tmpl',
		'scripts': ['modules/dashboard/myAccount/config.js', 'modules/dashboard/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'validate_email',
		//'label': 'Validate Change Email',
		'url': '#/changeEmail/validate',
		'tplPath': 'modules/dashboard/myAccount/directives/validate.tmpl',
		'scripts': ['modules/dashboard/myAccount/config.js', 'modules/dashboard/myAccount/controller.js'],
		'guestMenu': false
	},
	{
		'id': 'myAccount',
		'checkPermission': {
			'service': 'urac',
			'route': '/account/editProfile',
			'method': 'post'
		},
		'label': translation.myAccount[LANG],
		'url': '#/myaccount',
		'icon': 'smile',
		'tplPath': 'modules/dashboard/myAccount/directives/myAccount.tmpl',
		'scripts': ['modules/dashboard/myAccount/config.js', 'modules/dashboard/myAccount/controller.js'],
		'userMenu': true,
		'private': true
	}
];
navigation = navigation.concat(myAccountNav);