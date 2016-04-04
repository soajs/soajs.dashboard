var githubAppConfig = {
	'form': {
		'login': {
			'entries': [
				{
					'name': 'provider',
					'label': 'Account Provider',
					'type': 'select',
					'value': [{'v': 'github', 'l': 'GitHub', 'selected': true}],
					'tooltip': 'Choose Account Provider',
					'required': true
				},
				{
					'name': 'label',
					'label': 'Account Name',
					'type': 'text',
					'value': '',
					'tooltip': 'Choose Account Label',
					'placeholder': 'Example: myAccount',
					'required': true
				},
				{
					'name': 'username',
					'label': 'Username',
					'type': 'text',
					'value': '',
					'tooltip': 'Account Username',
					'placeholder': 'Your Username',
					'required': true
				},
				{
					"name": "tokenMessage",
					"type": "html",
					"value": "<p><b>By signing in, we will create a OAuth token to be used by the SOAJS GitHub App. The token will have the following permissions:</b><br><ul><li>Grants read/write access to code, commit statuses, collaborators, and deployment statuses for public and private repositories and organizations.</li><li>Grants read, write, ping, and delete access to hooks in public or private repositories</li></ul><br>Note: You can always revoke access to this token from your GitHub account settings.</p>"
				}
			]
		},
		'logout': {
			'entries': [
				{
					'name': 'password',
					'label': 'Please provide your GitHub password in order to delete the SOAJS token',
					'type': 'password',
					'value': '',
					'tooltip': 'Github Account Password',
					'placeholder': 'Github Password',
					'required': true
				}
			]
		},
		'selectConfigBranch': {
			'entries': [
				{
					'name': 'branch',
					'label': "Please specify the branch to use to read the repository's config file",
					'type': 'select',
					'value': [],
					'tooltip': 'Config File Branch',
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
	}
};