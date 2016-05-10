"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$cookies', 'ngDataApi', 'Upload', 'injectFiles', function ($scope, $timeout, $modal, $routeParams, $cookies, ngDataApi, Upload, injectFiles) {
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
									$scope.formEnvironment.config_loggerObj = JSON.stringify(response[x].services.config.logger, null, "\t");
								}
							}

							if ($scope.formEnvironment.deployer) {
								for (var driver in $scope.formEnvironment.deployer.container) {
									$scope.formEnvironment.deployer.container[driver] = JSON.stringify($scope.formEnvironment.deployer.container[driver], null, 2);
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
						}
						// $scope.grid.rows.forEach(function (env) {
							// env.profileLabel = env.profile.split("/");
							// env.profileLabel = env.profileLabel[env.profileLabel.length - 1].replace(".js", "");
						// });
					}
				}
			}
		});
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
							"method": "send",
							"routeName": "/dashboard/environment/add",
							"data": tmpl
						}, function (error, data) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('warning', translation.environmentCreatedSuccessfully[LANG] + ' ' + translation.inOrderToViewNewEnvYouNeedToReLogin[LANG]);
								$scope.modalInstance.close('ok');
								$scope.form.formData = {};
								$scope.updateEnvironment(data[0]);
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

		if ($scope.formEnvironment.config_loggerObj && ($scope.formEnvironment.config_loggerObj != "")) {
			try {
				$scope.formEnvironment.services.config.logger = JSON.parse($scope.formEnvironment.config_loggerObj);
				postData.services.config.logger = $scope.formEnvironment.services.config.logger;
			}
			catch (e) {
				$scope.$parent.displayAlert('danger', translation.errorInvalidLoggerJsonObject[LANG]);
				return;
			}
		}

		postData.services.config.session.unset = (postData.services.config.session.unset) ? "destroy" : "keep";


		postData.deployer = {
			"type": "",
			"selected": "",
			"container":{
				"dockermachine":{
					"local": {
						"host": "",
						"port": 0,
						"config":{
							"HostConfig": {
								"NetworkMode": ""
							},
							"MachineName": ""
						}
					},
					"cloud":{
						"rackspace": {
							"host": "",
							"port": 0
						}
					}
				},
				"docker": {
					"socket": {
						"socketPath": "/var/run/docker.sock"
					}
				}
			}
		};
		console.log (postData);
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/environment/" + (($scope.newEntry) ? "add" : "update"),
			"params": ($scope.newEntry) ? {} : {"id": $scope.envId},
			"data": postData
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				var successMessage = translation.environment[LANG] + ' ' + (($scope.newEntry) ? translation.created[LANG] : translation.updated[LANG]) + ' ' + translation.successfully[LANG];
				if ($scope.newEntry) {
					successMessage = successMessage + ' ' + translation.inOrderToViewNewEnvYouNeedToReLogin[LANG];
				}
				$scope.$parent.displayAlert(($scope.newEntry) ? 'warning' : 'success', successMessage);
			}
		});
	};

	$scope.UpdateTenantSecurity = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
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
				var text = "<p>" + translation.tenantSecurityConfigurationUpdated[LANG] + "<br />" + translation.pleaseCopyBelowKeyValueMarkedRed[LANG] + "<span class='red'>" +
					response.newKey +
					"</span> " + translation.andPlace[LANG] + " <b>config.js</b> " + translation.fileOfApplicationWhereItSays[LANG] + " <b>apiConfiguration.key</b>.<br />" + translation.onceYouHaveUpdatedAndSaved[LANG] + " <b>config.js</b>" + translation.clickOnTheButtonBelowDashboardWillOpen[LANG] + "</p><p>" + translation.onceThePageOpensUpNavigate[LANG] + " <b>" + translation.multiTenancy[LANG] + "</b> " + translation.andGenerateExternalKeysTenantsApplications[LANG] + "</p><br/><input type='button' onclick='overlay.hide(function(){location.reload();});' value='Reload Dashboard' class='btn btn-success'/><br /><br />";

				jQuery('#overlay').html("<div class='bg'></div><div class='content'>" + text + "</div>");
				overlay.show();
			}
		});
	};

	$scope.removeEnvironment = function (row) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/delete",
			"params": {"id": row['_id']}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				if (response) {
					$scope.$parent.displayAlert('success', translation.selectedEnvironmentRemoved[LANG]);
					$scope.listEnvironments();
				}
				else {
					$scope.$parent.displayAlert('danger', translation.unableRemoveSelectedEnvironment[LANG]);
				}
			}
		});
	};

	injectFiles.injectCss('modules/DASHBOARD/environments/environments.css');
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
