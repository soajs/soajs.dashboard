"use strict";
var myAccountApp = soajsApp.components;

myAccountApp.controller('changeSecurityCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function ($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	$scope.$parent.$on('xferData', function (event, args) {
		$scope.memberData = args.memberData;
	});
	$scope.changeEmail = function () {
		var config = changeEmailConfig.formConf;
		var options = {
			form: config,
			'timeout': $timeout,
			'name': 'changeEmail',
			'label': translation.changeEmail[LANG],
			'actions': [
				{
					'type': 'submit',
					'label': translation.changeEmail[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'email': formData.email
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"headers": {
								"key": apiConfiguration.key
							},
							"routeName": "/urac/account/changeEmail",
							"params": {"uId": $scope.memberData._id},
							"data": postData
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'urac', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.successMsgChangeEmail[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.changePassword = function () {
		var config = changePwConfig.formConf;
		var options = {
			form: config,
			'timeout': $timeout,
			'name': 'changePassword',
			'label': translation.changePassword[LANG],
			'actions': [
				{
					'type': 'submit',
					'label': translation.changePassword[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'password': formData.password,
							'oldPassword': formData.oldPassword,
							'confirmation': formData.confirmPassword
						};
						if (formData.password != formData.confirmPassword) {
							$scope.form.displayAlert('danger', translation.errorMessageChangePassword[LANG]);
							return;
						}
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"headers": {
								"key": apiConfiguration.key
							},
							"routeName": "/urac/account/changePassword",
							"params": {"uId": $scope.memberData._id},
							"data": postData
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'urac', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.successMsgChangePassword[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
}]);

myAccountApp.controller('myAccountCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', '$cookies', '$cookieStore', function ($scope, $timeout, $modal, ngDataApi, $cookies, $cookieStore) {
	$scope.$parent.isUserLoggedIn();
	var userCookie = $cookieStore.get('soajs_user');

	var formConfig = {
		'timeout': $timeout,
		'name': 'editProfile',
		'label': translation.editProfile[LANG],
		'entries': [],
		'data': {},
		'actions': [
			{
				'type': 'submit',
				'label': translation.editProfile[LANG],
				'btn': 'primary',
				'action': function (formData) {
					var profileObj = {};
					if (formData.profile && (formData.profile != "")) {
						try {
							profileObj = JSON.parse(formData.profile);
						}
						catch (e) {
							$scope.$parent.displayAlert('danger', translation.errorInvalidProfileJsonObject[LANG]);
							return;
						}
					}

					var prof = JSON.stringify(profileObj);
					var postData = {
						'username': formData.username, 'firstName': formData.firstName, 'lastName': formData.lastName,
						'profile': prof
					};
					getSendDataFromServer($scope, ngDataApi, {
						"method": "send",
						"routeName": "/urac/account/editProfile",
						"params": {"uId": $scope.uId},
						"headers": {
							"key": apiConfiguration.key
						},
						"data": postData
					}, function (error) {
						if (error) {
							$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', translation.profileUpdatedSuccessfully[LANG]);
							userCookie.firstName = formData.firstName;
							userCookie.username = formData.username;
							userCookie.lastName = formData.lastName;
							userCookie.profile = profileObj;

							$cookieStore.put('soajs_user', userCookie);
							$scope.$parent.$emit('refreshWelcome', {});
						}
					});
				}
			}
		],
		form: profileConfig.formConf
	};

	$scope.getProfile = function (username) {
		getSendDataFromServer($scope, ngDataApi, {
			"headers": {
				"key": apiConfiguration.key
			},
			"method": "get",
			"routeName": "/urac/account/getUser",
			"params": {"username": username}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			}
			else {
				$scope.uId = response._id;
				var p = JSON.stringify(response.profile, null, "\t");
				formConfig.entries = [
					{
						'name': 'firstName',
						'label': translation.firstName[LANG],
						'type': 'text',
						'placeholder': translation.enterFirstName[LANG],
						'value': response.firstName,
						'tooltip': translation.enterFirstNameUser[LANG],
						'required': true
					},
					{
						'name': 'lastName',
						'label': translation.lastName[LANG],
						'type': 'text',
						'placeholder': translation.enterLastName[LANG],
						'value': response.lastName,
						'tooltip': translation.enterLastNameUser[LANG],
						'required': true
					},
					{
						'name': 'email',
						'label': translation.email[LANG],
						'type': 'readonly',
						'placeholder': translation.enterEmail[LANG],
						'value': response.email,
						'tooltip': translation.emailToolTip[LANG],
						'required': true
					},
					{
						'name': 'username',
						'label': translation.username[LANG],
						'type': 'text',
						'placeholder': translation.enterUsername[LANG],
						'value': response.username,
						'tooltip': translation.usernamesToolTip[LANG],
						'required': true
					},
					{
						'name': 'profile',
						'label': translation.profile[LANG],
						'type': 'textarea',
						'value': p,
						'placeholder': translation.JSONObjectRepresentingYourProfile[LANG],
						'tooltip': translation.fillYourAdditionalProfileInformation[LANG],
						'required': false,
						'rows': 10
					}
				];
				//formConfig.data = response;
				formConfig.data.profile = p;
				//buildFormWithModal($scope, null, formConfig);
				buildForm($scope, null, formConfig);
				
				$scope.$parent.$emit('xferData', {'memberData': response});
				
			}
		});
	};

	if ((typeof(userCookie) != "undefined") && (typeof(userCookie) == "object")) {
		var uname = userCookie.username;
		$scope.getProfile(uname);
	}
	else {
		$scope.$parent.displayAlert("danger", translation.youNeedToLoginFirst[LANG]);
		$scope.$parent.go("/");
	}

}]);

myAccountApp.controller('validateCtrl', ['$scope', 'ngDataApi', '$route', 'isUserLoggedIn', function ($scope, ngDataApi, $route, isUserLoggedIn) {

	$scope.validateChangeEmail = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/urac/changeEmail/validate",
			"params": {"token": $route.current.params.token}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.yourEmailValidatedChangedSuccessfully[LANG]);
				setTimeout(function () {
					$scope.$parent.go("/myaccount");
				}, 2000);
			}
		});
	};

	$scope.validateChangeEmail();
}]);

myAccountApp.controller('loginCtrl', ['$scope', 'ngDataApi', '$cookies', '$cookieStore', 'isUserLoggedIn', '$localStorage', function ($scope, ngDataApi, $cookies, $cookieStore, isUserLoggedIn, $localStorage) {
	var formConfig = loginConfig.formConf;
	formConfig.actions = [{
		'type': 'submit',
		'label': translation.login[LANG],
		'btn': 'primary',
		'action': function (formData) {
			var postData = {
				'username': formData.username, 'password': formData.password
			};
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"routeName": "/urac/login",
				"data": postData
			}, function (error, response) {
				if (error) {
					overlayLoading.hide();
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$cookieStore.put('soajs_user', response);
					if(response.soajsauth){
						$cookieStore.put("soajs_auth", response.soajsauth);
					}
					//get dashboard keys
					getKeys();
				}
			});

			function getKeys() {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/dashboard/key/get",
					"params": {"main": false}
				}, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						$cookieStore.put("soajs_dashboard_key", response.extKey);
						getPermissions();
					}
				});
			}

			function getPermissions() {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/dashboard/permissions/get"
				}, function (error, response) {
					overlayLoading.hide();
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						$localStorage.acl_access = {};
						$localStorage.acl_access['dashboard'] = response.acl;
						$localStorage.environments = response.environments;
						$cookieStore.put("soajs_envauth", response.envauth);
						response.environments.forEach(function(oneEnv){
							if(oneEnv.code.toLowerCase() === 'dashboard'){
								$cookieStore.put("myEnv", oneEnv);
							}
						});
						$scope.$parent.$emit("loadUserInterface", {});
						$scope.$parent.$emit('refreshWelcome', {});
					}
				});
			}
		}
	}];
	
	if (!isUserLoggedIn()) {
		buildForm($scope, null, formConfig);
	}
	else {
		$scope.$parent.displayAlert('danger', translation.youAreAlreadyLoggedIn[LANG]);
		$scope.$parent.go($scope.$parent.mainMenu.links[0].entries[0].url.replace("#", ""));
	}
	
}]);

myAccountApp.controller('forgotPwCtrl', ['$scope', 'ngDataApi', 'isUserLoggedIn', function ($scope, ngDataApi, isUserLoggedIn) {
	var formConfig = forgetPwConfig.formConf;
	formConfig.actions = [{
		'type': 'submit',
		'label': translation.submit[LANG],
		'btn': 'primary',
		'action': function (formData) {
			var postData = {
				'username': formData.username
			};
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/urac/forgotPassword",
				"params": postData
			}, function (error) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', translation.resetLinkSentYourEmailAddress[LANG]);
					$scope.$parent.go("/login");
				}
			});
		}
	}];

	if (!isUserLoggedIn()) {
		buildForm($scope, null, formConfig);
	}
	else {
		$scope.$parent.displayAlert('danger', translation.youAlreadyLoggedInLogOutFirst[LANG]);
		$scope.$parent.go($scope.$parent.mainMenu.links[0].url.replace("#", ""));
	}
}]);

myAccountApp.controller('setPasswordCtrl', ['$scope', 'ngDataApi', '$routeParams', 'isUserLoggedIn', function ($scope, ngDataApi, $routeParams, isUserLoggedIn) {
	var formConfig = setPasswordConfig.formConf;
	formConfig.actions = [{
		'type': 'submit',
		'label': translation.submit[LANG],
		'btn': 'primary',
		'action': function (formData) {
			var postData = {
				'password': formData.password, 'confirmation': formData.confirmPassword
			};
			if (formData.password != formData.confirmPassword) {
				$scope.$parent.displayAlert('danger', translation.errorMessageChangePassword[LANG]);
				return;
			}
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"routeName": "/urac/resetPassword",
				"params": {"token": $routeParams.token},
				"data": postData
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', translation.passwordSetSuccessfully[LANG]);
					$scope.$parent.go("/login");
				}
			});
		}
	}];

	if (!isUserLoggedIn()) {
		buildForm($scope, null, formConfig);
	}
	else {
		$scope.$parent.displayAlert('danger', translation.youAlreadyLoggedInLogOutFirst[LANG]);
		$scope.$parent.go($scope.$parent.mainMenu.links[0].url.replace("#", ""));
	}
}]);

myAccountApp.controller('resetPwCtrl', ['$scope', 'ngDataApi', '$routeParams', 'isUserLoggedIn', function ($scope, ngDataApi, $routeParams, isUserLoggedIn) {
	var formConfig = resetPwConfig.formConf;
	formConfig.actions = [{
		'type': 'submit',
		'label': translation.submit[LANG],
		'btn': 'primary',
		'action': function (formData) {
			var postData = {
				'password': formData.password, 'confirmation': formData.confirmPassword
			};
			if (formData.password != formData.confirmPassword) {
				$scope.$parent.displayAlert('danger', translation.passwordConfirmFieldsNotMatch[LANG]);
				return;
			}
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"routeName": "/urac/resetPassword",
				"params": {"token": $routeParams.token},
				"headers": {
					"key": apiConfiguration.key
				},
				"data": postData
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', translation.yourPasswordReset[LANG]);
					$scope.$parent.go("/login");
				}
			});
		}
	}];

	if (!isUserLoggedIn()) {
		buildForm($scope, null, formConfig);
	}
	else {
		$scope.$parent.displayAlert('danger', translation.youAlreadyLoggedInLogOutFirst[LANG]);
		$scope.$parent.go($scope.$parent.mainMenu.links[0].url.replace("#", ""));
	}
}]);


