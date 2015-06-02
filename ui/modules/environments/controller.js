"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$compile','$timeout', '$modal', '$http', '$routeParams', 'ngDataApi', function($scope, $compile, $timeout, $modal, $http, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	$scope.newEntry = true;
	$scope.envId = null;
	$scope.formEnvironment = {services: {}};
	$scope.formEnvironment.config_loggerObj='';
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.waitMessage = {
		type: "info",
		message: "Services Detected. Awareness check in progress. Please wait...",
		close: function() {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
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
							if(!$scope.formEnvironment.services.config.session.hasOwnProperty('proxy')){
								$scope.formEnvironment.services.config.session.proxy = undefined;
							}
							if(response[x].services && response[x].services.config) {
								if(response[x].services.config.logger) {
									$scope.formEnvironment.config_loggerObj = JSON.stringify(response[x].services.config.logger, null, "\t");
								}
							}
							break;
						}
					}
					$scope.waitMessage.message ='';
					$scope.waitMessage.type ='';
					$scope.formEnvironment.services.config.session.unset = ($scope.formEnvironment.services.config.session.unset === 'keep') ? false : true;
				}
				else {
					$scope.grid = {rows: response};
					if($scope.grid.rows) {
						if($scope.grid.rows.length == 1) {
							$scope.grid.rows[0].showOptions = true;
						}
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

		if( typeof($scope.formEnvironment.services.config.session.proxy)=='undefined'){
			postData.services.config.session.proxy = 'undefined';
		}
		else if( $scope.formEnvironment.services.config.session.proxy === false){
			postData.services.config.session.proxy = 'false';
		}
		else if( $scope.formEnvironment.services.config.session.proxy === true){
			postData.services.config.session.proxy = 'true';
		}
		delete postData.dbs;
		if(postData.services.config && postData.services.config.oauth && postData.services.config.oauth.grants) {
			if(typeof(postData.services.config.oauth.grants) == 'string') {
				postData.services.config.oauth.grants = postData.services.config.oauth.grants.replace(/ /g, '').split(",");
			}
		}

		postData.services.config.agent ={
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
	};

	$scope.UpdateTenantSecurity = function(){
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
				$scope.waitMessage.type='danger';
				$scope.waitMessage.message = error.message;
			}
			else {
				var text = "<p>The Tenant Security Configuration has been updated.<br />Please copy the below key value marked in red <span class='red'>"+response.newKey+"</span> and place it the <b>config.js</b> file of this application where it says <b>apiConfiguration.key</b>.<br />Once you have updated and saved the <b>config.js</b>, Click on the button below and your dashboard will open up.</p><p>Once the page opens up, navigate to <b>Multi-Tenancy</b> and generate new external keys for all your tenants appplications.</p><br/><input type='button' onclick='overlay.hide(function(){location.reload();});' value='Reload Dashboard' class='btn btn-success'/><br /><br />";

				jQuery('#overlay').html("<div class='bg'></div><div class='content'>"+text+"</div>");
				overlay.show();
			}
		});
	};

	$scope.listHosts = function(env, noPopulate) {
		var controllers = [];
		if($scope.access.listHosts){
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/hosts/list",
				"params": {
					"env": env
				}
			}, function(error, response) {
				if(error || !response) {
					$scope.$parent.displayAlert('danger', "Unable to retrieve services hosts information.");
					console.log(error.message);
				}
				else {
					for(var i = 0; i < response.length; i++) {
						if(response[i].name === 'controller') {
							controllers.push({'name': 'controller', 'ip': response[i].ip, 'color': 'red', 'port': 4000});
						}
					}
					controllers.forEach(function(oneController) {
						invokeHostsAwareness(oneController.ip);
					});
				}
			});
		}

		function invokeHostsAwareness(defaultControllerHost) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/hosts/maintenanceOperation",
				"data": {
					"serviceName": "controller",
					"operation": "awarenessStat",
					"serviceHost": defaultControllerHost,
					"servicePort": 4000,
					"env": env
				}
			}, function(error, response) {
				if(error || !response || !response.result || !response.data) {
					$scope.$parent.displayAlert('danger', "Unable to retrieve services hosts information.");
					console.log(error.message);
				}
				else {
					propulateServices(response.data);
				}
			});
		}

		function propulateServices(regServices) {
			for(var i = 0; i < $scope.grid.rows.length; i++) {
				if($scope.grid.rows[i]['code'] === env) {
					$scope.grid.rows[i].controllers = controllers;
					var renderedHosts = {};
					var services = Object.keys(regServices);
					services.forEach(function(serviceName) {
						var oneService = regServices[serviceName];
						if(oneService.hosts && Array.isArray(oneService.hosts) && oneService.hosts.length > 0) {
							renderedHosts[serviceName] = {
								'name': serviceName,
								'port': regServices[serviceName].port,
								'ips': [],
								'color': 'red'
							};
							if(serviceName === 'controller') {
								renderedHosts[serviceName].heartbeat = false;
							}
							else {
								renderedHosts[serviceName].healthy = false;
							}

							regServices[serviceName].hosts.forEach(function(oneHostIP) {
								var oneHost;
								if(serviceName === 'controller') {
									oneHost = {'ip': oneHostIP, 'name': serviceName, 'heartbeat': false, 'color': 'red', 'port': regServices[serviceName].port};
									$timeout(function() {
										$scope.executeHeartbeatTest(env, oneHost);
									}, 2000);
								}
								else {
									oneHost = {
										'controllers': controllers,
										'ip': oneHostIP,
										'name': serviceName,
										'healthy': false,
										'color': 'red',
										'downCount': 'N/A',
										'downSince': 'N/A',
										'port': regServices[serviceName].port
									};
								}
								renderedHosts[serviceName].ips.push(oneHost);
							});
						}
					});

					$scope.grid.rows[i].hosts = renderedHosts;
					break;
				}
			}
		}
	};

	$scope.executeHeartbeatTest = function(env, oneHost) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceName": oneHost.name,
				"operation": "heartbeat",
				"serviceHost": oneHost.ip,
				"servicePort": oneHost.port,
				"env": env
			}
		}, function(error, heartbeatResponse) {
			if(error) {
				console.log("error executing heartbeat test for " + oneHost.name + " on ip: " + oneHost.ip);
				updateServiceStatus(false);
				$scope.waitMessage.type = 'danger';
				$scope.waitMessage.message = "error executing heartbeat test for " + oneHost.name + " on ip: " + oneHost.ip + " @ " + new Date().toISOString();
				$scope.closeWaitMessage();
			}
			else {
				if(heartbeatResponse.result) {
					$scope.grid.rows.forEach(function(oneEnvironmentRow) {
						if(oneEnvironmentRow.code === env) {
							for(var i = 0; i < oneEnvironmentRow.hosts[oneHost.name].ips.length; i++) {
								if(oneEnvironmentRow.hosts[oneHost.name].ips[i].ip === oneHost.ip) {
									oneEnvironmentRow.hosts[oneHost.name].ips[i].heartbeat = true;
									oneEnvironmentRow.hosts[oneHost.name].ips[i].color = 'green';
								}
							}
						}
					});
				}
				updateServiceStatus(true);
				if(oneHost.name === 'controller') {
					$scope.waitMessage.type = 'success';
					$scope.waitMessage.message = "Service " +
					                             oneHost.name +
					                             " on address: " +
					                             oneHost.ip +
					                             ":" +
					                             oneHost.port +
					                             " is healthy @ " +
					                             new Date().toISOString() +
					                             ", checking services please wait...";
				}
			}
		});

		function updateServiceStatus(healthyCheck) {
			$scope.grid.rows.forEach(function(oneEnvironmentRow) {
				if(oneEnvironmentRow.code === env) {
					var count = 0;
					var healthy = oneEnvironmentRow.hosts[oneHost.name].healthy;
					var color = oneEnvironmentRow.hosts[oneHost.name].color;
					var waitMessage = {};

					for(var i = 0; i < oneEnvironmentRow.hosts[oneHost.name].ips.length; i++) {
						if(oneHost.ip === oneEnvironmentRow.hosts[oneHost.name].ips[i].ip) {
							if(healthyCheck) {
								if(oneHost.name === 'controller') {
									oneEnvironmentRow.hosts[oneHost.name].ips[i].heartbeat = true;
									oneEnvironmentRow.hosts[oneHost.name].ips[i].color = 'green';
									setTimeout(function() {
										$scope.executeAwarenessTest(env, oneHost);
									}, 4000);
								}
								else {
									oneEnvironmentRow.hosts[oneHost.name].ips[i].healthy = true;
									oneEnvironmentRow.hosts[oneHost.name].ips[i].color = 'green';
									waitMessage = {
										type: "success",
										message: "Service " + oneHost.name + " on address: " + oneHost.ip + ":" + oneHost.port + " is healthy @ " + new Date().toISOString(),
										close: function(entry) {
											entry.waitMessage.type = '';
											entry.waitMessage.message = '';
										}
									};
								}
							}
							else {
								oneEnvironmentRow.hosts[oneHost.name].ips[i].healthy = false;
								oneEnvironmentRow.hosts[oneHost.name].ips[i].heartbeat = false;
								oneEnvironmentRow.hosts[oneHost.name].ips[i].color = 'red';
							}
						}
					}
					for(var j = 0; j < oneEnvironmentRow.hosts[oneHost.name].ips.length; j++) {
						if(oneEnvironmentRow.hosts[oneHost.name].ips[j].heartbeat || oneEnvironmentRow.hosts[oneHost.name].ips[j].healthy) {
							count++;
						}
					}

					if(count === oneEnvironmentRow.hosts[oneHost.name].ips.length) {
						color = 'green';
						healthy = true;
					}
					else if(count === 0) {
						color = 'red';
						healthy = false;
					}
					else {
						color = 'yellow';
						healthy = false;
					}
					oneEnvironmentRow.hosts[oneHost.name].healthy = healthy;
					oneEnvironmentRow.hosts[oneHost.name].color = color;
					if(oneHost.name !== 'controller' && JSON.stringify(waitMessage) !== '{}') {
						oneEnvironmentRow.hosts[oneHost.name].waitMessage = waitMessage;
						$scope.closeWaitMessage(oneEnvironmentRow.hosts[oneHost.name]);
					}
				}
			});
		}
	};

	$scope.executeAwarenessTest = function(env, oneHost) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceName": oneHost.name,
				"operation": "awarenessStat",
				"serviceHost": oneHost.ip,
				"servicePort": oneHost.port,
				"env": env
			}
		}, function(error, awarenessResponse) {
			if(error || !awarenessResponse.result || !awarenessResponse.data) {
				console.log("error executing awareness test for controller on ip: " + oneHost.ip);
				$scope.waitMessage.type = 'danger';
				$scope.waitMessage.message = "error executing awareness test for controller on ip: " + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString();
				$scope.closeWaitMessage();
			}
			else {
				awarenessResponse = awarenessResponse.data;
				for(var oneService in awarenessResponse) {
					if(awarenessResponse.hasOwnProperty(oneService)) {
						if(oneService === 'controller') {
							continue;
						}

						if(awarenessResponse[oneService].awarenessStats) {
							var ips = Object.keys(awarenessResponse[oneService].awarenessStats);
							ips.forEach(function(serviceIp) {
								updateService(awarenessResponse, oneService, serviceIp);
							});
						}
					}
				}
			}
		});

		function updateService(response, oneService, serviceIp) {

			$scope.grid.rows.forEach(function(oneEnvironmentRow) {
				if(oneEnvironmentRow.code === env && oneEnvironmentRow.hosts[oneService]) {
					for(var i = 0; i < oneEnvironmentRow.hosts[oneService].ips.length; i++) {
						if(oneEnvironmentRow.hosts[oneService].ips[i].ip === serviceIp) {
							if(response[oneService].awarenessStats[serviceIp].healthy) {
								oneEnvironmentRow.hosts[oneService].ips[i].healthy = true;
								oneEnvironmentRow.hosts[oneService].ips[i].color = 'green';
							}
							else {
								oneEnvironmentRow.hosts[oneService].ips[i].healthy = false;
								oneEnvironmentRow.hosts[oneService].ips[i].color = 'red';
							}

							var lc = response[oneService].awarenessStats[serviceIp].lastCheck;
							oneEnvironmentRow.hosts[oneService].ips[i].lastCheck = getTimeAgo(lc);

							if(response[oneService].awarenessStats[serviceIp].downSince) {
								oneEnvironmentRow.hosts[oneService].ips[i].downSince = new Date(response[oneService].awarenessStats[serviceIp].downSince).toISOString();
							}
							if(response[oneService].awarenessStats[serviceIp].downCount) {
								oneEnvironmentRow.hosts[oneService].ips[i].downCount = response[oneService].awarenessStats[serviceIp].downCount;
							}

							oneEnvironmentRow.hosts[oneService].ips[i].controllers.forEach(function(oneCtrl) {
								if(oneCtrl.ip === oneHost.ip) {
									oneCtrl.color = 'green';
								}
							});
						}
					}

					var count = 0;
					oneEnvironmentRow.hosts[oneService].ips.forEach(function(oneIP) {
						if(oneIP.healthy) {
							count++;
						}
					});
					var healthy, color;
					if(count === oneEnvironmentRow.hosts[oneService].ips.length) {
						color = 'green';
						healthy = true;
					}
					else if(count === 0) {
						color = 'red';
						healthy = false;
					}
					else {
						color = 'yellow';
						healthy = false;
					}
					oneEnvironmentRow.hosts[oneService].healthy = healthy;
					oneEnvironmentRow.hosts[oneService].color = color;

					$scope.waitMessage.type = 'success';
					$scope.waitMessage.message = "Awareness test for controller on ip: " + oneHost.ip + ":" + oneHost.port + " was successful @ " + new Date().toISOString();
					$scope.closeWaitMessage();
				}
			});
		}
	};

	$scope.reloadRegistry = function(env, oneHost, cb) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceName": oneHost.name,
				"operation": "reloadRegistry",
				"serviceHost": oneHost.ip,
				"servicePort": oneHost.port,
				"env": env
			}
		}, function(error, response) {
			if(error) {
				console.log("error executing Reload Registry test for " + oneHost.name + " on ip: " + oneHost.ip);
				$scope.waitMessage.type = 'danger';
				$scope.waitMessage.message = "error executing Reload Registry test for " + oneHost.name + " on ip: " + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString();
				$scope.closeWaitMessage();
			}
			else {
				if(cb) {
					cb();
				}
				else {
					$modal.open({
						templateUrl: "serviceInfoBox.html",
						size: 'lg',
						backdrop: false,
						keyboard: false,
						controller: function($scope, $modalInstance) {
							$scope.title = "Reloaded Registry of " + oneHost.name;
							$scope.data = JSON.stringify(response, null, 2);
							setTimeout(function() {highlightMyCode()}, 500);
							$scope.ok = function() {
								$modalInstance.dismiss('ok');
							};
						}
					});
				}
			}
		});
	};

	$scope.loadProvisioning = function(env, oneHost) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceName": oneHost.name,
				"operation": "loadProvision",
				"serviceHost": oneHost.ip,
				"servicePort": oneHost.port,
				"env": env
			}
		}, function(error, response) {
			if(error) {
				console.log("error executing Reload Provision test for " + oneHost.name + " on ip: " + oneHost.ip);
				$scope.waitMessage.type = 'danger';
				$scope.waitMessage.message = "error executing Reload Provision test for " + oneHost.name + " on ip: " + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString();
				$scope.closeWaitMessage();
			}
			else {
				$modal.open({
					templateUrl: "serviceInfoBox.html",
					size: 'lg',
					backdrop: false,
					keyboard: false,
					controller: function($scope, $modalInstance) {
						$scope.title = "Reloaded Provisioned Information of " + oneHost.name;
						$scope.data = JSON.stringify(response, null, 2);
						setTimeout(function() {highlightMyCode()}, 500);
						$scope.ok = function() {
							$modalInstance.dismiss('ok');
						};
					}
				});
			}
		});
	};

	$scope.removeHost = function(env, serviceName, oneHost) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/hosts/delete",
			"params": {'env': env, 'ip': oneHost.ip, 'name': oneHost.name}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				for(var e = 0; e < $scope.grid.rows.length; e++) {
					if($scope.grid.rows[e].code === env) {
						for(var i = 0; i < $scope.grid.rows[e].hosts[serviceName].ips.length; i++) {
							if($scope.grid.rows[e].hosts[serviceName].ips[i].ip === oneHost.ip) {
								$scope.grid.rows[e].hosts[serviceName].ips.splice(i, 1);
							}
						}

						if(serviceName === 'controller') {
							for(var s in $scope.grid.rows[e].hosts) {
								if($scope.grid.rows[e].hosts.hasOwnProperty(s) && s !== 'controller') {
									for(var j = 0; j < $scope.grid.rows[e].hosts[s].ips.length; j++) {
										for(var k = 0; k < $scope.grid.rows[e].hosts[s].ips[j].controllers.length; k++) {
											if($scope.grid.rows[e].hosts[s].ips[j].controllers[k].ip === oneHost.ip) {
												$scope.grid.rows[e].hosts[s].ips[j].controllers.splice(k, 1);
											}
										}
									}
								}
							}
						}

						if(serviceName === 'controller') {
							for(var c = 0; c < $scope.grid.rows[e].controllers.length; c++) {
								if($scope.grid.rows[e].controllers[c].ip === oneHost.ip) {
									$scope.grid.rows[e].controllers[c].splice(c, 1);
								}
							}
						}
						$scope.grid.rows[e].controllers.forEach(function(oneController) {
							if(oneController.color === 'green') {
								$scope.reloadRegistry(env, oneController, function() {
									$scope.executeAwarenessTest(env, oneController);
								});
							}
						});
					}
				}
				$scope.$parent.displayAlert('success', "Selected Environment host has been removed.");
			}
		});
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
		if($scope.access.dbs.list){
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/dbs/list",
				"params": {"env": env}
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					if(response) {
						for(var i = 0; i < $scope.grid.rows.length; i++) {
							if($scope.grid.rows[i]['code'] === env) {
								$scope.grid.rows[i].dbs = response;
							}
						}
					}
					else {
						$scope.$parent.displayAlert('danger', "Unable to fetch Environment Database.");
					}
				}
			});
		}
	};

	$scope.removeDatabase = function(env, name) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/dbs/delete",
			"params": {"env": env, 'name': name}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(response) {
					$scope.$parent.displayAlert('success', "Selected Environment Database has been removed.");
					$scope.listDatabases(env);
				}
				else {
					$scope.$parent.displayAlert('danger', "Unable to remove selected Environment Database.");
				}
			}
		});
	};

	$scope.addDatabase = function(env, session) {
		var options = {
			timeout: $timeout,
			form: (session) ? environmentsConfig.form.session : environmentsConfig.form.database,
			name: 'addDatabase',
			label: 'Add New Database',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'name': formData.name,
							'cluster': formData.cluster
						};
						if(session) {
							postData['name'] = 'session';
							postData['sessionInfo'] = {
								'store': JSON.parse(formData.store),
								'dbName': formData.name,
								'expireAfter': formData.expireAfter * 3600 * 1000,
								'collection': formData.collection,
								'stringify': (formData.stringify === 'true')
							};
						}
						else {
							postData['tenantSpecific'] = (formData.tenantSpecific === 'true');
						}

						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/dbs/add",
							"params": {"env": env},
							"data": postData
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Database Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listDatabases(env);
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

	$scope.editDatabase = function(env, name, data) {
		var formData;
		if(name === 'session') {
			var t = angular.copy(data);
			delete t.cluster;
			formData = {
				"cluster": data.cluster,
				"name": data.name,
				"collection": data.collection,
				"stringify": data.stringify,
				"expireAfter": data.expireAfter / (3600 * 1000),
				"store": JSON.stringify(data.store, null, "\t")

			};
		}
		else {
			formData = angular.copy(data);
			formData.name = name;
		}
		var options = {
			timeout: $timeout,
			form: (name === 'session') ? angular.copy(environmentsConfig.form.session) : angular.copy(environmentsConfig.form.database),
			name: 'updateDatabase',
			label: 'Update Database',
			'data': formData,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'name': formData.name,
							'cluster': formData.cluster
						};
						if(name === 'session') {
							postData['name'] = 'session';
							postData['sessionInfo'] = {
								'store': JSON.parse(formData.store),
								'dbName': formData.name,
								'expireAfter': formData.expireAfter * 3600 * 1000,
								'collection': formData.collection,
								'stringify': (formData.stringify === 'true')
							};
						}
						else {
							postData['tenantSpecific'] = (formData.tenantSpecific === 'true');
						}

						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/dbs/update",
							"params": {"env": env},
							"data": postData
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Database Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listDatabases(env);
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

	$scope.updateDbPrefix = function(env, prefix) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/environment/dbs/updatePrefix",
			"params": {"env": env},
			"data": {'prefix': prefix}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(response) {
					$scope.$parent.displayAlert('success', "Environment Database Prefix has been removed.");
				}
				else {
					$scope.$parent.displayAlert('danger', "Unable to update Environment Database Prefix.");
				}
			}
		});
	};

	$scope.listClusters = function(env) {
		if($scope.access.clusters.list){
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/clusters/list",
				"params": {"env": env}
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					if(response) {
						for(var i = 0; i < $scope.grid.rows.length; i++) {
							if($scope.grid.rows[i]['code'] === env) {
								delete response.soajsauth;
								$scope.grid.rows[i].dbs.clusters = response;
								break;
							}
						}
					}
					else {
						$scope.$parent.displayAlert('danger', "Unable to fetch Environment Cluster.");
					}
				}
			});
		}
	};

	$scope.addCluster = function(env) {
		var options = {
			timeout: $timeout,
			form: environmentsConfig.form.cluster,
			name: 'addCluster',
			label: 'Add New Cluster',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var servers = formData.servers.split(",");
						for(var i = 0; i < servers.length; i++) {
							var t = servers[i].split(":");
							servers[i] = {
								"host": t[0],
								"port": t[1]
							};
						}
						var postData = {
							'cluster': {
								'servers': servers,
								'credentials': (formData.credentials) ? JSON.parse(formData.credentials) : {},
								'URLParam': (formData.urlParam) ? JSON.parse(formData.urlParam) : {},
								'extraParam': (formData.extraParam) ? JSON.parse(formData.extraParam) : {}
							}
						};

						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/clusters/add",
							"params": {"env": env, "name": formData.name},
							"data": postData
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Cluster Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listClusters(env);
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

	$scope.editCluster = function(env, name, data) {
		var formConfig = angular.copy(environmentsConfig.form.cluster);
		formConfig.entries[0].type = 'readonly';

		var servers = "";
		for(var i = 0; i < data.servers.length; i++) {
			servers += data.servers[i].host + ":" + data.servers[i].port;
		}
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editCluster',
			label: 'Edit Cluster',
			'data': {
				'name': name,
				'urlParam': JSON.stringify(data.URLParam, null, "\t"),
				'extraParam': JSON.stringify(data.extraParam, null, "\t"),
				'credentials': JSON.stringify(data.credentials, null, "\t"),
				'servers': servers
			},
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var servers = formData.servers.split(",");
						for(var i = 0; i < servers.length; i++) {
							var t = servers[i].split(":");
							servers[i] = {
								"host": t[0],
								"port": t[1]
							};
						}
						var postData = {
							'cluster': {
								'servers': servers,
								'credentials': (formData.credentials) ? JSON.parse(formData.credentials) : {},
								'URLParam': (formData.urlParam) ? JSON.parse(formData.urlParam) : {},
								'extraParam': (formData.extraParam) ? JSON.parse(formData.extraParam) : {}
							}
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/clusters/update",
							"params": {"env": env, "name": name},
							"data": postData
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Cluster Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listClusters(env);
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

	$scope.removeCluster = function(env, name) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/clusters/delete",
			"params": {"env": env, 'name': name}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(response) {
					$scope.$parent.displayAlert('success', "Selected Environment Cluster has been removed.");
					$scope.listClusters(env);
				}
				else {
					$scope.$parent.displayAlert('danger', "Unable to remove selected Environment Cluster.");
				}
			}
		});
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