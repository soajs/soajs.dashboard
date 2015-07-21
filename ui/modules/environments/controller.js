"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$compile', '$timeout', '$modal', '$http', '$routeParams', 'ngDataApi', 'envHosts', 'envDB', 'envClusters', 'deploySrv', function ($scope, $compile, $timeout, $modal, $http, $routeParams, ngDataApi, envHosts, envDB, envClusters, deploySrv) {
    $scope.$parent.isUserLoggedIn();
    $scope.newEntry = true;
    $scope.envId = null;
    $scope.formEnvironment = {services: {}};
    $scope.formEnvironment.config_loggerObj = '';
    $scope.access = {};
    constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

    $scope.waitMessage = {
        type: "",
        message: "",
        close: function () {
            $scope.waitMessage.message = '';
            $scope.waitMessage.type = '';
        }
    };

    $scope.generateNewMsg = function (env, type, msg) {
        $scope.grid.rows.forEach(function (oneEnvRecord) {
            if (oneEnvRecord.code === env) {
                oneEnvRecord.hostInfo = {
                    waitMessage: {
                        "type": type,
                        "message": msg
                    }
                };

                $timeout(function () {
                    oneEnvRecord.hostInfo.waitMessage.message = '';
                    oneEnvRecord.hostInfo.waitMessage.type = '';
                }, 7000);
            }
        });
    };

    $scope.closeWaitMessage = function (context) {
        if (!context) {
            context = $scope;
        }
        context.waitMessage.message = '';
        context.waitMessage.type = '';
    };

    $scope.expand = function (row) {
        row.showOptions = true;
    };

    $scope.collapse = function (row) {
        row.showOptions = false;
    };

    $scope.listEnvironments = function (environmentId) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/environment/list"
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                if (environmentId) {
                    $scope.envId = environmentId;
                    for (var x = 0; x < response.length; x++) {
                        if (response[x]._id === $scope.envId) {
                            $scope.newEntry = false;
                            $scope.formEnvironment = response[x];
                            if (!$scope.formEnvironment.services.config.session.hasOwnProperty('proxy')) {
                                $scope.formEnvironment.services.config.session.proxy = undefined;
                            }
                            if (response[x].services && response[x].services.config) {
                                if (response[x].services.config.logger) {
                                    $scope.formEnvironment.config_loggerObj = JSON.stringify(response[x].services.config.logger, null, "\t");
                                }
                            }

                            if ($scope.formEnvironment.deployer.container) {
                                for (var driver in $scope.formEnvironment.deployer.container.docker) {
                                    $scope.formEnvironment.deployer.container.docker[driver] = JSON.stringify($scope.formEnvironment.deployer.container.docker[driver], null, 2);
                                }

                                for (var driver in $scope.formEnvironment.deployer.container.coreos) {
                                    $scope.formEnvironment.deployer.container.coreos[driver] = JSON.stringify($scope.formEnvironment.deployer.container.coreos[driver], null, 2);
                                }
                            }

                            if ($scope.formEnvironment.deployer.cloud) {
                                for (var driver in $scope.formEnvironment.deployer.cloud) {
                                    $scope.formEnvironment.deployer.cloud[driver] = JSON.stringify($scope.formEnvironment.deployer.cloud[driver], null, 2);
                                    if($scope.formEnvironment.deployer.cloud[driver] === '{}'){
                                        delete $scope.formEnvironment.deployer.cloud[driver];
                                    }
                                }
                            }

                            $scope.formEnvironment.profile = $scope.formEnvironment.profile.split("/");
                            $scope.formEnvironment.profile = $scope.formEnvironment.profile[$scope.formEnvironment.profile.length - 1];
                            $scope.formEnvironment.profile = $scope.formEnvironment.profile.replace(".js", "");
                            break;
                        }
                    }
                    $scope.waitMessage.message = '';
                    $scope.waitMessage.type = '';
                    $scope.formEnvironment.services.config.session.unset = ($scope.formEnvironment.services.config.session.unset === 'keep') ? false : true;
                }
                else {
                    $scope.grid = {rows: response};
                    if ($scope.grid.rows) {
                        if ($scope.grid.rows.length == 1) {
                            $scope.grid.rows[0].showOptions = true;
                        }
                        $scope.grid.rows.forEach(function (env) {
                            env.profileLabel = env.profile.split("/");
                            env.profileLabel = env.profileLabel[env.profileLabel.length - 1].replace(".js", "");
                            env.selectedDeployer = env.deployer.selected;
                            delete env.deployer.selected;
                        });
                    }
                }
            }
        });
    };

    $scope.getDeploymentMode = function (deployer, value) {
        if (!deployer.ui) {
            deployer.ui = {};
        }
        deployer.ui[value] = (deployer.type === value);
    };

    $scope.getDeploymentDriver = function (deployer, value, technology, type) {
        deployer.ui[value] = (deployer[type].selected === technology + '.' + value);
    };

    $scope.addEnvironment = function () {
        var configuration = environmentsConfig.form.template;
        $scope.grid.rows.forEach(function (oneEnv) {
            for (var i = 0; i < configuration.entries[0].value.length; i++) {
                if (configuration.entries[0].value[i].v === oneEnv.code) {
                    configuration.entries[0].value.splice(i, 1);
                }
            }
        });
        var options = {
            timeout: $timeout,
            form: configuration,
            name: 'addEnvironment',
            label: 'Add New Environment',
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var tmpl = angular.copy(env_template);
                        tmpl.code = formData.code;
                        tmpl.port = parseInt(formData.port);
                        tmpl.description = formData.description;
                        tmpl.profile = formData.profile[0];
                        tmpl.deployer.selected = formData.platformDriver[0];
                        tmpl.services.config.key.password = formData.tKeyPass;
                        tmpl.services.config.cookie.secret = formData.sessionCookiePass;
                        tmpl.services.config.session.secret = formData.sessionCookiePass;
                        tmpl.services.config.session.cookie.domain = formData.domain;

                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/environment/add",
                            "data": tmpl
                        }, function (error, data) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.$parent.displayAlert('success', 'Environment Created Successfully.');
                                $scope.modalInstance.close('ok');
                                $scope.form.formData = {};
                                $scope.updateEnvironment(data[0]);
                            }
                        });
                    }
                },
                {
                    'type': 'button',
                    'label': 'Advanced Mode',
                    'btn': 'success',
                    'action': function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.$parent.go("/environments/environment/");
                    }
                },
                {
                    'type': 'reset',
                    'label': 'Cancel',
                    'btn': 'danger',
                    'action': function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.form.formData = {};
                    }
                }
            ]
        };

        buildFormWithModal($scope, $modal, options);
    };

    $scope.updateEnvironment = function (data) {
        $scope.$parent.go('/environments/environment/' + data._id);
    };

    $scope.save = function () {
        var postData = angular.copy($scope.formEnvironment);

        if (typeof($scope.formEnvironment.services.config.session.proxy) == 'undefined') {
            postData.services.config.session.proxy = 'undefined';
        }
        else if ($scope.formEnvironment.services.config.session.proxy === false) {
            postData.services.config.session.proxy = 'false';
        }
        else if ($scope.formEnvironment.services.config.session.proxy === true) {
            postData.services.config.session.proxy = 'true';
        }
        delete postData.dbs;
        if (postData.services.config && postData.services.config.oauth && postData.services.config.oauth.grants) {
            if (typeof(postData.services.config.oauth.grants) == 'string') {
                postData.services.config.oauth.grants = postData.services.config.oauth.grants.replace(/ /g, '').split(",");
            }
        }

        postData.services.config.agent = {
            "topologyDir": "/opt/soajs/"
        };

        if ($scope.formEnvironment.config_loggerObj && ($scope.formEnvironment.config_loggerObj != "")) {
            try {
                $scope.formEnvironment.services.config.logger = JSON.parse($scope.formEnvironment.config_loggerObj);
                postData.services.config.logger = $scope.formEnvironment.services.config.logger;
            }
            catch (e) {
                $scope.$parent.displayAlert('danger', 'Error: Invalid logger Json object');
                return;
            }
        }

        if (!postData.deployer.container.docker.socket && !postData.deployer.container.docker.boot2docker && !postData.deployer.container.docker.joyent) {
            $timeout(function () {
                alert("Provide a configuration for at least one platform driver to proceed.");
            }, 100);
        }
        else {
            try {
                var driver = postData.deployer.selected.split(".")[0];

                if (postData.deployer.container && postData.deployer.container[driver]) {
                    postData.deployer.container.selected = postData.deployer.selected;
                    for (var driver in postData.deployer.container.docker) {
                        postData.deployer.container.docker[driver] = JSON.parse(postData.deployer.container.docker[driver]);
                    }

                    for (var driver in postData.deployer.container.coreos) {
                        postData.deployer.container.coreos[driver] = JSON.parse(postData.deployer.container.coreos[driver]);
                    }
                }

                if (postData.deployer.cloud && postData.deployer.cloud[driver]) {
                    postData.deployer.cloud.selected = postData.deployer.selected;
                    for (var driver in postData.deployer.cloud) {
                        if(driver === 'selected') continue;
                        postData.deployer.cloud[driver] = JSON.parse(postData.deployer.cloud[driver]);
                    }
                }
                delete postData.deployer.selected;
            }
            catch (e) {
                console.log(postData.deployer);
                console.log(e);
                $scope.$parent.displayAlert("danger", "Error: invalid Json object provided for Deployer Configuration");
                return;
            }

            postData.services.config.session.unset = (postData.services.config.session.unset) ? "destroy" : "keep";
            getSendDataFromServer($scope, ngDataApi, {
                "method": "send",
                "routeName": "/dashboard/environment/" + (($scope.newEntry) ? "add" : "update"),
                "params": ($scope.newEntry) ? {} : {"id": $scope.envId},
                "data": postData
            }, function (error) {
                if (error) {
                    $scope.$parent.displayAlert('danger', error.message);
                }
                else {
                    $scope.$parent.displayAlert('success', 'Environment ' + (($scope.newEntry) ? "Created" : "Updated") + ' Successfully.');
                }
            });
        }
    };

    $scope.UpdateTenantSecurity = function () {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/environment/key/update",
            "params": {"id": $scope.envId},
            "data": {
                'algorithm': $scope.formEnvironment.services.config.key.algorithm,
                'password': $scope.formEnvironment.services.config.key.password
            }
        }, function (error, response) {
            if (error) {
                $scope.waitMessage.type = 'danger';
                $scope.waitMessage.message = error.message;
            }
            else {
                var text = "<p>The Tenant Security Configuration has been updated.<br />Please copy the below key value marked in red <span class='red'>" +
                    response.newKey +
                    "</span> and place it the <b>config.js</b> file of this application where it says <b>apiConfiguration.key</b>.<br />Once you have updated and saved the <b>config.js</b>, Click on the button below and your dashboard will open up.</p><p>Once the page opens up, navigate to <b>Multi-Tenancy</b> and generate new external keys for all your tenants appplications.</p><br/><input type='button' onclick='overlay.hide(function(){location.reload();});' value='Reload Dashboard' class='btn btn-success'/><br /><br />";

                jQuery('#overlay').html("<div class='bg'></div><div class='content'>" + text + "</div>");
                overlay.show();
            }
        });
    };

    $scope.deployEnvironment = function (envCode) {
        deploySrv.deployEnvironment($scope, envCode);
    };

    $scope.listHosts = function (env, noPopulate) {
        if ($scope.grid.rows) {
            $scope.grid.rows.forEach(function (oneEnvRecord) {
                if (oneEnvRecord.code === env) {
                    oneEnvRecord.hostInfo = {
                        waitMessage: {
                            "type": "",
                            "message": ""
                        }
                    };
                    //oneEnvRecord.hostInfo.waitMessage.type = 'info';
                    //oneEnvRecord.hostInfo.waitMessage.message = 'Services Detected. Awareness check in progress. Please wait...';
                }
            });
        }
        envHosts.listHosts($scope, env, noPopulate);
    };

    $scope.executeHeartbeatTest = function (env, oneHost) {
        envHosts.executeHeartbeatTest($scope, env, oneHost);
    };

    $scope.executeAwarenessTest = function (env, oneHost) {
        envHosts.executeAwarenessTest($scope, env, oneHost);
    };

    $scope.reloadRegistry = function (env, oneHost, cb) {
        envHosts.reloadRegistry($scope, env, oneHost, cb);
    };

    $scope.loadProvisioning = function (env, oneHost) {
        envHosts.loadProvisioning($scope, env, oneHost);
    };

    $scope.removeHost = function (env, serviceName, oneHost) {
        envHosts.removeHost($scope, env, serviceName, oneHost);
    };

    $scope.stopHost = function (env, serviceName, oneHost, serviceInfo) {
        envHosts.stopHost($scope, env, serviceName, oneHost, serviceInfo);
    };

    $scope.startHost = function (env, serviceName, oneHost, serviceInfo) {
        envHosts.startHost($scope, env, serviceName, oneHost, serviceInfo);
    };

    $scope.hostLogs = function (env, serviceName, oneHost, serviceInfo) {
        envHosts.hostLogs($scope, env, serviceName, oneHost, serviceInfo);
    };

    $scope.infoHost = function (env, serviceName, oneHost, serviceInfo) {
        envHosts.infoHost($scope, env, serviceName, oneHost, serviceInfo);
    };

    $scope.createHost = function (env, services) {
        envHosts.createHost($scope, env, services);
    };

    $scope.removeEnvironment = function (row) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/environment/delete",
            "params": {"id": row['_id']}
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                if (response) {
                    $scope.$parent.displayAlert('success', "Selected Environment has been removed.");
                    $scope.listEnvironments();
                }
                else {
                    $scope.$parent.displayAlert('danger', "Unable to remove selected Environment.");
                }
            }
        });
    };

    $scope.listDatabases = function (env) {
        envDB.listDatabases($scope, env);
    };

    $scope.removeDatabase = function (env, name) {
        envDB.removeDatabase($scope, env, name);
    };

    $scope.addDatabase = function (env, session) {
        envDB.addDatabase($scope, env, session);
    };

    $scope.editDatabase = function (env, name, data) {
        envDB.editDatabase($scope, env, name, data);
    };

    $scope.updateDbPrefix = function (env, prefix) {
        envDB.updateDbPrefix($scope, env, prefix);
    };

    $scope.listClusters = function (env) {
        envClusters.listClusters($scope, env);
    };

    $scope.addCluster = function (env) {
        envClusters.addCluster($scope, env);
    };

    $scope.editCluster = function (env, name, data) {
        envClusters.editCluster($scope, env, name, data);
    };

    $scope.removeCluster = function (env, name) {
        envClusters.removeCluster($scope, env, name);
    };

    //default operation
    if ($routeParams.id) {
        if ($scope.access.editEnvironment) {
            $scope.listEnvironments($routeParams.id);
        }
    }
    else {
        if ($scope.access.listEnvironments) {
            $scope.listEnvironments(null);
        }
    }
}]);