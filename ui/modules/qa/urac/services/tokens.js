"use strict";
var serviceUracApp = soajsApp.components;

serviceUracApp.service('tokensModuleQaHelper', ['ngDataApi', '$timeout', '$cookies', '$modal', function (ngDataApi, $timeout, $cookies, $modal) {
	
	function listTokens(currentScope, tokenConfig, firsCall, callback) {
		var tCode = $cookies.getObject('urac_merchant').code;
		if (currentScope.access.adminToken.list) {
			var opts = {
				"method": "get",
				"routeName": "/urac/owner/admin/tokens/list",
				"proxy": true,
				"params": {
					"start": currentScope.startLimit,
					"limit": currentScope.endLimit,
					"tCode": tCode,
					"__env": currentScope.currentSelectedEnvironment.toUpperCase()
				}
			};
			
			getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
				if (error) {
					currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
				}
				else {
					if (firsCall) {
						currentScope.totalCount = response.totalCount;
						currentScope.showNext = (currentScope.totalCount > currentScope.endLimit);
						currentScope.totalPagesActive = Math.ceil(currentScope.totalCount / currentScope.endLimit);
					}
					else {
						var nextLimit = currentScope.startLimit + currentScope.increment;
						if (currentScope.totalCount <= nextLimit) {
							currentScope.showNext = false;
						}
					}
					
					if (callback && typeof(callback) === 'function') {
						return callback(response);
					}
					else {
						printTokens(currentScope, tokenConfig, response);
					}
				}
			});
		}
	}
	
	function printTokens(currentScope, tokenConfig, response) {
		var tCode = $cookies.getObject('urac_merchant').code;
		
		response.records.forEach(function (record) {
			if (!record.username) {
				record.username = record.userId;
			}
		});
		
		var options = {
			grid: tokenConfig.grid,
			data: response.records,
			defaultSortField: 'code',
			left: [],
			top: []
		};
		
		if (currentScope.access.adminToken.delete) {
			options.top.push({
				'label': translation.delete[LANG],
				'msg': translation.areYouSureWantDeleteSelectedToken[LANG],
				'handler': 'deleteTokens'
			});
			
			options.left.push({
				'label': translation.delete[LANG],
				'icon': 'cross',
				'msg': translation.areYouSureWantDeleteSelectedToken[LANG],
				'handler': 'delete1Token'
			});
		}
		
		buildGrid(currentScope, options);
	}
	
	function delete1Token(currentScope, data) {
		var tCode = $cookies.getObject('urac_merchant').code;
		var opts = {
			"method": "del",
			"routeName": "/urac/owner/admin/tokens/delete",
			"proxy": true,
			"params": {
				"tCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				"tokenId": data._id
			}
		};
		
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				currentScope.$parent.displayAlert('success', translation.successMessageDeleteToken[LANG]);
				currentScope.listTokens();
			}
		});
	}
	
	function deleteTokens(currentScope) {
		
		var tCode = $cookies.getObject('urac_merchant').code;
		var config = {
			'routeName': "/urac/owner/admin/tokens/delete",
			"method": "del",
			"proxy": true,
			"params": {
				"tCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				'tokenId': '%id%'
			},
			'msg': {
				'error': translation.errorMessageDeleteToken[LANG],
				'success': translation.successMessageDeleteToken[LANG]
			}
		};
		
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			currentScope.listTokens();
		});
	}
	
	return {
		'listTokens': listTokens,
		'printTokens': printTokens,
		'deleteTokens': deleteTokens,
		'delete1Token': delete1Token
	}
}]);