"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$cookies', 'ngDataApi', 'Upload', 'injectFiles', '$localStorage', function ($scope, $timeout, $modal, $routeParams, $cookies, ngDataApi, Upload, injectFiles, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	$scope.newEntry = true;
	$scope.envId = null;
	$scope.formEnvironment = {services: {}};
	$scope.formEnvironment.config_loggerObj = '';
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.waitMessage = {
		type: "",
		message: "",
		close: function () {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};

	$scope.jsonEditor = {
		custom: {
			options: {
				mode: 'tree'
			},
			data: {},
			jsonIsValid: true,
			dataIsReady: false
		},
		logger: {
			options: {
				mode: 'tree'
			},
			data: {},
			jsonIsValid: true,
		}
	};

	$scope.generateNewMsg = function (env, type, msg) {
		$scope.grid.rows.forEach(function (oneEnvRecord) {
			if (oneEnvRecord.code === env) {
				oneEnvRecord.hostInfo = {
					waitMessage: {
						"type": type,
						"message": msg
					}
				};

				$timeout(function () {
					oneEnvRecord.hostInfo.waitMessage.message = '';
					oneEnvRecord.hostInfo.waitMessage.type = '';
				}, 7000);
			}
		});
	};

	$scope.closeWaitMessage = function (context) {
		if (!context) {
			context = $scope;
		}
		context.waitMessage.message = '';
		context.waitMessage.type = '';
	};

	$scope.listEnvironments = function (environmentId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				if (environmentId) {
					$scope.envId = environmentId;
					for (var x = 0; x < response.length; x++) {
						if (response[x]._id === $scope.envId) {
							$scope.newEntry = false;
							$scope.formEnvironment = response[x];
							if (!$scope.formEnvironment.services.config.session.hasOwnProperty('proxy')) {
								$scope.formEnvironment.services.config.session.proxy = undefined;
							}
							if (response[x].services && response[x].services.config) {
								if (response[x].services.config.logger) {
									$scope.formEnvironment.config_loggerObj = JSON.stringify(response[x].services.config.logger, null, 2);
									$scope.jsonEditor.logger.data = $scope.formEnvironment.config_loggerObj;
									$scope.jsonEditor.logger.editor.setValue($scope.jsonEditor.logger.data);
									fixEditorHeigh($scope.jsonEditor.logger.editor)
								}
							}

							break;
						}
					}
					$scope.waitMessage.message = '';
					$scope.waitMessage.type = '';
					$scope.formEnvironment.services.config.session.unset = ($scope.formEnvironment.services.config.session.unset === 'keep') ? false : true;
				}
				else {
					if ($cookies.getObject('myEnv')) {
						for (var i = response.length - 1; i >= 0; i--) {
							if (response[i].code !== $cookies.getObject('myEnv').code) {
								response.splice(i, 1);
							}
						}
					}
					$scope.grid = {rows: response};
					if ($scope.grid.rows) {
						if ($scope.grid.rows.length == 1) {
							$scope.grid.rows[0].showOptions = true;
							$scope.jsonEditor.custom.dataIsReady = true;
						}
					}
				}
			}
		});
	};

	$scope.customLoaded = function (instance) {
		if (!$scope.grid.rows[0].custom) {
			$scope.grid.rows[0].custom = {};
		}
		$scope.jsonEditor.custom.data = angular.copy ($scope.grid.rows[0].custom);

		$scope.editorLoaded(instance, 'custom');
	};

	$scope.editorLoaded = function (_editor) {
		//bug in jsoneditor: setting default mode to 'code' does not display data
		//to fix this, use another mode, load data, wait, switch mode, wait, start listener to validate json object
		$scope.jsonEditor.logger.editor = _editor;
		// _editor.$blockScrolling = Infinity;
		_editor.setValue("");
		fixEditorHeigh(_editor);
	};

	function fixEditorHeigh(_editor){
		_editor.scrollToLine(0, true, true);
		_editor.scrollPageUp();
		_editor.clearSelection();
		_editor.setShowPrintMargin(false);
	}
	
	$scope.saveCustomRegistry = function () {
		if (!$scope.jsonEditor.custom.jsonIsValid) {
			$scope.displayAlert('danger', 'Custom Registry: Invalid JSON Object');
			return;
		}

		$scope.formEnvironment = angular.copy($scope.grid.rows[0]);
		$scope.formEnvironment.custom = $scope.jsonEditor.custom.data;
		$scope.newEntry = false;
		$scope.envId = $scope.formEnvironment._id;

		$scope.save();
	};

	$scope.getDeploymentMode = function (deployer, value) {
		if (!deployer.ui) {
			deployer.ui = {};
		}
		deployer.ui[value] = (deployer.type === value);
	};

	$scope.getDeploymentDriver = function (deployer, value, technology, type) {
		deployer.ui[value] = (deployer.selected === technology + '.' + value);
	};
	
	function getEnvironments(newEnvRecord, cb) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/permissions/get"
		}, function (error, response) {
			if (error) {
				$localStorage.soajs_user = null;
				$cookies.remove('soajs_auth');
				$cookies.remove('soajs_dashboard_key');
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$localStorage.environments = response.environments;
				
				if (newEnvRecord) {
					$cookies.putObject("myEnv", newEnvRecord);
				}
				else {
					response.environments.forEach(function (oneEnv) {
						if (oneEnv.code.toLowerCase() === 'dashboard') {
							$cookies.putObject("myEnv", oneEnv);
						}
					});
				}
				$scope.$parent.reRenderMenu('deployment');
				return cb();
			}
		});
	}
	
	$scope.addEnvironment = function () {
		var configuration = environmentsConfig.form.template;
		$scope.grid.rows.forEach(function (oneEnv) {
			for (var i = 0; i < configuration.entries[0].value.length; i++) {
				if (configuration.entries[0].value[i].v === oneEnv.code) {
					configuration.entries[0].value.splice(i, 1);
				}
			}
		});
		var options = {
			timeout: $timeout,
			form: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var tmpl = angular.copy(env_template);
						tmpl.code = formData.code;
						tmpl.domain = formData.domain;
						tmpl.description = formData.description;

						if (formData.apiPrefix) {
							tmpl.apiPrefix = formData.apiPrefix;
						}

						if (formData.sitePrefix) {
							tmpl.sitePrefix = formData.sitePrefix;
						}

						tmpl.services.config.key.password = formData.tKeyPass;
						tmpl.services.config.cookie.secret = formData.sessionCookiePass;
						tmpl.services.config.session.secret = formData.sessionCookiePass;

						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/environment/add",
							"data": tmpl
						}, function (error, data) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.environmentCreatedSuccessfully[LANG]);
								$scope.modalInstance.close('ok');
								$scope.form.formData = {};
								getEnvironments({
									code: data[0].code,
									_id: data[0]._id.toString(),
									deployer: data[0].deployer
								}, function () {
									$scope.updateEnvironment(data[0]);
								});
							}
						});
					}
				},
				{
					'type': 'button',
					'label': translation.advancedMode[LANG],
					'btn': 'success',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.$parent.go("/environments/environment/");
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

	$scope.updateEnvironment = function (data) {
		$scope.$parent.go('/environments/environment/' + data._id);
	};

	$scope.save = function () {
		var postData = angular.copy($scope.formEnvironment);
		
		if (typeof($scope.formEnvironment.services.config.session.proxy) == 'undefined') {
			postData.services.config.session.proxy = 'undefined';
		}
		else if ($scope.formEnvironment.services.config.session.proxy === false) {
			postData.services.config.session.proxy = 'false';
		}
		else if ($scope.formEnvironment.services.config.session.proxy === true) {
			postData.services.config.session.proxy = 'true';
		}
		delete postData.dbs;
		if (postData.services.config && postData.services.config.oauth && postData.services.config.oauth.grants) {
			if (typeof(postData.services.config.oauth.grants) == 'string') {
				postData.services.config.oauth.grants = postData.services.config.oauth.grants.replace(/ /g, '').split(",");
			}
		}

		postData.services.config.agent = {
			"topologyDir": "/opt/soajs/"
		};

		if ($scope.formEnvironment.config_loggerObj) {
			try{
				postData.services.config.logger = JSON.parse($scope.jsonEditor.logger.data);
			}
			catch(e){
				$scope.displayAlert('danger', 'Logger Config: Invalid JSON Object');
				return;
			}
		}

		postData.services.config.session.unset = (postData.services.config.session.unset) ? "destroy" : "keep";

		getSendDataFromServer($scope, ngDataApi, {
			"method": (($scope.newEntry) ? "post" : "put"),
			"routeName": "/dashboard/environment/" + (($scope.newEntry) ? "add" : "update"),
			"params": ($scope.newEntry) ? {} : {"id": $scope.envId},
			"data": postData
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				var successMessage = translation.environment[LANG] + ' ' + (($scope.newEntry) ? translation.created[LANG] : translation.updated[LANG]) + ' ' + translation.successfully[LANG];
				
				$scope.$parent.displayAlert('success', successMessage);
			}
		});
	};

	$scope.UpdateTenantSecurity = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/environment/key/update",
			"params": {"id": $scope.envId},
			"data": {
				'algorithm': $scope.formEnvironment.services.config.key.algorithm,
				'password': $scope.formEnvironment.services.config.key.password
			}
		}, function (error, response) {
			if (error) {
				$scope.waitMessage.type = 'danger';
				$scope.waitMessage.message = getCodeMessage(error.code, 'dashboard', error.message);
			}
			else {
				if (response.newKeys) {
					$scope.newKeys = [];
					for (var app in response.newKeys) {
						response.newKeys[app].newKeys.forEach(function (oneKey) {
							oneKey.extKeys.forEach(function (oneExtKey) {
								$scope.newKeys.push({
									appPackage: response.newKeys[app].package,
									key: oneKey.key,
									extKey: oneExtKey.extKey
								});
							});
						});
					}

					var currentScope = $scope;
					var keyUpdateSuccess = $modal.open({
						templateUrl: 'keyUpdateSuccess.tmpl',
						size: 'lg',
						backdrop: true,
						keyboard: true,
						controller: function ($scope) {
							fixBackDrop();
							$scope.currentScope = currentScope;

							$scope.reloadDashboard = function () {
								location.reload(true);
								keyUpdateSuccess.close();
							};
						}
					});
				}
				else {
					$scope.$parent.displayAlert('success', translation.keySecurityHasBeenUpdated[LANG]);
				}
			}
		});
	};

	$scope.removeEnvironment = function (row) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/environment/delete",
			"params": {"id": row['_id']}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				if (response) {
					$scope.$parent.displayAlert('success', translation.selectedEnvironmentRemoved[LANG]);
					getEnvironments(null, function () {
						$scope.listEnvironments();
					});
				}
				else {
					$scope.$parent.displayAlert('danger', translation.unableRemoveSelectedEnvironment[LANG]);
				}
			}
		});
	};

	injectFiles.injectCss('modules/dashboard/environments/environments.css');
	//default operation
	if ($routeParams.id) {
		if ($scope.access.editEnvironment) {
			$scope.listEnvironments($routeParams.id);
		}
	}
	else {
		if ($scope.access.listEnvironments) {
			$scope.listEnvironments(null);
		}
	}
}]);
