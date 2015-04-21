"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

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
			}
		});
	};

	$scope.listHosts = function(env) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/hosts/list",
			"params": {"env": env}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				for(var i = 0; i < $scope.grid.rows.length; i++) {
					if($scope.grid.rows[i]['code'] === env) {
						$scope.grid.rows[i].hosts = response;
					}
				}
			}
		});
	};

	$scope.addEnvironment = function() {
		var options = {
			timeout: $timeout,
			form: environmentConfig.form.environment,
			name: 'addEnvironment',
			label: 'Add New Environment',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						formData.ips = formData.ips.replace(/ /g, '');
						var postData = {
							'code': formData.code,
							'description': formData.description,
							'ips': formData.ips.split(",")
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/add",
							"data": postData
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.$parent.$emit('reloadEnvironments', {});
								$scope.listEnvironments();
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

	$scope.editEnvironment = function(data) {
		var formConfig = angular.copy(environmentConfig.form.environment);
		formConfig.entries[0].type = 'readonly';

		var options = {
			timeout: $timeout,
			form: formConfig,
			'name': 'editEnvironment',
			'label': 'Edit Environment',
			'data': data,
			'actions': [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						formData.ips = formData.ips.replace(/ /g, '');
						var postData = {
							'description': formData.description,
							'ips': formData.ips.split(",")
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/update",
							"params": {"id": data['_id']},
							"data": postData
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listEnvironments();
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
				}]
		};
		buildFormWithModal($scope, $modal, options);
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
							postData['sessionInfo'] = JSON.parse(formData.sessionInfo);
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
		var formData = angular.copy(data);
		formData.name = name;
		var options = {
			timeout: $timeout,
			form: (name === 'session') ? angluar.copy(environmentConfig.form.session) : angular.copy(environmentConfig.form.database),
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
							postData['sessionInfo'] = JSON.parse(formData.sessionInfo);
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
