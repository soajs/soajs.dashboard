"use strict";
var contentBuilderService = soajsApp.components;
contentBuilderService.service('cbHelper', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

    function listEntries(currentScope, moduleConfig, callback) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": (callback && typeof(callback) === 'function') ? "/dashboard/cb/listRevisions" : "/dashboard/cb/list",
            "params": {}
        }, function (error, response) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                if (callback && typeof(callback) === 'function') {
                    return callback(response);
                }
                else {
                    printEntries(currentScope, response, moduleConfig.grid.active);
                }
            }
        });
    }

    function printEntries(currentScope, response, grid, viewOnly) {
        var options = {
            data: response,
            grid: grid,
            defaultSortField: grid.defaultSortField,
            left: [],
            top: []
        };

        if (currentScope.access.getService) {
            options.left.push({
                'label': translation.view[LANG],
                'icon': 'search',
                'handler': 'viewService'
            });
        }

        if (currentScope.access.updateService && !viewOnly) {
            options.left.push({
                'label': translation.edit[LANG],
                'icon': 'pencil2',
                'handler': 'editService'
            });
        }
        buildGrid(currentScope, options);
    }

    function viewEntry(currentScope, params, cb) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/cb/get",
            "params": params
        }, function (error, response) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                if (cb && typeof(cb) === 'function') {
                    return cb(response);
                }
                else {
                    $modal.open({
                        templateUrl: "serviceInfoBox.html",
                        size: 'lg',
                        backdrop: true,
                        keyboard: true,
                        controller: function ($scope, $modalInstance) {
                            $scope.data = response;

                            if (Object.keys($scope.data.soajsService.db.config).length === 0) {
                                delete $scope.data.soajsService.db.config;
                            }
                            var errorCodes = $scope.data.genericService.config.errors;
                            var str = "";
                            for (var err in errorCodes) {
                                str += "<li class='APIInputBox mb5'><b>" + err + "</b>:&nbsp;" + errorCodes[err] + "</li>"
                            }
                            str = "<ul class='apiErrorCodes'>" + str + "</ul>";
                            $scope.data.genericService.config.errors = str;


                            for (var api in $scope.data.soajsService.apis) {
                                if ($scope.data.soajsService.apis.hasOwnProperty(api)) {
                                    for (var stepName in $scope.data.soajsService.apis[api].workflow) {
                                        if ($scope.data.soajsService.apis[api].workflow.hasOwnProperty(stepName)) {
                                            $scope.data.soajsService.apis[api].workflow[stepName] = $scope.data.soajsService.apis[api].workflow[stepName].replace(/\\n/g, "<br />");
                                        }
                                    }
                                }
                            }
                            var files = [];
                            for (var i = 0; i < $scope.data.soajsUI.form.add.length; i++) {
                                if ($scope.data.soajsUI.form.add[i].limit !== undefined) {
                                    files.push(angular.copy($scope.data.soajsUI.form.add[i]));
                                }
                                $scope.data.soajsUI.form.add[i].print = JSON.stringify($scope.data.soajsUI.form.add[i], null, 2);
                            }

                            for (var i = 0; i < $scope.data.soajsUI.form.update.length; i++) {
                                $scope.data.soajsUI.form.update[i].print = JSON.stringify($scope.data.soajsUI.form.update[i], null, 2);
                            }

                            $scope.data.genericService.config.maxFileUpload = parseInt($scope.data.genericService.config.maxFileUpload);
                            $scope.data.files = files;
                            setTimeout(function () {
                                highlightMyCode()
                            }, 500);
                            $scope.ok = function () {
                                $modalInstance.dismiss('ok');
                            };
                        }
                    });
                }
            }
        });
    }

    /*
     Step 1
     */
    function getEmptySchema(currentScope) {
        currentScope.config = {
            "name": "",
            "dbtoUse": {},
            "clustertoUse": {},
            "genericService": {
                "config": {
                    "serviceGroup": "GCS Group",
                    "errors": {},
                    "schema": {
                        "commonFields": {
                            "id": {
                                "source": ['query.id'],
                                "req": true,
                                "validation": {
                                    "type": "string"
                                }
                            }
                        }
                    }
                },
                "options": {}
            },
            "soajsService": {
                "db": {
                    "config": {}
                },
                "apis": {}
            },
            "soajsUI": {
                "list": {
                    "columns": [],
                    "defaultSortField": ""
                },
                "form": {
                    "add": [],
                    "update": []
                }
            }
        };
    }

    function loadExistingSchema(currentScope, routeParams, cb) {
        viewEntry(currentScope, {'id': routeParams.id}, function (data) {
            currentScope.config = {
                "name": data.name,
                "dbtoUse": {},
                "clustertoUse": {},
                "genericService": data.genericService,
                "soajsService": data.soajsService,
                "soajsUI": data.soajsUI
            };
            if (currentScope.config.genericService.config.extKeyRequired) {
                for (var envName in data.soajsService.db.config) {
                    var dbName = data.name;
                    currentScope.config.clustertoUse[envName] = {
                        "cluster": data.soajsService.db.config[envName][dbName].cluster,
                        "tenantSpecific": data.soajsService.db.config[envName][dbName].tenantSpecific
                    };
                }
            }
            else {
                for (var envName in data.soajsService.db.config) {
                    currentScope.config.dbtoUse[envName] = Object.keys(data.soajsService.db.config[envName])[0];
                }
            }
            cb();
        });
    }

    function getEnvironments(currentScope, cb) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/environment/list"
        }, function (error, response) {
            if (error) {
                currentScope.$parent.displayAlert('danger', error.message);
            }
            else {
                currentScope.envList = [];
                response.forEach(function (oneEnvironment) {
                    if (oneEnvironment.code.toLowerCase() !== 'dashboard') {
                        if (Object.keys(oneEnvironment.dbs.clusters).length > 0) {
                            currentScope.nextStep = true;
                        }
                        currentScope.envList.push({
                            'name': oneEnvironment.code,
                            'databases': oneEnvironment.dbs.databases,
                            'clusters': oneEnvironment.dbs.clusters
                        });
                    }
                });

                if (cb && typeof(cb) === 'function') {
                    cb();
                }
            }
        });
    }

    /*
     Step 3
     */
    function populateSettingsForm(currentScope) {
        var options = {
            timeout: $timeout,
            entries: angular.copy(cbConfig.form.step3.settings),
            data: reconstructData(),
            name: 'serviceSettings',
            label: '',
            actions: []
        };

        buildForm(currentScope, null, options);

        function reconstructData() {
            var data = {};
            if (currentScope.config.genericService.config.servicePort) {
                data['servicePort'] = currentScope.config.genericService.config.servicePort;
            }

            data['requestTimeout'] = 30;
            if (currentScope.config.genericService.config.requestTimeout && currentScope.config.genericService.config.requestTimeout >= 0) {
                data['requestTimeout'] = currentScope.config.genericService.config.requestTimeout;
            }

            data['requestTimeoutRenewal'] = 5;
            if (currentScope.config.genericService.config.requestTimeoutRenewal && currentScope.config.genericService.config.requestTimeoutRenewal >= 0) {
                data['requestTimeoutRenewal'] = currentScope.config.genericService.config.requestTimeoutRenewal;
            }

            if (Object.keys(currentScope.config.genericService.config.errors).length > 0) {
                data['errors'] = angular.copy(currentScope.config.genericService.config.errors);
                data['errors'] = JSON.stringify(data['errors'], null, 2);
            }

            if (currentScope.config.genericService.config.maxFileUpload) {
                data['maxFileUpload'] = currentScope.config.genericService.config.maxFileUpload;
            }

            data['extKeyRequired'] = (currentScope.config.genericService.config.extKeyRequired === false ? false : true);
            data['session'] = (currentScope.config.genericService.config.session === true ? true : false);
            data['oauth'] = (currentScope.config.genericService.config.oauth === false ? false : true);
            data['urac'] = (currentScope.config.genericService.config.urac === false ? false : true);
            data['urac_Profile'] = (currentScope.config.genericService.config.urac_Profile === true ? true : false);
            data['urac_ACL'] = (currentScope.config.genericService.config.urac_ACL === true ? true : false);
            data['provision_ACL'] = (currentScope.config.genericService.config.provision_ACL === true ? true : false);

            if (currentScope.config.soajsService.db.collection) {
                data['collection'] = currentScope.config.soajsService.db.collection;
            }
            return (Object.keys(data).length > 0) ? data : null;
        }
    }

    function saveContentSchema(currentScope, cb) {
        currentScope.config.genericService.config.serviceName = "gc-" + currentScope.config.name.toLowerCase().trim().replace(/\s\s*/g, "-");

        for (var env in currentScope.config.soajsService.db.config) {
            var dbName = Object.keys(currentScope.config.soajsService.db.config[env])[0];
            dbName = dbName.replace(/(gc\-)+/g, "");
            currentScope.config.soajsService.db.config[env]['gc-' + dbName] = angular.copy(currentScope.config.soajsService.db.config[env][dbName]);
            delete currentScope.config.soajsService.db.config[env][dbName];
        }
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/cb/add",
            "data": {
                "name": currentScope.config.genericService.config.serviceName,
                "config": {
                    "genericService": currentScope.config.genericService,
                    "soajsService": currentScope.config.soajsService,
                    "soajsUI": currentScope.config.soajsUI
                }
            }
        }, function (error, response) {
            if (error) {
                currentScope.config.soajsService.db.config[env][dbName] = angular.copy(currentScope.config.soajsService.db.config[env]['gc-' + dbName]);
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                currentScope.$parent.displayAlert("success", translation.contentBuilderCreatedSuccessfully[LANG]);
                currentScope.$parent.go("/content-builder");
                cb();
            }
        });
    }

    function updateContentSchema(currentScope, serviceId, cb) {
        remapPostedConfig(currentScope.config);
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "put",
            "routeName": "/dashboard/cb/update",
            "params": {"id": serviceId},
            "data": {
                "config": {
                    "genericService": currentScope.config.genericService,
                    "soajsService": currentScope.config.soajsService,
                    "soajsUI": currentScope.config.soajsUI
                }
            }
        }, function (error, response) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                currentScope.$parent.displayAlert("success", translation.contentBuilderCreatedSuccessfully[LANG]);
                currentScope.$parent.go("/content-builder");
                cb();
            }
        });


        function remapPostedConfig(config, cb) {
            var commonFields = config.genericService.config.schema.commonFields;
            for (var i in commonFields) {
                if (commonFields.hasOwnProperty(i)) {
                    commonFields[i].req = commonFields[i].required===true ? true : false;
                    delete commonFields[i].required;
                }
            }

            ['add', 'update'].forEach(function (formType) {
                var formConfig = config.soajsUI.form[formType];

                for (var j = 0; j < formConfig.length; j++) {
                    for (var field in formConfig[j]) {
                        if (formConfig[j].hasOwnProperty(field)) {
                            if (field === 'required') {
                                formConfig[j].req = formConfig[j]['required'] ? formConfig[j]['required'] : false;
                                delete formConfig[j]['required'];
                            }
                            if (field === 'type') {
                                formConfig[j]._type = formConfig[j]['type'];
                                delete formConfig[j]['type'];
                            }
                        }
                    }
                }
            });

        }
    }

    return {
        'getEmptySchema': getEmptySchema,
        'loadExistingSchema': loadExistingSchema,

        'listEntries': listEntries,
        'printEntries': printEntries,
        'viewEntry': viewEntry,
        'saveContentSchema': saveContentSchema,
        'updateContentSchema': updateContentSchema,

        'getEnvironments': getEnvironments,
        'populateSettingsForm': populateSettingsForm
    }
}]);
