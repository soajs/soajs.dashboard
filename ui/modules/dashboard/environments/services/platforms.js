"use strict";
var platformsServices = soajsApp.components;
platformsServices.service('envPlatforms', ['ngDataApi', '$timeout', '$modal', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $cookies, Upload) {

	var access_token = $cookies.get('access_token');

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
		currentScope.currentSelected = record.selected.split('.');

		if (currentScope.currentSelected[0] === 'container') {
			currentScope.deployer.selected = currentScope.currentSelected[1] + '.' + currentScope.currentSelected[2];
			currentScope.deployer.platform = currentScope.currentSelected[1];
		}

		currentScope.allowSelect = currentScope.deployer.type === 'container';

		currentScope.availableCerts = {}; //used later to view available certificates and allow user to choose them for other drivers
		record.certs.forEach(function (oneCert) {
			if (!currentScope.availableCerts[oneCert.metadata.platform]) {
				currentScope.availableCerts[oneCert.metadata.platform] = [];
			}

			currentScope.availableCerts[oneCert.metadata.platform].push(oneCert);
		});

		currentScope.platforms = record.container;

		//filling in certificates
		for (var platform in currentScope.platforms) {
			var onePlatform = currentScope.platforms[platform];
			for (var driver in onePlatform) {
				onePlatform[driver].certs = [];
				for (var i = 0; i < record.certs.length; i++) {
					if (record.certs[i].metadata.platform === platform && record.certs[i].metadata.env[currentScope.envCode] && record.certs[i].metadata.env[currentScope.envCode].indexOf(platform + '.' + driver) !== -1) {
						currentScope.platforms[platform][driver].certs.push({
							_id: record.certs[i]._id,
							filename: record.certs[i].filename,
							certType: record.certs[i].metadata.certType
						});
					}
				}
			}
		}

		if (cb) {
			return cb();
		}
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
					selected: {},
					types: ['ca', 'cert', 'key']
				};

				$scope.platform = platform;
				$scope.driver = driverName;
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
						method: "put",
						routeName: "/dashboard/environment/platforms/cert/choose",
						params: {
							env: currentScope.envCode,
							platform: platform,
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
							currentScope.listPlatforms(currentScope.envCode);
						}
					});
				};

				$scope.getAvailableCerts = function () {
					$scope.certsToDisplay = [];
					$scope.availableCertTypes = [];
					if (currentScope.availableCerts[$scope.platform]) {
						currentScope.availableCerts[$scope.platform].forEach(function (oneCert) {
							if (oneCert.metadata.platform === $scope.platform) {
								$scope.certsToDisplay.push({
									_id: oneCert._id,
									name: oneCert.filename,
									env: Object.keys(oneCert.metadata.env),
									certType: oneCert.metadata.certType
								});
							}
						});
					}
					//check the types of the certicates that are currently available for this driver
					//do not allow user to upload more than one certificate with the same type [ca, cert, key]
					if (currentScope.platforms[$scope.platform][$scope.driver].certs && currentScope.platforms[$scope.platform][$scope.driver].certs.length > 0) {
						currentScope.platforms[$scope.platform][$scope.driver].certs.forEach(function (oneCert) {
							$scope.availableCertTypes.push(oneCert.certType);
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
							certType: $scope.index[counter],
							platform: platform,
							driver: driverName,
							access_token: access_token
						},
						file: $scope.formData.certificates[$scope.index[counter]],
						headers: {
							'soajsauth': soajsauthCookie,
							'key': dashKeyCookie
						}
					};

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
			"method": "delete",
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
			"method": "put",
			"routeName": "/dashboard/environment/platforms/driver/changeSelected",
			"params": {env: currentScope.envCode},
			"data": {selected: driver}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			} else {
				currentScope.$parent.displayAlert('success', translation.selectedDriverUpdated[LANG]);
				currentScope.deployer.selected = platform + '.' + driverName;
				currentScope.deployer.platform = platform;
				currentScope.originalDeployer = currentScope.deployer.selected;
			}
		});
	}

	function changeDeployerType (currentScope) {
		//scope.allowSelect if type is container
		var postData = {
			deployerType: currentScope.deployer.type
		};
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "put",
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

	function updateNamespaceConfig(currentScope, driver) {
		var currentConfig = currentScope.platforms.kubernetes[driver];
		var modal = $modal.open({
			templateUrl: "updateNamespaceConfig.tmpl",
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();

				$scope.title = 'Update Namespace Configuration';
				$scope.namespaces = {
					ui: {
						selection: [
							{ value: 'existing', label: 'Choose Existing Namespace' },
							{ value: 'new', label: 'Create New Namespace' }
						],
						list: [],
						type: [
							{ value: 'global', label: 'Global' },
							{ value: 'perService', label: 'Per Service' }
						]
					},
					data: {
						selection: 'existing',
						default: currentConfig.namespace.default,
						type: ((currentConfig.namespace.perService) ? 'perService' : 'global')
					}
				};

				$scope.reset = function () {
					if ($scope.namespaces.data.selection === 'new') {
						$scope.namespaces.data.default = '';
					}
					else {
						$scope.namespaces.data.default = currentConfig.namespace.default;
					}
				};

				$scope.listNamespaces = function () {
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/cloud/namespaces/list'
					}, function (error, namespaces) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							namespaces.forEach(function (oneNamespace) {
								$scope.namespaces.ui.list.push({ value: oneNamespace.id, label: oneNamespace.name });
							});
						}
					});
				};

				$scope.onSubmit = function () {
					var newConfig = {
						namespace: {
							default: $scope.namespaces.data.default,
							perService: (($scope.namespaces.data.type.value === 'perService') ? true : false)
						}
					};
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/environment/platforms/deployer/update',
						params: {
							env: currentScope.envCode.toLowerCase()
						},
						data: {
							driver: driver,
							config: newConfig
						}
					}, function (error, result) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							$scope.namespaces.data = {};
							modal.close();
							currentScope.displayAlert('success', 'Namespace configuration updated successfully');
							currentScope.listPlatforms(currentScope.envCode);
						}
					});
				};

				$scope.closeModal = function () {
					$scope.namespaces.data = {};
					modal.close();
				};

				$scope.listNamespaces();
			}
		});
	}

	return {
		'listPlatforms': listPlatforms,
		'uploadCerts': uploadCerts,
		'removeCert': removeCert,
		'selectDriver': selectDriver,
		'changeDeployerType': changeDeployerType,
		'updateNamespaceConfig': updateNamespaceConfig
	}

}]);
