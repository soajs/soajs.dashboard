"use strict";
var multiTenantApp = soajsApp.components;
multiTenantApp.controller('tenantCtrl', ['$scope', '$compile', '$timeout', '$modal', '$routeParams', 'ngDataApi', function ($scope, $compile, $timeout, $modal, $routeParams, ngDataApi) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, tenantConfig.permissions);

    $scope.mt = {};
    $scope.mt.displayAlert = function (type, msg, id) {
        $scope.mt[id] = {};
        $scope.mt[id].alerts = [];
        $scope.mt[id].alerts.push({'type': type, 'msg': msg});
        $scope.mt.closeAllAlerts(id);
    };

    $scope.mt.closeAlert = function (index, id) {
        $scope.mt[id].alerts.splice(index, 1);
    };

    $scope.mt.closeAllAlerts = function (id) {
        $timeout(function () {
            $scope.mt[id].alerts = [];
        }, 7000);
    };

    $scope.openKeys = function (id, app) {
        app.showKeys = true;
    };

    $scope.closeKeys = function (id, app) {
        app.showKeys = false;
    };

    $scope.removeAppKey = function (id, app, key, event) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/application/key/delete",
            "params": {"id": id, "appId": app.appId, "key": key}
        }, function (error) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, id);
            }
            else {
                $scope.mt.displayAlert('success', 'Application Key Removed Successfully.', id);
                $scope.listKeys(id, app.appId);
            }
        });
        if (event && event.stopPropagation) {
            event.stopPropagation();
        }
    };

    $scope.getProds = function () {
        $scope.availablePackages = [];
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/product/list"
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                var prods = [];
                var len = response.length;
                var v, i;
                var p = {};
                for (v = 0; v < len; v++) {
                    p = response[v];
                    var ll = p.packages.length;
                    for (i = 0; i < ll; i++) {
                        prods.push({
                            'pckCode': p.packages[i].code,
                            'prodCode': p.code,
                            'v': p.packages[i].code,
                            'l': p.packages[i].code,
                            'acl': p.packages[i].acl
                        });
                    }
                }
                $scope.availablePackages = prods;
            }
        });
    };

    $scope.getEnvironments = function () {
        $scope.availableEnv = [];
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/environment/list"
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                response.forEach(function (oneEnv) {
                    $scope.availableEnv.push(oneEnv.code.toLowerCase());
                });
            }
        });
    };

    $scope.listTenants = function () {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/list"
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                $scope.tenantsList = {
                    rows: response
                };
                $scope.tenantsList.actions = {
                    'editTenant': {
                        'label': 'Edit Tenant',
                        'command': function (row) {
                            $scope.edit_Tenant(row);
                        }
                    },
                    'delete': {
                        'label': 'Remove',
                        'commandMsg': "Are you sure you want to remove this tenant ?",
                        'command': function (row) {
                            $scope.removeTenant(row);
                        }
                    }
                };
            }
        });
    };

    $scope.listOauthUsers = function (row) {
        var tId = row['_id'];
        if (!row.alreadyGotAuthUsers) {
            getSendDataFromServer($scope, ngDataApi, {
                "method": "get",
                "routeName": "/dashboard/tenant/oauth/users/list",
                "params": {"id": tId}
            }, function (error, response) {
                if (error) {
                    $scope.mt.displayAlert('danger', error.message, tId);
                }
                else {
                    row.alreadyGotAuthUsers = true;
                    if (response.length > 0) {
                        for (var i = 0; i < $scope.tenantsList.rows.length; i++) {
                            if ($scope.tenantsList.rows[i]['_id'] === tId) {
                                $scope.tenantsList.rows[i].oAuthUsers = response;
                                break;
                            }
                        }
                    }
                }
            });
        }
    };

    $scope.edit_Tenant = function (data) {
        var formConfig = angular.copy(tenantConfig.form.tenantEdit);
        //formConfig.entries[0].type = 'readonly';
        //formConfig.label = 'Edit Basic Tenant Information';
        formConfig.timeout = $timeout;

        var oAuth = data.oauth;
        if (oAuth.secret) {
            data.secret = oAuth.secret;
        }
        /*
         if(oAuth.redirectURI) {
         data.redirectURI = oAuth.redirectURI;
         }
         */
        var keys = Object.keys(data);

        for (var i = 0; i < formConfig.entries.length; i++) {
            keys.forEach(function (inputName) {
                if (formConfig.entries[i].name === inputName) {
                    formConfig.entries[i].value = data[inputName];
                }
            });
        }

        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'editTenant',
            label: 'Edit Basic Tenant Information',
            data: {},
            actions: [
                {
                    'type': 'reset',
                    'label': 'Cancel',
                    'btn': 'danger',
                    'action': function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.form.formData = {};
                    }
                },
                {
                    'type': 'submit',
                    'label': 'Update Tenant',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            'name': formData.name,
                            'description': formData.description
                        };
                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/tenant/update",
                            "data": postData,
                            "params": {"id": data['_id']}
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                if (formData.secret && $scope.access.tenant.oauth.update) {
                                    var oAuthData = {
                                        'secret': formData.secret
                                        //'redirectURI': formData.redirectURI
                                    };

                                    getSendDataFromServer($scope, ngDataApi, {
                                        "method": "send",
                                        "routeName": "/dashboard/tenant/oauth/update",
                                        "data": oAuthData,
                                        "params": {"id": data['_id']}
                                    }, function (error) {
                                        if (error) {
                                            $scope.form.displayAlert('danger', error.message);
                                        }
                                        else {
                                            $scope.$parent.displayAlert('success', 'Tenant Info Upated Successfully.');
                                            $scope.modalInstance.close();
                                            $scope.form.formData = {};
                                            $scope.listTenants();
                                        }
                                    });
                                }
                                else {
                                    $scope.$parent.displayAlert('success', 'Tenant Updated Successfully.');
                                    $scope.modalInstance.close();
                                    $scope.form.formData = {};
                                    $scope.listTenants();
                                }
                            }
                        });
                    }
                }
            ]
        };

        if ($scope.access.tenant.oauth.delete) {
            options.actions.push(
                {
                    'type': 'submit',
                    'label': 'Delete oAuth Info',
                    'btn': 'danger',
                    'action': function () {
                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "get",
                            "routeName": "/dashboard/tenant/oauth/delete",
                            "params": {"id": data['_id']}
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.$parent.displayAlert('success', 'Tenant OAuth Deleted Successfully.');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listTenants();
                            }
                        });
                    }
                }
            );
        }
        buildFormWithModal($scope, $modal, options);
    };

    $scope.removeTenant = function (row) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/delete",
            "params": {"id": row._id}
        }, function (error) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                $scope.$parent.displayAlert('success', "Tenant removed successfully.");
                $scope.listTenants();
            }
        });
    };

    $scope.addTenant = function () {
        var options = {
            timeout: $timeout,
            form: tenantConfig.form.tenantAdd,
            type: 'tenant',
            name: 'addTenant',
            label: 'Add New Tenant',
            actions: [
                {
                    'type': 'submit',
                    'label': 'Add Tenant',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            'code': formData.code,
                            'name': formData.name,
                            'description': formData.description
                        };
                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/tenant/add",
                            "data": postData
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.$parent.displayAlert('success', 'Tenant Added Successfully.');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listTenants();
                            }
                        });

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

    $scope.reloadOauthUsers = function (tId) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/oauth/users/list",
            "params": {"id": tId}
        }, function (error, response) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                for (var i = 0; i < $scope.tenantsList.rows.length; i++) {
                    if ($scope.tenantsList.rows[i]['_id'] === tId) {
                        $scope.tenantsList.rows[i].oAuthUsers = response;
                        break;
                    }
                }
            }
        });
    };

    $scope.removeTenantOauthUser = function (tId, user) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/oauth/users/delete",
            "params": {"id": tId, 'uId': user['_id']}
        }, function (error) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                $scope.mt.displayAlert('success', 'User Deleted Successfully.', tId);
                $scope.reloadOauthUsers(tId);
            }
        });
    };

    $scope.editTenantOauthUser = function (tId, user) {
        user.password = null;
        user.confirmPassword = null;
        var options = {
            timeout: $timeout,
            form: tenantConfig.form.oauthUserUpdate,
            name: 'updateUser',
            label: 'Update User',
            data: user,
            actions: [
                {
                    'type': 'submit',
                    'label': 'Update oAuth User',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            'userId': formData.userId
                        };
                        if (formData.password && formData.password != '') {
                            if (formData.password !== formData.confirmPassword) {
                                $scope.form.displayAlert('danger', 'Password and Confirm Password fields do not match.');
                                return;
                            } else {
                                postData.password = formData.password;
                            }
                        }
                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/tenant/oauth/users/update",
                            "data": postData,
                            "params": {"id": tId, 'uId': user['_id']}
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.mt.displayAlert('success', 'User Updated Successfully.', tId);
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.reloadOauthUsers(tId);
                            }
                        });
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

    $scope.addOauthUser = function (tId) {
        var options = {
            timeout: $timeout,
            form: tenantConfig.form.oauthUser,
            name: 'addUser',
            label: 'Add New oAuth User',
            data: {
                'userId': null,
                'user_password': null
            },
            actions: [
                {
                    'type': 'submit',
                    'label': 'Add oAuth User',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            'userId': formData.userId,
                            'password': formData.user_password
                        };
                        if (formData.user_password !== formData.confirmPassword) {
                            $scope.form.displayAlert('danger', 'Password and Confirm Password fields do not match.');
                            return;
                        }

                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/tenant/oauth/users/add",
                            "data": postData,
                            "params": {"id": tId}
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.mt.displayAlert('success', 'User Added Successfully.', tId);
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.reloadOauthUsers(tId);
                            }
                        });
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

    $scope.addTenantApplication = function (tId) {
        var formConfig = angular.copy(tenantConfig.form.application);
        formConfig.entries.forEach(function (oneEn) {
            if (oneEn.type === 'select') {
                oneEn.value[0].selected = true;
            }
            if (oneEn.name === 'package') {
                oneEn.type = "select";
                oneEn.value = $scope.availablePackages;
            }
            if (oneEn.name === 'product') {
                oneEn.name = 'Prod';
            }
        });

        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'addApplication',
            label: 'Add New Application',
            sub: true,
            actions: [
                {
                    'type': 'submit',
                    'label': 'Add Application',
                    'btn': 'primary',
                    'action': function (formData) {

                        var postData = {
                            'description': formData.description,
                            '_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
                        };
                        if (formData.package && (typeof(formData.package) == 'string')) {
                            var productCode = formData.package.split("_")[0];
                            var packageCode = formData.package.split("_")[1];
                            postData.productCode = productCode;
                            postData.packageCode = packageCode;
                            getSendDataFromServer($scope, ngDataApi, {
                                "method": "send",
                                "routeName": "/dashboard/tenant/application/add",
                                "data": postData,
                                "params": {"id": tId}
                            }, function (error) {
                                if (error) {
                                    $scope.form.displayAlert('danger', error.message);
                                }
                                else {
                                    $scope.mt.displayAlert('success', 'Application Added Successfully.', tId);
                                    $scope.modalInstance.close();
                                    $scope.form.formData = {};
                                    $scope.reloadApplications(tId);
                                }
                            });
                        }
                        else {
                            $scope.form.displayAlert('danger', "Choose a package.");
                        }
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

        formConfig.entries.splice(0, 1);

        buildFormWithModal($scope, $modal, options);
    };

    $scope.editAppAcl = function (tId, appId) {
        $scope.$parent.go("/multi-tenancy/" + tId + "/editAcl/" + appId);
    };

    $scope.editTenantApplication = function (tId, data) {
        var formConfig = angular.copy(tenantConfig.form.application);
        var recordData = angular.copy(data);
        recordData._TTL = recordData._TTL / 3600000;

        formConfig.entries[1].type = "html";
        formConfig.entries[0].type = "html";
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'editApplication',
            label: 'Edit Application',
            data: recordData,
            actions: [
                {
                    'type': 'submit',
                    'label': 'Edit Application',
                    'btn': 'primary',
                    'action': function (formData) {
                        var packageCode = formData.package.split("_")[1];
                        var postData = {
                            'productCode': formData.product,
                            'packageCode': formData.package,
                            'description': formData.description,
                            '_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
                        };

                        postData.packageCode = packageCode;
                        postData.acl = recordData.acl;
                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/tenant/application/update",
                            "data": postData,
                            "params": {"id": tId, "appId": data.appId}
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.mt.displayAlert('success', 'Application Updated Successfully.', tId);
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.reloadApplications(tId);
                            }
                        });

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

    $scope.reloadApplications = function (tId) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/application/list",
            "params": {"id": tId}
        }, function (error, response) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                for (var i = 0; i < $scope.tenantsList.rows.length; i++) {
                    if ($scope.tenantsList.rows[i]['_id'] === tId) {
                        $scope.tenantsList.rows[i].applications = response;
                        break;
                    }
                }
            }
        });
    };

    $scope.removeTenantApplication = function (tId, appId) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/application/delete",
            "params": {"id": tId, "appId": appId}
        }, function (error) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                $scope.mt.displayAlert('success', "Selected Application has been removed.", tId);
                $scope.reloadApplications(tId);
            }
        });
    };

    $scope.addNewKey = function (tId, appId) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/tenant/application/key/add",
            "params": {"id": tId, "appId": appId}
        }, function (error) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                $scope.mt.displayAlert('success', 'Application Key Added Successfully.', tId);
                $scope.listKeys(tId, appId);
            }
        });
    };

    $scope.emptyConfiguration = function (tId, appId, key, env) {
        var configObj = {};
        var postData = {
            'envCode': env,
            'config': configObj
        };

        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/tenant/application/key/config/update",
            "data": postData,
            "params": {"id": tId, "appId": appId, "key": key}
        }, function (error) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                $scope.mt.displayAlert('success', 'Key Configuration Updated Successfully.', tId);
                $scope.reloadConfiguration(tId, appId, key);
            }
        });

    };

    $scope.updateConfiguration = function (tId, appId, key, env, value) {
        var data = {};
        if (value) {
            data.config = JSON.stringify(value, null, "\t");
        }
        if (env) {
            data.envCode = env;
        }
        var options = {
            timeout: $timeout,
            form: tenantConfig.form.keyConfig,
            name: 'updatekeyConfig',
            label: 'Update Key Configuration',
            labels: {
                submit: 'Update'
            },
            data: data,
            sub: true,
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var configObj;
                        if (formData.config && (formData.config != "")) {
                            try {
                                configObj = JSON.parse(formData.config);
                            }
                            catch (e) {
                                $scope.form.displayAlert('danger', 'Error: Invalid Config Json object ');
                                return;
                            }
                        }
                        else {
                            configObj = {};
                        }

                        var postData = {
                            'envCode': formData.envCode,
                            'config': configObj
                        };

                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/tenant/application/key/config/update",
                            "data": postData,
                            "params": {"id": tId, "appId": appId, "key": key}
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.mt.displayAlert('success', 'Key Configuration Updated Successfully.', tId);
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.reloadConfiguration(tId, appId, key);
                            }
                        });
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
                }]

        };

        buildFormWithModal($scope, $modal, options);
    };

    $scope.addNewExtKey = function (tId, appId, key) {
        var options = {
            timeout: $timeout,
            form: tenantConfig.form.extKey,
            name: 'addExtKey',
            label: 'Add New External Key',
            sub: true,
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var deviceObj, geoObj;
                        if (formData.device && (formData.device != "")) {
                            try {
                                deviceObj = JSON.parse(formData.device);
                            }
                            catch (e) {
                                $scope.form.displayAlert('danger', 'Error: Invalid device Json object ');
                                return;
                            }
                        }
                        else {
                            deviceObj = {};
                        }
                        if (formData.geo && (formData.geo != "")) {
                            try {
                                geoObj = JSON.parse(formData.geo);
                            }
                            catch (e) {
                                $scope.form.displayAlert('danger', 'Error: Invalid geo Json object ', tId);
                                return;
                            }
                        }
                        else {
                            geoObj = {};
                        }

                        var postData = {
                            'expDate': formData.expDate,
                            'device': deviceObj,
                            'geo': geoObj
                        };


                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/tenant/application/key/ext/add",
                            "data": postData,
                            "params": {"id": tId, "appId": appId, "key": key}
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message, tId);
                            }
                            else {
                                $scope.mt.displayAlert('success', 'External Key Added Successfully.', tId);
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listExtKeys(tId, appId, key);
                            }
                        });
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
                }]
        };

        buildFormWithModal($scope, $modal, options);
    };

    $scope.editExtKey = function (tId, appId, data, key) {
        var dataForm = angular.copy(data);
        if (data.geo) {
            dataForm.geo = JSON.stringify(data.geo, null, "\t");
        }
        if (data.device) {
            dataForm.device = JSON.stringify(data.device, null, "\t");
        }

        var formConfig = angular.copy(tenantConfig.form.extKey);
        formConfig.entries.unshift({
            'name': 'extKey',
            'label': 'External Key Value',
            'type': 'textarea',
            'rows': 3,
            'required': false
        });
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'editExtKey',
            label: 'Edit External Key',
            sub: true,
            data: dataForm,
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var geoObj, deviceObj;
                        if (formData.device && (formData.device != "")) {
                            try {
                                deviceObj = JSON.parse(formData.device);
                            }
                            catch (e) {
                                $scope.form.displayAlert('danger', 'Error: Invalid device Json object ');
                                return;
                            }
                        }
                        else {
                            deviceObj = {};
                        }
                        if (formData.geo && (formData.geo != "")) {
                            try {
                                geoObj = JSON.parse(formData.geo);
                            }
                            catch (e) {
                                $scope.form.displayAlert('danger', 'Error: Invalid geo Json object ');
                                return;
                            }
                        }
                        else {
                            geoObj = {};
                        }

                        var postData = {
                            'device': deviceObj,
                            'geo': geoObj,
                            'extKey': data.extKey
                        };
                        if (formData.expDate) {
                            postData.expDate = new Date(formData.expDate).toISOString();
                        }

                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/tenant/application/key/ext/update",
                            "data": postData,
                            "params": {"id": tId, "appId": appId, "key": key}
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.mt.displayAlert('success', 'External Key Updated Successfully.', tId);
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listExtKeys(tId, appId, key);
                            }
                        });

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
                }]
        };
        buildFormWithModal($scope, $modal, options);
    };

    $scope.removeExtKey = function (tId, appId, data, key) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/tenant/application/key/ext/delete",
            "data": {'extKey': data.extKey},
            "params": {"id": tId, "appId": appId, "key": key}
        }, function (error) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                $scope.mt.displayAlert('success', 'External Key Removed Successfully.', tId);
                $scope.modalInstance.close();
                $scope.form.formData = {};
                $scope.listExtKeys(tId, appId, key);
            }
        });
    };

    $scope.listExtKeys = function (tId, appId, key) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/application/key/ext/list",
            "params": {"id": tId, "appId": appId, "key": key}
        }, function (error, response) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                for (var i = 0; i < $scope.tenantsList.rows.length; i++) {
                    if ($scope.tenantsList.rows[i]['_id'] === tId) {
                        var apps = $scope.tenantsList.rows[i].applications;
                        for (var j = 0; j < apps.length; j++) {

                            if (apps[j].appId === appId) {
                                var app = apps[j];
                                var keys = app.keys;
                                for (var v = 0; v < keys.length; v++) {

                                    if (keys[v].key === key) {
                                        delete response['soajsauth'];
                                        //$scope.tenantsList.rows[i].applications[j].keys[v]=
                                        $scope.tenantsList.rows[i].applications[j].keys[v].extKeys = response;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }
        });
    };

    $scope.listKeys = function (tId, appId) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/application/key/list",
            "params": {"id": tId, "appId": appId}
        }, function (error, response) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                for (var i = 0; i < $scope.tenantsList.rows.length; i++) {
                    if ($scope.tenantsList.rows[i]['_id'] === tId) {
                        delete response['soajsauth'];
                        var apps = $scope.tenantsList.rows[i].applications;
                        for (var j = 0; j < apps.length; j++) {

                            if (apps[j].appId === appId) {
                                $scope.tenantsList.rows[i].applications[j].keys = response;
                                break;
                            }
                        }
                    }
                }
            }
        });
    };

    $scope.reloadConfiguration = function (tId, appId, key, index) {
        $scope.currentApplicationKey = key;
        $scope.currentApplicationKeyIndex = index;

        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/application/key/config/list",
            "params": {"id": tId, "appId": appId, "key": key}
        }, function (error, response) {
            if (error) {
                $scope.mt.displayAlert('danger', error.message, tId);
            }
            else {
                if (JSON.stringify(response) !== '{}') {
                    delete response['soajsauth'];

                    for (var i = 0; i < $scope.tenantsList.rows.length; i++) {
                        if ($scope.tenantsList.rows[i]['_id'] === tId) {
                            var apps = $scope.tenantsList.rows[i].applications;
                            for (var j = 0; j < apps.length; j++) {
                                if (apps[j].appId === appId) {
                                    var app = apps[j];
                                    var keys = app.keys;
                                    for (var v = 0; v < keys.length; v++) {
                                        if (keys[v].key === key) {
                                            $scope.tenantsList.rows[i].applications[j].keys[v].config = response;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        });
    };

    //default operation
    if ($scope.access.tenant.list) {
        if ($scope.access.product.list) {
            $scope.getProds();
        }
        if ($scope.access.environment.list) {
            $scope.getEnvironments();
        }
        $scope.listTenants();
    }

}]);

multiTenantApp.controller('tenantdbkeysCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi){
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, tenantConfig.permissions);

    $scope.listDbTenantKeys = function () {
        if($scope.access.db.listKeys) {
            $scope.tenantDbKeys = angular.extend($scope);
            getSendDataFromServer($scope, ngDataApi, {
                "method": "get",
                "routeName": "/dashboard/tenant/db/keys/list"
            }, function (error, response) {
                if (error) {
                    $scope.$parent.displayAlert('danger', error.message);
                }
                else {
                    var options = {
                        grid: tenantConfig.grid.keys,
                        data: response,
                        defaultSortField: 'code',
                        left: [],
                        top: []
                    };

                    if ($scope.access.db.deleteKey) {
                        options.left = [
                            {
                                'label': 'Delete',
                                'icon': 'cross',
                                'msg': "Are you sure you want to delete the selected tenant key(s)?",
                                'handler': 'removeDbTenantKey'
                            }
                        ];

                        options.top = [
                            {
                                'label': 'Delete',
                                'msg': "Are you sure you want to delete the selected tenant key(s)?",
                                'handler': 'removeDbTenantKey'
                            }
                        ];
                    }
                    buildGrid($scope.tenantDbKeys, options);
                    //var elem = angular.element(document.getElementById('tenantsdbKeys'));
                    //elem.html('<nglist></nglist>');
                    //$compile(elem.contents())($scope.tenantDbKeys);
                }
            });
        }
    };

    $scope.addDbTenantKey = function () {
        if($scope.access.db.addKey) {
            var options = {
                timeout: $timeout,
                form: tenantConfig.form.dbKey,
                name: 'addTenantKey',
                label: 'Add New Tenant Key',
                actions: [
                    {
                        'type': 'submit',
                        'label': 'Save Key',
                        'btn': 'primary',
                        'action': function (formData) {
                            var postData = {
                                'code': formData.code,
                                'extKey': formData.key
                            };
                            getSendDataFromServer($scope, ngDataApi, {
                                "method": "send",
                                "routeName": "/dashboard/tenant/db/keys/add",
                                "data": postData
                            }, function (error) {
                                if (error) {
                                    $scope.form.displayAlert('danger', error.message);
                                }
                                else {
                                    $scope.$parent.displayAlert('success', 'Tenant Key Added Successfully.');
                                    $scope.modalInstance.close();
                                    $scope.form.formData = {};
                                    $scope.listDbTenantKeys();
                                }
                            });

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
        }
    };

    $scope.removeDbTenantKey = function (data) {
        if($scope.access.db.deleteKey) {
            getSendDataFromServer($scope, ngDataApi, {
                "method": "get",
                "routeName": "/dashboard/tenant/db/keys/delete",
                "params": {"id": data._id}
            }, function (error) {
                if (error) {
                    $scope.$parent.displayAlert('danger', error.message);
                }
                else {
                    $scope.$parent.displayAlert('success', "Tenant removed successfully.");
                    $scope.listDbTenantKeys();
                }
            });
        }
    };

    if($scope.access.db.listKeys){
        $scope.listDbTenantKeys();
    }
}]);


multiTenantApp.controller('tenantApplicationAcl', ['$scope', 'ngDataApi', '$routeParams', 'aclHelper', function ($scope, ngDataApi, $routeParams, aclHelper) {
    $scope.$parent.isUserLoggedIn();
    $scope.isInherited = false;
    $scope.currentApplication = {};
    $scope.allGroups = [];

    $scope.getApplicationInfo = function () {
        var tId = $routeParams.tId;
        var appId = $routeParams.appId;

        // get tenant application info
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/tenant/application/list",
            "params": {"id": tId}
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                var l = response.length;
                for (var x = 0; x < l; x++) {
                    if (response[x].appId === appId) {
                        $scope.currentApplication = response[x];
                        if ($scope.currentApplication._TTL && $scope.currentApplication._TTL.toString().length > 3) {
                            $scope.currentApplication._TTL = ($scope.currentApplication._TTL / 3600000).toString();
                        }
                        break;
                    }
                }

                // get product info
                getSendDataFromServer($scope, ngDataApi, {
                    "method": "get",
                    "routeName": "/dashboard/product/packages/get",
                    "params": {
                        "productCode": $scope.currentApplication.product,
                        "packageCode": $scope.currentApplication.package
                    }

                }, function (error, response) {
                    if (error) {
                        $scope.$parent.displayAlert('danger', error.message);
                    }
                    else {
                        $scope.currentApplication.parentPckgAcl = response.acl;

                        var parentAcl = $scope.currentApplication.parentPckgAcl;
                        var serviceNames = Object.keys(parentAcl);

                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/services/list",
                            "data": {"serviceNames": serviceNames}
                        }, function (error, response) {
                            if (error) {
                                $scope.$parent.displayAlert('danger', error.message);
                            }
                            else {
                                var servicesList = response;

                                for (var x = 0; x < servicesList.length; x++) {
                                    var service = servicesList[x];
                                    var name = service.name;
                                    var newList;
                                    if ((parentAcl[name]) && (parentAcl[name].apisPermission === 'restricted')) {
                                        newList = [];
                                        service.forceRestricted = true;

                                        for (var i = 0; i < service.apis.length; i++) {
                                            var v = service.apis[i].v;
                                            if (parentAcl[name].apis) {
                                                if (parentAcl[name].apis[v]) {
                                                    newList.push(service.apis[i]);
                                                }
                                            }
                                        }
                                        service.fixList = aclHelper.groupApisForDisplay(newList, 'group');
                                    }
                                    else {
                                        newList = service.apis;
                                        service.fixList = aclHelper.groupApisForDisplay(service.apis, 'group');
                                    }
                                }
                                $scope.currentApplication.services = servicesList;

                                // get groups list
                                getSendDataFromServer($scope, ngDataApi, {
                                    "method": "get",
                                    "routeName": "/urac/admin/group/list",
                                    "params": {'tId': tId}
                                }, function (error, response) {
                                    if (error) {
                                        $scope.$parent.displayAlert("danger", error.message);
                                    }
                                    else {
                                        response.forEach(function (grpObj) {
                                            $scope.allGroups.push(grpObj.code);
                                        });
                                        if ($scope.currentApplication.acl) {
                                            $scope.currentApplication.aclFill = angular.copy($scope.currentApplication.acl);
                                        }
                                        else {
                                            $scope.isInherited = true;
                                            $scope.currentApplication.aclFill = angular.copy($scope.currentApplication.parentPckgAcl);
                                        }
                                        aclHelper.prepareViewAclObj($scope.currentApplication.aclFill);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    };

    $scope.minimize = function (service) {
        $scope.currentApplication.aclFill[service.name].collapse = true;
    };

    $scope.expand = function (service) {
        $scope.currentApplication.aclFill[service.name].collapse = false;
    };

    $scope.selectService = function (service) {
        if ($scope.currentApplication.aclFill[service.name].include) {
            if (service.forceRestricted) {
                $scope.currentApplication.aclFill[service.name].apisRestrictPermission = true;
            }
            $scope.currentApplication.aclFill[service.name].collapse = false;
        } else {
            $scope.currentApplication.aclFill[service.name].collapse = true;
        }
    };

    $scope.checkForGroupDefault = function (service, grp, val, myApi) {
        aclHelper.checkForGroupDefault($scope.currentApplication.aclFill, service, grp, val, myApi)
    };

    $scope.applyRestriction = function (service) {
        aclHelper.applyRestriction($scope.currentApplication.aclFill, service);
    };

    $scope.clearAcl = function () {
        var tId = $routeParams.tId;
        var appId = $routeParams.appId;
        var postData = $scope.currentApplication;

        postData.productCode = $scope.currentApplication.product;
        postData.packageCode = $scope.currentApplication.package.split("_")[1];
        postData.clearAcl = true;

        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/tenant/application/update",
            "data": postData,
            "params": {"id": tId, "appId": appId}
        }, function (error) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                $scope.$parent.displayAlert('success', 'ACL Updated Successfully.');
            }
        });
    };

    $scope.saveACL = function () {
        var tId = $routeParams.tId;
        var appId = $routeParams.appId;
        var postData = $scope.currentApplication;

        postData.productCode = $scope.currentApplication.product;
        postData.packageCode = $scope.currentApplication.package.split("_")[1];

        var result = aclHelper.prepareAclObjToSave($scope.currentApplication.aclFill);

        if (result.valid) {
            postData.acl = result.data;
            getSendDataFromServer($scope, ngDataApi, {
                "method": "send",
                "routeName": "/dashboard/tenant/application/update",
                "data": postData,
                "params": {"id": tId, "appId": appId}
            }, function (error) {
                if (error) {
                    $scope.$parent.displayAlert('danger', error.message);
                }
                else {
                    $scope.$parent.displayAlert('success', 'ACL Updated Successfully.');
                }
            });
        }
        else {
            $scope.$parent.displayAlert('danger', 'You need to choose at least one group when the access type is set to Groups');
        }
    };

    //default operation
    $scope.getApplicationInfo();
}]);