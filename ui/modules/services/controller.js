"use strict";

var servicesApp = soajsApp.components;
servicesApp.controller('servicesCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookieStore', 'Upload', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookieStore, Upload) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, servicesConfig.permissions);

    $scope.showHide = function (service) {
        if (!service.hide) {
            jQuery('#s_' + service._id + " .body").slideUp();
            service.icon = 'plus';
            service.hide = true;
            jQuery('#s_' + service._id + " .header").addClass("closed");
        }
        else {
            jQuery('#s_' + service._id + " .body").slideDown();
            jQuery('#s_' + service._id + " .header").removeClass("closed");
            service.icon = 'minus';
            service.hide = false;
        }
    };

    $scope.editService = function (service) {
        var count = 0;
        var formConfig = angular.copy(servicesConfig.form.serviceEdit);

        formConfig.entries.forEach(function (oneEntry) {
            if (oneEntry.name === 'apis') {
                if (service.apis && service.apis.length > 0) {
                    for (var i = 0; i < service.apis.length; i++) {
                        var clone = angular.copy(servicesConfig.form.oneApi);

                        clone.forEach(function (oneField) {
                            oneField.name = oneField.name.replace("%count%", count);

                            if (oneField.name === 'apiV' + count) {
                                oneField.value = service.apis[i].v;
                            }
                            if (oneField.name === 'apiL' + count) {
                                oneField.value = service.apis[i].l;
                            }
                            if (oneField.name === 'apiG' + count) {
                                oneField.value = service.apis[i].group;
                            }
                            if (oneField.name === 'apiMain' + count) {
                                oneField.value.forEach(function (oneV) {
                                    if (oneV.v === service.apis[i].groupMain) {
                                        oneV.selected = true;
                                    }
                                });
                            }
                            if (oneField.type === 'html') {
                                oneField.value = oneField.value.replace("%count%", count);
                            }
                            oneEntry.entries.push(oneField);
                        });
                        count++;
                    }
                }
            }
        });
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'editService',
            label: 'Update Service',
            'data': service,
            actions: [
                {
                    'type': 'button',
                    'label': 'Add New API',
                    'btn': 'success',
                    'action': function () {
                        $scope.form.entries.forEach(function (oneEntry) {
                            if (oneEntry.name === 'apis') {
                                var clone = angular.copy(servicesConfig.form.oneApi);
                                for (var i = 0; i < clone.length; i++) {
                                    clone[i].name = clone[i].name.replace("%count%", count);
                                }
                                oneEntry.entries = oneEntry.entries.concat(clone);
                                count++;
                            }
                        });
                    }
                },
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            'requestTimeout': formData.requestTimeout,
                            'requestTimeoutRenewal': formData.requestTimeoutRenewal,
                            "port": formData.port,
                            "awareness": formData.awareness
                        };
                        var extKeyRequired;
                        if (Array.isArray(formData.extKeyRequired)) {
                            extKeyRequired = formData.extKeyRequired[0];
                            postData.extKeyRequired = extKeyRequired;
                        }
                        else {
                            extKeyRequired = formData.extKeyRequired;
                        }
                        if (extKeyRequired === 'true') {
                            postData.extKeyRequired = true;
                        } else if (extKeyRequired === 'false') {
                            postData.extKeyRequired = false;
                        }

                        var awareness;
                        if (Array.isArray(formData.awareness)) {
                            awareness = formData.awareness[0];
                            postData.awareness = awareness;
                        }
                        else {
                            awareness = formData.awareness;
                        }
                        if (awareness === 'true') {
                            postData.awareness = true;
                        } else if (awareness === 'false') {
                            postData.awareness = false;
                        }

                        postData.apis = [];
                        for (var i = 0; i < count; i++) {
                            var tmpObj = {
                                l: formData['apiL' + i],
                                v: formData['apiV' + i],
                                group: formData['apiG' + i],
                                groupMain: (formData['apiMain' + i] && formData['apiMain' + i] === 'true')
                            };
                            if (!tmpObj.groupMain) {
                                delete tmpObj.groupMain;
                            }
                            if (tmpObj.l && tmpObj.v && tmpObj.l !== '' && tmpObj.v !== '') {
                                postData.apis.push(tmpObj);
                            }
                        }

                        if (postData.apis.length === 0) {
                            $timeout(function () {
                                alert("You need to provide at least One API for this service!");
                            }, 10);
                        }
                        else {
                            getSendDataFromServer($scope, ngDataApi, {
                                "method": "send",
                                "routeName": "/dashboard/services/update",
                                "params": {"name": service.name},
                                "data": postData
                            }, function (error) {
                                if (error) {
                                    $scope.form.displayAlert('danger', error.message);
                                }
                                else {
                                    $scope.$parent.displayAlert('success', 'Service Data Updated Successfully.');
                                    $scope.modalInstance.close();
                                    $scope.form.formData = {};
                                    $scope.listServices();
                                }
                            });
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

        buildFormWithModal($scope, $modal, options);
    };

    $scope.uploadService = function () {
        var formConfig = angular.copy(servicesConfig.form.serviceCustomAdd);
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'addService',
            label: 'Create Custom Service',
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        $scope.modalInstance.close();
                        var progress = {
                            value: 0
                        };

                        var mdm = $modal.open({
                            templateUrl: "serviceInfoBox.html",
                            size: 'lg',
                            backdrop: false,
                            keyboard: false,
                            controller: function ($scope, $modalInstance) {
                                $scope.title = "Creating Service";
                                $scope.text = "<p>Uploading service please wait, do not refresh this page, this will take a few minutes...</p>";
                                $scope.progress = progress;
                            }
                        });
                        var soajsAuthCookie = $cookieStore.get('soajs_auth');
                        $scope.form.uploadFileToUrl(Upload, {
                            'file': formData.upload_0,
                            'uploadUrl': "/dashboard/services/upload",
                            'headers': {
                                "soajsauth": soajsAuthCookie,
                                "key": $cookieStore.get("soajs_dashboard_key")
                            },
                            'progress': progress
                        }, function (error, response) {
                            if (error) {
                                $scope.$parent.displayAlert('danger', error.message);
                                mdm.close();
                            }
                            else {
                                $scope.form.formData = {};
                                mdm.close();
                                $modal.open({
                                    templateUrl: "serviceInfoBox.html",
                                    size: 'lg',
                                    backdrop: false,
                                    keyboard: false,
                                    controller: function ($scope, $modalInstance) {
                                        $scope.title = "Custom Service Uploaded";
                                        $scope.text = "<p>New Service Created from uploaded ZIP File and registered.<br />Proceed to environments to deploy your service.<br /></p>";
                                        $scope.data = true;
                                        $scope.deploy = function () {
                                            $modalInstance.dismiss('deploy');
                                            window.location.href = "#/environments";
                                        };
                                        $scope.ok = function () {
                                            $modalInstance.dismiss('ok');
                                        };

                                    }
                                });
	                            $scope.listServices();
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

    $scope.listServices = function () {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/services/list"
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                var l = response.length;
                for (var x = 0; x < l; x++) {
                    if (response[x].apis) {
                        response[x].fixList = $scope.arrGroupByField(response[x].apis, 'group');
                    }
                }
                $scope.grid = {
                    rows: response
                };
            }
        });
    };

    $scope.arrGroupByField = function (arr, f) {
        var result = {};
        var l = arr.length;
        var g = 'General';
        for (var i = 0; i < l; i++) {
            if (arr[i][f]) {
                g = arr[i][f];
            }
            if (!result[g]) {
                result[g] = {};
                result[g].apis = [];
            }
            if (arr[i].groupMain === true) {
                result[g]['defaultApi'] = arr[i].v;
            }
            result[g].apis.push(arr[i]);
        }

        var label;
        for (label in result) {
            if (result.hasOwnProperty(label)) {
                if (result[label].apis) {
                    var v = result[label].apis.length / 2;
                    var c = Math.ceil(v);
                    result[label].apis1 = result[label].apis.slice(0, c);
                    result[label].apis2 = result[label].apis.slice(c, l);
                }
            }
        }
        return result;
    };

    if ($scope.access.listServices) {
        injectFiles.injectCss("modules/services/services.css");
        $scope.listServices();
    }

}]);

servicesApp.controller('daemonsCtrl', ['$scope', 'ngDataApi', '$timeout', '$modal', function ($scope, ngDataApi, $timeout, $modal) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, servicesConfig.permissions);

    $scope.listDaemons = function (cb) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/daemons/list"
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                $scope.grid = {
                    rows: response
                };
                if (cb) cb();
            }
        });
    };

    $scope.updateDaemon = function (daemon) {
        var formConfig = angular.copy(servicesConfig.form.daemonEdit);
        formConfig.entries.forEach (function (oneEntry) {
            if (oneEntry.name === "daemonName") {
                oneEntry.value = daemon.name;
            } else if (oneEntry.name === "daemonPort") {
                oneEntry.value = daemon.port;
            }
        });
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'editDaemon',
            label: 'Update Daemon',
            'data': daemon,
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {};
                        postData.name = formData.name;
                        postData.port = formData.port;
                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/daemons/update",
                            "params": {"id": daemon._id},
                            "data": postData
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.$parent.displayAlert('success', 'Daemon Data Updated Successfully.');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listDaemons();
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

    $scope.deleteDaemon = function (daemon) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/daemons/delete",
            "params": {
                "id": daemon._id
            }
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                $scope.$parent.displayAlert('success', 'Daemon deleted successfully.');
                $scope.listDaemons();
            }
        });
    };

    $scope.addDaemon = function () {
        var options = {
            timeout: $timeout,
            form: servicesConfig.form.daemonEdit, ///////////////////////////////////////
            name: 'addDaemon',
            label: 'Add Daemon',
            //'data': daemon,
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {};
                        postData.name = formData.name;
                        postData.port = formData.port;
                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/daemons/add",
                            "data": postData
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.$parent.displayAlert('success', 'Daemon Added Successfully.');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listDaemons();
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

    $scope.listDaemonGroupConfig = function (cb) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/daemons/groupConfig/list"
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                $scope.groupConfigs = {
                    rows: response
                };
                if (cb) cb();
            }
        });
    };

    $scope.updateDaemonGroupConfig = function () {

    };

    $scope.addDaemonGroupConfig = function () {
        var options = {
            timeout: $timeout,
            form: servicesConfig.form.daemonGroupEdit,//////////////////////
            name: 'addDaemonGroup',
            label: 'Add Daemon Group Config',
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {};
                        postData.groupName = formData.groupName;
                        postData.interval = formData.interval;
                        postData.execution = formData.execution;
                        console.log (postData);
                        getSendDataFromServer($scope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/daemons/groupConfig/add",
                            "data": postData
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.$parent.displayAlert('success', 'Daemon Group Config Added Successfully.');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listDaemonGroupConfig();
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

    $scope.deleteDaemonGroupConfig = function (group) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/daemons/groupConfig/delete",
            "params": {
                "id": group._id
            }
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            }
            else {
                $scope.$parent.displayAlert('success', 'Daemon deleted successfully.');
                $scope.listDaemonGroupConfig();
            }
        });
    };

    /*
    $scope.timeConverter = function (timeInMillis) {
        //seconds millis/1000
        //minutes seconds/60
        //hours minutes/60
        //days hours/24
        //weeks days/7
        //months weeks/4
        //years days/256
        if (timeInMillis) {
            if (Math.floor(timeInMillis/1000) < 1) {
                return timeInMillis.toFixed(2) + " msec";
            } else {
                timeInMillis = timeInMillis / 1000; //seconds
                if (Math.floor(timeInMillis / 60) < 1) {
                    return timeInMillis.toFixed(2) + " sec";
                } else {
                    timeInMillis = timeInMillis / 60; //minutes
                    if (Math.floor(timeInMillis / 60) < 1) {
                        return timeInMillis.toFixed(2) + " min";
                    } else {
                        timeInMillis = timeInMillis / 60; //hours
                        if (Math.floor(timeInMillis / 24) < 1) {
                            return timeInMillis.toFixed(2) + " h";
                        } else {
                            timeInMillis = timeInMillis / 24; //days
                            if (Math.floor(timeInMillis / 7) < 1) {
                                return timeInMillis.toFixed(2) + " days";
                            } else {
                                timeInMillis = timeInMillis / 7; //weeks
                                if (Math.floor(timeInMillis / 4) < 1) {
                                    return timeInMillis.toFixed(2) + " weeks";
                                } else {
                                    timeInMillis = timeInMillis / 4; //months
                                    if (Math.floor(timeInMillis / 365) < 1) {
                                        return timeInMillis.toFixed(2) + " months";
                                    } else {
                                        timeInMillis = timeInMillis / 365; //years
                                        return timeInMillis.toFixed(2) + " years";
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    console.log ($scope.timeConverter(3600000000000));
    */

    if ($scope.access.daemons.listDaemons && $scope.access.daemonGroupConfig.listDaemonGroupConfig) {
        $scope.listDaemons(function () {
            $scope.listDaemonGroupConfig();
        });
    }
}]);

servicesApp.filter('nonEmpty', function() {
    return function(object) {
        console.log (!!(object && Object.keys(object).length > 0));
        return !!(object && Object.keys(object).length > 0);
    };
});