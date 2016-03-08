var staticContentConfig = {
    form: {
        "staticContent": {
            "entries": [
                {
                    "name": "name",
                    "label": "Name",
                    "type": "text",
                    "value": "",
                    "tooltip": "Static Content Name",
                    "placeholder": "Example: Dashboard UI Source",
                    "required": true
                },
                {
                    "name": "type",
                    "label": "Type",
                    "type": "text",
                    "value": "",
                    "tooltip": "Source Type",
                    "placeholder": "Example: github",
                    "required": true
                },
                {
                    "name": "owner",
                    "label": "Owner",
                    "type": "text",
                    "value": "",
                    "tooltip": "Source Owner",
                    "placeholder": "Example: soajs",
                    "required": true
                },
                {
                    "name": "repo",
                    "label": "Repository",
                    "type": "text",
                    "value": "",
                    "tooltip": "Source Repository",
                    "placeholder": "Example: soajs.dashboard",
                    "required": true
                },
                {
                    "name": "branch",
                    "label": "Branch",
                    "type": "text",
                    "value": "",
                    "tooltip": "Source Branch",
                    "placeholder": "Example: master",
                    "required": true
                },
                {
                    "name": "main",
                    "label": "Main File",
                    "type": "text",
                    "value": "",
                    "tooltip": "Source Main File",
                    "placeholder": "Example: /index.html",
                    "required": true
                },
                {
                    "name": "token",
                    "label": "Token",
                    "type": "text",
                    "value": "",
                    "tooltip": "Source Token",
                    "placeholder": "Example: my_token",
                    "fieldMsg": "Add a token only if you are using a private repository",
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