"use strict";
var platformsServices = soajsApp.components;
platformsServices.service('envPlatforms', ['ngDataApi', '$timeout', '$modal', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $cookies, Upload) {

	function listPlatforms(currentScope, env, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/platforms/list",
			"params": {
				env: env
			}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			} else {
				renderDisplay(currentScope, response, cb);
			}
		});
	}

	function renderDisplay(currentScope, record, cb) {
		currentScope.deployer.type = record.type;
		currentScope.originalDeployerType = record.type;//used to detect changes in type on UI level

		if (record.selected.split('.')[0] === 'container') {
			currentScope.deployer.selected = record.selected.substring(record.selected.indexOf('.') + 1, record.selected.length);
		}

		currentScope.allowSelect = currentScope.deployer.type === 'container';

		currentScope.availableCerts = { //used later to view available certificates and allow user to choose them for other drivers
			docker: record.certs
		};

		currentScope.platforms = record.container;

		//filling in certificates
		for (var platform in currentScope.platforms) {
			var onePlatform = currentScope.platforms[platform];
			for (var driver in onePlatform) {
				onePlatform[driver].certs = [];
				for (var i = 0; i < record.certs.length; i++) {
					if (record.certs[i].metadata.platform === platform && record.certs[i].metadata.env[currentScope.envCode].indexOf(platform + '.' + driver) !== -1) {
						currentScope.platforms[platform][driver].certs.push({
							_id: record.certs[i]._id,
							filename: record.certs[i].filename
						});
					}
				}
			}
		}

		if (cb) {
			return cb();
		}
	}

	function listNginxCerts(currentScope) {
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/environment/nginx/cert/list'
		}, function (error, certs) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			}
			else {
				currentScope.nginx = {
					certs: []
				};
				certs.forEach(function (oneCert) {
					if (oneCert.metadata.env.indexOf(currentScope.envCode) !== -1) {
						currentScope.nginx.certs.push(oneCert);
					}
				});
				if (!currentScope.availableCerts.nginx) {
					currentScope.availableCerts.nginx = [];
				}

				currentScope.availableCerts.nginx = certs;
			}
		});
	}

	function deleteNginxCert(currentScope, certId) {
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/environment/nginx/cert/delete',
			params: {
				id: certId,
				env: currentScope.envCode
			}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			}
			else {
				currentScope.$parent.displayAlert('success', translation.selectedCertificateRemoved[LANG]);
				listNginxCerts(currentScope);
			}
		});
	}

	function uploadCerts(currentScope, platform, driverName) {
		var upload = $modal.open({
			templateUrl: "uploadCerts.tmpl",
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();

				$scope.title = translation.uploadCertificates[LANG];
				$scope.outerScope = currentScope;
				$scope.formData = {
					certificates: {}
				};
				$scope.certs = {
					selected: {}
				};

				$scope.platform = platform;
				if (platform === 'nginx') {
					$scope.nginxRequiredCerts = angular.copy(environmentsConfig.nginxRequiredCerts);
					currentScope.nginx.certs.forEach(function (oneCert) {
						if ($scope.nginxRequiredCerts[oneCert.metadata.label]) {
							delete $scope.nginxRequiredCerts[oneCert.metadata.label];
						}
					});
					$scope.nginxRequiredCertsLength = Object.keys($scope.nginxRequiredCerts).length;
				}

				$scope.onSubmit = function () {
					if ($scope.formData && $scope.formData.certificates && Object.keys($scope.formData.certificates).length > 0) {
						upload.close();
						var uploadInfo = $modal.open({
							templateUrl: 'uploadCertsInfo.html',
							backdrop: true,
							keyboard: false,
							controller: function ($scope) {
								fixBackDrop();
								$scope.text = "<h4 style='text-align:center;'>" + translation.uploadingCertificates[LANG] + "</h4><p style='text-align:center;'>" + translation.thisMightTakeFewMinutesPleaseWait[LANG] + "</p>";
							}
						});
						//create array index to go through certificates list
						$scope.index = [];
						for (var i in $scope.formData.certificates) {
							$scope.index.push(i);
						}

						$scope.uploadFiles(platform, driverName, 0, uploadInfo, function () {
							$scope.formData.certificates = {};
							$scope.index = [];
							uploadInfo.close();
							var uploadDone = $modal.open({
								templateUrl: 'uploadCertsInfo.html',
								backdrop: true,
								keyboard: true,
								controller: function ($scope, $modalInstance) {
									fixBackDrop();
									$scope.text = "<h4 style='text-align:center;'>" + translation.certificateAddedSuccessfully[LANG] + "</h4>";
								}
							});
							$timeout(function () {
								uploadDone.dismiss();
							}, 1500);

							currentScope.listPlatforms(currentScope.envCode);
						});
					}
				};

				$scope.chooseCerts = function () {
					var certIds = [];
					var certsArr = Object.keys($scope.certs.selected);
					certsArr.forEach(function (oneCertId) {
						if ($scope.certs.selected[oneCertId]) {
							certIds.push(oneCertId);
						}
					});

					var options = {
						method: "send",
						routeName: "/dashboard/environment/platforms/cert/choose",
						params: {
							env: currentScope.envCode,
							driverName: driverName
						},
						data: {
							certIds: certIds
						}
					};

					if (platform === 'nginx') {
						options.routeName = '/dashboard/environment/nginx/cert/choose';
						delete options.params.driverName;
					}

					getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
						if (error) {
							currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
							upload.close();
						} else {
							currentScope.$parent.displayAlert('success', translation.chosenCertificatesSavedSuccessfully[LANG]);
							upload.close();
							if (platform === 'nginx') {
								currentScope.listNginxCerts(currentScope);
							}
							else {
								currentScope.listPlatforms(currentScope.envCode);
							}
						}
					});
				};

				$scope.getAvailableCerts = function () {
					if (platform === 'nginx') {
						$scope.certsToDisplay = {};
						currentScope.availableCerts[$scope.platform].forEach(function (oneCert) {
							if (oneCert.metadata.platform === $scope.platform) {
								if (!$scope.certsToDisplay[oneCert.metadata.label]) {
									$scope.certsToDisplay[oneCert.metadata.label] = [];
								}
								$scope.certsToDisplay[oneCert.metadata.label].push({
									_id: oneCert._id,
									name: oneCert.filename,
									env: oneCert.metadata.env
								});
							}
						});
						currentScope.nginx.certs.forEach(function (oneCert) {
							if ($scope.certsToDisplay[oneCert.metadata.label]) {
								delete $scope.certsToDisplay[oneCert.metadata.label];
							}
						});
						$scope.certsToDisplay.length = Object.keys($scope.certsToDisplay).length;
					}
					else if (platform === 'docker') {
						$scope.certsToDisplay = [];
						currentScope.availableCerts[$scope.platform].forEach(function (oneCert) {
							if (oneCert.metadata.platform === $scope.platform) {
								$scope.certsToDisplay.push({
									_id: oneCert._id,
									name: oneCert.filename,
									env: Object.keys(oneCert.metadata.env)
								});
							}
						});
					}
				};
				$scope.getAvailableCerts();

				$scope.closeModal = function () {
					upload.close();
				};

				$scope.uploadFiles = function(platform, driverName, counter, modal, cb) {
					if (!currentScope.envCode || !platform || !$scope.formData.certificates[$scope.index[counter]].name) {
						//to avoid incompatibiltiy issues when using safari browsers
						return cb();
					}

					var soajsauthCookie = $cookies.get('soajs_auth');
					var dashKeyCookie = $cookies.get('soajs_dashboard_key');
					var progress = {
						value: 0
					};

					var options = {
						url: apiConfiguration.domain + "/dashboard/environment/platforms/cert/upload",
						params: {
							envCode: currentScope.envCode,
							filename: $scope.formData.certificates[$scope.index[counter]].name,
							platform: platform,
							driver: driverName
						},
						file: $scope.formData.certificates[$scope.index[counter]],
						headers: {
							'soajsauth': soajsauthCookie,
							'key': dashKeyCookie
						}
					};

					if (platform === 'nginx') {
						options.url = apiConfiguration.domain + "/dashboard/environment/nginx/cert/upload";

						delete options.params.driver;
						if ($scope.formData.certificates[$scope.index[counter]].type === 'application/x-x509-ca-cert') {
							options.params.label = "certificate";
						}
						else {
							options.params.label = "privateKey";
						}
					}

					Upload.upload(options).progress(function (evt) {
						var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
						progress.value = progressPercentage;
					}).success(function (response, status, headers, config) {
						if (!response.result) {
							currentScope.$parent.displayAlert('danger', response.errors.details[0].message);
							currentScope.listPlatforms(currentScope.envCode); //refresh view in case some files were uploaded successfully
							modal.close();
						}
						else {
							counter++;
							if (counter === Object.keys($scope.formData.certificates).length) {
								return cb();
							} else {
								$scope.uploadFiles(platform, driverName, counter, modal, cb);
							}
						}
					}).error(function (data, status, header, config) {
						currentScope.$parent.displayAlert('danger', translation.errorOccurredWhileUploadingFile[LANG] + " " + options.params.filename);
						modal.close();
					});
				}
			}
		});
	}

	function removeCert(currentScope, certId, platform, driverName) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/platforms/cert/delete",
			"params": {
				"id": certId,
				"env": currentScope.envCode,
				"driverName": platform + '.' + driverName
			}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			} else {
				currentScope.$parent.displayAlert('success', translation.selectedCertificateRemoved[LANG]);
				currentScope.listPlatforms(currentScope.envCode);
			}
		});
	}

	function selectDriver(currentScope, platform, driverName, type) {
		var driver = type + "." + platform + '.' + driverName;
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/environment/platforms/driver/changeSelected",
			"params": {env: currentScope.envCode},
			"data": {selected: driver}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			} else {
				currentScope.$parent.displayAlert('success', translation.selectedDriverUpdated[LANG]);
				currentScope.deployer.selected = platform + '.' + driverName;
				currentScope.originalDeployer = currentScope.deployer.selected;
			}
		});
	}

	function clearDriverConfig(currentScope, driverName) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/platforms/driver/delete",
			"params": {
				env: currentScope.envCode,
				driverName: driverName
			}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			} else {
				currentScope.$parent.displayAlert('success', translation.driverConfigurationClearedSuccessfully[LANG]);
				currentScope.listPlatforms(currentScope.envCode);
			}
		});
	}

	function addDriver(currentScope) {
		$modal.open({
			templateUrl: "addEditDriver.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				$scope.jsoneditor = angular.copy(currentScope.jsoneditorConfig);

				$scope.title = translation.addDriver[LANG];
				$scope.outerScope = currentScope;

				$scope.driver = {
					info: {}
				};

				$scope.local = {};
				$scope.cloud = {};
				$scope.socket = {};

				$scope.onSubmit = function () {
					var postData = preparePostData($scope);

					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/environment/platforms/driver/add",
						"params": {
							env: currentScope.envCode,
							driverName: $scope.driver.info.label
						},
						"data": postData
					}, function (error, response) {
						if (error) {
							currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
							$modalInstance.close();
						} else {
							currentScope.$parent.displayAlert('success', translation.driverCreatedSuccessfully[LANG]);
							$modalInstance.close();
							delete currentScope.allowAddDriver[$scope.driver.info.label.split(" - ")[1]];
							currentScope.listPlatforms(currentScope.envCode);
						}
					});
				};

				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	}

	function editDriver(currentScope, platform, driver, driverConfig) {
		$modal.open({
			templateUrl: "addEditDriver.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				$scope.jsoneditor = angular.copy(currentScope.jsoneditorConfig);
				$scope.jsoneditor.jsonIsValid = true;
				$scope.jsoneditor.onLoad = function (instance) {
			        if (instance.mode === 'code') {
			            instance.setMode('code');
			        }
			        else {
			            instance.set();
			        }

			        instance.editor.getSession().on('change', function () {
			            try {
			                instance.get();
			                $scope.jsoneditor.jsonIsValid = true;
			            }
			            catch (e) {
			                $scope.jsoneditor.jsonIsValid = false;
			            }
			        });
				};

				$scope.title = "Edit Driver";
				$scope.outerScope = currentScope;

				$scope.driver = {
					info: angular.copy(driverConfig)
				};

				$scope.local = {};
				$scope.cloud = {};
				$scope.socket = {};
				$scope.mode = 'edit';

				if (driver.label === 'dockermachine - local') {
					$scope.local.host = driver.host;
					$scope.local.port = driver.port;
					if (driver.config && driver.config !== "") {
						$scope.local.config = angular.copy (driver.config);
					}
				} else if (driver.label.indexOf('dockermachine - cloud') !== -1) {
					$scope.cloud.selectedCloud = driver.label.split(" - ")[2];
					$scope.driver.info.label = 'dockermachine - cloud'; //must be in this format to be compatible with form

					$scope.cloud.host = driver.host;
					$scope.cloud.port = driver.port;
					if (driver.config && driver.config !== "") {
						$scope.cloud.config = angular.copy (driver.config);
					}
				} else if (driver.label === 'docker - socket') {
					$scope.socket.socketPath = driver.socketPath;
				}

				$scope.onSubmit = function () {
					if (driver.label === 'dockermachine - local') {
						if (!$scope.jsoneditor.jsonIsValid) {
							$scope.error = {
								message: 'Invalid JSON Object'
							};
							$timeout(function () {
								$scope.error.message = '';
							}, 5000);
							return;
						}
					}
					else if (driver.label.indexOf('dockermachine - cloud') !== -1) {
						if (!$scope.jsoneditor.jsonIsValid) {
							$scope.error = {
								message: 'Invalid JSON Object'
							};
							$timeout(function () {
								$scope.error.message = '';
							}, 5000);
							return;
						}
					}
					var postData = preparePostData($scope);

					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/environment/platforms/driver/edit",
						"params": {
							env: currentScope.envCode,
							driverName: driver.label
						},
						"data": postData
					}, function (error, response) {
						if (error) {
							currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
							$modalInstance.close();
						} else {
							currentScope.$parent.displayAlert('success', 'Driver edited successfully');
							$modalInstance.close();
							currentScope.listPlatforms(currentScope.envCode);
						}
					});
				};

				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	}

	function changeDeployerType (currentScope) {
		//scope.allowSelect if type is container
		var postData = {
			deployerType: currentScope.deployer.type
		};
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/environment/platforms/deployer/type/change",
			"params": {
				env: currentScope.envCode
			},
			"data": postData
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			} else {
				currentScope.$parent.displayAlert('success', 'Deployer type changed successfully');
				currentScope.allowSelect = currentScope.deployer.type === 'container';
				currentScope.listPlatforms(currentScope.envCode);
			}
		});
	}

	function preparePostData(currentScope) {
		if (currentScope.driver.info.label === 'dockermachine - local') {
			var postData = {
				local: {
					host: currentScope.local.host,
					port: currentScope.local.port
				}
			};
			if (currentScope.local.config && currentScope.local.config !== "") {
				postData.local.config = currentScope.local.config;
			}
		} else if (currentScope.driver.info.label === 'dockermachine - cloud') {
			var postData = {
				cloud: {
					cloudProvider: currentScope.cloud.selectedCloud,
					host: currentScope.cloud.host,
					port: currentScope.cloud.port
				}
			};
			if (currentScope.cloud.config && currentScope.cloud.config !== "") {
				postData.cloud.config = currentScope.cloud.config;
			}

		} else if (currentScope.driver.info.label === 'docker - socket') {
			var postData = {
				socket: {
					socketPath: currentScope.socket.socketPath
				}
			};
		}

		return postData;
	}

	return {
		'listPlatforms': listPlatforms,
		'listNginxCerts': listNginxCerts,
		'deleteNginxCert': deleteNginxCert,
		'uploadCerts': uploadCerts,
		'removeCert': removeCert,
		'selectDriver': selectDriver,
		'clearDriverConfig': clearDriverConfig,
		'addDriver': addDriver,
		'editDriver': editDriver,
		'changeDeployerType': changeDeployerType
	}
}]);
