"use strict";
var productizationApp = soajsApp.components;
productizationApp.controller('productCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $routeParams, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, productizationConfig.permissions);

	$scope.viewPackage = function (pack) {
		pack.showDetails = true;
	};
	$scope.closePackage = function (pack) {
		pack.showDetails = false;
	};

	$scope.listProducts = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
			}
			else {
				for (var i = 0; i < response.length; i++) {
					if (response[i].locked) {
						var lockedProd = response[i];
						response.splice(i, 1);
						response.unshift(lockedProd);
					}
				}
				$scope.grid = {
					rows: response
				};

				$scope.grid.actions = {
					'edit': {
						'label': translation.edit[LANG],
						'command': function (row) {
							$scope.editProduct(row);
						}
					},
					'delete': {
						'label': translation.remove[LANG],
						'commandMsg': translation.areYouSureWantRemoveProduct[LANG],
						'command': function (row) {
							$scope.removeProduct(row);
						}
					}
				};
			}
		});
	};

	$scope.removeProduct = function (row) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/delete",
			"params": {"id": row._id}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
			}
			else {
				$scope.$parent.displayAlert('success', translation.productRemovedSuccessfully[LANG]);
				$scope.listProducts();
			}
		});
	};

	$scope.addProduct = function () {
		var options = {
			timeout: $timeout,
			form: productizationConfig.form.product,
			type: 'product',
			name: 'addProduct',
			label: translation.addNewProduct[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.addProduct[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'code': formData.code,
							'name': formData.name,
							'description': formData.description
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/product/add",
							"data": postData
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard');
							}
							else {
								$scope.$parent.displayAlert('success', translation.productAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listProducts();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.editProduct = function (row) {

		var formConfig = {};
		formConfig.form = angular.copy(productizationConfig.form.product);
		formConfig.form.entries[0].type = 'readonly';
		formConfig.name = 'editProduct';
		formConfig.label = translation.editProduct[LANG];
		formConfig.timeout = $timeout;

		var keys = Object.keys(row);
		for (var i = 0; i < formConfig.form.entries.length; i++) {
			keys.forEach(function (inputName) {
				if (formConfig.form.entries[i].name === inputName) {
					formConfig.form.entries[i].value = row[inputName];
				}
			});
		}

		formConfig.actions = [
			{
				'type': 'submit',
				'label': translation.editProduct[LANG],
				'btn': 'primary',
				'action': function (formData) {
					var postData = {
						'name': formData.name,
						'description': formData.description
					};
					getSendDataFromServer($scope, ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/product/update",
						"data": postData,
						"params": {"id": row['_id']}
					}, function (error) {
						if (error) {
							$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
						}
						else {
							$scope.$parent.displayAlert('success', translation.productUpdatedSuccessfully[LANG]);
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listProducts();
						}
					});
				}
			},
			{
				'type': 'reset',
				'label': translation.cancel[LANG],
				'btn': 'danger',
				'action': function () {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}];

		buildFormWithModal($scope, $modal, formConfig);
	};

	$scope.reloadPackages = function (productId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/packages/list",
			"params": {"id": productId}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
			}
			else {
				for (var i = 0; i < $scope.grid.rows.length; i++) {
					if ($scope.grid.rows[i]['_id'] === productId) {
						$scope.grid.rows[i].packages = response;
					}
				}
			}
		});
	};

	$scope.addPackage = function (productId) {
		var formConf = angular.copy(productizationConfig.form.package);
		formConf.entries.forEach(function (oneEn) {
			if (oneEn.type === 'select') {
				oneEn.value[0].selected = true;
			}
		});

		var options = {
			timeout: $timeout,
			form: formConf,
			name: 'addPackage',
			label: translation.addNewPackage[LANG],
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': translation.addPackage[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'code': formData.code,
							'name': formData.name,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};

						postData.acl = {};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/product/packages/add",
							"data": postData,
							"params": {"id": productId}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard');
							}
							else {
								$scope.$parent.displayAlert('success', translation.productAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.$parent.$emit('reloadProducts', {});
								$scope.reloadPackages(productId);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
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

	$scope.editPackAcl = function (productId, code) {
		$scope.$parent.go("/productization/" + productId + "/editAcl/" + code);
	};

	$scope.editPackage = function (productId, data) {
		var formConfig = angular.copy(productizationConfig.form.package);
		var recordData = angular.copy(data);
		delete recordData.acl;
		recordData._TTL = recordData._TTL / 3600000;

		formConfig.entries[0].type = 'readonly';
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editPackage',
			label: translation.editPackage[LANG],
			data: recordData,
			actions: [
				{
					'type': 'submit',
					'label': translation.editPackage[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'name': formData.name,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						postData.acl = data.acl;
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/product/packages/update",
							"data": postData,
							"params": {"id": productId, "code": data.code.split("_")[1]}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard');
							}
							else {
								$scope.$parent.displayAlert('success', translation.productUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadPackages(productId);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
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

	$scope.removeProductPackage = function (productId, packageCode) {
		packageCode = packageCode.split("_")[1];
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/packages/delete",
			"params": {"id": productId, "code": packageCode}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
			}
			else {
				$scope.$parent.displayAlert('success', translation.selectedPackageRemoved[LANG]);
				$scope.reloadPackages(productId);
			}
		});
	};

	//default operation
	if ($scope.access.listProduct) {
		$scope.listProducts();
	}

	injectFiles.injectCss("modules/productization/productization.css");
}]);

productizationApp.controller('aclCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', function ($scope, $routeParams, ngDataApi, aclHelpers) {
	$scope.$parent.isUserLoggedIn();

	$scope.environments_codes = [];
	$scope.allServiceApis = [];
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};

	$scope.minimize = function (envCode, service) {
		$scope.aclFill[envCode][service.name].collapse = true;
	};

	$scope.expand = function (envCode, service) {
		$scope.aclFill[envCode][service.name].collapse = false;
	};

	$scope.selectService = function (envCode, service) {
		$scope.aclFill[envCode][service.name].collapse = !$scope.aclFill[envCode][service.name]['include'];
	};

	$scope.getPackageAcl = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/get",
			"params": {"id": $routeParams.pid}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
			}
			else {
				var code = $routeParams.code;
				for (var x = 0; x < response.packages.length; x++) {
					if (response.packages[x].code === code) {
						$scope.currentPackage = angular.copy(response.packages[x]);
						$scope.currentPackage._TTL = (response.packages[x]._TTL / 3600000).toString();
						break;
					}
				}

				$scope.aclFill = angular.copy($scope.currentPackage.acl);
				$scope.$evalAsync(function ($scope) {

					aclHelpers.fillAcl($scope);
				});
			}
		});
	};

	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": {"short": true}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
			}
			else {
				$scope.environments_codes = response;
				$scope.getPackageAcl();
			}
		});
	};

	//default operation
	$scope.getAllServicesList = function () {
		var serviceNames = [];
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list",
			"data": {"serviceNames": serviceNames}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
			}
			else {
				response.forEach(function (serv) {
					serv.fixList = aclHelpers.groupApisForDisplay(serv.apis, 'group');
					delete serv.apis;
				});

				$scope.allServiceApis = response;
				$scope.getEnvironments();
			}
		});
	};

	$scope.saveACL = function () {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		postData.acl = aclHelpers.constructAclFromPost($scope.aclFill);

		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/product/packages/update",
			"data": postData,
			"params": {"id": productId, "code": postData.code.split("_")[1], '_TTL': postData._TTL}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
			}
			else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
			}
		});
	};

	$scope.checkForGroupDefault = function (envCode, service, grp, val, myApi) {
		aclHelpers.checkForGroupDefault($scope, envCode, service, grp, val, myApi);
	};

	$scope.applyRestriction = function (envCode, service) {
		aclHelpers.applyPermissionRestriction($scope, envCode, service);
	};

	// default operation
	overlayLoading.show(function () {
		$scope.getAllServicesList();
	});
}]);
