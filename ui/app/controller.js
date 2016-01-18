'use strict';
var index = 0;
(function () {
	var link = document.createElement("script");
	link.type = "text/javascript";
	link.src = "themes/" + themeToUse + "/bootstrap.js";
	document.getElementsByTagName("head")[0].appendChild(link);
})();

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

		navigation.forEach(function (navigationEntry) {
			if (navigationEntry.scripts && navigationEntry.scripts.length > 0) {
				$routeProvider.when(navigationEntry.url.replace('#', ''), {
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
				$routeProvider.when(navigationEntry.url.replace('#', ''), {
					templateUrl: navigationEntry.tplPath
				});
			}
		});

		$routeProvider.otherwise({
			redirectTo: navigation[0].url.replace('#', '')
		});

		soajsApp.components = {
			filter: $filterProvider.register,
			controller: $controllerProvider.register,
			service: $provide.service
		};
	}
]);

soajsApp.run(function($rootScope){
	$rootScope.angular = angular;
});

soajsApp.controller('soajsAppController', ['$scope', '$location', '$timeout', '$route', '$cookies', '$cookieStore', 'ngDataApi', 'checkApiHasAccess', '$localStorage',
	function ($scope, $location, $timeout, $route, $cookies, $cookieStore, ngDataApi, checkApiHasAccess, $localStorage) {
		$scope.enableInterface = false;
		$scope.go = function (path) {
			$scope.previousPage = $route.current.originalPath;
			$location.path(path.replace("#",""));
		};

		$scope.alerts = [];
		$scope.themeToUse = themeToUse;

		$scope.displayFixedAlert = function (type, msg) {
			$scope.alerts = [];
			$scope.alerts.push({'type': type, 'msg': msg});
		};

		$scope.displayAlert = function (type, msg) {
			$scope.alerts = [];
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

		$scope.pillarChange = function(pillarName){
			$cookieStore.remove('myEnv');
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

			//function getRoutePillar(route) {
			//	for (var p = 0; p < $scope.mainMenu.links.length; p++) {
			//		for (var e = 0; e < $scope.mainMenu.links[p].entries.length; e++) {
			//			if($scope.mainMenu.links[p].entries[e].url.replace("#","") === route){
			//				return $scope.mainMenu.links[p].pillar.name;
			//			}
			//		}
			//	}
			//}
		};

		$scope.switchEnvironment = function (envRecord) {
			var requestedEnv = this.myCurrentEnvironment;
			if(requestedEnv && !envRecord){
				$localStorage.environments.forEach(function(oneEnvRecord){
					if(oneEnvRecord.code === requestedEnv){
						envRecord = oneEnvRecord;
					}
				});
			}

			$scope.currentSelectedEnvironment = envRecord.code;
			if (!$cookieStore.get('myEnv') || $cookieStore.get('myEnv').code !== envRecord.code) {
				$cookieStore.put('myEnv', envRecord);
				$route.reload();
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
			for (var i = 0; i < navigation.length; i++) {
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

				if (navigation[i].footerMenu) {
					$scope.footerMenu.links.push(navigation[i]);
				}

				if (navigation[i].userMenu) {
					$scope.userMenu.links.push(navigation[i]);
				}

				if (navigation[i].guestMenu) {
					$scope.guestMenu.links.push(navigation[i]);
				}
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

			function doPermissions(navigation){
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

			}

			doPermissions(navigation);

			$scope.updateSelectedMenus();
		};

		$scope.buildNavigation();
		$scope.$on('$routeChangeSuccess', function () {
			$scope.tracker = [];
			$scope.updateSelectedMenus();

			for (var i = 0; i < navigation.length; i++) {
				if (navigation[i].tracker && navigation[i].url === '#' + $route.current.originalPath) {
					if (!navigation[i].hasOwnProperty('private') && !navigation[i].hasOwnProperty('guestMenu') && !navigation[i].hasOwnProperty('footerMenu')) {
						if ($scope.dashboard && $scope.dashboard.indexOf(navigation[i].id) === -1) {
							$scope.displayAlert('danger', 'You do not have permissions to access this section');
							$scope.$parent.go($scope.$parent.mainMenu.links[0].entries[0].url.replace("#", ""));
						}
					}

					if (navigation[i].tracker && navigation[i].ancestor && Array.isArray(navigation[i].ancestor) && navigation[i].ancestor.length > 0) {
						for (var j = navigation[i].ancestor.length - 1; j >= 0; j--) {
							findAndcestorProperties($scope.tracker, navigation[i].ancestor[j], $route.current.params);
						}
						$scope.tracker.push({
							pillar: (navigation[i].pillar) ? navigation[i].pillar.label : null,
							label: navigation[i].label,
							link: navigation[i].url,
							current: true
						});
					}
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
					$scope.displayFixedAlert('danger', "Session expired. Please login.");
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
			$scope.isUserLoggedIn();
		});

		$scope.buildPermittedOperation = function (serviceName, routePath) {
			var access = false;
			var user = $cookieStore.get('soajs_user');
			if (user) {
				var userGroups = user.groups;
				var acl = $localStorage.acl_access;
				if (acl[serviceName]) {
					access = checkApiHasAccess(acl, serviceName, routePath, userGroups);
				}
			}
			return access;
		};
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
				"headers": {
					"key": apiConfiguration.key
				},
				"routeName": "/urac/logout",
				"params": {"username": user.username}
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.message);
				}

				$scope.currentSelectedEnvironment = null;
				$cookieStore.remove('myEnv');
				$cookieStore.remove('soajs_dashboard_key');
				$cookieStore.remove('soajsID');
				$cookieStore.remove('soajs_auth');
				$cookieStore.remove('soajs_user');
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

soajsApp.directive('phoneInput', function($filter, $browser) {
	return {
		require: 'ngModel',
		link: function($scope, $element, $attrs, ngModelCtrl) {
			var listener = function() {
				var value = $element.val().replace(/[^0-9]/g, '');
				$element.val($filter('tel')(value, false));
			};

			// This runs when we update the text field
			ngModelCtrl.$parsers.push(function(viewValue) {
				return viewValue.replace(/[^0-9]/g, '').slice(0,10);
			});

			// This runs when the model gets updated on the scope directly and keeps our view in sync
			ngModelCtrl.$render = function() {
				$element.val($filter('tel')(ngModelCtrl.$viewValue, false));
			};

			$element.bind('change', listener);
			$element.bind('keydown', function(event) {
				var key = event.keyCode;
				// If the keys include the CTRL, SHIFT, ALT, or META keys, or the arrow keys, do nothing.
				// This lets us support copy and paste too
				if (key == 91 || (15 < key && key < 19) || (37 <= key && key <= 40)){
					return;
				}
				$browser.defer(listener); // Have to do this or changes don't get picked up properly
			});

			$element.bind('paste cut', function() {
				$browser.defer(listener);
			});
		}

	};
});

function findAndcestorProperties(tracker, ancestorName, params) {
	for (var i = 0; i < navigation.length; i++) {
		if (navigation[i].tracker && navigation[i].label === ancestorName) {
			var link = navigation[i].url;
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

var overlay = {
	show: function () {
		var overlayHeight = jQuery(document).height();
		jQuery("#overlay").css('height', overlayHeight + 'px').show(200);
		jQuery("#overlay .bg").css('height', overlayHeight + 'px').show(200);
		jQuery("#overlay .content").css('top', '10%');
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
	show: function () {
		var overlayHeight = jQuery(document).height();
		jQuery("#overlayLoading").css('height', overlayHeight + 'px').show();
		jQuery("#overlayLoading .bg").css('height', overlayHeight + 'px').show(100);
		jQuery("#overlayLoading .content").show();
	},
	hide: function (cb) {
		jQuery("#overlayLoading .content").hide();
		jQuery("#overlayLoading").fadeOut(200);
		if (cb && typeof(cb) === 'function') {
			cb();
		}
	}
};