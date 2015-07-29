"use strict";
var cmService = soajsApp.components;
cmService.service('cmService', ['ngDataApi', '$cookieStore', '$http', 'Upload', '$compile', function (ngDataApi, $cookieStore, $http, Upload, $compile) {

    function loadServices(currentScope) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/environment/list"
        }, function (error, envRecords) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                var hosts = [];
                var count = 0;
                envRecords.forEach(function (oneEnv) {
                    getHosts(currentScope, oneEnv.code, function (envHosts) {
                        hosts = hosts.concat(envHosts);
                        count++;
                        if (count === envRecords.length) {
                            checkCBandHosts(currentScope, hosts);
                        }
                    });
                });
            }
        });
    }

    function getHosts(currentScope, envCode, cb) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/hosts/list",
            "params": {"env": envCode}
        }, function (error, hostsRecords) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                return cb(hostsRecords);
            }
        });
    }

    function checkCBandHosts(currentScope, hosts) {
        var services = [];
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/cb/list",
            "params": {'port': true}
        }, function (error, cbRecords) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                currentScope.noCB = (cbRecords > 0);
                cbRecords.forEach(function (oneService) {
                    var found = false;
                    for (var i = 0; i < hosts.length; i++) {
                        if (hosts[i].name === oneService.name) {
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        oneService.port = oneService.genericService.config.servicePort;
                        delete oneService.genericService;
                        services.push(oneService);
                    }
                });
                currentScope.hp = true;
                currentScope.services = services;
            }
        });
    }

    function downloadFile(currentScope, oneFile, mediaType) {
        var soajsAuthCookie = $cookieStore.get('soajs_auth');
        var options = {
            url: apiConfiguration.domain + "/" + currentScope.selectedService.name + "/download",
            method: 'get',
            headers: {
                "key": apiConfiguration.key,
                "soajsauth": soajsAuthCookie,
                "Accept": oneFile.contentType || oneFile.ct
            },
            responseType: 'arraybuffer',
            params: {
                'env': currentScope.selectedEnv.toUpperCase(),
                'id': oneFile._id || oneFile.v
            }
        };
        $http(options).success(function(data){
            switch(mediaType){
                case 'image':
                    var ext = (oneFile.filename || oneFile.n);
                    ext = ext.split('.')[1];
                    var blob = new Blob([data], { type: "image/" + ext });
                    var URL = window.URL || window.webkitURL;
                    oneFile.src = URL.createObjectURL(blob);
                    break;
                case 'audio':
                    var ext = (oneFile.filename || oneFile.n);
                    ext = ext.split('.')[1];
                    oneFile.mediaType = mediaType +"/" + ext;

                    var blob = new Blob([data], { type: oneFile.mediaType });
                    var URL = window.URL || window.webkitURL;
                    oneFile.src = URL.createObjectURL(blob);

                    oneFile.print = '<audio controls><source src="'+oneFile.src+'" ng-src="'+oneFile.src+'" type="'+oneFile.mediaType+'">Your browser does not support the audio tag.</audio>';

                    var e = angular.element(document.getElementById('aud_'+oneFile.id));
                    e.html = oneFile.print;
                    $compile(e.contents())(currentScope);
                    break;
                case 'video':
                    var ext = (oneFile.filename || oneFile.n);
                    ext = ext.split('.')[1];
                    oneFile.mediaType = mediaType +"/" + ext;

                    var blob = new Blob([data], { type: oneFile.mediaType });
                    var URL = window.URL || window.webkitURL;
                    oneFile.src = URL.createObjectURL(blob);

                    oneFile.print = '<video width="240" height="180" controls><source src="'+oneFile.src+'" type="'+oneFile.mediaType+'">Your browser does not support the video tag.</video>';

                    var e = angular.element(document.getElementById('vid_'+oneFile.id));
                    e.html = oneFile.print;
                    $compile(e.contents())(currentScope);
                    break;
                default:
                    openSaveAsDialog(oneFile.filename || oneFile.n, data, oneFile.contentType || oneFile.ct);
                    break;
            }
        });

        function openSaveAsDialog(filename, content, mediaType) {
            var blob = new Blob([content], {type: mediaType});
            var URL = window.URL || window.webkitURL;
            var objectUrl = URL.createObjectURL(blob);

            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            a.href = objectUrl;
            a.download = filename;
            a.click();
        }
    }

    function UploadFile(currentScope, method, files, apiData, url, cb) {
        var soajsAuthCookie = $cookieStore.get('soajs_auth');
        var headers = {
            "soajsauth": soajsAuthCookie
        };

        var max= 0, counter = 0;
        var err = [];
        for (var fileName in files) {
            if (files[fileName] && files[fileName].length > 0) {
                for (var i = 0; i < files[fileName].length; i++) {
                    if (files[fileName][i]) {
                        max++;
                    }
                }
            }
        }

        for (var fileName in files) {
            if (files[fileName] && files[fileName].length > 0) {
                for (var i = 0; i < files[fileName].length; i++) {
                    var progress = {
                        value: 0
                    };
                    if(files[fileName][i]) {
                        currentScope.form.uploadFileToUrl(Upload, files[fileName][i], url, {
                            "headers": headers,
                            "data": {
                                "nid": apiData[0]._id,
                                "env": currentScope.selectedEnv.toUpperCase(),
                                'field': fileName,
                                'position': i,
                                'action': method,
                                'media': fileName
                            }
                        }, progress, function (error, response) {
                            if (error) {
                                err.push(error);
                            }
                            else {
                                if (!response.result) {
                                    err = err.concat(response.errors.details);
                                }
                            }
                            counter++;
                            if (counter === max) {
                                return (err.length > 0) ? cb(err) : cb(null, true);
                            }
                        });
                    }
                }
            }
        }
    }

    function extractFilesFromPostedData(currentScope, config, formData) {
        var filesNames = [], formFiles = {};
        config.entries.forEach(function (oneEntry) {
            if (['audio', 'video', 'image', 'document'].indexOf(oneEntry.type) !== -1) {
                filesNames.push(oneEntry);
            }
        });
        var formFields = Object.keys(formData);
        if (filesNames && filesNames.length > 0) {
            filesNames.forEach(function (oneFileConfig) {
                var n = oneFileConfig.name;
                for (var i = 0; i < formFields.length; i++) {
                    if (formFields[i].indexOf(n) !== -1) {
                        if (!formFiles[n]) {
                            formFiles[n] = [];
                        }
                        if (!Array.isArray(formData[formFields[i]])) {
                            var position = formFields[i].split("_");
                            position = position[position.length -1];
                            formFiles[n][position]=formData[formFields[i]];
                        }
                        delete formData[formFields[i]];
                    }
                }

                if (oneFileConfig.required && (!formFiles[n] || formFiles[n].length === 0))
                    return false;
            });
            return formFiles;
        }
        else {
            return null;
        }

    }

    return {
        'loadServices': loadServices,
        'extractFilesFromPostedData': extractFilesFromPostedData,
        'UploadFile': UploadFile,
        'downloadFile': downloadFile
    }
}]);