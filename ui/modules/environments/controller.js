"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

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

				if($scope.grid.rows.length == 1){
					$scope.grid.rows[0].showOptions = true;
				}
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
						var postData = {
							'code': formData.code,
							'description': formData.description,
							'services': {
								"controller": JSON.parse(formData.controller),
								"config": JSON.parse(formData.serviceConfig)
							}
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

	$scope.updateEnvironment = function(data) {
		$scope.$parent.go('/environments/environment/'+data._id);
	};
	$scope.editEnvironment = function(data) {
		var formConfig = angular.copy(environmentConfig.form.environment);
		formConfig.entries[0].type = 'readonly';
		formConfig.entries[0].required = false;
		var envData = {
			"code": data.code,
			"description": data.description,
			"controller": JSON.stringify(data.services.controller, null, "\t"),
			"serviceConfig": JSON.stringify(data.services.config, null, "\t")
		};
		var options = {
			timeout: $timeout,
			form: formConfig,
			'name': 'editEnvironment',
			'label': 'Edit Environment',
			'data': envData,
			'actions': [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'description': formData.description,
							'services': {
								"controller": JSON.parse(formData.controller),
								"config": JSON.parse(formData.serviceConfig)
							}
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
								'stringify': (formData.stringify ==='true')? true: false
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


environmentsApp.controller('envirEditCtrl', ['$scope', '$timeout', '$modal','$routeParams' ,'ngDataApi', function($scope, $timeout, $modal, $routeParams ,ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	$scope.envId='';
	$scope.formEnvironment={};
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
				var l = response.length;
				$scope.envId = $routeParams.id;
				for(var x=0; x< l ; x++){
					if( response[x]._id == $scope.envId){
						$scope.formEnvironment = response[x];
						break;
					}
				}

			}
		});
	};

	$scope.save = function() {
		var postData = $scope.formEnvironment;
		delete postData.dbs;
		if( typeof( $scope.formEnvironment.services.controller['authorization'] )=='string'){
			postData.services.controller.authorization = Boolean($scope.formEnvironment.services.controller['authorization']);
		}

		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/environment/update",
			"params": {"id": 	$scope.envId},
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



	//default operation
	$scope.listEnvironments();

}]);

