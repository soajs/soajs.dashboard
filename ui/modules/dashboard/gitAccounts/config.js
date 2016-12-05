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

							form.entries[4].label = 'Username';

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

								form.entries[4].label = 'Email Address';
							}
							else if (selected === 'bitbucket_enterprise') {
								form.entries[1].value = ' ';
								form.entries[1].type = 'text';

								form.entries[4].label = 'Username';
							}
						}

						form.entries = form.entries.slice(0, 5);
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
						if (selected.split('_')[1] === 'private') {
							if (!formConfig.entries[5] || (formConfig.entries[5] && formConfig.entries[5].name !== 'password')) {
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
							}

							var currentProvider;
							for (var i =0; i < formConfig.entries[0].value.length; i++) {
								if (formConfig.entries[0].value[i].selected) {
									currentProvider = formConfig.entries[0].value[i];
								}
							}
							if (currentProvider.v === 'bitbucket_org' && !formConfig.entries[6] && !formConfig.entries[7]) {
								var oauth = [
									{
										'name': 'oauthKey',
										'label': 'OAuth 2.0 Consumer Key',
										'type': 'text',
										'value': '',
										'placeholder': 'OAuth consumer key generated using Bitbucket account settings',
										'required': true
									},
									{
										'name': 'oauthSecret',
										'label': 'OAuth 2.0 Consumer Secret',
										'type': 'text',
										'value': '',
										'placeholder': 'OAuth consumer secret generated using Bitbucket account settings',
										'required': true
									},
									{
										"name": "bitbucketMessage",
										"type": "html",
										"value": "<br><p><b>In order to generate OAuth consumer key/secret, follow the following steps:</b><br><ul><li>Login to your bitbucket account, go to Bitbucket Settings > OAuth</li><li>Under OAuth consumers section, click on Add consumer and fill in the required information</li><li>Make sure you grant this consumer permission to read repositories</li><li>Finally, grab the generated key and secret and use them to login to SOAJS Git app using your bitbucket account</li></ul></p>"
									}
								];
								formConfig.entries.splice(6, 0, oauth[0], oauth[1], oauth[2]);
							}
							else if (currentProvider.v === 'github') {
								var githubMessage = {
									"name": "tokenMessage",
									"type": "html",
									"value": "<br><p><b>" + translation.loginMessagePermissionsPartOne[LANG] + "</b><br><ul><li>" + translation.loginMessagePermissionsPartTwo[LANG] + "</li><li>" + translation.loginMessagePermissionsPartThree[LANG] + "</li></ul><br>" + translation.loginMessagePermissionsPartFour[LANG] + "</p>"
								};
								formConfig.entries.splice(6, 0, githubMessage);
							}
						}
						else {

							if (formConfig.entries[8] && formConfig.entries[8].name === 'bitbucketMessage') {
								formConfig.entries.splice(8, 1);
							}
							if (formConfig.entries[7] && formConfig.entries[7].name === 'oauthSecret') {
								formConfig.entries.splice(7, 1);
							}
							if (formConfig.entries[6] && formConfig.entries[6].name === 'oauthKey') {
								formConfig.entries.splice(6, 1);
							}
							if (formConfig.entries[5] && formConfig.entries[5].name === 'password') {
								formConfig.entries.splice(5, 1);
							}
						}
		            }
		        },
				{
					'name': 'label',
					'label': translation.accountLabel[LANG],
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
		'soajs/soajs.jsconfbeirut',
		"soajs/soajs.installer",
		"soajs/soajs.sdk",
		"soajs/soajs.dashboard.ui",
		"soajs/soajs.website.ui"
	]
};
