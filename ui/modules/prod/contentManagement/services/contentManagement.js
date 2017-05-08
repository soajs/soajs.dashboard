"use strict";
var cmService = soajsApp.components;

cmService.service('cmModuleProdService', ['ngDataApi', '$cookies', '$http', 'Upload', '$compile', function (ngDataApi, $cookies, $http, Upload, $compile) {
	var access_token = $cookies.get('access_token');
	
    function loadServices(currentScope) {
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
                   oneService.port = oneService.genericService.config.servicePort;
                   delete oneService.genericService;
                   services.push(oneService);
                });
                currentScope.hp = true;
                currentScope.services = services;
            }
        });
    }

    function downloadFile(currentScope, oneFile, mediaType) {
        var options = {
            routeName: "/" + currentScope.selectedService.name + "/download",
            method: 'get',
            headers: {
                "Accept": oneFile.contentType,
	            "key": $cookies.get("soajs_dashboard_key")
            },
            responseType: 'arraybuffer',
            params: {
                '__env': currentScope.selectedEnv.toUpperCase(),
                'id': oneFile._id,
	            'access_token' : access_token
            }
        };
        getSendDataFromServer(currentScope, ngDataApi, options, function (error, data) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                switch (mediaType) {
                    case 'image':
                        var blob = new Blob([data], {type: oneFile.metadata.mime});
                        var URL = window.URL || window.webkitURL;
                        oneFile.src = URL.createObjectURL(blob);
                        break;
                    case 'audio':
                        oneFile.mediaType = oneFile.metadata.mime.replace("mpeg3", "mpeg");

                        var blob = new Blob([data], {type: oneFile.mediaType});
                        var URL = window.URL || window.webkitURL;
                        oneFile.src = URL.createObjectURL(blob);

                        oneFile.print = '<audio controls><source src="' + oneFile.src + '" ng-src="' + oneFile.src + '" type="' + oneFile.mediaType + '">' + translation.yourBrowserDoesNotSupportAudioTag[LANG] + '</audio>';

                        var e = angular.element(document.getElementById('aud_' + oneFile.id));
                        e.html = oneFile.print;
                        $compile(e.contents())(currentScope);
                        break;
                    case 'video':
                        oneFile.mediaType = oneFile.metadata.mime;

                        var blob = new Blob([data], {type: oneFile.mediaType});
                        var URL = window.URL || window.webkitURL;
                        oneFile.src = URL.createObjectURL(blob);

                        oneFile.print = '<video width="240" height="180" controls><source src="' + oneFile.src + '" type="' + oneFile.mediaType + '">' + translation.yourBrowserDoesNotSupportAudioTag[LANG] + '</video>';

                        var e = angular.element(document.getElementById('vid_' + oneFile.id));
                        e.html = oneFile.print;
                        $compile(e.contents())(currentScope);
                        break;
                    default:
                        openSaveAsDialog(oneFile.filename, data, oneFile.contentType);
                        break;
                }
            }
        });
    }

    function UploadFile(currentScope, config, method, files, apiData, url, cb) {
        var soajsAuthCookie = $cookies.get('soajs_auth');

        var max = 0, counter = 0;
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
                    if (files[fileName][i]) {
                        var media;
                        config.entries.forEach(function (oneEntry) {
                            if(oneEntry.name === fileName){
                                media = oneEntry.type;
                            }
                        });

	                    var uploadParams = {
		                    'file': files[fileName][i],
		                    'uploadUrl': url,
		                    'headers': {
			                    "soajsauth": soajsAuthCookie,
			                    "key": $cookies.get("soajs_dashboard_key")
		                    },
		                    'progress': progress,
		                    "data": {
			                    "nid": apiData[0]._id,
			                    "__env": currentScope.selectedEnv.toUpperCase(),
			                    'field': fileName,
			                    'position': i,
			                    'action': method,
			                    'media': media
		                    }
	                    };

	                    var pathParams = url.split("/");
	                    var exclude = ['urac', 'dashboard'];
	                    if (exclude.indexOf(pathParams[3]) === -1) {
		                    uploadParams.uploadUrl = "/proxy/redirect";
		                    uploadParams.data['proxyRoute'] = encodeURIComponent(url);
	                    }
	                    
	                    if (access_token) {
		                    uploadParams.data.access_token = access_token;
	                    }
	                    
                        currentScope.form.uploadFileToUrl(Upload, uploadParams,
                            function (error, response) {
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
                            position = position[position.length - 1];
                            formFiles[n][position] = formData[formFields[i]];
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