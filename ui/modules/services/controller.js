"use strict";

var servicesApp = soajsApp.components;
servicesApp.controller('servicesCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', function($scope, $timeout, $modal, $compile, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, servicesConfig.permissions);

	$scope.showHide = function(service) {
		if(!service.hide) {
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

	$scope.addService = function() {
		var formConfig = angular.copy(servicesConfig.form.serviceAdd);

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addService',
			label: 'Add Custom Service',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						console.log(formData);
						//todo: complete the code here.
						//getSendDataFromServer($scope, ngDataApi, {
						//	"method": "send",
						//	"routeName": "/dashboard/services/add",
						//	"file": formData.serviceFile
						//}, function(error) {
						//	if(error) {
						//		$scope.form.displayAlert('danger', error.message);
						//	}
						//	else {
						//		$scope.$parent.displayAlert('success', 'Service Data Updated Successfully.');
						//		$scope.modalInstance.close();
						//		$scope.form.formData = {};
						//		$scope.listServices();
						//	}
						//});

						$scope.form.displayAlert('success', "Your service has been Uploaded and Created.");
						jQuery('.modal-content .modal-body table').slideUp();
						jQuery('.modal-content .modal-body').append("<br /><div id='deployServiceDiv'></div>");
						var ele = angular.element(document.getElementById('deployServiceDiv'));
						ele.html("<a href='#/environments' class='btn btn-sm btn-primary'>Click Here to Deploy The Service</a>");
						$compile(ele.contents())($scope);
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

	$scope.editService = function(service) {
		var formConfig = angular.copy(servicesConfig.form.serviceEdit);

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editService',
			label: 'Update Service',
			'data': service,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'requestTimeout': formData.requestTimeout,
							'requestTimeoutRenewal': formData.requestTimeoutRenewal
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

						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/services/update",
							"params": {"name": service.name},
							"data": postData
						}, function(error) {
							if(error) {
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

	$scope.listServices = function() {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var l = response.length;
				for(var x = 0; x < l; x++) {
					if(response[x].apis) {
						response[x].fixList = $scope.arrGroupByField(response[x].apis, 'group');
					}
				}
				$scope.grid = {
					rows: response
				};
			}
		});
	};

	$scope.arrGroupByField = function(arr, f) {
		var result = {};
		var l = arr.length;
		var g = 'General';
		for(var i = 0; i < l; i++) {
			if(arr[i][f]) {
				g = arr[i][f];
			}
			if(!result[g]) {
				result[g] = {};
				result[g].apis = [];
			}
			if(arr[i].groupMain === true) {
				result[g]['defaultApi'] = arr[i].v;
			}
			result[g].apis.push(arr[i]);
		}

		var label;
		for(label in result) {
			if(result.hasOwnProperty(label)) {
				if(result[label].apis) {
					var v = result[label].apis.length / 2;
					var c = Math.ceil(v);
					result[label].apis1 = result[label].apis.slice(0, c);
					result[label].apis2 = result[label].apis.slice(c, l);
				}
			}
		}
		return result;
	};

	if($scope.access.listServices) {
		$scope.listServices();
	}

}]);