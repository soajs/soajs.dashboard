var staticContentConfig = {
    form: {
        "staticContent": {
            "entries": [
                {
                    "name": "name",
                    "label": translation.name[LANG],
                    "type": "text",
                    "value": "",
                    "tooltip": translation.staticContentName[LANG],
                    "placeholder": translation.exampleDashUISource[LANG],
                    "required": true
                },
                {
                    "name": "type",
                    "label": translation.type[LANG],
                    "type": "text",
                    "value": "github",
                    "tooltip": translation.sourceType[LANG],
                    "placeholder": translation.exampleGithub[LANG],
                    "required": true
                },
                {
                    "name": "owner",
                    "label": translation.owner[LANG],
                    "type": "text",
                    "value": "",
                    "tooltip": translation.sourceOwner[LANG],
                    "placeholder": translation.exampleSoajs[LANG],
                    "required": true
                },
                {
                    "name": "repo",
                    "label": translation.repository[LANG],
                    "type": "text",
                    "value": "",
                    "tooltip": translation.sourceRepository[LANG],
                    "placeholder": translation.exampleSoajsDashboard[LANG],
                    "required": true
                },
                {
                    "name": "branch",
                    "label": translation.branch[LANG],
                    "type": "text",
                    "value": "",
                    "tooltip": translation.sourceBranch[LANG],
                    "placeholder": translation.exampleMaster[LANG],
                    "required": true
                },
                {
                    "name": "main",
                    "label": translation.mainFile[LANG],
                    "type": "text",
                    "value": "",
                    "tooltip": translation.sourceMainFile[LANG],
                    "placeholder": translation.exampleIndex[LANG],
                    "required": true
                },
                {
                    "name": "token",
                    "label": translation.oauth[LANG],
                    "type": "text",
                    "value": "",
                    "tooltip": translation.sourceOauth[LANG],
                    "placeholder": translation.exampleMyOauth[LANG],
                    "fieldMsg": translation.oauthIfUsingPrivateRepo[LANG],
                    "required": false
                }
            ]
        }
    },
    permissions: {
        'list': ['dashboard', '/staticContent/list'],
        'add': ['dashboard', '/staticContent/add'],
        'update': ['dashboard', '/staticContent/update'],
        'delete': ['dashboard', '/staticContent/delete']
    }
};