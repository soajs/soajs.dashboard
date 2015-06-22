"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$compile', '$timeout', '$modal', '$http', '$routeParams', 'ngDataApi', 'envHosts', 'envDB', 'envClusters', 'deploySrv', function($scope, $compile, $timeout, $modal, $http, $routeParams, ngDataApi, envHosts, envDB, envClusters, deploySrv) {
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
		close: function() {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};

	$scope.generateNewMsg = function(env, type, msg) {
		$scope.grid.rows.forEach(function(oneEnvRecord){
			if(oneEnvRecord.code === env){
				oneEnvRecord.hostInfo = {
					waitMessage: {
						"type": type,
						"message": msg
					}
				};

				$timeout(function() {
					oneEnvRecord.hostInfo.waitMessage.message = '';
					oneEnvRecord.hostInfo.waitMessage.type = '';
				}, 7000);
			}
		});
	};

	$scope.closeWaitMessage = function(context) {
		if(!context) {
			context = $scope;
		}
		$timeout(function() {
			context.waitMessage.message = '';
			context.waitMessage.type = '';
		}, 7000);
	};

	$scope.expand = function(row) {
		row.showOptions = true;
	};

	$scope.collapse = function(row) {
		row.showOptions = false;
	};

	$scope.listEnvironments = function(environmentId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(environmentId) {
					$scope.envId = environmentId;
					for(var x = 0; x < response.length; x++) {
						if(response[x]._id === $scope.envId) {
							$scope.newEntry = false;
							$scope.formEnvironment = response[x];
							if(!$scope.formEnvironment.services.config.session.hasOwnProperty('proxy')) {
								$scope.formEnvironment.services.config.session.proxy = undefined;
							}
							if(response[x].services && response[x].services.config) {
								if(response[x].services.config.logger) {
									$scope.formEnvironment.config_loggerObj = JSON.stringify(response[x].services.config.logger, null, "\t");
								}
							}

							for(var driver in $scope.formEnvironment.deployer){
								if(driver === 'selected') continue;
								if(JSON.stringify($scope.formEnvironment.deployer[driver]) === "{}"){
									delete $scope.formEnvironment.deployer[driver];
								}
								else {
									$scope.formEnvironment.deployer[driver] = JSON.stringify($scope.formEnvironment.deployer[driver], null, 2);
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
					$scope.grid = {rows: response};
					if($scope.grid.rows) {
						if($scope.grid.rows.length == 1) {
							$scope.grid.rows[0].showOptions = true;
						}
						$scope.grid.rows.forEach(function(env){
							$scope.listHosts(env.code);
						});
					}
				}
			}
		});
	};

	$scope.updateEnvironment = function(data) {
		$scope.$parent.go('/environments/environment/' + data._id);
	};

	$scope.save = function() {
		var postData = angular.copy($scope.formEnvironment);

		if(typeof($scope.formEnvironment.services.config.session.proxy) == 'undefined') {
			postData.services.config.session.proxy = 'undefined';
		}
		else if($scope.formEnvironment.services.config.session.proxy === false) {
			postData.services.config.session.proxy = 'false';
		}
		else if($scope.formEnvironment.services.config.session.proxy === true) {
			postData.services.config.session.proxy = 'true';
		}
		delete postData.dbs;
		if(postData.services.config && postData.services.config.oauth && postData.services.config.oauth.grants) {
			if(typeof(postData.services.config.oauth.grants) == 'string') {
				postData.services.config.oauth.grants = postData.services.config.oauth.grants.replace(/ /g, '').split(",");
			}
		}

		postData.services.config.agent = {
			"topologyDir": "/opt/soajs/"
		};

		if($scope.formEnvironment.config_loggerObj && ($scope.formEnvironment.config_loggerObj != "")) {
			try {
				$scope.formEnvironment.services.config.logger = JSON.parse($scope.formEnvironment.config_loggerObj);
				postData.services.config.logger = $scope.formEnvironment.services.config.logger;
			}
			catch(e) {
				$scope.$parent.displayAlert('danger', 'Error: Invalid logger Json object');
				return;
			}
		}

		if(!postData.deployer.unix && !postData.deployer.boot2docker){
			$timeout(function(){
				alert("Provide a configuration for at least one platform driver to proceed.");
			},100);
		}
		else{
			try{
				if(postData.deployer.unix){
					postData.deployer.unix = JSON.parse(postData.deployer.unix);
				}
			}
			catch(e){
				$scope.$parent.displayAlert("danger", "Error: invalid Json object provided for Unix Driver");
				return;
			}

			try{
				if(postData.deployer.boot2docker){
					postData.deployer.boot2docker = JSON.parse(postData.deployer.boot2docker);
				}
			}
			catch(e){
				$scope.$parent.displayAlert("danger", "Error: invalid Json object provided for Boot2docker Driver");
				return;
			}

			postData.services.config.session.unset = (postData.services.config.session.unset) ? "destroy" : "keep";
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/environment/" + (($scope.newEntry) ? "add" : "update"),
				"params": ($scope.newEntry) ? {} : {"id": $scope.envId},
				"data": postData
			}, function(error) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', 'Environment ' + (($scope.newEntry) ? "Created" : "Updated") + ' Successfully.');
				}
			});
		}
	};

	$scope.UpdateTenantSecurity = function() {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/environment/key/update",
			"params": {"id": $scope.envId},
			"data": {
				'algorithm': $scope.formEnvironment.services.config.key.algorithm,
				'password': $scope.formEnvironment.services.config.key.password
			}
		}, function(error, response) {
			if(error) {
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

	$scope.deployEnvironment = function(envCode){
		deploySrv.deployEnvironment($scope, envCode);
	};

	$scope.listHosts = function(env, noPopulate) {
		if($scope.grid.rows){
			$scope.grid.rows.forEach(function(oneEnvRecord){
				if(oneEnvRecord.code === env){
					oneEnvRecord.hostInfo = {
						waitMessage: {
							"type": "",
							"message": ""
						}
					};
					oneEnvRecord.hostInfo.waitMessage.type = 'info';
					oneEnvRecord.hostInfo.waitMessage.message = 'Services Detected. Awareness check in progress. Please wait...';
				}
			});
		}
		envHosts.listHosts($scope, env, noPopulate);
	};

	$scope.executeHeartbeatTest = function(env, oneHost) {
		envHosts.executeHeartbeatTest($scope, env, oneHost);
	};

	$scope.executeAwarenessTest = function(env, oneHost) {
		envHosts.executeAwarenessTest($scope, env, oneHost);
	};

	$scope.reloadRegistry = function(env, oneHost, cb) {
		envHosts.reloadRegistry($scope, env, oneHost, cb);
	};

	$scope.loadProvisioning = function(env, oneHost) {
		envHosts.loadProvisioning($scope, env, oneHost);
	};

	$scope.removeHost = function(env, serviceName, oneHost) {
		envHosts.removeHost($scope, env, serviceName, oneHost);
	};

	$scope.stopHost = function(env, serviceName, oneHost, serviceInfo) {
		envHosts.stopHost($scope, env, serviceName, oneHost, serviceInfo);
	};

	$scope.startHost = function(env, serviceName, oneHost, serviceInfo) {
		envHosts.startHost($scope, env, serviceName, oneHost, serviceInfo);
	};

	$scope.infoHost = function(env, serviceName, oneHost, serviceInfo) {
		envHosts.infoHost($scope, env, serviceName, oneHost, serviceInfo);
	};

	$scope.createHost = function(env, services) {
		envHosts.createHost($scope, env, services);
	};

	$scope.updateServicesControllers = function(env, oneCtrl) {
		envHosts.updateServicesControllers($scope, env, oneCtrl);
	};

	$scope.removeEnvironment = function(row) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/delete",
			"params": {"id": row['_id']}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(response) {
					$scope.$parent.displayAlert('success', "Selected Environment has been removed.");
					$scope.listEnvironments();
				}
				else {
					$scope.$parent.displayAlert('danger', "Unable to remove selected Environment.");
				}
			}
		});
	};

	$scope.listDatabases = function(env) {
		envDB.listDatabases($scope, env);
	};

	$scope.removeDatabase = function(env, name) {
		envDB.removeDatabase($scope, env, name);
	};

	$scope.addDatabase = function(env, session) {
		envDB.addDatabase($scope, env, session);
	};

	$scope.editDatabase = function(env, name, data) {
		envDB.editDatabase($scope, env, name, data);
	};

	$scope.updateDbPrefix = function(env, prefix) {
		envDB.updateDbPrefix($scope, env, prefix);
	};

	$scope.listClusters = function(env) {
		envClusters.listClusters($scope, env);
	};

	$scope.addCluster = function(env) {
		envClusters.addCluster($scope, env);
	};

	$scope.editCluster = function(env, name, data) {
		envClusters.editCluster($scope, env, name, data);
	};

	$scope.removeCluster = function(env, name) {
		envClusters.removeCluster($scope, env, name);
	};

	//default operation
	if($routeParams.id) {
		if($scope.access.editEnvironment) {
			$scope.listEnvironments($routeParams.id);
		}
	}
	else {
		if($scope.access.listEnvironments) {
			$scope.listEnvironments(null);
		}
	}
}]);