"use strict";
var dbServices = soajsApp.components;
dbServices.service('envDB', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

	function listDatabases(currentScope, env) {
		if (currentScope.access.dbs.list) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/dbs/list",
				"params": {"env": env}
			}, function (error, response) {
				if (error) {
					currentScope.$parent.displayAlert('danger', error.message);
				}
				else {
					if (response) {
						currentScope.dbs = response;
					}
					else {
						currentScope.$parent.displayAlert('danger', translation.unableFetchEnvironmentDatabase[LANG]);
					}
				}
			});
		}
	}

	function removeDatabase(currentScope, env, name) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/environment/dbs/delete",
			"params": {"env": env, 'name': name}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.message);
			}
			else {
				if (response) {
					currentScope.$parent.displayAlert('success', translation.selectedEnvironmentDatabaseRemoved[LANG]);
					currentScope.listDatabases(env);
				}
				else {
					currentScope.$parent.displayAlert('danger', translation.unableRemoveSelectedEnvironmentDatabase[LANG]);
				}
			}
		});
	}

	function addDatabase(currentScope, env, session) {
		var options = {
			timeout: $timeout,
			form: (session) ? environmentsConfig.form.session : environmentsConfig.form.database,
			name: 'addDatabase',
			label: 'Add New Database',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'name': formData.name,
							'cluster': formData.cluster
						};
						if (session) {
							postData['name'] = 'session';
							postData['sessionInfo'] = {
								'store': formData.store,
								'dbName': formData.name,
								'expireAfter': formData.expireAfter * 3600 * 1000,
								'collection': formData.collection,
								'stringify': formData.stringify
							};
						}
						else {
							postData['tenantSpecific'] = formData.tenantSpecific;
						}

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/environment/dbs/add",
							"params": {"env": env},
							"data": postData
						}, function (error) {
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.$parent.displayAlert('success', translation.environmentDatabaseAddedSuccessfully[LANG]);
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listDatabases(env);
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

	function editDatabase(currentScope, env, name, data) {
		var formData, formConfig;
		if (name === 'session') {
			var t = angular.copy(data);
			delete t.cluster;
			formData = {
				"cluster": data.cluster,
				"name": data.name,
				"collection": data.collection,
				"stringify": data.stringify,
				"expireAfter": data.expireAfter / (3600 * 1000),
				"store": data.store
			};
			formConfig = environmentsConfig.form.session;
		}
		else {
			formData = angular.copy(data);
			formData.name = name;

			formConfig = angular.copy(environmentsConfig.form.database);
			formConfig.entries.forEach(function (oneEntry) {
				if (oneEntry.name === 'name') {
					oneEntry.type = 'readonly';
				}
			});
		}
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'updateDatabase',
			label: translation.updateDatabase[LANG],
			'data': formData,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'name': formData.name,
							'cluster': formData.cluster
						};
						if (name === 'session') {
							postData['name'] = 'session';
							postData['sessionInfo'] = {
								'store': formData.store,
								'dbName': formData.name,
								'expireAfter': formData.expireAfter * 3600 * 1000,
								'collection': formData.collection,
								'stringify': formData.stringify
							};
						}
						else {
							postData['tenantSpecific'] = formData.tenantSpecific;
						}

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/environment/dbs/update",
							"params": {"env": env},
							"data": postData
						}, function (error) {
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.$parent.displayAlert('success', translation.environmentDatabaseAddedSuccessfully[LANG]);
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listDatabases(env);
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

	function updateDbPrefix(currentScope, env, prefix) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/environment/dbs/updatePrefix",
			"params": {"env": env},
			"data": {'prefix': prefix}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', translation.unableUpdateEnvironmentDatabasePrefix[LANG]);
			}
			else {
				currentScope.$parent.displayAlert('success', translation.environmentDatabasePrefixUpdated[LANG]);
			}
		});
	}

	return {
		'listDatabases': listDatabases,
		'removeDatabase': removeDatabase,
		'addDatabase': addDatabase,
		'editDatabase': editDatabase,
		'updateDbPrefix': updateDbPrefix
	};

}]);
