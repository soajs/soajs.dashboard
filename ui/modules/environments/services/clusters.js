"use strict";
var clustersServices = soajsApp.components;
clustersServices.service('envClusters', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

	function listClusters(currentScope, env) {
		if(currentScope.access.clusters.list) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/clusters/list",
				"params": {"env": env}
			}, function(error, response) {
				if(error) {
					currentScope.$parent.displayAlert('danger', error.message);
				}
				else {
					if(response) {
						delete response.soajsauth;
						currentScope.clusters = response;
					}
					else {
						currentScope.$parent.displayAlert('danger', "Unable to fetch Environment Cluster.");
					}
				}
			});
		}
	}

	function addCluster(currentScope, env) {
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

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/clusters/add",
							"params": {"env": env, "name": formData.name},
							"data": postData
						}, function(error) {
							if(error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.$parent.displayAlert('success', 'Environment Cluster Added Successfully.');
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listClusters(env);
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

	function editCluster(currentScope, env, name, data) {
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
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/clusters/update",
							"params": {"env": env, "name": name},
							"data": postData
						}, function(error) {
							if(error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.$parent.displayAlert('success', 'Environment Cluster Updated Successfully.');
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listClusters(env);
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

	function removeCluster(currentScope, env, name) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/clusters/delete",
			"params": {"env": env, 'name': name}
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(response) {
					currentScope.$parent.displayAlert('success', "Selected Environment Cluster has been removed.");
					currentScope.listClusters(env);
				}
				else {
					currentScope.$parent.displayAlert('danger', "Unable to remove selected Environment Cluster.");
				}
			}
		});
	}

	return {
		'listClusters': listClusters,
		'addCluster': addCluster,
		'editCluster': editCluster,
		'removeCluster': removeCluster
	}
}]);