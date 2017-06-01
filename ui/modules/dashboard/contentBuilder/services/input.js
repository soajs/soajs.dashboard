"use strict";
var cbInputService = soajsApp.components;
cbInputService.service('cbInputHelper', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

	/*
	 Step 2
	 */
	function buildListinUI(currentScope, formData, machineName, force) {
		if(force || (formData.listing && formData.listing[0] === 'yes')) {
			var listing = {'label': formData.label, 'name': machineName, 'field': 'fields.' + machineName};
			if(formData.filter) {
				if(Array.isArray(formData.filter) && formData.filter.length > 0) {
					listing.filter = formData.filter[0];
				}
				else {
					listing.filter = formData.filter;
				}
			}

			if(listing.filter === []){
				delete listing.filter;
			}
			var found = false;
			for(var i = 0; i < currentScope.config.soajsUI.list.columns.length; i++) {
				if(currentScope.config.soajsUI.list.columns[i].name === listing.name) {
					currentScope.config.soajsUI.list.columns[i] = listing;
					found = true;
					break;
				}
			}
			if(!found) {
				currentScope.config.soajsUI.list.columns.push(listing);
			}

			if(formData.sorting[0] === 'yes') {
				currentScope.config.soajsUI.list.defaultSortField = machineName;
			}

			if(formData.sortDirection) {
				currentScope.config.soajsUI.list.defaultSortASC = (formData.sortDirection === 'desc');
			}
		}
	}

	function buildFormUI(currentScope, formData, machineName) {
		var formType;
		if(Array.isArray(formData.type) && formData.type.length > 0) {
			formType = formData.type[0];
		}
		else if(formData.type !== '') {
			formType = formData.type;
		}
		if(formType) {
			var form = {
				'name': machineName,
				'label': formData.label,
				'_type': formType,
				'placeholder': formData.placeholder || '',
				'tooltip': formData.tooltip || '',
				'req': (formData.required === 'true'? true: false),
				'value': populateValue(formType, formData.defaultValue),
				'limit': parseInt(formData.limit)
			};


			var found = false;
			for(var i = 0; i < currentScope.config.soajsUI.form.add.length; i++) {
				if(currentScope.config.soajsUI.form.add[i].name === form.name) {
					currentScope.config.soajsUI.form.add[i] = form;
					found = true;
					break;
				}
			}
			if(found) {
				for(i = 0; i < currentScope.config.soajsUI.form.add.length; i++) {
					if(currentScope.config.soajsUI.form.add[i].name === form.name) {
						currentScope.config.soajsUI.form.add[i] = form;
						break;
					}
				}
			}
			else {
				currentScope.config.soajsUI.form.add.push(form);
			}
			currentScope.config.soajsUI.form.update = angular.copy(currentScope.config.soajsUI.form.add);
		}
	}

	function buildIMFV(currentScope, formData, machineName) {
		if(formData.imfv) {
			var imfv = formData.imfv;
			if(typeof(imfv) === 'string'){
				imfv = JSON.parse(imfv);
			}
			var imfv2 = {
				"req": ( ((formData.required === 'true') || formData.required[0] === true) ? true : false),
				"source": ["body." + machineName],
				"validation": imfv
			};
			currentScope.config.genericService.config.schema.commonFields[machineName] = imfv2;
		}
	}

	function populateValue(type, defaultValue) {
		var array = ['radio', 'checkbox', 'select', 'multi-select'];
		if(array.indexOf(type) === -1) {
			return defaultValue;
		}
		else {
			var defaults = [];
			defaultValue = defaultValue.split("--");
			defaultValue.forEach(function(oneDefaultValue) {
				oneDefaultValue = oneDefaultValue.trim().split("||");
				var oneValue = {
					'v': oneDefaultValue[1],
					'l': oneDefaultValue[0]
				};
				if(oneDefaultValue[2] === 'selected') {
					oneValue.selected = true;
				}
				defaults.push(oneValue);
			});
			return defaults;
		}
	}

	function rebuildDefaultValue(type, array) {
		var types = ['radio', 'checkbox', 'select', 'multi-select'];
		if(types.indexOf(type) === -1) {
			return array;
		}
		else {
			var str = [];
			array.forEach(function(oneObject) {
				var t = oneObject.l + "||" + oneObject.v;
				if(oneObject.selected) {
					t += "||selected";
				}
				str.push(t);
			});
			str = str.join(" -- ");
			return str;
		}
	}

	function addInput(currentScope) {
		$modal.open({
			templateUrl: "addInputForm.html",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function($scope, $modalInstance) {
				$scope.input = {};
				var options = {
					timeout: $timeout,
					entries: {},
					name: 'addInput',
					label: '',
					actions: []
				};

				$scope.userInput = function() {
					var op = angular.copy(options);
					op.label = translation.addNewUserInput[LANG];
					op.entries = angular.copy(cbConfig.form.step2.user);
					$scope.input = {};
					$scope.input.user = angular.extend($scope);
					buildForm($scope.input.user, null, op);
				};

				$scope.computedInputUI = function() {
					var op = angular.copy(options);
					op.label = translation.addNewComputedUIInput[LANG];
					op.entries = angular.copy(cbConfig.form.step2.computedUI);
					$scope.input = {};
					$scope.input.computedUI = angular.extend($scope);
					buildForm($scope.input.computedUI, null, op);
				};

                $scope.fileInputUI = function() {
                    var op = angular.copy(options);
                    op.label = "Add New File Input";
                    op.entries = angular.copy(cbConfig.form.step2.fileUI);
                    $scope.input = {};
                    $scope.input.fileUI = angular.extend($scope);
                    buildForm($scope.input.fileUI, null, op);
                };

				$scope.done = function() {
					var inputType = Object.keys($scope.input)[0];
					var formData = $scope.input[inputType].form.formData;

					if(!formData.label) {
						$scope.form.displayAlert('danger', translation.enterLabelForInputProceed[LANG]);
						return false;
					}   else {
						var machineName = formData.label.toLowerCase().trim().replace(/\s/g, "_");
						if(currentScope.config.genericService.config.schema.commonFields[machineName]) {
							$scope.form.displayAlert('danger', translation.youAlreadyHaveInputNamed[LANG] + " " + formData.label);
						}
						else {
							if(inputType === 'computedUI') {
								buildListinUI(currentScope, formData, machineName, true);
							}

							if(inputType === 'user') {
								try {
									if(typeof(formData['imfv']) === 'string'){
									formData['imfv'] = JSON.parse(formData['imfv']);
									}
								}
								catch (e){
									$scope.form.displayAlert('danger', translation.invalidErrorCodeFormatPleaseMakeJSONObject[LANG]);
									return false;
								}
								if(formData.required.length === 0) {
									$scope.form.displayAlert('danger', translation.checkInputrequiredProceed[LANG]);
									return false;
								} else if(formData.type.length === 0){
									$scope.form.displayAlert('danger', translation.entertypeForUIProceed[LANG]);
									return false;
								}
								buildIMFV(currentScope, formData, machineName);
								buildFormUI(currentScope, formData, machineName);
								buildListinUI(currentScope, formData, machineName);
							}

                            if(inputType === 'fileUI'){
                                buildFormUI(currentScope, formData, machineName);
                            }

							currentScope.validateStep2();
							$modalInstance.close();
						}
					}
				};

				$scope.cancel = function() {
					$modalInstance.dismiss('cancel');
				};
			}
		});
	}

	function removeInput(currentScope, fieldName) {
		if(currentScope.config.genericService.config.schema.commonFields[fieldName]) {
			delete currentScope.config.genericService.config.schema.commonFields[fieldName];

			for(var apiRoute in currentScope.config.genericService.config.schema) {
				if(apiRoute === 'commonFields') {
					continue;
				}
                if(currentScope.config.genericService.config.schema[apiRoute].commonFields){
                    var position = currentScope.config.genericService.config.schema[apiRoute].commonFields.indexOf(fieldName);
                    if(position !== -1) {
                        currentScope.config.genericService.config.schema[apiRoute].commonFields.splice(position, 1);
                    }
                }
			}
		}

		for(var j = currentScope.config.soajsUI.list.columns.length - 1; j >= 0; j--) {
			if(currentScope.config.soajsUI.list.columns[j].field === 'fields.' + fieldName) {
				currentScope.config.soajsUI.list.columns.splice(j, 1);
			}
		}

		for(var j = currentScope.config.soajsUI.form.add.length - 1; j >= 0; j--) {
			if(currentScope.config.soajsUI.form.add[j].name === fieldName) {
				currentScope.config.soajsUI.form.add.splice(j, 1);
			}
		}

		for(var j = currentScope.config.soajsUI.form.update.length - 1; j >= 0; j--) {
			if(currentScope.config.soajsUI.form.update[j].name === fieldName) {
				currentScope.config.soajsUI.form.update.splice(j, 1);
			}
		}
	}

	function editInput(currentScope, inputType, fieldName, fieldInfo) {
		var data = reconstructData();
		$modal.open({
			templateUrl: "editInputForm.html",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function($scope, $modalInstance) {
				var options = {
					timeout: $timeout,
					entries: {},
					data: data,
					name: 'addInput',
					label: '',
					actions: []
				};

				$scope.userInput = function() {
					var op = angular.copy(options);
					op.label = translation.updateUserInput[LANG];
					op.entries = angular.copy(cbConfig.form.step2.user);

                    /**
                     * if the input field of the "required" field is not selected
                     * force it to show false;
                     */
					if(!op.entries[1].entries[1].value[0].selected )
                        op.entries[1].entries[1].value[0].selected = true;

					$scope.input = {};
					$scope.input.user = angular.extend($scope);
					buildForm($scope.input.user, null, op, function() {
						var arr1 = ['radio', 'checkbox', 'select', 'multi-select'];
						if(arr1.indexOf(data['type']) !== -1) {
							jQuery(".wizardForm #defaultValue-wrapper").slideDown();
						}
						else {
							jQuery(".wizardForm #defaultValue-wrapper").slideUp();
						}
					});
				};

				$scope.computedInputUI = function() {
					var op = angular.copy(options);
					op.label = translation.updateComputedUIInput[LANG];
					op.entries = angular.copy(cbConfig.form.step2.computedUI);
					$scope.input = {};
					$scope.input.computedUI = angular.extend($scope);
					buildForm($scope.input.computedUI, null, op);
				};

                $scope.fileInputUI = function() {
                    var op = angular.copy(options);
                    op.label = translation.updateFileInput[LANG];
                    op.entries = angular.copy(cbConfig.form.step2.fileUI);
                    $scope.input = {};
                    $scope.input.fileUI = angular.extend($scope);
                    buildForm($scope.input.fileUI, null, op);
                };

				$scope.done = function() {
					var formData = $scope.input[inputType].form.formData;
					if(!formData.label) {
						$scope.form.displayAlert('danger', translation.enterLabelForInputProceed[LANG]);
						return false;
					} else {
						var machineName = formData.label.toLowerCase().trim().replace(/\s/g, "_");
						if(machineName !== fieldName && currentScope.config.genericService.config.schema.commonFields[machineName]) {
							$scope.form.displayAlert('danger', translation.youAlreadyHaveInputNamed[LANG] + " " + formData.label);
						}
						else {
							if(inputType === 'computedUI') {
								buildListinUI(currentScope, formData, machineName, true);
							} else if(inputType === 'fileUI'){
								buildFormUI(currentScope, formData, machineName);
							} else {
								try {
									if(typeof(formData['imfv']) === 'string'){
										formData['imfv'] = JSON.parse(formData['imfv']);
									}
								}
								catch (e){
									$scope.form.displayAlert('danger', translation.invalidErrorCodeFormatPleaseMakeJSONObject[LANG]);
									return false;
								}
								if(formData.required.length === 0) {
									$scope.form.displayAlert('danger', translation.checkInputrequiredProceed[LANG]);
									return false;
								} else if(formData.type.length === 0){
									$scope.form.displayAlert('danger', translation.entertypeForUIProceed[LANG]);
									return false;
								}
								buildIMFV(currentScope, formData, machineName);
								buildFormUI(currentScope, formData, machineName);
								buildListinUI(currentScope, formData, machineName, false);
							}

							currentScope.validateStep2();
							$modalInstance.close();
						}
					}
				};

				$scope.cancel = function() {
					$modalInstance.dismiss('cancel');
				};

				if(inputType === 'user') {
					$scope.userInput();
				}
                else if(inputType === 'fileUI'){
                    $scope.fileInputUI();
                }
				else {
					$scope.computedInputUI();
				}
				if(data.listing === 'yes') {
					$timeout(function() {
						jQuery(".wizardForm #filter-wrapper").show();
						jQuery(".wizardForm #sorting-wrapper").show();
						jQuery(".wizardForm #sortDirection-wrapper").show();
					}, 1000);
				}
			}
		});

		function reconstructData() {
			var data;
			if(inputType === 'user') {
				var formInfo = undefined;
				currentScope.config.soajsUI.form.add.forEach(function(formField) {
					if(formField.name === fieldName) {
						formInfo = formField;
					}
				});
				data = {
					"name": fieldName,
					"label": fieldName,
					"required": fieldInfo.required || fieldInfo.req,
					"imfv": angular.copy (fieldInfo.validation),
					"defaultValue": ""
				};
				data.imfv = JSON.stringify(data.imfv, null, 2);
				if(formInfo && Object.keys(formInfo).length > 0) {
					data['label'] = formInfo.label;
					data['type'] = formInfo.type || formInfo._type;
					data['placeholder'] = formInfo.placeholder;
					data['tooltip'] = formInfo.tooltip;
					data['defaultValue'] = rebuildDefaultValue(formInfo.type, formInfo.value);
				}
			}
            else if(inputType === 'fileUI'){
                var formInfo = undefined;
                currentScope.config.soajsUI.form.add.forEach(function(formField) {
                    if(formField.name === fieldName) {
                        formInfo = formField;
                    }
                });
                data = {
                    'label': fieldName
                };
                if(formInfo && Object.keys(formInfo).length > 0) {
                    data['label'] = formInfo.label;
                    data['type'] = formInfo.type || formInfo._type;
                    data['limit'] = parseInt(formInfo.limit);
                }
            }
			else {
				data = {
					'label': fieldName
				};
			}
			var listInfo = undefined;
			currentScope.config.soajsUI.list.columns.forEach(function(oneColumn) {
				if(oneColumn.name === fieldName) {
					listInfo = oneColumn;
				}
			});
			if(listInfo && Object.keys(listInfo).length > 0) {
				data['listing'] = 'yes';
				data['filter'] = listInfo.filter;
				data['sorting'] = (currentScope.config.soajsUI.list.defaultSortField === fieldName) ? 'yes' : '';
				data['sortDirection'] = (currentScope.config.soajsUI.list.defaultSortASC) ? 'desc' : 'asc';
			}
			return data;
		}
	}

	return {
		'addInput': addInput,
		'editInput': editInput,
		'removeInput': removeInput
	}

}]);
