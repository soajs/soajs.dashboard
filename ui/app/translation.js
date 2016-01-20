var LANG = 'ENG';

var translation = {
	'home': {
		"ENG": "Home",
		"FRA": "Acceuil"
	},
	'welcome': {
		"ENG": "Welcome",
		"FRA": "Bienvenue"
	},
	'help': {
		"ENG": "Help",
		"FRA": "Aide"
	}
};

var errorCodes = {
	"urac": {
		400: {
			"ENG": "Problem with the provided password."
		},
		401: {
			"ENG": "Unable to log in the user. User not found."
		},
		402: {
			"ENG": "User account already exists."
		},
		403: {
			"ENG": "Unable to register user. please try again."
		},
		404: {
			"ENG": "Unable to logout the user. User not found."
		},
		405: {
			"ENG": "Unable to find User. Please try again."
		},
		406: {
			"ENG": "Invalid or token has expired."
		},
		407: {
			"ENG": "Problem validating Request. Please try again."
		},
		408: {
			"ENG": "The password and its confirmation do not match"
		},
		409: {
			"ENG": "Invalid old password provided"
		},
		410: {
			"ENG": "username taken, please choose another username"
		},
		411: {
			"ENG": "invalid user id provided"
		},
		412: {
			"ENG": "You have provided the same existing email address"
		},
		413: {
			"ENG": "Invalid profile field provided. Profile should be a stringified object."
		},
		414: {
			"ENG": "Unable to add user."
		},
		415: {
			"ENG": "Unable to find group."
		},
		416: {
			"ENG": "Unable to create Group."
		},
		417: {
			"ENG": "Invalid group id provided"
		},
		418: {
			"ENG": "Unable to edit Group."
		},
		419: {
			"ENG": "Unable to delete Group."
		},
		420: {
			"ENG": "Group name already exists. Choose another"
		},
		421: {
			"ENG": "Group code already exists. Choose another"
		},

		500: {
			"ENG": "This record in locked. You cannot modify or delete it"
		},

		600: {
			"ENG": "Database connection error"
		},
		611: {
			"ENG": "invalid tenant id provided"
		}
	},
	"dashboard": {}
};

if ($.cookie) {
	var lnCookie = $.cookie("soajs_LANG");
	lnCookie = lnCookie.replace(/\"/g, '');
	LANG = lnCookie;
}