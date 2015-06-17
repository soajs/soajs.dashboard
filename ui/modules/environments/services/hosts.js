"use strict";
var hostsServices = soajsApp.components;
hostsServices.service('envHosts', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

	function listHosts(currentScope, env, noPopulate) {
		var controllers = [];
		if(currentScope.access.listHosts) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/hosts/list",
				"params": {
					"env": env
				}
			}, function(error, response) {
				if(error || !response) {
					currentScope.$parent.displayAlert('danger', "Unable to retrieve services hosts information.");
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
			getSendDataFromServer(currentScope, ngDataApi, {
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
					currentScope.$parent.displayAlert('danger', "Unable to retrieve services hosts information.");
					console.log(error.message);
				}
				else {
					propulateServices(response.data);
				}
			});
		}

		function propulateServices(regServices) {
			for(var i = 0; i < currentScope.grid.rows.length; i++) {
				if(currentScope.grid.rows[i]['code'] === env) {
					currentScope.grid.rows[i].controllers = controllers;
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
										currentScope.executeHeartbeatTest(env, oneHost);
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

					currentScope.grid.rows[i].hosts = renderedHosts;
					break;
				}
			}
		}
	}

	function executeHeartbeatTest(currentScope, env, oneHost) {
		getSendDataFromServer(currentScope, ngDataApi, {
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
				currentScope.waitMessage.type = 'danger';
				currentScope.waitMessage.message = "error executing heartbeat test for " + oneHost.name + " on ip: " + oneHost.ip + " @ " + new Date().toISOString();
				currentScope.closeWaitMessage();
				currentScope.updateServicesControllers(env, oneHost);
			}
			else {
				if(heartbeatResponse.result) {
					currentScope.grid.rows.forEach(function(oneEnvironmentRow) {
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
					currentScope.waitMessage.type = 'success';
					currentScope.waitMessage.message = "Service " +
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
			currentScope.grid.rows.forEach(function(oneEnvironmentRow) {
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
										currentScope.executeAwarenessTest(env, oneHost);
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
						currentScope.closeWaitMessage(oneEnvironmentRow.hosts[oneHost.name]);
					}
				}
			});
		}
	}

	function updateServicesControllers(currentScope, env, currentCtrl) {
		currentScope.grid.rows.forEach(function(oneEnv) {
			if(oneEnv.code === env && (oneEnv.hosts && Object.keys(oneEnv.hosts).length > 0)) {

				for(var serviceName in oneEnv.hosts) {
					if(serviceName === 'controller') { continue; }

					if(oneEnv.hosts[serviceName].ips && Array.isArray(oneEnv.hosts[serviceName].ips) && oneEnv.hosts[serviceName].ips.length > 0) {
						oneEnv.hosts[serviceName].ips.forEach(function(OneIp) {

							if(OneIp.controllers && Array.isArray(OneIp.controllers) && OneIp.controllers.length > 0) {
								OneIp.controllers.forEach(function(oneCtrl) {

									if(oneCtrl.ip === currentCtrl.ip) {
										oneCtrl.color = 'red';
									}
								});
							}
						});
					}
				}
			}
		});
	}

	function executeAwarenessTest(currentScope, env, oneHost) {
		getSendDataFromServer(currentScope, ngDataApi, {
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
				currentScope.waitMessage.type = 'danger';
				currentScope.waitMessage.message = "error executing awareness test for controller on ip: " + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString();
				currentScope.closeWaitMessage();
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

			currentScope.grid.rows.forEach(function(oneEnvironmentRow) {
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

					currentScope.waitMessage.type = 'success';
					currentScope.waitMessage.message = "Awareness test for controller on ip: " + oneHost.ip + ":" + oneHost.port + " was successful @ " + new Date().toISOString();
					currentScope.closeWaitMessage();
				}
			});
		}
	}

	function reloadRegistry(currentScope, env, oneHost, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
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
				currentScope.waitMessage.type = 'danger';
				currentScope.waitMessage.message = "error executing Reload Registry test for " + oneHost.name + " on ip: " + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString();
				currentScope.closeWaitMessage();
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
						controller: function(currentScope, $modalInstance) {
							currentScope.title = "Reloaded Registry of " + oneHost.name;
							currentScope.data = JSON.stringify(response, null, 2);
							setTimeout(function() {highlightMyCode()}, 500);
							currentScope.ok = function() {
								$modalInstance.dismiss('ok');
							};
						}
					});
				}
			}
		});
	}

	function loadProvisioning(currentScope, env, oneHost) {
		getSendDataFromServer(currentScope, ngDataApi, {
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
				currentScope.waitMessage.type = 'danger';
				currentScope.waitMessage.message = "error executing Reload Provision test for " + oneHost.name + " on ip: " + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString();
				currentScope.closeWaitMessage();
			}
			else {
				$modal.open({
					templateUrl: "serviceInfoBox.html",
					size: 'lg',
					backdrop: false,
					keyboard: false,
					controller: function(currentScope, $modalInstance) {
						currentScope.title = "Reloaded Provisioned Information of " + oneHost.name;
						currentScope.data = JSON.stringify(response, null, 2);
						setTimeout(function() {highlightMyCode()}, 500);
						currentScope.ok = function() {
							$modalInstance.dismiss('ok');
						};
					}
				});
			}
		});
	}

	function removeHost(currentScope, env, serviceName, oneHost) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/hosts/delete",
			"params": {'env': env, 'ip': oneHost.ip, 'name': oneHost.name}
		}, function(error) {
			if(error) {
				currentScope.$parent.displayAlert('danger', error.message);
			}
			else {
				for(var e = 0; e < currentScope.grid.rows.length; e++) {
					if(currentScope.grid.rows[e].code === env) {
						for(var i = 0; i < currentScope.grid.rows[e].hosts[serviceName].ips.length; i++) {
							if(currentScope.grid.rows[e].hosts[serviceName].ips[i].ip === oneHost.ip) {
								currentScope.grid.rows[e].hosts[serviceName].ips.splice(i, 1);
							}
						}

						if(serviceName === 'controller') {
							for(var s in currentScope.grid.rows[e].hosts) {
								if(currentScope.grid.rows[e].hosts.hasOwnProperty(s) && s !== 'controller') {
									for(var j = 0; j < currentScope.grid.rows[e].hosts[s].ips.length; j++) {
										for(var k = 0; k < currentScope.grid.rows[e].hosts[s].ips[j].controllers.length; k++) {
											if(currentScope.grid.rows[e].hosts[s].ips[j].controllers[k].ip === oneHost.ip) {
												currentScope.grid.rows[e].hosts[s].ips[j].controllers.splice(k, 1);
											}
										}
									}
								}
							}
						}

						if(serviceName === 'controller') {
							for(var c = 0; c < currentScope.grid.rows[e].controllers.length; c++) {
								if(currentScope.grid.rows[e].controllers[c].ip === oneHost.ip) {
									currentScope.grid.rows[e].controllers[c].splice(c, 1);
								}
							}
						}
						currentScope.grid.rows[e].controllers.forEach(function(oneController) {
							if(oneController.color === 'green') {
								currentScope.reloadRegistry(env, oneController, function() {
									currentScope.executeAwarenessTest(env, oneController);
								});
							}
						});
					}
				}
				currentScope.$parent.displayAlert('success', "Selected Environment host has been removed.");
			}
		});
	}

	//todo: complete the below function if api changed
	function stopHost(currentScope, env, serviceName, oneHost, serviceInfo) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceName": oneHost.name,
				"operation": "stopHost",
				"serviceHost": oneHost.ip,
				"servicePort": oneHost.port,
				"env": env
			}
		}, function(error, response) {
			serviceInfo.waitMessage = {};
			if(error || !response) {
				serviceInfo.waitMessage.type = 'danger';
				serviceInfo.waitMessage.message = "error executing Stop Host Operation for " +
				                                  oneHost.name +
				                                  " on ip: " +
				                                  oneHost.ip +
				                                  ":" +
				                                  oneHost.port +
				                                  " @ " +
				                                  new Date().toISOString();
				currentScope.closeWaitMessage(serviceInfo);
			}
			else {
				oneHost.color = "red";
				serviceInfo.waitMessage.type = 'success';
				serviceInfo.waitMessage.message = "Host " + oneHost.name + " on ip: " + oneHost.ip + ":" + oneHost.port + " has been stopped @ " + new Date().toISOString();
				currentScope.closeWaitMessage(serviceInfo);

				if(serviceName === 'controller') {
					oneHost.heartbeat = false;
					currentScope.executeHeartbeatTest(env, oneHost);
				}
				else {
					oneHost.healthy = false;
					serviceInfo.healthy = false;
					serviceInfo.color = (serviceInfo.ips.length === 1) ? "red" : "yellow";
				}
			}
		});
	}

	//todo: complete the below function if api changed
	function startHost(currentScope, env, serviceName, oneHost, serviceInfo) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceName": oneHost.name,
				"operation": "startHost",
				"serviceHost": oneHost.ip,
				"servicePort": oneHost.port,
				"env": env
			}
		}, function(error, response) {
			serviceInfo.waitMessage = {};

			if(error || !response) {
				serviceInfo.waitMessage.type = 'danger';
				serviceInfo.waitMessage.message = "error executing Start Host Operation for " +
				                                  oneHost.name +
				                                  " on ip: " +
				                                  oneHost.ip +
				                                  ":" +
				                                  oneHost.port +
				                                  " @ " +
				                                  new Date().toISOString();
				currentScope.closeWaitMessage(serviceInfo);
			}
			else {
				serviceInfo.waitMessage.type = 'success';
				serviceInfo.waitMessage.message = "Host " + oneHost.name + " on ip: " + oneHost.ip + ":" + oneHost.port + " has started @ " + new Date().toISOString();
				currentScope.closeWaitMessage(serviceInfo);

				oneHost.color = "green";
				if(serviceName === 'controller') {
					oneHost.heartbeat = true;
					currentScope.executeHeartbeatTest(env, oneHost);
				}
				else {
					oneHost.healthy = true;
					serviceInfo.healthy = true;

					var color = "green";
					serviceInfo.ips.forEach(function(oneIp) {
						if(!oneIp.healthy) {
							color = "yellow";
						}
					});
					serviceInfo.color = color;
				}
			}
		});
	}

	//todo: complete the below function if api changed
	function infoHost(currentScope, env, serviceName, oneHost, serviceInfo) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceName": oneHost.name,
				"operation": "infoHost",
				"serviceHost": oneHost.ip,
				"servicePort": oneHost.port,
				"env": env
			}
		}, function(error, response) {
			if(error) {
				serviceInfo.waitMessage.type = 'danger';
				serviceInfo.waitMessage.message = "error executing get Host Info Operation for " +
				                                  oneHost.name +
				                                  " on ip: " +
				                                  oneHost.ip +
				                                  ":" +
				                                  oneHost.port +
				                                  " @ " +
				                                  new Date().toISOString();
				currentScope.closeWaitMessage(serviceInfo);
			}
			else {
				$modal.open({
					templateUrl: "serviceInfoBox.html",
					size: 'lg',
					backdrop: false,
					keyboard: false,
					controller: function($scope, $modalInstance) {
						$scope.title = "Host Information of " + oneHost.name;
						$scope.data = JSON.stringify(response, null, 2);
						setTimeout(function() {highlightMyCode()}, 500);
						$scope.ok = function() {
							$modalInstance.dismiss('ok');
						};
					}
				});
			}
		});
	}

	//todo: complete the below function if api changed
	function addHost(currentScope, env, serviceName, serviceInfo) {
		//open modal form, user inputs the number of hosts and call API
		//upon return, if successful, push new hosts ip under serviceInfo, execute heartbeat new hoss
		var options = {
			timeout: $timeout,
			form: angular.copy(environmentsConfig.form.host),
			name: 'addHost',
			label: 'Add New Host(s)',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/hosts/add",
							"params": {"env": env, "name": serviceName},
							"data": {'number': formData.number}
						}, function(error, response) {
							serviceInfo.waitMessage = {};
							if(error) {
								serviceInfo.waitMessage.type = 'danger';
								serviceInfo.waitMessage.message = error.message;
								currentScope.closeWaitMessage(serviceInfo);
								//currentScope.form.displayAlert('danger', error.message);
							}
							else {
								serviceInfo.waitMessage.type = 'success';
								serviceInfo.waitMessage.message = "Host(s) Added Successfully.";
								currentScope.closeWaitMessage(serviceInfo);

								currentScope.modalInstance.close();
								currentScope.form.formData = {};

								var hosttmpl = {
									'ip': '',
									'port': serviceInfo.port,
									'name': serviceName,
									'downCount': 'N/A',
									'downSince': 'N/A',
									'lastCheck': 'N/A',
									'healthy': true,
									'color': 'green',
									'controllers': []
								};

								for(var i = 0; i < response.length; i++) {
									var newHost = angular.copy(hosttmpl);
									newHost.ip = response[i].ip;

									response[i].controllers.forEach(function(oneCtrl) {
										newHost.controllers.push({
											'color': 'green',
											'ip': oneCtrl.ip,
											'port': oneCtrl.port,
											'name': 'controller'
										});
									});
									serviceInfo.ips.push(newHost);
								}

								currentScope.executeHeartbeatTest(env, newHost);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function() {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}

	return {
		'listHosts': listHosts,
		'executeHeartbeatTest': executeHeartbeatTest,
		'executeAwarenessTest': executeAwarenessTest,
		'reloadRegistry': reloadRegistry,
		'loadProvisioning': loadProvisioning,
		'removeHost': removeHost,
		'stopHost': stopHost,
		'startHost': startHost,
		'infoHost': infoHost,
		'addHost': addHost,
		'updateServicesControllers': updateServicesControllers
	};

}]);