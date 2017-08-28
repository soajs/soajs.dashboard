"use strict";
var nodeSrv = soajsApp.components;
nodeSrv.service('nodeSrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	/**
	 * check for certificates
	 * @param currentScope
	 * @param env
	 */
	function checkCerts(currentScope, env) {
		currentScope.certsExist = {
			all: false,
			ca: false,
			cert: false,
			key: false
		};
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/platforms/list",
			"params": {
				env: env
			}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			}
			else if (response.selected.split('.')[1] === "kubernetes" || (response.selected.split('.')[1] === "docker" && response.selected.split('.')[2] === "remote")) {
				var requiredCerts = environmentsConfig.deployer.certificates.required;
				
				requiredCerts.forEach(function (oneCertType) {
					for (var i = 0; i < response.certs.length; i++) {
						if (response.certs[i].metadata.env[currentScope.envCode.toUpperCase()] && response.certs[i].metadata.env[currentScope.envCode.toUpperCase()].length > 0) {
							var currentSelected = response.selected.split('.')[1] + "." + response.selected.split('.')[2];
							if (response.certs[i].metadata.env[currentScope.envCode.toUpperCase()].indexOf(currentSelected) !== -1) {
								if (response.certs[i].metadata.certType === oneCertType) {
									currentScope.certsExist[oneCertType] = true;
								}
							}
						}
					}
				});
				
				currentScope.certsExist.all = (currentScope.certsExist.ca && currentScope.certsExist.cert && currentScope.certsExist.key);
			}
			else {
				//docker local does not require certificates, it uses unix socket
				currentScope.certsExist.all = true;
			}
		});
	}
	
	/**
	 * Nodes Functions
	 * @param currentScope
	 */
	function listNodes(currentScope) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cloud/nodes/list",
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.nodes.list = response;
				
				currentScope.nodes.list.forEach(function(oneNode){
					if(oneNode.labels && oneNode.labels.provider){
						currentScope.serviceProviders.forEach(function(oneProvider){
							if(oneProvider.v === oneNode.labels.provider){
								oneNode.tag = oneProvider;
							}
						});
					}
				});
			}
		});
	}
	
	function addNode(currentScope) {
		var formConfig = angular.copy(environmentsConfig.form.node);
		if (currentScope.envPlatform === 'kubernetes') {
			for (var i = formConfig.entries.length - 1; i >= 0; i--) {
				if (formConfig.entries[i].name === 'port' || formConfig.entries[i].name === 'role') {
					formConfig.entries.splice(i, 1);
				}
			}
		}
		
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addNode',
			label: 'Add New Node',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							env: currentScope.envCode,
							host: formData.ip,
							port: formData.port,
							role: formData.role
						};
						
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/cloud/nodes/add",
							"data": postData
						}, function (error, response) {
							overlayLoading.hide();
							currentScope.modalInstance.close();
							currentScope.form.formData = {};
							if (error) {
								currentScope.displayAlert('danger', error.message);
							}
							else {
								currentScope.displayAlert('success', 'Node added successfully');
								currentScope.listNodes();
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
	
	function removeNode(currentScope, nodeId) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/nodes/remove",
			"params": {
				env: currentScope.envCode,
				nodeId: nodeId
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Node removed successfully');
				currentScope.listNodes();
			}
		});
	}
	
	function updateNode(currentScope, node, type, newStatus) {
		var params = {
			env: currentScope.envCode,
			nodeId: node.id
		};
		
		var postData = {
			type: type,
			value: newStatus
		};
		
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/cloud/nodes/update",
			params: params,
			data: postData
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Node updated successfully');
				currentScope.listNodes();
			}
		});
	}
	
	function changeTag(currentScope, node){
		var data ={};
		var formConfig = angular.copy(environmentsConfig.form.nodeTag);
		
		if(node.tag){
			data.tag = node.tag.v;
		}
		
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'tagNode',
			label: 'Tag Node',
			data: data,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/cloud/nodes/tag",
							"data":{
								"id": node.id,
								"tag": formData.tag.v
							}
						}, function (error, response) {
							overlayLoading.hide();
							if (error) {
								currentScope.displayAlert('danger', error.message);
							}
							else {
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.displayAlert('success', 'Node tagged successfully');
								currentScope.listNodes();
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
	
	return {
		'listNodes': listNodes,
		'addNode': addNode,
		'removeNode': removeNode,
		'updateNode': updateNode,
		'checkCerts' : checkCerts,
		'changeTag': changeTag
	};
}]);
