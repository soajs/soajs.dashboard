"use strict";
var scTranslation = {
    "staticContent": {
        "ENG": "Static Content",
        "FRA": "Static Content"
    },
    "staticContentName": {
        "ENG": "Static Content Name",
        "FRA": "Static Content Name"
    },
    "exampleDashUISource": {
        "ENG": "Example: Dashboard UI Source",
        "FRA": "Example: Dashboard UI Source"
    },
    "type": {
        "ENG": "Type",
        "FRA": "Type"
    },
    "sourceType": {
        "ENG": "Source Type",
        "FRA": "Source Type"
    },
    "exampleGithub": {
        "ENG": "Example: github",
        "FRA": "Example: github"
    },
    "owner": {
        "ENG": "Owner",
        "FRA": "Owner"
    },
    "sourceOwner": {
        "ENG": "Source Owner",
        "FRA": "Source Owner"
    },
    "exampleSoajs": {
        "ENG": "Example: soajs",
        "FRA": "Example: soajs"
    },
    "repository": {
        "ENG": "Repository",
        "FRA": "Repository"
    },
    "sourceRepository": {
        "ENG": "Source Repository",
        "FRA": "Source Repository"
    },
    "exampleSoajsDashboard": {
        "ENG": "Example: soajs.dashboard",
        "FRA": "Example: soajs.dashboard"
    },
    "branch": {
        "ENG": "Branch",
        "FRA": "Branch"
    },
    "sourceBranch": {
        "ENG": "Source Branch",
        "FRA": "Source Branch"
    },
    "exampleMaster": {
        "ENG": "Example: master",
        "FRA": "Example: master"
    },
    "mainFile": {
        "ENG": "Main File",
        "FRA": "Main File"
    },
    "sourceMainFile": {
        "ENG": "Source Main File",
        "FRA": "Source Main File"
    },
    "exampleIndex": {
        "ENG": "Example: /index.html",
        "FRA": "Example: /index.html"
    },
    "oauth": {
        "ENG": "OAuth",
        "FRA": "OAuth"
    },
    "sourceOauth": {
        "ENG": "Source OAuth",
        "FRA": "Source OAuth"
    },
    "exampleMyOauth": {
        "ENG": "Example: my_oauth",
        "FRA": "Example: my_oauth"
    },
    "oauthIfUsingPrivateRepo": {
        "ENG": "Add OAuth if you are using a private repository",
        "FRA": "Add OAuth if you are using a private repository"
    },
    "updateSource": {
        "ENG": "Update Source",
        "FRA": "Update Source"
    },
    "deleteSource": {
        "ENG": "Delete Source",
        "FRA": "Delete Source"
    },
    "areYouSureYouWantToDeleteSource": {
        "ENG": "Are you sure you want to delete this source?",
        "FRA": "Are you sure you want to delete this source?"
    },
    "addNewSource": {
        "ENG": "Add New Source",
        "FRA": "Add New Source"
    },
    "privateRepo": {
        "ENG": "Private Repository",
        "FRA": "Private Repository"
    },
    "staticContentSourceAdded": {
        "ENG": "Static Content source added successfully",
        "FRA": "Static Content source added successfully"
    },
    "staticContentSourceUpdated": {
        "ENG": "Static Content source updated successfully",
        "FRA": "Static Content source updated successfully"
    },
    "staticContentSourceDeleted": {
        "ENG": "Static Content source deleted successfully",
        "FRA": "Static Content source deleted successfully"
    },
    "dashUI": {
        "ENG": "Dashboard UI",
        "FRA": "Dashboard UI"
    }
};

for (var attrname in scTranslation) {
    translation[attrname] = scTranslation[attrname];
}

var staticContentNav = [
    {
        'id': 'static-content',
        'label': translation.staticContent[LANG],
        'checkPermission': {
            'service': 'dashboard',
            'route': '/staticContent/list',
            'method': 'post'
        },
        'url': '#/static-content',
        'tplPath': 'modules/dashboard/staticContent/directives/list.tmpl',
        'icon': 'files-empty',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 3,
        'scripts': ['modules/dashboard/staticContent/config.js', 'modules/dashboard/staticContent/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(staticContentNav);