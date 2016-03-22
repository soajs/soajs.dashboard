var githubAppConfig = {
    'form': {
        'login': {
            'entries': [
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
                    'name': 'type',
                    'label': 'Account Type',
                    'type': 'radio',
                    'value': [{'v': 'personal', 'l': 'Personal Account', 'selected': true}, {'v': 'organization', 'l': 'Organization'}],
                    'required': true
                },
                {
                    'name': 'access',
                    'label': 'Account Access',
                    'type': 'radio',
                    'value': [{'v': 'public', 'l': 'Public', 'selected': true}, {'v': 'private', 'l': 'Private'}],
                    'required': true,
                    'fieldMsg': 'Public access will only allow public repositories. If you want to use private repositories as well, choose Private'
                },
                {
                    "name": "loginMessage",
                    "type": "html",
                    "value": "<p><b>If this account has private repositories, please provide a password:</b></p>"
                },
                {
                    'name': 'username',
                    'label': 'Github Username',
                    'type': 'text',
                    'value': '',
                    'tooltip': 'Github Account Username',
                    'placeholder': 'Github Username',
                    'required': false
                },
                {
                    'name': 'password',
                    'label': 'Github Password',
                    'type': 'password',
                    'value': '',
                    'tooltip': 'Github Account Password',
                    'placeholder': 'Github Password',
                    'required': false
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
                    "name": "message",
                    "type": "html",
                    "value": "<p><b>Please provide your GitHub password in order to delete the SOAJS token</b></p>"
                },
                {
                    'name': 'password',
                    'label': 'Github Password',
                    'type': 'password',
                    'value': '',
                    'tooltip': 'Github Account Password',
                    'placeholder': 'Github Password',
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
        getRepos: ['dashboard', '/github/getRepos']
    }
};