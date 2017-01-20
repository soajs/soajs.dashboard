"use strict";
var swaggerEditorSrv = soajsApp.components;

swaggerEditorSrv.service('swaggerEditorSrv',['$timeout', function ($timeout) {
	
	function swaggerService(){
		
	}
	function buildSwaggerForm(currentScope) {
		var count = 0;
		var infoForm = swaggerEditorConfig.form;
		infoForm.entries.forEach(function (entry) {
				if (entry.name === 'dbs') {
					entry.entries = [];
					var oneClone = angular.copy(dbForm.db);
					for (var i = 0; i < oneClone.length; i++) {
						oneClone[i].name = oneClone[i].name.replace("%count%", count);
					}
					entry.entries = entry.entries.concat(oneClone);
					count++;
				}
				
				if (entry.name === 'addDb') {
					entry.onAction = function (id, data, form) {
						var oneClone = angular.copy(dbForm.db);
						form.entries.forEach(function (entry) {
							if (entry.name === 'dbs' && entry.type === 'group') {
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
			buildForm(currentScope,null, infoForm);
		}
	return {
		'swaggerService': swaggerService,
		'buildSwaggerForm': buildSwaggerForm
	}
}]);