'use strict';
var gaTranslation = {
    addAccount: {
        ENG: "Add Account",
        FRA: "Add Account"
    },
    noGitAccountsAdded: {
        ENG: "No Git Accounts Added",
        FRA: "No Git Accounts Added"
    },
    repositories: {
        ENG: "Repositories",
        FRA: "Repositories"
    },
    noReposFound: {
        ENG: "No Repositories Found!",
        FRA: "No Repositories Found"
    },
    repoHasBeenDeleted: {
        ENG: "Repository has been deleted",
        FRA: "Repository has been deleted"
    },
    activeRepo: {
        ENG: "Active Repository",
        FRA: "Active Repository"
    },
    repoOutOfSync: {
        ENG: "Repository is out of sync",
        FRA: "Repository is out of sync"
    },
    activate: {
        ENG: "Activate",
        FRA: "Activate"
    },
    deactivate: {
        ENG: "Deactivate",
        FRA: "Deactivate"
    },
    sync: {
        ENG: "Sync",
        FRA: "Sync"
    },
    syncRepo: {
        ENG: "Sync Repositories",
        FRA: "Sync Repositories"
    },
    deleteAccount: {
        ENG: "Delete Account",
        FRA: "Delete Account"
    },
    areYouSureDeleteAccount: {
        ENG: "Are you sure you want to delete this account?",
        FRA: "Are you sure you want to delete this account?"
    },
    areYouSureDeactivateRepo: {
        ENG: "Are you sure you want to deactivate this repository?",
        FRA: "Are you sure you want to deactivate this repository?"
    },
    repoHasBeenActivated: {
        ENG: "Repository has been activated",
        FRA: "Repository has been activated"
    },
    theFollowingModulesWereAdded: {
        ENG: "The following modules were added:",
        FRA: "The following modules were added:"
    },
    name: {
        ENG: "Name",
        FRA: "Name"
    },
    type: {
        ENG: "Type",
        FRA: "Type"
    },
    link: {
        ENG: "Link",
        FRA: "Link"
    },
    repoHasBeenSynced: {
        ENG: "Repository has been synced",
        FRA: "Repository has been synced"
    },
    theFollowingModulesWere: {
        ENG: "The following modules were",
        FRA: "The following modules were"
    },
    wouldYouLikeReactivateRepo: {
        ENG: "Would you like to reactivate this repository?",
        FRA: "Would you like to reactivate this repository?"
    },
    reactivate: {
        ENG: "Reactivate",
        FRA: "Reactivate"
    },
    gettingReposPleaseWait: {
        "ENG": "Getting repositories, please wait...",
        "FRA": "Getting repositories, please wait..."
    },

    accountProvider: {
        ENG: "Account Provider",
        FRA: "Account Provider"
    },
    chooseAccountProvider: {
        ENG: "Choose Account Provider",
        FRA: "Choose Account Provider"
    },
    accountName: {
        ENG: "Account Name",
        FRA: "Account Name"
    },
    chooseAccountName: {
        ENG: "Choose Account Name",
        FRA: "Choose Account Name"
    },
    exampleMyAccount: {
        ENG: "Example: myAccount",
        FRA: "Example: myAccount"
    },
    username: {
        ENG: "Username",
        FRA: "Username"
    },
    yourUsername: {
        ENG: "Your Username",
        FRA: "Your Username"
    },
    loginMessagePermissionsPartOne: {
        ENG: "By signing in, we will create a OAuth token to be used by the SOAJS GitHub App. The token will have the following permissions:",
        FRA: "By signing in, we will create a OAuth token to be used by the SOAJS GitHub App. The token will have the following permissions:"
    },
    loginMessagePermissionsPartTwo: {
        ENG: "Grants read/write access to code, commit statuses, collaborators, and deployment statuses for public and private repositories and organizations.",
        FRA: "Grants read/write access to code, commit statuses, collaborators, and deployment statuses for public and private repositories and organizations."
    },
    loginMessagePermissionsPartThree: {
        ENG: "Grants read, write, ping, and delete access to hooks in public or private repositories.",
        FRA: "Grants read, write, ping, and delete access to hooks in public or private repositories."
    },
    loginMessagePermissionsPartFour: {
        ENG: "Note: You can always revoke access to this token from your GitHub account settings.",
        FRA: "Note: You can always revoke access to this token from your GitHub account settings."
    },
    pleaseProvidePassword: {
        ENG: "Please provide your GitHub password in order to delete the SOAJS token",
        FRA: "Please provide your GitHub password in order to delete the SOAJS token"
    },
    gitPassword: {
        ENG: "GitHub Password",
        FRA: "GitHub Password"
    },
    pleaseSpecifyBranch: {
        ENG: "Please specify the branch to use to read the repository's config file",
        FRA: "Please specify the branch to use to read the repository's config file"
    },
    pleaseSpecifyConfigBranch: {
        ENG: "Please specify the branch to use to read the repository's config file",
        FRA: "Please specify the branch to use to read the repository's config file"
    },
    
    logoutSuccessful: {
        ENG: "Logout Successful",
        FRA: "Logout Successful"
    },
    addNewGitAccount: {
        ENG: "Add New Git Account",
        FRA: "Add New Git Account"
    },
    loginSuccessful: {
        ENG: "Login Successful",
        FRA: "Login Successful"
    },
    listOfReposUpToDate: {
        ENG: "List of repositories is up to date",
        FRA: "List of repositories is up to date"
    },
    chooseConfigBranch: {
        ENG: "Choose Config Branch",
        FRA: "Choose Config Branch"
    },
    repoActivationFailed: {
        ENG: "Repository activation failed",
        FRA: "Repository activation failed"
    },

    repoHasBeenDeactivated: {
        ENG: "Repository has been deactivated",
        FRA: "Repository has been deactivated"
    }
};

for (var attrname in gaTranslation) {
    translation[attrname] = gaTranslation[attrname];
}

var gitAccountsNav = [
    {
        'id': 'git-accounts',
        'label': "Git Accounts",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/gitAccounts/accounts/list'
        },
        'url': '#/git-accounts',
        'tplPath': 'modules/dashboard/gitAccounts/directives/list.tmpl',
        'icon': 'git',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 4,
        'scripts': ['modules/dashboard/gitAccounts/config.js', 'modules/dashboard/gitAccounts/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(gitAccountsNav);