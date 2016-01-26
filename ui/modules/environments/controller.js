"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$cookieStore', 'ngDataApi', 'Upload', function ($scope, $timeout, $modal, $routeParams, $cookieStore, ngDataApi, Upload) {
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
				$scope.$parent.displayAlert('danger', error.message);
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
								for (var driver in $scope.formEnvironment.deployer.docker) {
									$scope.formEnvironment.deployer.docker[driver] = JSON.stringify($scope.formEnvironment.deployer.docker[driver], null, 2);
								}
							}

							$scope.formEnvironment.profile = $scope.formEnvironment.profile.split("/");
							$scope.formEnvironment.profile = $scope.formEnvironment.profile[$scope.formEnvironment.profile.length - 1];
							$scope.formEnvironment.profile = $scope.formEnvironment.profile.replace(".js", "");
							break;
						}
					}
					$scope.waitMessage.message = '';
					$scope.waitMessage.type = '';
					$scope.formEnvironment.services.config.session.unset = ($scope.formEnvironment.services.config.session.unset === 'keep') ? false : true;
				}
				else {
					if ($cookieStore.get('myEnv')) {
						for (var i = response.length - 1; i >= 0; i--) {
							if (response[i].code !== $cookieStore.get('myEnv').code) {
								response.splice(i, 1);
							}
						}
					}

					$scope.grid = {rows: response};
					if ($scope.grid.rows) {
						if ($scope.grid.rows.length == 1) {
							$scope.grid.rows[0].showOptions = true;
						}
						$scope.grid.rows.forEach(function (env) {
							env.profileLabel = env.profile.split("/");
							env.profileLabel = env.profileLabel[env.profileLabel.length - 1].replace(".js", "");
						});
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
			label: 'Add New Environment',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function (formData) {
						var tmpl = angular.copy(env_template);
						tmpl.code = formData.code;
						tmpl.domain = formData.domain;
						tmpl.port = parseInt(formData.port);
						tmpl.description = formData.description;
						tmpl.profile = formData.profile;

						tmpl.services.config.key.password = formData.tKeyPass;
						tmpl.services.config.cookie.secret = formData.sessionCookiePass;
						tmpl.services.config.session.secret = formData.sessionCookiePass;

						switch (formData.platformDriver) {
							case 'manual':
								tmpl.deployer.type = 'manual';
								break;
							case 'socket':
								tmpl.deployer.type = 'container';
								tmpl.deployer.selected = 'docker.socket';
								break;
							case 'machine':
								tmpl.deployer.type = 'container';
								tmpl.deployer.selected = 'docker.machine';
								break;
							case 'joyent':
								tmpl.deployer.type = 'container';
								tmpl.deployer.selected = 'docker.joyent';
								break;
							case 'rackspace':
								tmpl.deployer.type = 'container';
								tmpl.deployer.selected = 'docker.rackspace';
								break;
						}
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/add",
							"data": tmpl
						}, function (error, data) {
							if (error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Created Successfully.');
								$scope.modalInstance.close('ok');
								$scope.form.formData = {};
								$scope.updateEnvironment(data[0]);
							}
						});
					}
				},
				{
					'type': 'button',
					'label': 'Advanced Mode',
					'btn': 'success',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.$parent.go("/environments/environment/");
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
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
				$scope.$parent.displayAlert('danger', 'Error: Invalid logger Json object');
				return;
			}
		}

		if (!postData.deployer.docker.socket && !postData.deployer.docker.machine && !postData.deployer.docker.joyent) {
			$timeout(function () {
				alert("Provide a configuration for at least one platform driver to proceed.");
			}, 100);
		}
		else {
			try {
				var type = postData.deployer.type;
				var subType, driver;
				if (type.indexOf(".") !== -1) {
					type = type.split(".");
					subType = type[1];
					driver = type[2];
					type = type[0];
					postData.deployer.type = type;
					if (type !== 'manual') {
						postData.deployer.selected = subType + '.' + driver;
					}
				}
				if (type === 'container' && subType === 'docker') {
					postData.deployer.docker.selected = driver;
				}

				for (var supported in postData.deployer.docker) {
					if (supported === 'selected') {
						continue;
					}
					postData.deployer.docker[supported] = JSON.parse(postData.deployer.docker[supported]);
				}
			}
			catch (e) {
				console.log(e);
				$scope.$parent.displayAlert("danger", "Error: invalid Json object provided for Deployer Configuration");
				return;
			}
			postData.port = parseInt(postData.port);
			postData.services.config.session.unset = (postData.services.config.session.unset) ? "destroy" : "keep";
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/environment/" + (($scope.newEntry) ? "add" : "update"),
				"params": ($scope.newEntry) ? {} : {"id": $scope.envId},
				"data": postData
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', 'Environment ' + (($scope.newEntry) ? "Created" : "Updated") + ' Successfully.');
				}
			});
		}
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
				$scope.waitMessage.message = error.message;
			}
			else {
				var text = "<p>The Tenant Security Configuration has been updated.<br />Please copy the below key value marked in red <span class='red'>" +
					response.newKey +
					"</span> and place it the <b>config.js</b> file of this application where it says <b>apiConfiguration.key</b>.<br />Once you have updated and saved the <b>config.js</b>, Click on the button below and your dashboard will open up.</p><p>Once the page opens up, navigate to <b>Multi-Tenancy</b> and generate new external keys for all your tenants appplications.</p><br/><input type='button' onclick='overlay.hide(function(){location.reload();});' value='Reload Dashboard' class='btn btn-success'/><br /><br />";

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
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if (response) {
					$scope.$parent.displayAlert('success', "Selected Environment has been removed.");
					$scope.listEnvironments();
				}
				else {
					$scope.$parent.displayAlert('danger', "Unable to remove selected Environment.");
				}
			}
		});
	};

	$scope.uploadCerts = function () {
		var formConfig = angular.copy(environmentsConfig.form.uploadCerts);
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: "uploadCerts",
			label: "Upload Docker Certificates",
			actions: [
				{
					type: 'submit',
					label: 'Upload',
					btn: 'primary',
					action: function (formData) {
						$scope.modalInstance.close();
						var uploadInfo = $modal.open ({
							templateUrl: 'uploadCertsInfo.html',
							backdrop: true,
							keyboard: false,
							controller: function ($scope, $modalInstance) {
								fixBackDrop();

								$scope.text = "<h4 style='text-align:center;'>Uploading Certificates...</h4><p style='text-align:center;'>This might take a few minutes, please wait.</p>";
							}
						});
						$scope.uploadFiles(formData, "uploadCerts", 0, uploadInfo, function () {
							$scope.form.formData = {};
							uploadInfo.close();
							var uploadDone = $modal.open({
								templateUrl: 'uploadCertsInfo.html',
								backdrop: true,
								keyboard: true,
								controller: function ($scope, $modalInstance) {
									fixBackDrop();
									$scope.text = "<h4 style='text-align:center;'>Certificate(s) added successfully.</h4>";
								}
							});
							$timeout(function () {
								uploadDone.dismiss();
							}, 1500);
							$scope.listEnvironments(); //add env id here
						});
					}
				},
				{
					type: 'reset',
					label: 'Cancel',
					btn: 'danger',
					action: function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	//$scope.uploadCerts = function () {
	//	var outerScope = $scope;
	//	var upload = $modal.open({
	//		templateUrl: "uploadCerts.tmpl",
	//		backdrop: true,
	//		keyboard: true,
	//		controller: function ($scope, $modalInstance) {
	//			fixBackDrop();
    //
	//			$scope.title = "Upload Certificates";
    //
	//			$scope.test = function () {
	//				console.log ("Hello");
	//			};
    //
	//			$scope.onSubmit = function () {
	//				console.log ($scope.formData);
	//				upload.close();
	//				var uploadInfo = $modal.open ({
	//					templateUrl: 'uploadCertsInfo.html',
	//					backdrop: true,
	//					keyboard: false,
	//					controller: function ($scope, $modalInstance) {
	//						fixBackDrop();
	//						$scope.text = "<h4 style='text-align:center;'>Uploading Certificates...</h4><p style='text-align:center;'>This might take a few minutes, please wait.</p>";
	//					}
	//				});
	//				outerScope.uploadFiles($scope.formData.certificates, "uploadCerts", 0, uploadInfo, function () {
	//					$scope.formData.certificates = {};
	//					uploadInfo.close();
	//					var uploadDone = $modal.open({
	//						templateUrl: 'uploadCertsInfo.html',
	//						backdrop: true,
	//						keyboard: true,
	//						controller: function ($scope, $modalInstance) {
	//							fixBackDrop();
	//							$scope.text = "<h4 style='text-align:center;'>Certificate(s) added successfully.</h4>";
	//						}
	//					});
	//					$timeout(function () {
	//						uploadDone.dismiss();
	//					}, 1500);
	//					$scope.listEnvironments(); //add env id here
	//				});
	//			};
    //
	//			$scope.closeModal = function () {
	//				upload.close();
	//			}
	//		}
	//	});
	//};

	$scope.uploadFiles = function (formData, prefix, counter, modal, cb) {
		var total = Object.keys(formData).length;

		if (counter >= total) {
			return;
		}

		var soajsauthCookie = $cookieStore.get('soajs_auth');
		var dashKeyCookie = $cookieStore.get('soajs_dashboard_key');
		var progress = {
			value: 0
		};

		var filename = prefix + "_" + counter;
		$scope.form.uploadFileToUrl(Upload, {
			file: formData[filename],
			uploadUrl: "/dashboard/environment/cert/upload",
			headers: {
				'soajsauth': soajsauthCookie,
				'key': dashKeyCookie
			},
			data: {
				envId: $routeParams.id,
				filename: formData[filename].name
			},
			progress: progress
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
				modal.close();
			} else {
				counter++;
				$scope.uploadFiles(formData, prefix, counter);

				if (cb) return cb();
			}

		});
	};

	$scope.removeCert = function (certId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/cert/delete",
			"params": {"id": certId}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
			} else {
				$scope.$parent.displayAlert('success', 'Selected Certificate has been removed');
				$scope.listEnvironments();
			}
		});
	};

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

