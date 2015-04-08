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
				$scope.grid = {
					rows: response
				};

				$scope.grid.actions = {
					'edit': {
						'label': 'Edit',
						'command': function(row) {
							$scope.editProduct(row);
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
			actions: [
				{
					'type': 'submit',
					'label': 'Add Product',
					'btn': 'primary',
					'action': function(formData) {
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
				}]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.editProduct = function(row) {

		var formConfig = {};
		formConfig.form = angular.copy(productizationConfig.form.product);
		formConfig.form.entries[0].type = 'readonly';
		formConfig.name = 'editProduct';
		formConfig.label = 'Edit Product';
		formConfig.timeout = $timeout;

		var keys = Object.keys(row);
		for(var i = 0; i < formConfig.form.entries.length; i++) {
			keys.forEach(function(inputName) {
				if(formConfig.form.entries[i].name === inputName) {
					formConfig.form.entries[i].value = row[inputName];
				}
			});
		}

		formConfig.actions = [
			{
				'type': 'submit',
				'label': 'Edit Product',
				'btn': 'primary',
				'action': function(formData) {
					var postData = {
						'name': formData.name,
						'description': formData.description
					};
					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/product/update",
						"data": postData,
						"params": {"id": row['_id']}
					}, function(error, response) {
						if(error) {
							$scope.$parent.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Product Updated Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listProducts();
						}
					});
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
			}];

		buildFormWithModal($scope, $modal, formConfig);
	};

	$scope.reloadPackages = function(productId) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/packages/list",
			"params": {"id": productId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				for(var i = 0; i < $scope.grid.rows.length; i++) {
					if($scope.grid.rows[i]['_id'] === productId) {
						$scope.grid.rows[i].packages = response;
					}
				}
			}
		});
	};

	$scope.addPackage = function(productId) {
		var options = {
			timeout: $timeout,
			form: productizationConfig.form.package,
			name: 'addPackage',
			label: 'Add New Package',
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': 'Add Package',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'code': formData.code,
							'name': formData.name,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						if(formData.acl) {
							postData.acl = JSON.parse(formData.acl);
						}

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/product/packages/add",
							"data": postData,
							"params": {"id": productId}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Package Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadPackages(productId);
							}
						});
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

	$scope.editPackage = function(productId, data) {
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
			actions: [
				{
					'type': 'submit',
					'label': 'Edit Product',
					'btn': 'primary',
					'action': function(formData) {
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
							"params": {"id": productId, "code": data.code.split("_")[1]}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Package Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadPackages(productId);
							}
						});
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
				$scope.reloadPackages(productId);
			}
		});
	};

	//default operation
	$scope.listProducts();
}]);
