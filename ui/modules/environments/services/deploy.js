"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', '$compile', function(ngDataApi, $timeout, $modal, $compile) {

	function deployEnvironment(currentScope, envCode) {
		var options = {
			timeout: $timeout,
			form: angular.copy(environmentsConfig.form.deploy),
			name: 'deployEnv',
			label: 'Deploy Environment ' + envCode,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						if(!formData.controllers || formData.controllers < 1) {
							$timeout(function() {
								alert("You must choose at least 1 controller to deploy this environment");
							}, 100);
						}
						else {
							currentScope.modalInstance.dismiss("ok");
							//todo: bish3a, zabbita
							var text = "<h2>Deploying new " + envCode + " Environment</h2>";
							text += "<p>Deploying " + formData.controllers + " new controllers for environment " + envCode + ".</p>";
							text += "<p>Do not refresh this page, this will take a few minutes...</p>";
							text += "<div id='progress_deploy_" + envCode + "' style='padding:10px;'></div>";
							jQuery('#overlay').html("<div class='bg'></div><div class='content'>" + text + "</div>");
							jQuery("#overlay .content").css("width", "40%").css("left", "30%");
							overlay.show();
							deployEnvironment(formData);
						}
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
		var hostnames = [];
		buildFormWithModal(currentScope, $modal, options);

		function deployEnvironment(formData) {
			var params = {
				'envCode': envCode,
				//'profile': environmentsConfig.profiles + formData.profile + ".js"
				'profile': environmentsConfig.profiles + "single.js",
				"image": environmentsConfig.ctrlImage
			};

			var max = formData.controllers + 1;
			var ele = angular.element(document.getElementById("progress_deploy_" + envCode));
			ele.html('<progressbar class="progress-striped active" value="0" max="' + max + '" type="info">0%</progressbar>');
			$compile(ele.contents())(currentScope);
			deployControllers(params, 0, formData.controllers, function() {
				deployNginx(formData, max);
			});
		}

		function deployControllers(params, counter, max, cb) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/hosts/deployController",
				"data": params
			}, function(error, response) {
				if(error) {
					currentScope.generateNewMsg(envCode, 'danger', error.message);
				}
				else {
						counter++;
						if(counter === max) {
							return cb();
						}
						else {
							hostnames.push(response.hostname);
							var ele = angular.element(document.getElementById("progress_deploy_" + envCode));
							var percentage = Math.ceil((counter * 100) / max);
							ele.html('<p>Controller(s) Deployed: ' + counter + '</p><br /><progressbar class="progress-striped active" value="' + counter + '" max="' + (max + 1) + '" type="info">' + percentage + '%</progressbar>');
							$compile(ele.contents())(currentScope);

							deployControllers(params, counter, max, cb);
						}
				}
			});
		}

		function deployNginx(formData, max) {
			var controllersContainers = [];
			for(var i = 0; i < hostnames.length; i++) {
				controllersContainers.push(hostnames[i] + ":controllerProxy0" + (i + 1));
			}
			var params = {
				'envCode': envCode,
				'containerNames': controllersContainers,
				"image": environmentsConfig.nginxImage
			};

			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/hosts/deployNginx",
				"data": params
			}, function(error) {
				if(error) {
					currentScope.generateNewMsg(envCode, 'danger', error.message);
				}
				else {
					var ele = angular.element(document.getElementById("progress_deploy_" + envCode));
					ele.html('<p>Controller(s) Deployed: ' + formData.controllers + ' <br />Nginx Deployed.</p><br /><progressbar class="progress-striped active" value="' + max + '" max="' + max + '" type="info">100%</progressbar>');
					$compile(ele.contents())(currentScope);
					//reload the environment ui

					$timeout(function(){
						currentScope.listHosts(envCode);
						overlay.hide();
					}, 2000);
				}
			});
		}
	}

	return {
		'deployEnvironment': deployEnvironment
	}
}]);