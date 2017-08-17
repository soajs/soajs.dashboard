'use strict';

var helpers = {

    buildSelectors: function(selectors) {
        var labelSelector = '';

        var labels = Object.keys(selectors);

        for (var i = 0; i < labels.length; i++) {
            if (labelSelector.length > 0) labelSelector += ', ';
            labelSelector += labels[i] + '=' + selectors[labels[i]];
        }

        return labelSelector;
    },

    checkIfValid: function(record, type) {
        var valid = false;
        if(type === 'deployment') {
            if(record.spec && record.spec.template && record.spec.template.spec && record.spec.template.spec.containers) {
                for (var i = 0; i < record.spec.template.spec.containers.length; i++) {
                    var oneContainer = record.spec.template.spec.containers[i];
                    if(oneContainer.command && oneContainer.command.indexOf('/heapster') || oneContainer.command.indexOf('heapster') !== -1) {
                        if(oneContainer.command.indexOf('--api-server') !== -1 || (oneContainer.args && oneContainer.args.indexOf('--api-server') !== -1)) {
                            valid = true;
                            break;
                        }
                    }
                }
            }
        }
        else if (type === 'pod') {
            if(record.spec && record.spec.containers) {
                for (var i = 0; i < record.spec.containers.length; i++) {
                    var oneContainer = record.spec.containers[i];
                    if(oneContainer.command && oneContainer.command.indexOf('/heapster') !== -1 || oneContainer.command.indexOf('heapster') !== -1) {
                        if(oneContainer.command.indexOf('--api-server') !== -1 || (oneContainer.args && oneContainer.args.indexOf('--api-server') !== -1)) {
                            valid = true;
                            break;
                        }
                    }
                }
            }
        }

        return valid;
    },

    buildCatalogRecipe: function(record, service, type, params, cb) {
        var catalog = {
            "name": "Heapster Recipe for Autoscaling",
            "type": "plugin",
            "description": "Automatically generated Heapster recipe that enables Heapster's API server",
            "recipe": {
                "deployOptions": {
                    "namespace": "",
                    "image": {},
                    "labels": {},
                    "ports": [],
                    "serviceAccount": {}
                },
                "buildOptions": {
                    "env": {},
                    "cmd": {
                        "deploy": {
                            "command": [],
                            "args": []
                        }
                    }
                }
            }
        };

        if(record.metadata && record.metadata.labels) {
            catalog.recipe.deployOptions.labels = record.metadata.labels;
        }

        if(type === 'deployment') {
            if(record && record.spec && record.spec.template) record = record.spec.template;
        }

        if(record.spec && record.spec.containers && Array.isArray(record.spec.containers)) {
            for (var i = 0; i < record.spec.containers.length; i++) {
                var oneContainer = record.spec.containers[i];
                if(oneContainer.name === 'heapster') {
                    catalog.recipe.deployOptions.namespace = 'kube-system';
                    catalog.recipe.deployOptions.image.prefix = oneContainer.image.split('/')[0];
                    catalog.recipe.deployOptions.image.name = oneContainer.image.split(':')[0].replace(catalog.recipe.deployOptions.image.prefix + '/', '');
                    catalog.recipe.deployOptions.image.tag = oneContainer.image.split(':')[1];

                    catalog.recipe.buildOptions.cmd.deploy.command = oneContainer.command;
                    catalog.recipe.buildOptions.cmd.deploy.command.push('--api-server');

                    if(service.spec && service.spec.ports && Array.isArray(service.spec.ports)) {
                        for (var i = 0; i < service.spec.ports.length; i++) {
                            var onePort = service.spec.ports[i];
                            catalog.recipe.deployOptions.ports.push({
                                "name": "heapster",
                                "port": onePort.port,
                                "target": onePort.targetPort
                            });
                        }
                    }

                    catalog.recipe.deployOptions.serviceAccount = {
                        "metadata": {
                            "name": "heapster",
                            "namespace": "kube-system"
                        }
                    };

                    break;
                }
            }
        }

        var opts = {
            collection: 'catalogs',
            conditions: {
                name: catalog.name
            },
            fields: catalog,
            options: { upsert: true }
        };

        params.BL.model.updateEntry(params.soajs, opts, function (error, entry) {
            params.utils.checkErrorReturn(params.soajs, cb, { config: params.config, error: error, code: 600 }, function() {
                return cb(null, false);
            });
        });
    }

};

module.exports = helpers;
