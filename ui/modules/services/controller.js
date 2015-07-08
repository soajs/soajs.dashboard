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
                            "image": formData.image,
                            "port": formData.port
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

    $scope.addService = function() {
        var count = 1;
        var formConfig = angular.copy(servicesConfig.form.serviceAdd);
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'addService',
            label: 'Add New Service',
            actions: [
                {
                    'type': 'button',
                    'label': 'Add New API',
                    'btn': 'success',
                    'action': function() {
                        $scope.form.entries.forEach(function(oneEntry) {
                            if(oneEntry.name === 'apis') {
                                var clone = angular.copy(servicesConfig.form.oneApi);
                                for(var i = 0; i < clone.length; i++) {
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
                    'action': function(formData) {
                        var postData = {
                            'name': formData.name,
                            'requestTimeout': formData.requestTimeout,
                            'requestTimeoutRenewal': formData.requestTimeoutRenewal,
                            "image": formData.image,
                            "port": formData.port
                        };
                        var extKeyRequired;
                        if(Array.isArray(formData.extKeyRequired)) {
                            extKeyRequired = formData.extKeyRequired[0];
                            postData.extKeyRequired = extKeyRequired;
                        }
                        else {
                            extKeyRequired = formData.extKeyRequired;
                        }
                        if(extKeyRequired === 'true') {
                            postData.extKeyRequired = true;
                        } else if(extKeyRequired === 'false') {
                            postData.extKeyRequired = false;
                        }

                        postData.apis = [];
                        for(var i = 0; i < count; i++) {
                            var tmpObj = {
                                l: formData['apiL' + i],
                                v: formData['apiV' + i],
                                group: formData['apiG' + i],
                                groupMain: (formData['apiMain' + i] && formData['apiMain' + i] === 'true')
                            };
                            if(!tmpObj.groupMain) { delete tmpObj.groupMain; }
                            if(tmpObj.l && tmpObj.v && tmpObj.l !== '' && tmpObj.v !== '') {
                                postData.apis.push(tmpObj);
                            }
                        }

                        if(postData.apis.length === 0) {
                            $timeout(function() {
                                alert("You need to provide at least One API for this service!");
                            }, 10);
                        }
                        else {
                            getSendDataFromServer($scope, ngDataApi, {
                                "method": "send",
                                "routeName": "/dashboard/services/create",
                                "data": postData
                            }, function(error) {
                                if(error) {
                                    $scope.form.displayAlert('danger', error.message);
                                }
                                else {
                                    $scope.$parent.displayAlert('success', 'Service Created Successfully.');
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
                    'action': function() {
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
                                $scope.text = "<p>Creating a new Image from uploaded service File.<br />Do not refresh this page, this will take a few minutes...</p>";
                                $scope.progress = progress;
                            }
                        });
                        var soajsAuthCookie = $cookieStore.get('soajs_auth');
                        $scope.form.uploadFileToUrl(Upload, formData.upload_0, "/dashboard/services/upload", {
                            "data": {
                                "name": formData.name
                            },
                            "headers": {
                                "soajsauth": soajsAuthCookie
                            }
                        }, progress, function (error, response) {
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
                                        $scope.title = "Custom Service Image Created";
                                        $scope.text = "<p>Image Created from uploaded service File and build Logs are displayed in the box below.<br />Scroll to the bottom to perform additional operations.<br /></p>";
                                        $scope.data = response.data;
                                        setTimeout(function () {
                                            highlightMyCode()
                                        }, 500);

                                        $scope.deploy = function () {
                                            $modalInstance.dismiss('deploy');
                                            window.location.href = "#/environments";
                                        };
                                        $scope.ok = function () {
                                            $modalInstance.dismiss('ok');
                                        };

                                    }
                                });
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