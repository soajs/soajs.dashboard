var gitAccountsAppConfig = {
	'form': {
		'login': {
			'entries': [
				{
					'name': 'provider',
					'label': translation.accountProvider[LANG],
					'type': 'select',
					'value': [{'v': 'github', 'l': 'GitHub'}, {'v': 'bitbucket_org', 'l': 'Bitbucket'}, {'v': 'bitbucket_enterprise', 'l': 'Bitbucket Enterprise'}],
					'tooltip': translation.chooseAccountProvider[LANG],
					'required': true,
					'onAction': function (id, selected, form) {
						if (selected === 'github') {
							form.entries[1].value = 'github.com';
							form.entries[1].type = 'readonly';

							if (!form.entries[2].value[2]) {
								form.entries[2].value.push({'v': 'organization_public', 'l': 'Organization - Public'});
							}
						}
						else {
							if (form.entries[2].value[2] && form.entries[2].value[2].v === 'organization_public') {
								form.entries[2].value.splice(2, 1);
							}

							if (selected === 'bitbucket_org') {
								form.entries[1].value = 'bitbucket.org';
								form.entries[1].type = 'readonly';
							}
							else if (selected === 'bitbucket_enterprise') {
								form.entries[1].value = ' ';
								form.entries[1].type = 'text';
							}
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
		            'name': 'type',
		            'label': 'Account Type',
		            'class': 'accountType',
		            'type': 'radio',
		            'value': [
						{'v': 'personal_public', 'l': 'Personal Account - Public Repositories', 'selected': true},
		                {'v': 'personal_private', 'l': 'Personal Account - Public and Private Repositories'}
					],
		            'required': true,
		            onAction: function (label, selected, formConfig) {
		                if (selected.split('_')[1] === 'private' && formConfig.entries[5].name !== 'password') {
		                    var password = {
		                        'name': 'password',
		                        'label': 'Password',
		                        'type': 'password',
		                        'value': '',
		                        'tooltip': 'Account Password',
		                        'placeholder': 'Your Password',
		                        'required': true
		                    };
		                    formConfig.entries.splice(5, 0, password);
		                } else {
		                    if (selected.split('_')[1] !== 'private' && formConfig.entries[5].name === 'password') {
		                        formConfig.entries.splice(5, 1);
		                    }
		                }
		            }
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
