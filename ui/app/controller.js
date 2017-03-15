'use strict';
var routeProvider;

function configureRouteNavigation(navigation, scope) {
	function addRoute(navigationEntry) {
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
	
	navigation.forEach(function (navigationEntry) {
		if (navigationEntry.scripts && navigationEntry.scripts.length > 0) {
			navigationEntry.env = navigationEntry.scripts[0].split("/")[1];
			if (navigationEntry.env === 'dashboard') {
				addRoute(navigationEntry);
			}
			else if (scope) {
				if (navigationEntry.env === scope.currentSelectedEnvironment) {
					addRoute(navigationEntry);
				}
			}
		}
		else {
			routeProvider.when(navigationEntry.url.replace('#', ''), {
				templateUrl: navigationEntry.tplPath
			});
		}
	});
	
	var defaultRoute = navigation[0].url.replace('#', '');
	routeProvider.otherwise({
		redirectTo: defaultRoute
	});
}

/* App Module */
var soajsApp = angular.module('soajsApp', ['ui.bootstrap', 'ui.bootstrap.datetimepicker', 'luegg.directives', 'angular-sortable-view', 'ngRoute', 'ngCookies', 'ngStorage', 'textAngular', "ngFileUpload", "swaggerUi", "ui.ace"]);

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

soajsApp.controller('soajsAppController', ['$scope', '$location', '$timeout', '$route', '$cookies', 'ngDataApi', 'checkApiHasAccess', '$localStorage', 'aclDrawHelpers',
	function ($scope, $location, $timeout, $route, $cookies, ngDataApi, checkApiHasAccess, $localStorage, aclDrawHelpers) {
		$scope.appNavigation = navigation;
		$scope.navigation = [];
		$scope.pillar = null;
		$scope.enableInterface = false;
		$scope.go = function (path) {
			$scope.previousPage = $route.current.originalPath;
			if (path) {
				$cookies.put("soajs_current_route", path.replace("#", ""));
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
				var msgT = getCodeMessage(msg, service, orgMesg);
				if (msgT) {
					msg = msgT;
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
		
		$scope.pillarChange = function (link) {
			var pillarName = link.pillar.name;
			var url = link.entries[0].url;
			$scope.pillar = pillarName;
			if (pillarName === "operate") {
				if (!$scope.currentSelectedEnvironment || $scope.currentSelectedEnvironment === 'dashboard') {
					if ($localStorage.environments) {
						for (var x = 0; x < $localStorage.environments.length; x++) {
							if ($localStorage.environments[x].code.toLowerCase() !== 'dashboard') {
								$scope.currentSelectedEnvironment = $localStorage.environments[x].code.toLowerCase();
								break;
							}
						}
					}
				}
				
				if ($scope.currentSelectedEnvironment) {
					for (var x = 0; x < link.entries.length; x++) {
						if (link.entries[x].env === $scope.currentSelectedEnvironment) {
							if (link.entries[x].checkPermission && link.entries[x].checkPermission.access === true) {
								url = link.entries[x].url;
								break;
							}
						}
					}
					if (Object.keys($scope.navigation).length === 0) {
						doEnvPerNav();
					}
					$scope.go(url);
				}
				else {
					var envofFirstLink = link.entries[0].env;
					var envFound = false;
					for (var i = 0; i < $localStorage.environments.length; i++) {
						if ($localStorage.environments[i].code.toLowerCase() === envofFirstLink) {
							envFound = true;
							break;
						}
					}
					if (!envFound) {
						url = "#/home/env";
					}
					$scope.go(url);
				}
			}
			else {
				$scope.go(url);
			}
		};
		
		$scope.checkAuthEnvCookie = function () {
			return $cookies.get("soajs_envauth") || null;
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
								if ($scope.leftMenu.environments[k].code.toLowerCase() === "dashboard") {
									$scope.leftMenu.environments.splice(k, 1);
								}
							}
							if ($cookies.getObject('myEnv').code.replace(/\"/g, '').toLowerCase() === 'dashboard') {
								$cookies.putObject('myEnv', $scope.leftMenu.environments[0]);
							}
						}
						
						if ($cookies.getObject('myEnv')) {
							$scope.switchEnvironment($cookies.getObject('myEnv'));
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
			if (envRecord) {
				$scope.currentSelectedEnvironment = envRecord.code.toLowerCase();
			}
			if (!$cookies.getObject('myEnv') || $cookies.getObject('myEnv').code.toLowerCase() !== envRecord.code.toLowerCase()) {
				$cookies.putObject('myEnv', envRecord);
				
				if ($scope.pillar && $scope.pillar.toLowerCase() === 'operate') {
					getSendDataFromServer($scope, ngDataApi, {
						"method": "get",
						"routeName": "/dashboard/permissions/get",
						"params": {"envCode": envRecord.code.toLowerCase()}
					}, function (error, response) {
						if (error) {
							$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
						}
						else {
							if (response.acl) {
								$localStorage.acl_access[envRecord.code.toLowerCase()] = response.acl;
							}
							doEnvPerNav();
							$scope.isUserLoggedIn();
							$route.reload();
						}
					});
				}
				else {
					$route.reload();
				}
			}
		};
		
		$scope.updateSelectedMenus = function (cb) {
			$scope.mainMenu.selectedMenu = '#/' + $location.path().split("/")[1];
			$localStorage.mainMenu = $scope.mainMenu;
			$scope.footerMenu.selectedMenu = $scope.mainMenu.selectedMenu;
			$scope.userMenu.selectedMenu = $scope.mainMenu.selectedMenu;
			$scope.guestMenu.selectedMenu = $scope.mainMenu.selectedMenu;
			if ($scope.leftMenu) {
				$scope.leftMenu.selectedMenu = '#/' + $location.path().split("/")[1];
			}
			
			if ($scope.mainMenu && Array.isArray($scope.mainMenu.links) && $scope.mainMenu.links.length > 0) {
				updateMyMenus($scope.mainMenu.links, 0, function () {
					return cb();
				});
			}
			
			function updateMyMenus(links, count, cb) {
				var oneLink = links[count];
				for (var i = 0; i < oneLink.entries.length; i++) {
					if (oneLink.entries[i].url === $scope.mainMenu.selectedMenu) {
						oneLink.selected = true;
						$scope.reRenderMenu(oneLink.pillar.name);
						break;
					}
				}
				count++;
				if (count >= links.length) {
					return cb();
				}
				else {
					updateMyMenus(links, count, cb);
				}
			}
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
			
			for (var x in $scope.mainMenu.links) {
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
		
		$scope.rebuildMenus = function (cb) {
			$scope.mainMenu = {};
			$scope.mainMenu.links = [];
			
			$scope.userMenu = {};
			$scope.userMenu.links = [];
			
			$scope.guestMenu = {};
			$scope.guestMenu.links = [];
			
			$scope.dashboard = [];
			
			function doPermissions(navigation, i, cb) {
				function pushEntry(i) {
					navigation[i].checkPermission.access = true;
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
				
				var p = {};
				if (navigation[i].checkPermission) {
					p = navigation[i].checkPermission;
					if (p.service && p.route) {
						$scope.buildPermittedEnvOperation(p.service, p.route, p.method, navigation[i].env, function (hasAccess) {
							if (hasAccess) {
								pushEntry(i);
							}
							step2();
						});
					}
					else {
						navigation[i].checkPermission = {};
						pushEntry(i);
						step2();
					}
				}
				else {
					navigation[i].checkPermission = {};
					pushEntry(i);
					step2();
				}
				
				function step2() {
					i++;
					if (i === navigation.length) {
						for (var x in $scope.mainMenu.links) {
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
						return cb();
					}
					else {
						doPermissions(navigation, i, cb);
					}
				}
			}
			
			$scope.navigation = $scope.appNavigation;
			doPermissions($scope.navigation, 0, function () {
				$scope.dashboard.unshift(navigation[0].id);
				$scope.updateSelectedMenus(function () {
					return cb();
				});
			});
		};
		
		$scope.buildNavigation();
		
		$scope.$on('$routeChangeStart', function (event, next, current) {
			if (!current) {
				$cookies.put("soajs_current_route", $location.url());
				var gotourl = $cookies.get("soajs_current_route");
				//console.log("page reload event invoked ...");
				$timeout(function () {
					overlayLoading.show();
				}, 200);
				$timeout(function () {
					doEnvPerNav(function () {
						overlayLoading.hide();
						if (gotourl) {
							$cookies.put("soajs_current_route", gotourl);
							$location.url(gotourl);
						}
					});
				}, 2000);
			}
		});
		
		$scope.$on('$routeChangeSuccess', function () {
			$scope.tracker = [];
			doEnvPerNav();
			$scope.rebuildMenus(function () {
				for (var i = 0; i < $scope.navigation.length; i++) {
					if ($scope.navigation[i].tracker && $scope.navigation[i].url === '#' + $route.current.originalPath) {
						if (!$scope.navigation[i].hasOwnProperty('private') && !$scope.navigation[i].hasOwnProperty('guestMenu') && !$scope.navigation[i].hasOwnProperty('footerMenu')) {
							
							if ($scope.navigation[i].checkPermission && !$scope.navigation[i].checkPermission.access) {
								if ($scope.currentSelectedEnvironment && $scope.currentSelectedEnvironment !== 'dashboard') {
									if ($scope.navigation[i].env === $scope.currentSelectedEnvironment) {
										$scope.displayAlert('danger', 'You do not have permissions to access this section');
										$timeout(function () {
											$scope.closeAlert();
											$scope.go("/help");
										}, 9000);
									}
								}
							}
						}
						
						if ($scope.navigation[i].tracker && $scope.navigation[i].ancestor && Array.isArray($scope.navigation[i].ancestor) && $scope.navigation[i].ancestor.length > 0) {
							$scope.tracker = [];
							for (var j = $scope.navigation[i].ancestor.length - 1; j >= 0; j--) {
								findAndcestorProperties($scope.tracker, $scope.navigation[i].ancestor[j], $route.current.params);
							}
							$scope.tracker.push({
								pillar: ($scope.navigation[i].pillar) ? $scope.navigation[i].pillar.label : null,
								label: $scope.navigation[i].label,
								link: $scope.navigation[i].url,
								current: true
							});
							if ($scope.navigation[i].pillar) {
								$scope.pillar = $scope.navigation[i].pillar.name;
							}
						}
					}
				}
				
				$cookies.put("soajs_current_route", $location.path());
			});
			//$cookies.put("soajs_current_route", $location.path());
		});
		
		$scope.isUserLoggedIn = function (stopRedirect) {
			if (!$cookies.get('soajs_auth') || !$localStorage.soajs_user) {
				$cookies.remove('soajs_auth');
				$localStorage.soajs_user = null;
				$localStorage.acl_access = null;
				$scope.enableInterface = false;
				if (!stopRedirect) {
					console.log('Session Expired');
					$scope.displayAlert('danger', translation.expiredSessionPleaseLogin[LANG]);
					$scope.go("/login");
				}
			}
			else {
				var user = $localStorage.soajs_user;
				if ($scope.footerMenu.selectedMenu === '#/login') {
					$scope.footerMenu.selectedMenu = '#/dashboard';
				}
				
				$scope.enableInterface = true;
				$scope.userFirstName = user.firstName;
				$scope.userLastName = user.lastName;
			}
		};
		
		$scope.$on("loadUserInterface", function (event, args) {
			doEnvPerNav();
			if ($scope.footerMenu.selectedMenu === '#/login') {
				$scope.footerMenu.selectedMenu = '#/dashboard';
			}
			
			var user = $localStorage.soajs_user;
			if (user) {
				$scope.userFirstName = user.firstName;
				$scope.userLastName = user.lastName;
			}
			else {
				console.log('Missing user object');
			}
			$scope.enableInterface = true;
			var defaultRoute = navigation[0].url.replace('#', '');
			$scope.go("defaultRoute");
		});
		
		$scope.buildPermittedEnvOperation = function (serviceName, routePath, method, env, cb) {
			var user = $localStorage.soajs_user;
			if (user) {
				var userGroups = user.groups;
				var acl = {};
				acl[env.toLowerCase()] = $localStorage.acl_access[env.toLowerCase()];
				var firstEnv = Object.keys(acl)[0];
				//check if old system
				if (acl[firstEnv] && (acl[firstEnv].access || acl[firstEnv].apis || acl[firstEnv].apisRegExp || acl[firstEnv].apisPermission)) {
					acl['dashboard'] = acl;
				}
				checkApiHasAccess(acl, serviceName, routePath, method, userGroups, function (access) {
					return cb(access);
				});
			}
			else {
				return cb(false);
			}
		};
		
		$scope.switchLanguage = function (lang) {
			LANG = lang;
			$scope.LANG = LANG;
			$cookies.put('soajs_LANG', LANG);
			window.location.reload();
		};
		
		function doEnvPerNav(cb) {
			configureRouteNavigation(navigation, $scope);
			
			//delete navigation items based on deployer type
			if (!$scope.currentDeployer) {
				$scope.currentDeployer = {type: ''};
			}
			
			for (var i = 0; i < navigation.length; i++) {
				if ($scope.currentDeployer && $scope.currentDeployer.type) {
					if ($scope.currentDeployer.type === 'manual' && navigation[i].id === 'environments-hacloud' ||
						$scope.currentDeployer.type !== 'manual' && navigation[i].id === 'environments-hosts') {
						navigation.splice(i, 1);
						break;
					}
				}
			}
			
			$scope.appNavigation = navigation;
			$scope.navigation = navigation;
			
			var counter = 0;
			var max = $scope.appNavigation.length;
			for (var i = 0; i < $scope.appNavigation.length; i++) {
				var strNav = $scope.appNavigation[i].tplPath.split("/");
				if ($localStorage.environments && Array.isArray($localStorage.environments) && $localStorage.environments.length > 0) {
					for (var e = 0; e < $localStorage.environments.length; e++) {
						if (strNav[1].toLowerCase() === $localStorage.environments[e].code.toLowerCase()) {
							
							if (!$scope.navigation[strNav[1]]) {
								$scope.navigation[strNav[1]] = [];
							}
							$scope.navigation[strNav[1]] = $scope.navigation[strNav[1]].concat($scope.appNavigation[i]);
						}
					}
					counter++;
				}
				else {
					counter++;
				}
				
				if (counter === max) {
					if (!$scope.$$phase) {
						$scope.$apply();
					}
					if (cb && typeof(cb) === 'function') {
						return cb();
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
		
		if (!$scope.currentSelectedEnvironment) {
			if ($cookies.getObject("myEnv")) {
				$scope.currentSelectedEnvironment = $cookies.getObject("myEnv").code.toLowerCase();
				
				if (!$scope.currentDeployer) {
					$scope.currentDeployer = {type: ''};
				}
				$scope.currentDeployer.type = $cookies.getObject("myEnv").deployer.type;
			}
		}
		
		$scope.checkUserCookie = function () {
			function getUser(username, cb) {
				var apiParams = {
					"method": "get",
					"routeName": "/urac/account/getUser",
					"headers": {
						"key": apiConfiguration.key
					},
					"params": {
						"username": username
					}
				};
				
				getSendDataFromServer($scope, ngDataApi, apiParams, function (error, response) {
					if (error) {
						cb(false);
					}
					else {
						cb(true);
					}
				});
			}
			
			if ($cookies.get('soajs_auth') && $localStorage.soajs_user) {
				var user = $localStorage.soajs_user;
				getUser(user.username, function (result) {
					if (!result) {
						$cookies.remove('soajs_auth');
						$cookies.remove('myEnv');
						$cookies.remove('soajs_dashboard_key');
						$cookies.remove('soajsID');
						$localStorage.soajs_user = null;
						$cookies.remove('soajs_current_route');
						$cookies.remove('soajs_envauth');
						$scope.isUserLoggedIn();
					}
				});
			}
		};
		
		$scope.checkUserCookie();
		
	}]);

soajsApp.controller('welcomeCtrl', ['$scope', 'ngDataApi', '$cookies', '$localStorage', function ($scope, ngDataApi, $cookies, $localStorage) {
	$scope.$parent.$on('refreshWelcome', function (event, args) {
		$scope.setUser();
	});
	
	$scope.setUser = function () {
		var user = $localStorage.soajs_user;
		if (user) {
			$scope.userFirstName = user.firstName;
			$scope.userLastName = user.lastName;
		}
	};
	
	$scope.logoutUser = function () {
		var user = $localStorage.soajs_user;
		
		function clearData() {
			$cookies.remove('myEnv');
			$cookies.remove('soajs_dashboard_key');
			$cookies.remove('soajsID');
			$cookies.remove('soajs_auth');
			$localStorage.soajs_user = null;
			$cookies.remove('soajs_current_route');
			$cookies.remove('soajs_envauth');
			$localStorage.acl_access = null;
			$localStorage.environments = null;
			$scope.$parent.enableInterface = false;
		}
		
		function logout() {
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/urac/logout",
				"params": {"username": user.username}
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				$scope.currentSelectedEnvironment = null;
				clearData();
				$scope.dashboard = [];
				$scope.$parent.go("/login");
			});
		}
		
		if (typeof(user) !== 'undefined') {
			logout();
		}
		else {
			clearData();
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

soajsApp.directive('textSizeSlider', ['$document', function ($document) {
	return {
		restrict: 'E',
		template: '<table class="text-size-slider"><tr><td class="small-letter" ng-style="{ fontSize: min + unit }">A</td> <td><input type="range" min="{{ min }}" max="{{ max }}" ng-model="textSize" class="slider" value="{{ value }}" /></td> <td class="big-letter" ng-style="{ fontSize: max + unit}">A</td></tr></table>',
		scope: {
			min: '@',
			max: '@',
			unit: '@',
			value: '@',
			idt: '@'
		},
		link: function (scope, element, attr) {
			scope.textSize = scope.value;
			scope.$watch('textSize', function (size) {
				if (scope.idt) {
					document.getElementById(scope.idt).style.fontSize = size + scope.unit;
				}
				else {
					$document[0].body.style.fontSize = size + scope.unit;
				}
			});
		}
	}
}]);

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
	hide: function (t, cb) {
		var fT = 200;
		if (t && typeof(t) === 'number') {
			fT = t;
		}
		jQuery("#overlayLoading .content").hide();
		jQuery("#overlayLoading").fadeOut(fT);
		if (cb && typeof(cb) === 'function') {
			cb();
		}
	}
};
