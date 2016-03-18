var githubAppConfig = {
    'form': {
        'login': {
            'entries': [
                {
                    'name': 'username',
                    'label': 'Github Username',
                    'type': 'text',
                    'value': '',
                    'tooltip': 'Github Account Username',
                    'placeholder': 'Github Username',
                    'required': true
                },
                {
                    'name': 'password',
                    'label': 'Github Password',
                    'type': 'password',
                    'value': '',
                    'tooltip': 'Github Account Password',
                    'placeholder': 'Github Password',
                    'required': true
                },
                {
                    'name': 'accountLabel',
                    'label': 'Account Label',
                    'type': 'text',
                    'value': '',
                    'tooltip': 'Choose Account Label',
                    'placeholder': 'Example: myAccount',
                    'required': true
                },
                {
                    "name": "defaultENVVAR",
                    "type": "html",
                    "value": "<p><b>By signing in, we will create a OAuth token to be used by the SOAJS GitHub App. The token will have the following permissions:</b><br><ul><li>Grants read/write access to code, commit statuses, collaborators, and deployment statuses for public and private repositories and organizations.</li><li>Grants read, write, ping, and delete access to hooks in public or private repositories</li></ul><br>Note: You can always revoke access to this token from your GitHub account settings.</p>"
                }
            ]
        }
    },
    'permissions': {
        listAccounts: ['dashboard', '/github/accounts/list'],
        deleteAccount: ['dashboard', '/github/accounts/delete'],
        updateAccount: ['dashboard', '/github/accounts/update'],
        login: ['dashboard', '/github/login'],
        getRepos: ['dashboard', '/github/getRepos']
    }
}