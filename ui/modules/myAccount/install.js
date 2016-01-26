"use strict";
var accTranslation = {
	"login": {
		"ENG": "Login",
		"FRA": "Login"
	},
	"myAccount": {
		"ENG": "My Account",
		"FRA": "My Account"
	},
	//controller
	"changeEmail": {
		"ENG": "Change Email",
		"FRA": "Change Email"
	},
	"successMsgChangeEmail": {
		"ENG": "A link will be sent to your new email address to validate the change",
		"FRA": "A link will be sent to your new email address to validate the change"
	},
	"changePassword": {
		"ENG": "Change Password",
		"FRA": "Change Password"
	},
	"errorMessageChangePassword": {
		"ENG": "Your password and confirm password fields do not match",
		"FRA": "Your password and confirm password fields do not match"
	},
	"successMsgChangePassword": {
		"ENG": "Password Updated Successfully",
		"FRA": "Password Updated Successfully"
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
		"ENG": "Profile Updated Successfully",
		"FRA": "Profile Updated Successfully"
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
		"ENG": "Your email was validated and changed successfully",
		"FRA": "Your email was validated and changed successfully"
	},
	"youAreAlreadyLoggedIn": {
		"ENG": "You are already logged in",
		"FRA": "You are already logged in"
	},
	"resetLinkSentYourEmailAddress": {
		"ENG": "A reset link has been sent to your email address",
		"FRA": "A reset link has been sent to your email address"
	},
	"youAlreadyLoggedInLogOutFirst": {
		"ENG": "You are already logged in. Log out first",
		"FRA": "You are already logged in. Log out first"
	},
	"passwordSetSuccessfully": {
		"ENG": "Password was set successfully",
		"FRA": "Password was set successfully"
	},
	"yourPasswordReset": {
		"ENG": "Your password was reset",
		"FRA": "Your password was reset"
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
		"FRA": "Enter Password"
	},
	"forgotYourPassword": {
		"ENG": "Forgot your password?",
		"FRA": "Forgot your password?"
	},
	"resetPassword": {
		"ENG": "Reset Password",
		"FRA": "Reset Password"
	},
	"pleaseEnterNewPassword": {
		"ENG": "Please enter a new password",
		"FRA": "Please enter a new password"
	},
	"newPassword": {
		"ENG": "New Password",
		"FRA": "New Password"
	},
	"setYourPassword": {
		"ENG": "Set your Password",
		"FRA": "Set your Password"
	},
	"forgotPassword": {
		"ENG": "Forgot Password",
		"FRA": "Forgot Password"
	},
	"forgetPasswordMsgHeader": {
		"ENG": "Please enter your account email address or username to reset your password",
		"FRA": "Please enter your account email address or username to reset your password"
	},
	"enterUsernameEmail": {
		"ENG": "Enter Username or E-mail",
		"FRA": "Enter Username or E-mail"
	},
	"enterUserNameEmailPasswordChange": {
		"ENG": "Enter your Username or E-mail to ask for a password change",
		"FRA": "Enter your Username or E-mail to ask for a password change"
	},
	"oldPassword": {
		"ENG": "Old Password",
		"FRA": "Old Password"
	},
	"EnterOldPassword": {
		"ENG": "Enter your Old Password",
		"FRA": "Enter your Old Password"
	},
	"newEmail": {
		"ENG": "New Email",
		"FRA": "New Email"
	},
	"register": {
		"ENG": "Register",
		"FRA": "Register"
	},
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
		'label': translation.myAccount[LANG],
		'url': '#/myaccount',
		'icon': 'smile',
		'tplPath': 'modules/myAccount/directives/myAccount.tmpl',
		'scripts': ['modules/myAccount/config.js', 'modules/myAccount/controller.js'],
		'userMenu': true,
		'private': true
	}
];
navigation = navigation.concat(myAccountNav);