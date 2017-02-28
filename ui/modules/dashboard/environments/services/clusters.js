"use strict";
var clustersServices = soajsApp.components;
clustersServices.service('envClusters', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function listClusters(currentScope, env) {
		if (currentScope.access.clusters.list) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/clusters/list",
				"params": {"env": env}
			}, function (error, response) {
				if (error) {
					currentScope.$parent.displayAlert('danger', error.message);
				}
				else {
					if (response) {
						delete response.soajsauth;
						currentScope.clusters = response;
					}
					else {
						currentScope.$parent.displayAlert('danger', translation.unableFetchEnvironmentCluster[LANG]);
					}
				}
			});
		}
	}
	
	function addCluster(currentScope, env) {
		var count = 0;
		
		function addType(type) {
			count = 0;
			var formConf;
			if (environmentsConfig.form.clusters[type]) {
				formConf = environmentsConfig.form.clusters[type];
			}
			else {
				formConf = environmentsConfig.form.clusters['default'];
			}
			formConf.entries.forEach(function (entry) {
				if (entry.name === 'servers') {
					entry.entries = [];
					var oneClone = angular.copy(modelObj.cluster.server);
					for (var i = 0; i < oneClone.length; i++) {
						oneClone[i].name = oneClone[i].name.replace("%count%", count);
					}
					entry.entries = entry.entries.concat(oneClone);
					count++;
				}
				
				if (entry.name === 'addServer') {
					entry.onAction = function (id, data, form) {
						var oneClone = angular.copy(modelObj.cluster.server);
						form.entries.forEach(function (entry) {
							if (entry.name === 'servers' && entry.type === 'group') {
								for (var i = 0; i < oneClone.length; i++) {
									oneClone[i].name = oneClone[i].name.replace("%count%", count);
								}
								entry.entries = entry.entries.concat(oneClone);
							}
						});
						count++;
					};
				}
			});
			var options = {
				timeout: $timeout,
				form: formConf,
				name: 'addCluster',
				label: translation.addNewCluster[LANG], // + ': ' + type,
				actions: [
					{
						'type': 'submit',
						'label': translation.submit[LANG],
						'btn': 'primary',
						'action': function (formData) {
							var servers = [];
							for (var i = 0; i < count; i++) {
								var tmpObj = {
									host: formData['host' + i],
									port: formData['port' + i]
								};
								if (tmpObj.port && tmpObj.host && tmpObj.host !== '' && tmpObj.port !== '') {
									servers.push(tmpObj);
								}
							}
							
							var credentials = {};
							if (formData.username) {
								credentials.username = formData.username;
							}
							if (formData.password) {
								credentials.password = formData.password;
							}
							
							var urlParam = {};
							switch (type) {
								case 'mongo':
									if (formData.connectTimeoutMS) {
										urlParam.connectTimeoutMS = formData.connectTimeoutMS;
									}
									if (formData.socketTimeoutMS) {
										urlParam.socketTimeoutMS = formData.socketTimeoutMS;
									}
									if (formData.maxPoolSize) {
										urlParam.maxPoolSize = formData.maxPoolSize;
									}
									if (formData.wtimeoutMS) {
										urlParam.wtimeoutMS = formData.wtimeoutMS;
									}
									if (formData.slaveOk) {
										urlParam.slaveOk = formData.slaveOk;
									}
									break;
								case 'es':
									if (formData.protocol) {
										urlParam.protocol = formData.protocol;
									}
									break;
								case 'default':
									urlParam = (formData.urlParam) ? formData.urlParam : {};
									break;
							}
							
							var extraParam = (formData.extraParam) ? formData.extraParam : {};
							var streamingOptions = (formData.streaming) ? formData.streaming : {};
							
							var postData = {
								'cluster': {
									'servers': servers,
									'credentials': credentials,
									'URLParam': urlParam,
									'extraParam': extraParam,
									'streaming': streamingOptions
								}
							};
							//postData.cluster.clusterType = type;
							
							getSendDataFromServer(currentScope, ngDataApi, {
								"method": "post",
								"routeName": "/dashboard/environment/clusters/add",
								"params": {"env": env, "name": formData.name},
								"data": postData
							}, function (error) {
								if (error) {
									currentScope.form.displayAlert('danger', error.message);
								}
								else {
									currentScope.$parent.displayAlert('success', translation.environmentClusterAddedSuccessfully[LANG]);
									currentScope.modalInstance.close();
									currentScope.form.formData = {};
									currentScope.listClusters(env);
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							currentScope.modalInstance.dismiss('cancel');
							currentScope.form.formData = {};
						}
					}
				]
			};
			
			buildFormWithModal(currentScope, $modal, options);
		}
		
		function getClusterType(currentScope, env) {
			var options1 = {
				timeout: $timeout,
				form: environmentsConfig.form.clusterType,
				name: 'addCluster',
				label: translation.addNewCluster[LANG],
				actions: [
					{
						'type': 'submit',
						'label': translation.submit[LANG],
						'btn': 'primary',
						'action': function (formData) {
							currentScope.modalInstance.dismiss('cancel');
							addType(formData.type);
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							currentScope.modalInstance.dismiss('cancel');
							currentScope.form.formData = {};
						}
					}
				]
			};
			
			buildFormWithModal(currentScope, $modal, options1);
		}
		
		//getClusterType(currentScope, env);
		
		addType('default');
	}
	
	function editCluster(currentScope, env, name, data) {
		var count = 0;
		var formConfig = angular.copy(environmentsConfig.form.clusters.default);
		
		// TODO: edit by type
		// if (data.clusterType) {
		// 	if (environmentsConfig.form.clusters['data.clusterType']) {
		// 	}
		// }
		formConfig.entries.forEach(function (entry) {
			if (entry.name === 'name') {
				entry.type = 'readonly';
			}
			if (entry.name === 'servers') {
				count = 0;
				entry.entries = [];
				if (data.servers && data.servers.length) {
					for (var i = 0; i < data.servers.length; i++) {
						var clone = angular.copy(modelObj.cluster.server);
						clone.forEach(function (oneField) {
							oneField.name = oneField.name.replace("%count%", count);
							
							if (oneField.name === 'port' + count) {
								oneField.value = data.servers[i].port;
							}
							if (oneField.name === 'host' + count) {
								oneField.value = data.servers[i].host;
							}
							
							if (oneField.type === 'html') {
								oneField.value = oneField.value.replace("%count%", count);
							}
							entry.entries.push(oneField);
						});
						count++;
					}
				}
			}
			if (entry.name === 'addServer') {
				entry.onAction = function (id, data, form) {
					var oneClone = angular.copy(modelObj.cluster.server);
					form.entries.forEach(function (entry) {
						if (entry.name === 'servers' && entry.type === 'group') {
							for (var i = 0; i < oneClone.length; i++) {
								oneClone[i].name = oneClone[i].name.replace("%count%", count);
							}
							entry.entries = entry.entries.concat(oneClone);
						}
					});
					count++;
				};
			}
			if (entry.name === 'credentials') {
				
			}
		});
		var clusterType = data.clusterType;
		
		var dataForm = {
			'name': name,
			'urlParam': angular.copy(data.URLParam),
			'extraParam': angular.copy(data.extraParam),
			'streaming': angular.copy(data.streaming)
		};
		
		if (data.credentials && typeof(data.credentials) === 'object') {
			dataForm.username = data.credentials.username;
			dataForm.password = data.credentials.password;
		}
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editCluster',
			label: translation.editCluster[LANG],
			'data': dataForm,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var servers = [];
						for (var i = 0; i < count; i++) {
							var tmpObj = {
								host: formData['host' + i],
								port: formData['port' + i]
							};
							if (tmpObj.port && tmpObj.host && tmpObj.host !== '' && tmpObj.port !== '') {
								servers.push(tmpObj);
							}
						}
						
						var extraParam = (formData.extraParam) ? formData.extraParam : {};
						var urlParam = (formData.urlParam) ? formData.urlParam : {};
						var streamingOptions = (formData.streaming) ? formData.streaming : {};
						
						var credentials = {};
						if (formData.username) {
							credentials.username = formData.username;
						}
						if (formData.password) {
							credentials.password = formData.password;
						}
						var postData = {
							'cluster': {
								'servers': servers,
								'credentials': credentials,
								'URLParam': urlParam,
								'extraParam': extraParam,
								'streaming': streamingOptions
							}
						};
						
						if (clusterType) {
							postData.cluster.clusterType = clusterType;
						}
						
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/environment/clusters/update",
							"params": {"env": env, "name": name},
							"data": postData
						}, function (error) {
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.$parent.displayAlert('success', translation.environmentClusterAddedSuccessfully[LANG]);
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listClusters(env);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
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
			"method": "delete",
			"routeName": "/dashboard/environment/clusters/delete",
			"params": {"env": env, 'name': name}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.message);
			}
			else {
				if (response) {
					currentScope.$parent.displayAlert('success', translation.selectedEnvironmentClusterRemoved[LANG]);
					currentScope.listClusters(env);
				}
				else {
					currentScope.$parent.displayAlert('danger', translation.unableRemoveSelectedEnvironmentCluster[LANG]);
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
