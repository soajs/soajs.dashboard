"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', '$http', 'ngDataApi', function($scope, $timeout, $modal, $http, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.waitMessage = {
		type: "info",
		message: "Services Detected. Awareness check in progress. Please wait...",
		close: function() {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};

	$scope.access = {
		addEnvironment: $scope.buildPermittedOperation('dashboard', '/environment/add'),
		deleteEnvironment: $scope.buildPermittedOperation('dashboard', '/environment/delete'),
		editEnvironment: $scope.buildPermittedOperation('dashboard', '/environment/update'),
		listHosts: $scope.buildPermittedOperation('dashboard', '/hosts/list'),
		dbs: {
			list: $scope.buildPermittedOperation('dashboard', '/environment/dbs/list'),
			delete: $scope.buildPermittedOperation('dashboard', '/environment/dbs/delete'),
			add: $scope.buildPermittedOperation('dashboard', '/environment/dbs/add'),
			update: $scope.buildPermittedOperation('dashboard', '/environment/dbs/update'),
			updatePrefix: $scope.buildPermittedOperation('dashboard', '/environment/dbs/updatePrefix')
		}
	};

	$scope.access.clusters = {
		add: $scope.buildPermittedOperation('dashboard', '/environment/clusters/add'),
		list: $scope.buildPermittedOperation('dashboard', '/environment/clusters/list'),
		delete: $scope.buildPermittedOperation('dashboard', '/environment/clusters/delete'),
		update: $scope.buildPermittedOperation('dashboard', '/environment/clusters/update')
	};

	$scope.expand = function(row) {
		row.showOptions = true;
	};

	$scope.collapse = function(row) {
		row.showOptions = false;
	};

	$scope.listEnvironments = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.grid = {
					rows: response
				};

				if($scope.grid.rows) {
					if($scope.grid.rows.length == 1) {
						$scope.grid.rows[0].showOptions = true;
					}
				}

			}
		});
	};

	$scope.listHosts = function(env) {
		var controllers = [];
		$http({
			url: apiConfiguration.domain + ":5000/reloadRegistry",
			method: 'get',
			responseType: 'json',
			cache: false,
			timeout: 20000,
			json: true
		}).success(function(response) {
			if(response && response.services) {
				response.services.controller.hosts.forEach(function(oneCtrl) {
					controllers.push({'ip': oneCtrl, 'color': 'red'});
				});
				propulateServices(response.services);
			}
			else {
				$scope.$parent.displayAlert('danger', "Unable to retrieve services hosts information.");
			}
		}).error(function() {
			$scope.$parent.displayAlert('danger', "Unable to retrieve services hosts information.");
		});

		function propulateServices(regServices) {
			for(var i = 0; i < $scope.grid.rows.length; i++) {
				if($scope.grid.rows[i]['code'] === env) {

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
								if(serviceName === 'controller') {
									var oneHost = {'ip': oneHostIP, 'name': serviceName, 'heartbeat': false, 'color': 'red', 'port': regServices[serviceName].port};
									$timeout(function() {
										$scope.executeHeartbeatTest(env, oneHost);
									}, 2000);
								}
								else {
									var oneHost = {
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
		$http({
			url: "http://" + oneHost.ip + ":" + (oneHost.port + 1000) + "/heartbeat",
			method: 'get',
			responseType: 'json',
			cache: false,
			timeout: 20000,
			json: true
		}).success(function(heartbeatResponse) {
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
				$scope.waitMessage.message = "Service " + oneHost.name + " on address: " + oneHost.ip + ":" + oneHost.port + " is healthy @ " + new Date().toISOString() + ", checking services please wait...";
			}
		}).error(function() {
			console.log("error executing heartbeat test for " + oneHost.name + " on ip: " + oneHost.ip);
			updateServiceStatus(false);
			$scope.waitMessage.type = 'danger';
			$scope.waitMessage.message = "error executing heartbeat test for " + oneHost.name + " on ip: " + oneHost.ip + " @ " + new Date().toISOString();
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
									}, 5000);
								}
								else {
									oneEnvironmentRow.hosts[oneHost.name].ips[i].healthy = true;
									oneEnvironmentRow.hosts[oneHost.name].ips[i].color = 'green';
									waitMessage = {
										type: "success",
										message: "Service " + oneHost.name + " on address: " + oneHost.ip + ":" + oneHost.port + " is healthy @ " + new Date().toISOString(),
										close: function(entry){
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
					for(var i = 0; i < oneEnvironmentRow.hosts[oneHost.name].ips.length; i++) {
						if(oneEnvironmentRow.hosts[oneHost.name].ips[i].heartbeat || oneEnvironmentRow.hosts[oneHost.name].ips[i].healthy) {
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
					}
				}
			});
		}
	};

	$scope.executeAwarenessTest = function(env, oneHost) {
		$http({
			url: "http://" + oneHost.ip + ":5000/awarenessStat",
			method: 'get',
			responseType: 'json',
			cache: false,
			timeout: 20000,
			json: true
		}).success(function(awarenessResponse) {

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
			$scope.waitMessage.type = 'success';
			$scope.waitMessage.message = "Awareness test for controller on ip: " + oneHost.ip + ":" + oneHost.port + " was successful @ " + new Date().toISOString();

		}).error(function() {
			console.log("error executing awareness test for controller on ip: " + oneHost.ip);
			$scope.waitMessage.type = 'danger';
			$scope.waitMessage.message = "error executing awareness test for controller on ip: " + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString();
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
				}
			});
		}
	};

	$scope.reloadRegistry = function(env, oneHost) {
		$http({
			url: "http://" + oneHost.ip + ":" + (oneHost.port + 1000) + "/reloadRegistry",
			method: 'get',
			responseType: 'json',
			json: true
		}).success(function(response) {
			if(response) {
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
		}).error(function() {
			console.log("error executing Reload Registry test for " + oneHost.name + " on ip: " + oneHost.ip);
		});
	};

	$scope.loadProvisioning = function(env, oneHost) {
		$http({
			url: "http://" + oneHost.ip + ":" + (oneHost.port + 1000) + "/loadProvision",
			method: 'get',
			responseType: 'json',
			json: true
		}).success(function(response) {
			if(response) {
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
		}).error(function() {
			console.log("error executing Reload Provision test for " + oneHost.name + " on ip: " + oneHost.ip);
		});
	};

	$scope.removeHost = function(env, oneHost) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/hosts/delete",
			"params": {'env': env, 'ip': oneHost.ip, 'name': oneHost.name}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Selected Environment host has been removed.");
				$scope.listHosts(env);
			}
		});
	};

	$scope.updateEnvironment = function(data) {
		$scope.$parent.go('/environments/environment/' + data._id);
	};

	$scope.removeEnvironment = function(row) {
		getSendDataFromServer(ngDataApi, {
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
		getSendDataFromServer(ngDataApi, {
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
	};

	$scope.removeDatabase = function(env, name) {
		getSendDataFromServer(ngDataApi, {
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
			form: (session) ? environmentConfig.form.session : environmentConfig.form.database,
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
								'stringify': (formData.stringify === 'true') ? true : false
							};
						}
						else {
							postData['tenantSpecific'] = (formData.tenantSpecific === 'true') ? true : false;
						}

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/dbs/add",
							"params": {"env": env},
							"data": postData
						}, function(error, response) {
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
		if(name === 'session') {
			var t = angular.copy(data);
			delete t.cluster;
			var formData = {
				"cluster": data.cluster,
				"name": data.name,
				"collection": data.collection,
				"stringify": data.stringify,
				"expireAfter": data.expireAfter / (3600 * 1000),
				"store": JSON.stringify(data.store, null, "\t")

			};
		}
		else {
			var formData = angular.copy(data);
			formData.name = name;
		}
		var options = {
			timeout: $timeout,
			form: (name === 'session') ? angular.copy(environmentConfig.form.session) : angular.copy(environmentConfig.form.database),
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
								'stringify': (formData.stringify === 'true') ? true : false
							};
						}
						else {
							postData['tenantSpecific'] = (formData.tenantSpecific === 'true') ? true : false;
						}

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/dbs/update",
							"params": {"env": env},
							"data": postData
						}, function(error, response) {
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
		getSendDataFromServer(ngDataApi, {
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
		getSendDataFromServer(ngDataApi, {
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
	};

	$scope.addCluster = function(env) {
		var options = {
			timeout: $timeout,
			form: environmentConfig.form.cluster,
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

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/clusters/add",
							"params": {"env": env, "name": formData.name},
							"data": postData
						}, function(error, response) {
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
		var formConfig = angular.copy(environmentConfig.form.cluster);
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
						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/clusters/update",
							"params": {"env": env, "name": name},
							"data": postData
						}, function(error, response) {
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
		getSendDataFromServer(ngDataApi, {
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
	$scope.listEnvironments();

}]);

environmentsApp.controller('envirEditCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	$scope.envId = '';
	$scope.formEnvironment = {};
	$scope.formEnvironment.services = {};

	$scope.expand = function(row) {
		row.showOptions = true;
	};
	$scope.isAdd = false;
	$scope.isEdit = false;

	$scope.collapse = function(row) {
		row.showOptions = false;
	};

	$scope.getEnvironment = function() {
		if($routeParams.id) {
			getSendDataFromServer(ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/list"
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					var l = response.length;
					$scope.isEdit = true;
					$scope.envId = $routeParams.id;
					for(var x = 0; x < l; x++) {
						if(response[x]._id == $scope.envId) {
							$scope.formEnvironment = response[x];
							break;
						}
					}
				}
			});
		}
		else {
			$scope.isAdd = true;
		}
	};

	$scope.saveEdit = function() {
		var postData = $scope.formEnvironment;
		delete postData.dbs;
		if($scope.formEnvironment.services.config && $scope.formEnvironment.services.config.oauth && $scope.formEnvironment.services.config.oauth.grants) {
			if(typeof($scope.formEnvironment.services.config.oauth.grants) == 'string') {
				postData.services.config.oauth.grants = postData.services.config.oauth.grants.replace(/ /g, '');
				var arr = postData.services.config.oauth.grants.split(",");
				postData.services.config.oauth.grants = arr;
			}
		}
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/environment/update",
			"params": {"id": $scope.envId},
			"data": postData
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Environment Updated Successfully.');
			}
		});
	};
	$scope.saveCreate = function() {
		if($scope.envirForm.$valid) {
			var postData = $scope.formEnvironment;
			delete postData.dbs;
			if($scope.formEnvironment.services.config && $scope.formEnvironment.services.config.oauth && $scope.formEnvironment.services.config.oauth.grants) {
				if(typeof($scope.formEnvironment.services.config.oauth.grants) == 'string') {
					postData.services.config.oauth.grants = postData.services.config.oauth.grants.replace(/ /g, '');
					var arr = postData.services.config.oauth.grants.split(",");
					postData.services.config.oauth.grants = arr;
				}
			}
			getSendDataFromServer(ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/environment/add",
				"params": {"id": $scope.envId},
				"data": postData
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', 'Environment Updated Successfully.');
				}
			});

		}
	};

	//default operation
	$scope.getEnvironment();

}]);