var gitAccountsAppConfig = {
	'form': {
		'login': {
			'entries': [
				{
					'name': 'provider',
					'label': translation.accountProvider[LANG],
					'type': 'select',
					'value': [{'v': 'bitbucket', 'l': 'Bitbucket'},  {'v': 'github', 'l': 'GitHub'}],
					'tooltip': translation.chooseAccountProvider[LANG],
					'required': true,
					'onAction': function (id, selected, form) {
						if (selected === 'bitbucket') {
							form.entries[1].value = 'bitbucket.org';
							if (form.entries[1].type !== 'text') {
								form.entries[1].type = 'text';
							}
						}
						else if (selected === 'github') {
							form.entries[1].value = 'github.com';
							form.entries[1].type = 'readonly';
						}
						form.refresh();
					}
				},
				{
					'name': 'providerDomain',
					'label': 'Provider Domain',
					'type': 'text',
					'value': '',
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
		listAccounts: ['dashboard', '/gitAccounts/accounts/list'],
		login: ['dashboard', '/gitAccounts/login'],
		logout: ['dashboard', '/gitAccounts/logout'],
		activateRepo: ['dashboard', '/gitAccounts/repo/activate'],
		deactivateRepo: ['dashboard', '/gitAccounts/repo/deactivate'],
		syncRepo: ['dashboard', '/gitAccounts/repo/sync'],
		getRepos: ['dashboard', '/gitAccounts/getRepos'],
		getBranches: ['dashboard', '/gitAccounts/getBranches']
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
