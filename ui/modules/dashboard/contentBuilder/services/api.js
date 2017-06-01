"use strict";
var cbAPIService = soajsApp.components;
cbAPIService.service('cbAPIHelper', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

	/*
	 Step 4
	 */
	function buildAPIData(currentScope, formData) {
		if(Array.isArray(formData.type)){ formData.type = formData.type[0]; }
		if(Array.isArray(formData.method)){ formData.method = formData.method[0]; }

		var gcAPI = {
			"_apiInfo": {
				"l": formData.label,
				"group": formData.group
			}
		};
		if(formData.groupMain && formData.groupMain === "true") { gcAPI._apiInfo.groupMain = true; }
		if(formData.inputs && Object.keys(formData.inputs).length > 0) { gcAPI.commonFields = formData.inputs; }


		var wfAPI = {
			"method": formData.method,
			"mw": {'code': formData.code},
			"type": formData.type,
			"workflow": {}
		};

		switch(formData.type.toLowerCase()) {
			case 'get':
			case 'delete':
				if(!gcAPI.commonFields) { gcAPI.commonFields = []; }

				if(gcAPI.commonFields.indexOf("id") === -1) {
					gcAPI.commonFields.push('id');
				}
				break;
			case 'add':
				wfAPI.mw.model = 'add';
				break;
			case 'update':
				if(!gcAPI.commonFields) {
					gcAPI.commonFields = [];
				}

				if(gcAPI.commonFields.indexOf("id") === -1) {
					gcAPI.commonFields.push('id');
				}
				wfAPI.mw.model = 'update';
				break;
		}

		if(formData.initialize && formData.initialize !== '') {
			wfAPI.workflow.initialize = formData.initialize;
		}

		if(formData.preExec && formData.preExec !== '') {
			wfAPI.workflow.preExec = formData.preExec;
		}

		if(formData.exec && formData.exec !== '') {
			wfAPI.workflow.exec = formData.exec;
		}

		if(formData.postExec && formData.postExec !== '') {
			wfAPI.workflow.postExec = formData.postExec;
		}

		if(formData.response && formData.response !== '') {
			wfAPI.workflow.response = formData.response;
		}
		currentScope.config.genericService.config.schema[formData.route] = gcAPI;
		currentScope.config.soajsService.apis[formData.route] = wfAPI;
	}

	function addAPI(currentScope, cb) {
		$modal.open({
			templateUrl: "APIForm.html",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function($scope, $modalInstance) {
				var elms = angular.copy(cbConfig.form.step4);
				var data = getErrorsAndInputsValues(elms);
				var options = {
					timeout: $timeout,
					entries: elms,
					data: data,
					name: 'addAPI',
					label: translation.addNewAPI[LANG],
					actions: []
				};
				buildForm($scope, null, options);

				$scope.done = function() {
					var formData = $scope.form.formData;
					if(!formData.route) {
						$scope.form.displayAlert('danger', translation.enterRouteValueApiProceed[LANG]);
						return false;
					} else if(formData.method.length === 0) {
						$scope.form.displayAlert('danger', translation.enterAPImethodProceed[LANG]);
						return false;
					} else if(formData.type.length === 0) {
						$scope.form.displayAlert('danger', translation.enterAPItypeProceed[LANG]);
						return false;
					} else if(!formData.code) {
						$scope.form.displayAlert('danger', translation.enterErrorCodeProceed[LANG]);
						return false;
					} else if(!formData.label) {
						$scope.form.displayAlert('danger', translation.enterAPIlabelProceed[LANG]);
						return false;
					} else if(!formData.group) {
						$scope.form.displayAlert('danger', translation.enterAPIgroupProceed[LANG]);
						return false;
					} else if(formData.groupMain.length === 0) {
						$scope.form.displayAlert('danger', translation.enterAPIgroupMainProceed[LANG]);
						return false;
					} else {
						var allowedErrorCodes = JSON.parse(formData.codeValues);
						allowedErrorCodes = Object.keys(allowedErrorCodes);
						if(allowedErrorCodes.indexOf(formData.code.toString()) === -1){
							$scope.form.displayAlert('danger', translation.errorCodeYouEnteredAPIInvalid[LANG]);
						}
						else {
							buildAPIData(currentScope, formData);
							currentScope.validateStep4();
							$modalInstance.close();
						}
					}
				};

				$scope.cancel = function() {
					$modalInstance.dismiss('cancel');
				};

				if(cb && typeof(cb) === 'function'){ cb(); }
			}
		});

		function getErrorsAndInputsValues(elms) {
			var data = {};
			data['codeValues'] = JSON.stringify(currentScope.config.genericService.config.errors, null, 2);
			data['group'] = currentScope.config.name;
			var inputs = Object.keys(currentScope.config.genericService.config.schema.commonFields);
			inputs.forEach(function(oneInput) {
				var label = oneInput;
				currentScope.config.soajsUI.form.add.forEach(function(formFields) {
					if(formFields.name === oneInput) {
						label = formFields.label;
					}
				});

				var t = {'v': oneInput, "l": label};
				elms.forEach(function(groups) {
					if(groups.name === 'inputsGroup') {
						groups.entries[0].value.push(t);
					}
				});
			});

			return (Object.keys(data).length > 0) ? data : null;
		}
	}

	function editAPI(currentScope, APIName, APIInfo, cb) {
		$modal.open({
			templateUrl: "APIForm.html",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function($scope, $modalInstance) {
				var elms = angular.copy(cbConfig.form.step4);
				var data = getErrorsInputsAndFillForm(elms);
				var options = {
					timeout: $timeout,
					entries: elms,
					data: data,
					name: 'addAPI',
					label: translation.addNewAPI[LANG],
					actions: []
				};
				buildForm($scope, null, options);

				$scope.done = function() {
					var formData = $scope.form.formData;
					
					if(!formData.route) {
						$scope.form.displayAlert('danger', translation.enterRouteValueApiProceed[LANG]);
						return false;
					} else if(formData.method.length === 0) {
						$scope.form.displayAlert('danger', translation.enterAPImethodProceed[LANG]);
						return false;
					} else if(formData.type.length === 0) {
						$scope.form.displayAlert('danger', translation.enterAPItypeProceed[LANG]);
						return false;
					} else if(!formData.code) {
						$scope.form.displayAlert('danger', translation.enterErrorCodeProceed[LANG]);
						return false;
					} else if(!formData.label) {
						$scope.form.displayAlert('danger', translation.enterAPIlabelProceed[LANG]);
						return false;
					} else if(!formData.group) {
						$scope.form.displayAlert('danger', translation.enterAPIgroupProceed[LANG]);
						return false;
					} else if(formData.groupMain.length === 0) {
						$scope.form.displayAlert('danger', translation.enterAPIgroupMainProceed[LANG]);
						return false;
					} else{
						var allowedErrorCodes = JSON.parse(formData.codeValues);
						allowedErrorCodes = Object.keys(allowedErrorCodes);
						if(allowedErrorCodes.indexOf(formData.code.toString()) === -1){
							$scope.form.displayAlert('danger', translation.errorCodeYouEnteredAPIInvalid[LANG]);
						}
						else {
							buildAPIData(currentScope, formData);
							currentScope.validateStep4();
							$modalInstance.close();
						}
					}
				};

				$scope.cancel = function() {
					$modalInstance.dismiss('cancel');
				};

				if(cb && typeof(cb) === 'function'){ cb(); }
			}
		});

		function getErrorsInputsAndFillForm(elms) {
			var gcInfo = currentScope.config.genericService.config.schema[APIName];
			var data = {
				"route": APIName,
				"label": gcInfo._apiInfo.l,
				"group": gcInfo._apiInfo.group,
				"groupMain": gcInfo._apiInfo.groupMain || false,

				"inputs": gcInfo.commonFields || null,

				"method": APIInfo.method,
				"code": APIInfo.mw.code,
				"type": APIInfo.type,

				"initialize": (APIInfo.workflow && APIInfo.workflow.initialize) ? APIInfo.workflow.initialize : null,
				"preExec": (APIInfo.workflow && APIInfo.workflow.preExec) ? APIInfo.workflow.preExec : null,
				"exec": (APIInfo.workflow && APIInfo.workflow.exec) ? APIInfo.workflow.exec : null,
				"postExec": (APIInfo.workflow && APIInfo.workflow.postExec) ? APIInfo.workflow.postExec : null,
				"response": (APIInfo.workflow && APIInfo.workflow.response) ? APIInfo.workflow.response : null
			};
			data['codeValues'] = JSON.stringify(currentScope.config.genericService.config.errors, null, 2);

			var inputs = Object.keys(currentScope.config.genericService.config.schema.commonFields);
			inputs.forEach(function(oneInput) {
				var label = oneInput;
				currentScope.config.soajsUI.form.add.forEach(function(formFields) {
					if(formFields.name === oneInput) {
						label = formFields.label;
					}
				});

				var t = {'v': oneInput, "l": label};
				elms.forEach(function(groups) {
					if(groups.name === 'inputsGroup') {
						groups.entries[0].value.push(t);
					}
				});
			});

			return (Object.keys(data).length > 0) ? data : null;
		}
	}

	function removeAPI(currentScope, APIName) {
		delete currentScope.config.genericService.config.schema[APIName];
		delete currentScope.config.soajsService.apis[APIName];
		currentScope.validateStep4();
	}

	function colorInputs(){
		$timeout(function(){
			var errorCodes = jQuery(".wizardForm #codeValues").val();
			errorCodes = JSON.parse(errorCodes);
			var str = "";
			for(var err in errorCodes){
				str += "<li><b>"+err+"</b>:&nbsp;"+errorCodes[err]+"</li>"
			}
			str = "<ul class='apiErrorCodes'>"+str+"</ul>";
			jQuery(".wizardForm #codeValues-wrapper").html(str).show();

			jQuery(".wizardForm #inputs-wrapper ul li").addClass('APIInputBox');
		}, 1000);
	}

	return {
		'addAPI': addAPI,
		'editAPI': editAPI,
		'removeAPI': removeAPI,
		'colorInputs': colorInputs
	}
}]);
