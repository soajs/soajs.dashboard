"use strict";
var productizationApp = soajsApp.components;
productizationApp.controller('productCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$compile', 'ngDataApi', function($scope, $timeout, $modal, $routeParams,$compile, ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.viewPackage = function(pack) {
		pack.showDetails = true;
	};
	$scope.closePackage = function(pack) {
		pack.showDetails = false;
	};

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
		var formConf = angular.copy(productizationConfig.form.package);
		formConf.entries.forEach(function(oneEn) {
			if(oneEn.type==='select'){
				oneEn.value[0].selected=true;
			}
		});

		var options = {
			timeout: $timeout,
			form: formConf,
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

						postData.acl = {};
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
								$scope.$parent.$emit('reloadProducts', {});
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

	$scope.editPackAcl = function(productId, code) {
		$scope.$parent.go("/productization/"+productId+"/editAcl/" + code );
	};

	$scope.editPackage = function(productId, data) {
		var formConfig = angular.copy(productizationConfig.form.package);
		var recordData = angular.copy(data);
		delete recordData.acl;
		recordData._TTL = recordData._TTL / 3600000;

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
					'label': 'Edit Package',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'name': formData.name,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						postData.acl = data.acl;
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

productizationApp.controller('aclCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$compile', 'ngDataApi', function($scope, $timeout, $modal, $routeParams,$compile, ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	$scope.minimize =function(service){
		$scope.aclFill.services[service.name].collapse = true;
	};
	$scope.expand =function(service){
		$scope.aclFill.services[service.name].collapse = false;
	};
	$scope.allServiceApis=[];
	$scope.aclFill={};
	$scope.aclFill.services={};
	$scope.currentPackage = {};

	$scope.selectService = function( service, index) {
		if( $scope.aclFill.services[service.name]['include'])
		{
			$scope.aclFill.services[service.name].collapse = false;
		}
		else{
			$scope.aclFill.services[service.name].collapse = true;
		}
	};

	$scope.getPackageAcl = function() {
		var productId=  $routeParams.pid;

		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/get",
			"params": { "id": $routeParams.pid }
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var code = $routeParams.code;

				var l = response.packages.length;
				for (var x = 0; x<l; x++)
				{
					if(response.packages[x].code === code)
					{
						$scope.currentPackage = angular.copy(response.packages[x]);
						$scope.currentPackage._TTL = ($scope.currentPackage._TTL / 3600000).toString();
						break;
					}
				}

				$scope.aclFill.services= angular.copy($scope.currentPackage.acl);
				for(var propt in $scope.aclFill.services)
				{
					var s = $scope.aclFill.services[propt];
					s.include =true;
					s.collapse = false;

					if(s.access)
					{
						if( s.access===true){
							s.accessType = 'private';
						}
						else if( s.access===false){
							s.accessType = 'public';
						}
						else if( Array.isArray(s.access) && (s.access.indexOf('administrator')>-1 )){
							s.accessType = 'admin';
						}
					}
					else{
						s.accessType = 'public';
					}

					if(s.apisPermission==='restricted'){
						s.apisRestrictPermission = true;
					}
					if(s.apis){
						for(var ap in s.apis)
						{
							s.apis[ap].include=true;
							s.apis[ap].accessType = 'clear';

							if( s.apis[ap].access==true)
							{
								s.apis[ap].accessType = 'private';
							}
							else if( s.apis[ap].access===false)
							{
								s.apis[ap].accessType = 'public';
							}
							else{
								if(Array.isArray(s.apis[ap].access) && (s.apis[ap].access.indexOf('administrator')>-1) ){
									s.apis[ap].accessType = 'admin';
								}
							}
						}
					}
				}
			}
		});
	};

	//default operation
	$scope.getAllServicesList = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list",
			"data": { "serviceNames":["oauth","urac", "dashboard" ] }
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				response.forEach(function(serv) {
					serv.fixList = $scope.groupArrBy( serv.apis , 'group');
				});

				$scope.allServiceApis = response;
				$scope.getPackageAcl();
			}
		});
	};

	$scope.groupArrBy = function(arr, f) {
		var result = {} ;
		var l = arr.length;
		var g = 'General' ;
		for(var i=0; i<l; i++)
		{
			if(arr[i][f])
			{
				g = arr[i][f];
			}
			if(!result[g])
			{
				result[g]={};
				result[g].apis=[];
			}
			if(arr[i].groupMain === true ){
				result[g]['defaultApi'] =arr[i].v;
			}
			result[g].apis.push(arr[i]);
		}
		return result;
	};

	$scope.saveACL=function(){
		var productId=  $routeParams.pid;
		var postData = $scope.currentPackage ;
		var aclObj={};

		for(var propt in $scope.aclFill.services)
		{
			var s = angular.copy($scope.aclFill.services[propt]);

			if(s.include===true)
			{
				aclObj[propt]={};
				aclObj[propt].apis={};

				if(s.accessType==='private'){
					aclObj[propt].access=true;
				}
				else if(s.accessType==='admin'){
					aclObj[propt].access= ['administrator'];
				}
				else{
					aclObj[propt].access=false;
				}

				if(s.apisRestrictPermission ===true ){
					aclObj[propt].apisPermission ='restricted';
				}

				if(s.apis)
				{

					for(var ap in s.apis){
						var api = s.apis[ap];

						if( ( s.apisRestrictPermission=== true && api.include===true) || (!s.apisRestrictPermission ) )
						{
							/// need to also check for the default api if restricted
							aclObj[propt].apis[ap]={};
							if(api.accessType==='private'){
								aclObj[propt].apis[ap].access=true;
							}
							else if(api.accessType==='public'){
								aclObj[propt].apis[ap].access=false;
							}
							else if(api.accessType==='admin'){
								aclObj[propt].apis[ap].access=['administrator'];
							}
						}
					}
				}
			}
		}

		postData.acl =aclObj;

		getSendDataFromServer( ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/product/packages/update",
			"data": postData,
			"params": {"id": productId, "code": postData.code.split("_")[1]}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'ACL Updated Successfully.');
			}
		});

	};

	$scope.checkForGroupDefault=function(service,grp,val,myApi) {
		var defaultApi = service.fixList[grp]['defaultApi'];
		if(myApi.groupMain===true){
			if( $scope.aclFill.services[service.name].apis ) {
				if (($scope.aclFill.services[service.name].apis[defaultApi]) && $scope.aclFill.services[service.name].apis[defaultApi].include !== true) {
					val.apis.forEach(function( one ) {
						if($scope.aclFill.services[service.name].apis[one.v])
						{
							$scope.aclFill.services[service.name].apis[one.v].include=false;
						}
					});

				}
			}
		}

	};

	$scope.applyRestriction=function(service){
		if( $scope.aclFill.services[service.name].apisRestrictPermission===true ){
			for(var grpLabel in service.fixList )
			{
				var defaultApi = service.fixList[grpLabel]['defaultApi'];
				if( $scope.aclFill.services[service.name].apis )
				{
					var apisList = service.fixList[grpLabel]['apis'];
					if ((!$scope.aclFill.services[service.name].apis[defaultApi]) || $scope.aclFill.services[service.name].apis[defaultApi].include !== true)
					{
						apisList.forEach(function( oneApi ) {
							if($scope.aclFill.services[service.name].apis[oneApi.v])
							{
								$scope.aclFill.services[service.name].apis[oneApi.v].include=false;
							}
						});
					}
				}
			}
		}
	};

	// default operation
	$scope.getAllServicesList();
}]);
