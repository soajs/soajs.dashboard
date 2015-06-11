"use strict";
var contentBuilderService = soajsApp.components;
contentBuilderService.service('cbHelper', ['ngDataApi', '$timeout', '$modal', '$window', function(ngDataApi, $timeout, $modal, $window) {

	function listEntries(currentScope, moduleConfig, callback) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": (callback && typeof(callback) === 'function') ? "/dashboard/cb/listRevisions" : "/dashboard/cb/list",
			"params": {}
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert("danger", error.message);
			}
			else {
				if(callback && typeof(callback) === 'function') {
					return callback(response);
				}
				else {
					printEntries(currentScope, response, moduleConfig.grid.active);
				}
			}
		});
	}

	function printEntries(currentScope, response, grid, viewOnly) {
		var options = {
			data: response,
			grid: grid,
			defaultSortField: grid.defaultSortField,
			left: [],
			top: []
		};

		if(currentScope.access.getService) {
			options.left.push({
				'label': 'View',
				'icon': 'search',
				'handler': 'viewService'
			});
		}

		if(currentScope.access.updateService && !viewOnly) {
			options.left.push({
				'label': 'Edit',
				'icon': 'pencil2',
				'handler': 'editService'
			});
		}
		buildGrid(currentScope, options);
	}

	function viewEntry(currentScope, params, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cb/get",
			"params": params
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert("danger", error.message);
			}
			else {
				if(cb && typeof(cb) === 'function') {
					return cb(response);
				}
				else {
					$modal.open({
						templateUrl: "serviceInfoBox.html",
						size: 'lg',
						backdrop: true,
						keyboard: true,
						controller: function($scope, $modalInstance) {
							$scope.data = response;

							if(Object.keys($scope.data.soajsService.db.config).length === 0) {
								delete $scope.data.soajsService.db.config;
							}
							var errorCodes = $scope.data.genericService.config.errors;
							var str = "";
							for(var err in errorCodes){
								str += "<li class='APIInputBox mb5'><b>"+err+"</b>:&nbsp;"+errorCodes[err]+"</li>"
							}
							str = "<ul class='apiErrorCodes'>"+str+"</ul>";
							$scope.data.genericService.config.errors = str;


							for(var api in $scope.data.soajsService.apis) {
								if($scope.data.soajsService.apis.hasOwnProperty(api)) {
									for(var stepName in $scope.data.soajsService.apis[api].workflow) {
										if($scope.data.soajsService.apis[api].workflow.hasOwnProperty(stepName)) {
											$scope.data.soajsService.apis[api].workflow[stepName] = $scope.data.soajsService.apis[api].workflow[stepName].replace(/\\n/g, "<br />");
										}
									}
								}
							}
							for(var i = 0; i < $scope.data.soajsUI.form.add.length; i++) {
								$scope.data.soajsUI.form.add[i].print = JSON.stringify($scope.data.soajsUI.form.add[i], null, 2);
							}

							for(var i = 0; i < $scope.data.soajsUI.form.update.length; i++) {
								$scope.data.soajsUI.form.update[i].print = JSON.stringify($scope.data.soajsUI.form.update[i], null, 2);
							}

							setTimeout(function() {highlightMyCode()}, 500);
							$scope.ok = function() {
								$modalInstance.dismiss('ok');
							};
						}
					});
				}
			}
		});
	}

	/*
	 Step 1
	 */
	function getEmptySchema(currentScope) {
		currentScope.config = {
			"name": "",
			"dbtoUse": {},
			"clustertoUse": {},
			"genericService": {
				"config": {
					"errors": {},
					"schema": {
						"commonFields": {
							"id": {
								"source": ['query.id'],
								"req": true,
								"validation": {
									"type": "string"
								}
							}
						}
					}
				},
				"options": {}
			},
			"soajsService": {
				"db": {
					"config": {}
				},
				"apis": {}
			},
			"soajsUI": {
				"list": {
					"columns": [],
					"defaultSortField": ""
				},
				"form": {
					"add": [],
					"update": []
				}
			}
		};
	}

	function loadExistingSchema(currentScope, routeParams, cb) {
		viewEntry(currentScope, {'id': routeParams.id}, function(data) {
			currentScope.config = {
				"name": data.name,
				"dbtoUse": {},
				"clustertoUse": {},
				"genericService": data.genericService,
				"soajsService": data.soajsService,
				"soajsUI": data.soajsUI
			};
			if(currentScope.config.genericService.options.multitenant) {
				for(var envName in data.soajsService.db.config) {
					var dbName = data.name;
					currentScope.config.clustertoUse[envName] = {
						"cluster": data.soajsService.db.config[envName][dbName].cluster,
						"tenantSpecific": data.soajsService.db.config[envName][dbName].tenantSpecific
					};
				}
			}
			else {
				for(var envName in data.soajsService.db.config) {
					currentScope.config.dbtoUse[envName] = Object.keys(data.soajsService.db.config[envName])[0];
				}
			}
			cb();
		});
	}

	function getEnvironments(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert('danger', error.message);
			}
			else {
				currentScope.envList = [];
				response.forEach(function(oneEnvironment) {
					if(Object.keys(oneEnvironment.dbs.clusters).length > 0) {
						currentScope.nextStep = true;
					}
					currentScope.envList.push({
						'name': oneEnvironment.code,
						'databases': oneEnvironment.dbs.databases,
						'clusters': oneEnvironment.dbs.clusters
					});
				});
				if(cb && typeof(cb) === 'function') { cb(); }
			}
		});
	}

	/*
	 Step 3
	 */
	function populateSettingsForm(currentScope) {
		var options = {
			timeout: $timeout,
			entries: angular.copy(cbConfig.form.step3.settings),
			data: reconstructData(),
			name: 'serviceSettings',
			label: '',
			actions: []
		};
		buildForm(currentScope, null, options);

		function reconstructData() {
			var data = {};
			if(currentScope.config.genericService.config.servicePort) {
				data['servicePort'] = currentScope.config.genericService.config.servicePort;
			}

			if(currentScope.config.genericService.config.requestTimeout) {
				data['requestTimeout'] = currentScope.config.genericService.config.requestTimeout;
			}

			if(currentScope.config.genericService.config.requestTimeoutRenewal) {
				data['requestTimeoutRenewal'] = currentScope.config.genericService.config.requestTimeoutRenewal;
			}

			if(Object.keys(currentScope.config.genericService.config.errors).length > 0) {
				data['errors'] = JSON.stringify(currentScope.config.genericService.config.errors, null, 2);
			}

			data['extKeyRequired'] = (currentScope.config.genericService.config.extKeyRequired);
			data['awareness'] = (currentScope.config.genericService.config.awareness);
			data['session'] = (currentScope.config.genericService.options.session);
			data['acl'] = (currentScope.config.genericService.options.acl);
			data['security'] = (currentScope.config.genericService.options.security);
			data['oauth'] = (currentScope.config.genericService.options.oauth);

			if(currentScope.config.genericService.options.multitenant) {
				data['extKeyRequired'] = true;
				data['security'] = true;
			}

			if(currentScope.config.soajsService.db.collection) {
				data['collection'] = currentScope.config.soajsService.db.collection;
			}
			return (Object.keys(data).length > 0) ? data : null;
		}
	}

	function saveContentSchema(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/cb/add",
			"data": {
				"name": currentScope.config.name,
				"config": {
					"genericService": currentScope.config.genericService,
					"soajsService": currentScope.config.soajsService,
					"soajsUI": currentScope.config.soajsUI
				}
			}
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert("danger", error.message);
			}
			else {
				currentScope.$parent.displayAlert("success", "Content Builder Created Successfully");
				currentScope.$parent.go("/content-builder");
				cb();
			}
		});
	}

	function updateContentSchema(currentScope, serviceId, cb) {
		remapPostedConfig(currentScope.config);
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/cb/update",
			"params": {"id": serviceId},
			"data": {
				"config": {
					"genericService": currentScope.config.genericService,
					"soajsService": currentScope.config.soajsService,
					"soajsUI": currentScope.config.soajsUI
				}
			}
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert("danger", error.message);
			}
			else {
				currentScope.$parent.displayAlert("success", "Content Builder Updated Successfully");
				currentScope.$parent.go("/content-builder");
				cb();
			}
		});

		function remapPostedConfig(config) {
			var commonFields = config.genericService.config.schema.commonFields;
			for(var i in commonFields) {
				if(commonFields.hasOwnProperty(i)) {
					if(commonFields[i].required) {
						commonFields[i].req = commonFields[i].required;
						delete commonFields[i].required;
					}
				}
			}

			['add', 'update'].forEach(function(formType) {
				var formConfig = config.soajsUI.form[formType];

				for(var j = 0; j < formConfig.length; j++) {
					for(var field in formConfig[j]) {
						if(formConfig[j].hasOwnProperty(field)) {
							if(field === 'required') {
								formConfig[j].req = formConfig[j]['required'];
								delete formConfig[j]['required'];
							}

							if(field === 'type') {
								formConfig[j]._type = formConfig[j]['type'];
								delete formConfig[j]['type'];
							}
						}
					}
				}
			});
		}
	}

	return {
		'getEmptySchema': getEmptySchema,
		'loadExistingSchema': loadExistingSchema,

		'listEntries': listEntries,
		'printEntries': printEntries,
		'viewEntry': viewEntry,
		'saveContentSchema': saveContentSchema,
		'updateContentSchema': updateContentSchema,

		'getEnvironments': getEnvironments,
		'populateSettingsForm': populateSettingsForm
	}
}]);