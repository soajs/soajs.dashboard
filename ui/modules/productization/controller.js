"use strict";
var productizationApp = soajsApp.components;
productizationApp.controller('productCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.listProducts = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var total = Math.ceil(response.length / 3);
				$scope.grid = {
					rows: new Array(total)
				};

				for(var i = 0; i < total; ++i) {
					$scope.grid.rows[i] = response.slice(i * 3, (i + 1) * 3);
				}

				$scope.grid.actions = {
					'edit': {
						'label': 'Edit',
						'command': function(row) {
							$scope.$parent.go("/productization/edit/" + row._id);
						}
					},
					'delete': {
						'label': 'Remove',
						'commandMsg': "Are you sure you want to remove this product ?",
						'command': function(row) {
							$scope.removeProduct(row);
						}
					}
				};
			}
		});
	};

	$scope.removeProduct = function(row) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/delete",
			"params": {"id": row._id}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Product removed successfully.");
				$scope.listProducts();
			}
		});
	};

	$scope.addProduct = function() {
		var options = {
			timeout: $timeout,
			form: productizationConfig.form.product,
			type: 'product',
			name: 'addProduct',
			label: 'Add New Product',
			actions: {
				submit: function(formData) {
					var postData = {
						'code': formData.code,
						'name': formData.name,
						'description': formData.description
					};
					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/product/add",
						"data": postData
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Product Added Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listProducts();
						}
					});
				},
				cancel: function() {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.editProduct = function() {

		var productId = $routeParams.id;
		if(!productId) {
			$scope.$parent.displayAlert('danger', 'Invalid Product Id Provided.');
			$scope.$parent.go("/productization");
		}

		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/get",
			"params": {'id': productId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
				$scope.$parent.go("/productization");
			}
			else {
				var formConfig = angular.copy(productizationConfig.form.product);
				formConfig.entries[0].type = 'readonly';
				formConfig.name = 'editProduct';
				formConfig.label = 'Edit Product';
				formConfig.timeout = $timeout;

				var keys = Object.keys(response);
				for(var i = 0; i < formConfig.entries.length; i++) {
					keys.forEach(function(inputName) {
						if(formConfig.entries[i].name === inputName) {
							formConfig.entries[i].value = response[inputName];
						}
					});
				}

				formConfig.actions = {
					submit: function(formData) {
						var postData = {
							'name': formData.name,
							'description': formData.description
						};
						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/product/update",
							"data": postData,
							"params": {"id": productId}
						}, function(error, response) {
							if(error) {
								$scope.$parent.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Product Upated Successfully.');
								$scope.$parent.go("/productization/edit/" + productId);
							}
						});
					}
				};

				buildForm($scope, false, formConfig);
				$scope.$parent.$emit('listPackages', {'productRecord': response.packages});
			}
		});
	};

	$scope.removeProductPackage = function(productId, packageCode) {
		packageCode = packageCode.split("_")[1];
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/packages/delete",
			"params": {"id": productId, "code": packageCode}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Selected Package has been removed.");
				$scope.listProducts();
			}
		});
	};

	//default operation
	$scope.listProducts();
}]);

productizationApp.controller('productPackagesCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.listPackages = function(packagesList) {
		//print the grid of packages
		var options = {
			grid: productizationConfig.grid.package,
			data: packagesList,
			defaultSortField: 'code',
			left: [{
				'label': 'Edit',
				'icon': 'edit',
				'handler': 'editPackage'
			}, {
				'label': 'Remove',
				'icon': 'remove',
				'msg': "Are you sure you want to remove this package?",
				'handler': 'removePackage'
			}],
			top: [{
				'label': 'Remove',
				'msg': "Are you sure you want to remove the selected package(s)?",
				'handler': 'removeMultiplePackages'
			}]
		};
		buildGrid($scope, options);
	};

	$scope.reloadPackages = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/packages/list",
			"params": {"id": $routeParams.id}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.listPackages(response);
			}
		});
	};

	$scope.addPackage = function() {
		var options = {
			timeout: $timeout,
			form: productizationConfig.form.package,
			name: 'addPackage',
			label: 'Add New Package',
			sub: true,
			actions: {
				submit: function(formData) {
					var postData = {
						'code': formData.code,
						'name': formData.name,
						'description': formData.description,
						'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
					};
					if(formData.acl) {
						postData.acl = JSON.parse(formData.acl);
					}

					console.log(postData);
					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/product/packages/add",
						"data": postData,
						"params": {"id": $routeParams.id}
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Package Added Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.reloadPackages();
						}
					});
				},
				cancel: function() {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.editPackage = function(data) {
		var formConfig = angular.copy(productizationConfig.form.package);
		var recordData = angular.copy(data);
		recordData._TTL = recordData._TTL / 3600;
		recordData.acl = (recordData.acl) ? JSON.stringify(recordData.acl, null, "\t") : "{\n}";
		formConfig.entries[0].type = 'readonly';
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editPackage',
			label: 'Edit Package',
			data: recordData,
			actions: {
				submit: function(formData) {
					var postData = {
						'name': formData.name,
						'description': formData.description,
						'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
					};
					if(formData.acl) {
						postData.acl = JSON.parse(formData.acl);
					}

					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/product/packages/update",
						"data": postData,
						"params": {"id": $routeParams.id, "code": data.code.split("_")[1]}
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Package Updated Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.reloadPackages();
						}
					});
				},
				cancel: function() {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.removePackage = function(data) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/packages/delete",
			"params": {"id": $routeParams.id, "code": data.code.split("_")[1]}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Selected Package has been removed.");
				$scope.reloadPackages();
			}
		});
	};

	$scope.removeMultiplePackages = function() {
		var config = {
			'routeName': "/dashboard/product/packages/delete",
			"params": {'id': $routeParams.id, 'code': '%code%'},
			"override": {
				"fieldName": "code",
				"fieldReshape": function(value) {
					return value.split("_")[1];
				}
			},
			'msg': {
				'error': 'one or more of the selected Package(s) status was not removed.',
				'success': 'Selected Package(s) has been removed.'
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function(valid) {
			$scope.reloadPackages();
		});
	};

	$scope.$parent.$on('listPackages', function(event, args) {
		$scope.listPackages(args.productRecord);
	});
}]);
