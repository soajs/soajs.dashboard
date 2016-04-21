var gitAccountsAppConfig = {
	'form': {
		'login': {
			'entries': [
				{
					'name': 'provider',
					'label': translation.accountProvider[LANG],
					'type': 'select',
					'value': [{'v': 'github', 'l': 'GitHub', 'selected': true}],
					'tooltip': translation.chooseAccountProvider[LANG],
					'required': true
				},
				{
					'name': 'label',
					'label': translation.accountName[LANG],
					'type': 'text',
					'value': '',
					'tooltip': translation.chooseAccountName[LANG],
					'placeholder': translation.exampleMyAccount[LANG],
					'required': true
				},
				{
					'name': 'username',
					'label': translation.username[LANG],
					'type': 'text',
					'value': '',
					'placeholder': translation.yourUsername[LANG],
					'required': true
				},
				{
					"name": "tokenMessage",
					"type": "html",
					"value": "<p><b>" + translation.loginMessagePermissionsPartOne[LANG] + "</b><br><ul><li>" + translation.loginMessagePermissionsPartTwo[LANG] + "</li><li>" + translation.loginMessagePermissionsPartThree[LANG] + "</li></ul><br>" + translation.loginMessagePermissionsPartFour[LANG] + "</p>"
				}
			]
		},
		'logout': {
			'entries': [
				{
					'name': 'password',
					'label': translation.pleaseProvidePassword[LANG],
					'type': 'password',
					'value': '',
					'placeholder': translation.gitPassword[LANG],
					'required': true
				}
			]
		},
		'selectConfigBranch': {
			'entries': [
				{
					'name': 'branch',
					'label': translation.pleaseSpecifyConfigBranch[LANG],
					'type': 'select',
					'value': [],
					'required': true
				}
			]
		}
	},
	'permissions': {
		listAccounts: ['dashboard', '/github/accounts/list'],
		deleteAccount: ['dashboard', '/github/accounts/delete'],
		updateAccount: ['dashboard', '/github/accounts/update'],
		login: ['dashboard', '/github/login'],
		listRepos: ['dashboard', '/github/getRepos']
	},

	"blacklistedRepos": [
		'soajs/connect-mongo-soajs',
		'soajs/soajs',
		'soajs/soajs.agent',
		'soajs/soajs.composer',
		'soajs/soajs.dash.example',
		'soajs/soajs.gcs',
		'soajs/soajs.mongodb.data',
		'soajs/soajs.utilities',
		'soajs/soajs.website.contactus',
		'soajs/soajs.jsconfbeirut'
	]
};