'use strict';
var routeProvider;

function configureRouteNavigation(navigation){
	navigation.forEach(function (navigationEntry) {
		if (navigationEntry.scripts && navigationEntry.scripts.length > 0) {
			navigationEntry.env = navigationEntry.scripts[0].split("/")[1];
			routeProvider.when(navigationEntry.url.replace('#', ''), {
				templateUrl: navigationEntry.tplPath,
				resolve: {
					load: ['$q', '$rootScope', function ($q, $rootScope) {
						var deferred = $q.defer();
						require(navigationEntry.scripts, function () {
							$rootScope.$apply(function () {
								deferred.resolve();
							});
						});
						return deferred.promise;
					}]
				}
			});
		}
		else {
			routeProvider.when(navigationEntry.url.replace('#', ''), {
				templateUrl: navigationEntry.tplPath
			});
		}
	});

	routeProvider.otherwise({
		redirectTo: navigation[0].url.replace('#', '')
	});
}

/* App Module */
var soajsApp = angular.module('soajsApp', ['ui.bootstrap', 'ngRoute', 'ngCookies', 'ngStorage', 'textAngular', "ngFileUpload"]);

soajsApp.config([
	'$routeProvider',
	'$controllerProvider',
	'$compileProvider',
	'$filterProvider',
	'$provide',
	'$sceDelegateProvider',
	function ($routeProvider, $controllerProvider, $compileProvider, $filterProvider, $provide, $sceDelegateProvider) {
		soajsApp.compileProvider = $compileProvider;
		var whitelisted = ['self'];
		whitelisted = whitelisted.concat(whitelistedDomain);
		$sceDelegateProvider.resourceUrlWhitelist(whitelisted);
		routeProvider = $routeProvider;
		configureRouteNavigation(navigation);

		soajsApp.components = {
			filter: $filterProvider.register,
			controller: $controllerProvider.register,
			service: $provide.service
		};
	}
]);

soajsApp.run(function ($rootScope) {
	$rootScope.angular = angular;
	$rootScope.LANG = LANG;
	$rootScope.translation = translation;
});

soajsApp.controller('soajsAppController', ['$scope', '$location', '$timeout', '$route', '$cookies', '$cookieStore', 'ngDataApi', 'checkApiHasAccess', '$localStorage',
	function ($scope, $location, $timeout, $route, $cookies, $cookieStore, ngDataApi, checkApiHasAccess, $localStorage) {
		$scope.appNavigation = navigation;
		$scope.navigation=[];
		$scope.pillar=null;
		$scope.enableInterface = false;
		$scope.go = function (path) {
			$scope.previousPage = $route.current.originalPath;
			if(path){
				$location.path(path.replace("#", ""));
			}
		};

		$scope.alerts = [];
		$scope.themeToUse = themeToUse;

		$scope.displayFixedAlert = function (type, msg) {
			$scope.alerts = [];
			$scope.alerts.push({'type': type, 'msg': msg});
		};

		$scope.displayAlert = function (type, msg, isCode, service, orgMesg) {
			$scope.alerts = [];
			if (isCode) {
				var msgT = getCodeMessage(msg, service);
				if (msgT) {
					msg = msgT;
				}
				else if (orgMesg) {
					msg = orgMesg;
				}
			}
			$scope.alerts.push({'type': type, 'msg': msg});
			$scope.closeAllAlerts();
		};

		$scope.displayCodeAlert = function (type, code, service) {
			$scope.alerts = [];
			var msg = code;
			if (errorCodes[service] && errorCodes[service][code]) {
				if (errorCodes[service][code][LANG]) {
					msg = errorCodes[service][code][LANG];
				}
			}
			$scope.alerts.push({'type': type, 'msg': msg});
			$scope.closeAllAlerts();
		};

		$scope.pushAlert = function (type, msg) {
			$scope.alerts.push({'type': type, 'msg': msg});
			$scope.closeAllAlerts();
		};

		$scope.closeAlert = function (index) {
			$scope.alerts.splice(index, 1);
		};

		$scope.closeAllAlerts = function () {
			$timeout(function () {
				$scope.alerts = [];
			}, 7000);
		};

		$scope.mainMenu = {};
		$scope.mainMenu.links = [];

		$scope.footerMenu = {};
		$scope.footerMenu.links = [];

		$scope.userMenu = {};
		$scope.userMenu.links = [];

		$scope.guestMenu = {};
		$scope.guestMenu.links = [];

		$scope.leftMenu = {};
		$scope.leftMenu.links = [];
		$scope.leftMenu.environments = [];

		$scope.collapseMainMenu = false;

		$scope.collapseExpandMainMenu = function () {
			$scope.collapseMainMenu = !$scope.collapseMainMenu;
		};

		$scope.pillarChange = function (pillarName) {
			$scope.pillar=pillarName;
			$cookieStore.remove('myEnv');
			if(pillarName === "operate") {
				if (Object.keys($scope.navigation).length === 0) {
					doEnvPerNav();
				}
			}
		};

		$scope.reRenderMenu = function (pillarName) {
			$scope.leftMenu.links = [];
			$scope.leftMenu.environments = [];
			$scope.currentSelectedEnvironment = null;
			for (var j = 0; j < $scope.mainMenu.links.length; j++) {
				if ($scope.mainMenu.links[j].pillar.name === pillarName) {
					$scope.leftMenu.links = $scope.mainMenu.links[j].entries;

					var pillarsPerEnv = [3, 4];
					if (pillarsPerEnv.indexOf($scope.mainMenu.links[j].pillar.position) !== -1) {
						$scope.leftMenu.environments = angular.copy($localStorage.environments);

						if ($scope.mainMenu.links[j].pillar.position === 4) {
							for (var k = $scope.leftMenu.environments.length - 1; k >= 0; k--) {
								if ($scope.leftMenu.environments[k].code === "DASHBOARD") {
									$scope.leftMenu.environments.splice(k, 1);
								}
							}
							$cookieStore.put('myEnv', $scope.leftMenu.environments[0]);
						}

						if ($cookieStore.get('myEnv')) {
							$scope.switchEnvironment($cookieStore.get('myEnv'));
						}
						else {
							$scope.switchEnvironment($scope.leftMenu.environments[0]);
						}
					}
					break;
				}
			}
		};

		$scope.switchEnvironment = function (envRecord) {
			if(envRecord) {
				$scope.currentSelectedEnvironment = envRecord.code;
			}
			if (!$cookieStore.get('myEnv') || $cookieStore.get('myEnv').code !== envRecord.code) {
				$cookieStore.put('myEnv', envRecord);

				if($scope.pillar && $scope.pillar.toLowerCase() === 'operate'){
					getSendDataFromServer($scope, ngDataApi, {
						"method": "get",
						"routeName": "/dashboard/permissions/get",
						"params":{"envCode": envRecord.code}
					}, function(error, response) {
						if (error) {
							$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
						}
						else {
							$localStorage.acl_access[envRecord.code.toLowerCase()] = response.acl;
							$scope.$parent.$emit("loadUserInterface", {});
							$route.reload();
						}
					});
				}
				else{
					$route.reload();
				}
			}
		};

		$scope.updateSelectedMenus = function () {
			$scope.mainMenu.selectedMenu = '#/' + $location.path().split("/")[1];
			$scope.footerMenu.selectedMenu = $scope.mainMenu.selectedMenu;
			$scope.userMenu.selectedMenu = $scope.mainMenu.selectedMenu;
			$scope.guestMenu.selectedMenu = $scope.mainMenu.selectedMenu;
			if ($scope.leftMenu) {
				$scope.leftMenu.selectedMenu = '#/' + $location.path().split("/")[1];
			}
			$scope.mainMenu.links.forEach(function (oneLink) {
				for (var i = 0; i < oneLink.entries.length; i++) {
					if (oneLink.entries[i].url === $scope.mainMenu.selectedMenu) {
						oneLink.selected = true;
						$scope.reRenderMenu(oneLink.pillar.name);
						break;
					}
				}
			});
		};

		$scope.buildNavigation = function () {
			for (var i = 0; i < $scope.appNavigation.length; i++) {
				if ($scope.appNavigation[i].mainMenu) {
					var found = false;
					for (var j = 0; j < $scope.mainMenu.links.length; j++) {
						if ($scope.mainMenu.links[j] && $scope.mainMenu.links[j].pillar) {
							if ($scope.appNavigation[i].pillar.name === $scope.mainMenu.links[j].pillar.name) {
								found = j;
								break;
							}
						}
					}
					if (found === false) {
						$scope.mainMenu.links.push({"pillar": $scope.appNavigation[i].pillar, "entries": []});
						found = $scope.mainMenu.links.length - 1;
					}

					$scope.mainMenu.links[found].entries.push($scope.appNavigation[i]);
				}

				if ($scope.appNavigation[i].footerMenu) {
					$scope.footerMenu.links.push($scope.appNavigation[i]);
				}

				if ($scope.appNavigation[i].userMenu) {
					$scope.userMenu.links.push($scope.appNavigation[i]);
				}

				if ($scope.appNavigation[i].guestMenu) {
					$scope.guestMenu.links.push($scope.appNavigation[i]);
				}
			}

			for (var x in $scope.mainMenu.links){
				$scope.mainMenu.links[x].entries.sort(function (a, b) {
					if (a.order > b.order) {
						return 1;
					}
					if (a.order < b.order) {
						return -1;
					}
					// a must be equal to b
					return 0;
				});
			}
		};

		$scope.rebuildMenus = function () {
			$scope.mainMenu = {};
			$scope.mainMenu.links = [];

			$scope.userMenu = {};
			$scope.userMenu.links = [];

			$scope.guestMenu = {};
			$scope.guestMenu.links = [];

			$scope.dashboard = [];

			function doPermissions(navigation) {
				var a = true;
				var p = {};
				for (var i = 0; i < navigation.length; i++) {
					a = true;
					if (navigation[i].hasOwnProperty('checkPermission')) {
						p = navigation[i].checkPermission;
						if (p.service && p.route) {
							a = $scope.buildPermittedOperation(p.service, p.route);
						}
					}

					if (navigation[i].hasOwnProperty('private') || (a)) {
						$scope.dashboard.push(navigation[i].id);
						if (navigation[i].mainMenu) {
							var found = false;
							for (var j = 0; j < $scope.mainMenu.links.length; j++) {
								if ($scope.mainMenu.links[j] && $scope.mainMenu.links[j].pillar) {
									if (navigation[i].pillar.name === $scope.mainMenu.links[j].pillar.name) {
										found = j;
										break;
									}
								}
							}
							if (found === false) {
								$scope.mainMenu.links.push({"pillar": navigation[i].pillar, "entries": []});
								found = $scope.mainMenu.links.length - 1;
							}

							$scope.mainMenu.links[found].entries.push(navigation[i]);
						}

						if (navigation[i].userMenu) {
							$scope.userMenu.links.push(navigation[i]);
						}

						if (navigation[i].guestMenu) {
							$scope.guestMenu.links.push(navigation[i]);
						}
					}
				}
				for (var x in $scope.mainMenu.links){
					$scope.mainMenu.links[x].entries.sort(function (a, b) {
						if (a.order > b.order) {
							return 1;
						}
						if (a.order < b.order) {
							return -1;
						}
						// a must be equal to b
						return 0;
					});
				}
			}

			doPermissions($scope.appNavigation);
			$scope.updateSelectedMenus();
		};

		$scope.buildNavigation();

		$scope.$on('$routeChangeStart', function (event) {
			if($scope.enableInterface){
				$cookieStore.put("soajs_current_route", $location.path());
			}

			if($cookieStore.get("soajs_current_route") === $location.path()){
				event.preventDefault();
			}
		});

		$scope.$on('$routeChangeSuccess', function () {
			$scope.tracker = [];
			//$scope.updateSelectedMenus();
			for (var i = 0; i < $scope.appNavigation.length; i++) {
				if ($scope.appNavigation[i].tracker && $scope.appNavigation[i].url === '#' + $route.current.originalPath) {
					if (!$scope.appNavigation[i].hasOwnProperty('private') && !$scope.appNavigation[i].hasOwnProperty('guestMenu') && !$scope.appNavigation[i].hasOwnProperty('footerMenu')) {
						if ($scope.dashboard && $scope.dashboard.indexOf($scope.appNavigation[i].id) === -1) {
							$scope.displayAlert('danger', 'You do not have permissions to access this section');
							$scope.$parent.go($scope.$parent.mainMenu.links[0].entries[0].url.replace("#", ""));
						}
					}

					if ($scope.appNavigation[i].tracker && $scope.appNavigation[i].ancestor && Array.isArray($scope.appNavigation[i].ancestor) && $scope.appNavigation[i].ancestor.length > 0) {
						for (var j = $scope.appNavigation[i].ancestor.length - 1; j >= 0; j--) {
							findAndcestorProperties($scope.tracker, $scope.appNavigation[i].ancestor[j], $route.current.params);
						}
						$scope.tracker.push({
							pillar: ($scope.appNavigation[i].pillar) ? $scope.appNavigation[i].pillar.label : null,
							label: $scope.appNavigation[i].label,
							link: $scope.appNavigation[i].url,
							current: true
						});
						if($scope.appNavigation[i].pillar){
							$scope.pillar = $scope.appNavigation[i].pillar.name;
						}
					}
				}
			}

			if(navigation.length > $scope.appNavigation.length){
				$scope.appNavigation = navigation;
				if (!$scope.$$phase) {
					$scope.$apply();
				}
				configureRouteNavigation(navigation);
				if($cookieStore.get("soajs_current_route") && $location.path() !== $cookieStore.get("soajs_current_route")){
					$location.path( $cookieStore.get("soajs_current_route") );
				}
			}
		});

		$scope.isUserLoggedIn = function (stopRedirect) {
			if (!$cookies['soajs_auth'] || !$cookies['soajs_user']) {
				$cookieStore.remove('soajs_auth');
				$cookieStore.remove('soajs_user');
				$localStorage.acl_access = null;
				$scope.enableInterface = false;
				if (!stopRedirect) {
					$scope.displayFixedAlert('danger', translation.expiredSessionPleaseLogin[LANG]);
					$scope.go("/login");
				}
			}
			else {
				$scope.footerMenu.links.forEach(function (oneMenuEntry) {
					if (oneMenuEntry.id === 'home') {
						oneMenuEntry.url = '#/dashboard';
					}
				});
				if ($scope.footerMenu.selectedMenu === '#/login') {
					$scope.footerMenu.selectedMenu = '#/dashboard';
				}

				var user = $cookieStore.get('soajs_user');

				$scope.enableInterface = true;
				$scope.userFirstName = user.firstName;
				$scope.userLastName = user.lastName;
				$scope.rebuildMenus();
			}
		};

		$scope.$on("loadUserInterface", function (event, args) {
			doEnvPerNav();
			$scope.isUserLoggedIn();
		});

		$scope.buildPermittedOperation = function (serviceName, routePath) {
			var access = false;
			var user = $cookieStore.get('soajs_user');
			if (user) {
				var userGroups = user.groups;
				var acl = $localStorage.acl_access;
				var envCode = ($scope.pillar === 'operate') ? $cookieStore.get('myEnv').code : "DASHBOARD";
				access = checkApiHasAccess(acl, serviceName, routePath, userGroups, envCode);
			}
			return access;
		};

		$scope.switchLanguage = function (lang) {
			LANG = lang;
			$scope.LANG = LANG;
			$cookieStore.put('soajs_LANG', LANG);
			window.location.reload();
		};

		function doEnvPerNav (){
			for (var i = 0; i < $scope.appNavigation.length; i++) {
				var strNav = $scope.appNavigation[i].tplPath.split("/");
				for (var e = 0; e < $localStorage.environments.length; e++) {
					if (strNav[1] === $localStorage.environments[e].code) {
						if ($scope.navigation[strNav[1]]) {
							$scope.navigation[strNav[1]].push($scope.appNavigation[i]);
						}
						else {
							$scope.navigation[strNav[1]] = [];
							$scope.navigation[strNav[1]].push($scope.appNavigation[i]);
						}
					}
				}
			}
		}

		function findAndcestorProperties(tracker, ancestorName, params) {
			for (var i = 0; i < $scope.appNavigation.length; i++) {
				if ($scope.appNavigation[i].tracker && $scope.appNavigation[i].label === ancestorName) {
					var link = $scope.appNavigation[i].url;
					for (var i in params) {
						link = link.replace(":" + i, params[i]);
					}
					tracker.unshift({
						label: ancestorName,
						link: link
					});

				}
			}
		}
	}]);

soajsApp.controller('welcomeCtrl', ['$scope', 'ngDataApi', '$cookieStore', '$localStorage', function ($scope, ngDataApi, $cookieStore, $localStorage) {
	$scope.$parent.$on('refreshWelcome', function (event, args) {
		$scope.setUser();

		if ($scope.$parent.mainMenu.links.length > 0) {
			$scope.$parent.go($scope.$parent.mainMenu.links[0].entries[0].url.replace("#", ""));
		}
		else {
			$scope.$parent.go("/myaccount");
		}
	});

	$scope.setUser = function () {
		var user = $cookieStore.get('soajs_user');
		if (user) {
			$scope.userFirstName = user.firstName;
			$scope.userLastName = user.lastName;
		}
	};

	$scope.logoutUser = function () {
		var user = $cookieStore.get('soajs_user');

		function logout() {
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				//"headers": {
				//	"key": apiConfiguration.key
				//},
				"routeName": "/dashboard/logout",
				"params": {"username": user.username}
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard');
				}

				$scope.currentSelectedEnvironment = null;
				$cookieStore.remove('myEnv');
				$cookieStore.remove('soajs_dashboard_key');
				$cookieStore.remove('soajsID');
				$cookieStore.remove('soajs_auth');
				$cookieStore.remove('soajs_user');
				$cookieStore.remove('soajs_current_route');
				$cookieStore.remove('soajs_envauth');
				$localStorage.acl_access = null;
				$localStorage.environments = null;
				$scope.dashboard = [];
				$scope.$parent.enableInterface = false;
				$scope.$parent.go("/login");
			});
		}

		if (typeof(user) != 'undefined') {
			logout();
		} else {
			$cookieStore.remove('soajs_auth');
			$scope.$parent.isUserLoggedIn();
		}
	};
}]);

soajsApp.directive('header', function () {
	return {
		restrict: 'E',
		templateUrl: 'themes/' + themeToUse + '/directives/header.tmpl'
	};
});

soajsApp.directive('userMenu', function () {
	return {
		restrict: 'E',
		templateUrl: 'themes/' + themeToUse + '/directives/userMenu.tmpl'
	};
});

soajsApp.directive('mainMenu', function () {
	return {
		restrict: 'E',
		templateUrl: 'themes/' + themeToUse + '/directives/mainMenu.tmpl'
	};
});

soajsApp.directive('tracker', function () {
	return {
		restrict: 'E',
		templateUrl: 'themes/' + themeToUse + '/directives/tracker.tmpl'
	};
});

soajsApp.directive('content', function () {
	return {
		restrict: 'E',
		templateUrl: 'themes/' + themeToUse + '/directives/content.tmpl'
	};
});

soajsApp.directive('footer', function () {
	return {
		restrict: 'E',
		templateUrl: 'themes/' + themeToUse + '/directives/footer.tmpl'
	};
});

soajsApp.directive('overlay', function () {
	return {
		restrict: 'E',
		templateUrl: 'themes/' + themeToUse + '/directives/overlay.tmpl'
	};
});

soajsApp.directive('ngConfirmClick', [
	function () {
		return {
			priority: -1,
			restrict: 'A',
			link: function (scope, element, attrs) {
				element.bind('click', function (e) {
					var message = attrs.ngConfirmClick;
					if (message && !confirm(message)) {
						e.stopImmediatePropagation();
						e.preventDefault();
					}
				});
			}
		}
	}
]);

soajsApp.directive('phoneInput', function ($filter, $browser) {
	return {
		require: 'ngModel',
		link: function ($scope, $element, $attrs, ngModelCtrl) {
			var listener = function () {
				var value = $element.val().replace(/[^0-9]/g, '');
				$element.val($filter('tel')(value, false));
			};

			// This runs when we update the text field
			ngModelCtrl.$parsers.push(function (viewValue) {
				return viewValue.replace(/[^0-9]/g, '').slice(0, 10);
			});

			// This runs when the model gets updated on the scope directly and keeps our view in sync
			ngModelCtrl.$render = function () {
				$element.val($filter('tel')(ngModelCtrl.$viewValue, false));
			};

			$element.bind('change', listener);
			$element.bind('keydown', function (event) {
				var key = event.keyCode;
				// If the keys include the CTRL, SHIFT, ALT, or META keys, or the arrow keys, do nothing.
				// This lets us support copy and paste too
				if (key == 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) {
					return;
				}
				$browser.defer(listener); // Have to do this or changes don't get picked up properly
			});

			$element.bind('paste cut', function () {
				$browser.defer(listener);
			});
		}

	};
});

var overlay = {
	show: function (cb) {
		var overlayHeight = jQuery(document).height();
		jQuery("#overlay").css('height', overlayHeight + 'px').show(200);
		jQuery("#overlay .bg").css('height', overlayHeight + 'px').show(200);
		jQuery("#overlay .content").css('top', '10%');
		if (cb && typeof(cb) === 'function') {
			cb();
		}
	},
	hide: function (cb) {
		jQuery("#overlay .content").remove();
		jQuery("#overlay").fadeOut(200);
		if (cb && typeof(cb) === 'function') {
			cb();
		}
	}
};

var overlayLoading = {
	show: function (cb) {
		var overlayHeight = jQuery(document).height();
		jQuery("#overlayLoading").css('height', overlayHeight + 'px').show();
		jQuery("#overlayLoading .bg").css('height', overlayHeight + 'px').show(100);
		jQuery("#overlayLoading .content").show();
		if (cb && typeof(cb) === 'function') {
			cb();
		}
	},
	hide: function (cb) {
		jQuery("#overlayLoading .content").hide();
		jQuery("#overlayLoading").fadeOut(200);
		if (cb && typeof(cb) === 'function') {
			cb();
		}
	}
};