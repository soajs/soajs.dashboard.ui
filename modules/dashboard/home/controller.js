"use strict";
var dahsboardApp = soajsApp.components;
dahsboardApp.controller('dahsboardCtrl', ['$scope', '$timeout', 'injectFiles', '$cookies', '$localStorage', 'myAccountAccess', 'ngDataApi',
	function ($scope, $timeout, injectFiles, $cookies, $localStorage, myAccountAccess, ngDataApi) {
		injectFiles.injectCss('modules/dashboard/home/home.css');
		
		$scope.isUserLoggedIn = function () {
			if ($cookies.get('access_token', { 'domain': interfaceDomain }) && $cookies.get('soajs_username', { 'domain': interfaceDomain })) {
				var username = $cookies.get('soajs_username', { 'domain': interfaceDomain });
				if ($localStorage.soajs_user && $localStorage.acl_access) {
					$scope.$parent.$emit("loadUserInterface", {});
					$scope.$parent.$emit('refreshWelcome', {});
				}
				else {
					myAccountAccess.getUser($scope, username, function (result) {
						if (result) {
							myAccountAccess.getKeyPermissions($scope, function (success) {
								if (success) {
									$timeout(function () {
										window.location.reload();
									}, 150);

								}
							});
						} else {
							ngDataApi.logoutUser($scope);
							$scope.$parent.go("/login");
						}
					});
				}
			}
			else {
				ngDataApi.logoutUser($scope);
				$scope.$parent.displayAlert('danger', translation.expiredSessionPleaseLogin[LANG]);
				$scope.$parent.go("/login");
			}
		};
		
		$scope.isUserLoggedIn();
		
		(function () {
			
			var counter = 1;
			var max = 4;
			
			jQuery("ul.slider li.p" + counter).css('display', 'block');
			$timeout(function () {
				showPillar();
			}, 7000);
			
			function showPillar() {
				jQuery("ul.slider li.p" + counter).fadeOut('slow', function () {
					counter++;
					if (counter > max) {
						counter = 1;
					}
					jQuery("ul.slider li.p" + counter).fadeIn('slow', function () {
						$timeout(function () {
							showPillar();
						}, 15000);
					});
				});
			}
		})();
	}]);

dahsboardApp.controller('helpPageCtrl', ['$scope', function ($scope) {
	$scope.$parent.isUserLoggedIn(true);
}]);

dahsboardApp.controller('noEnvCtrl', ['$scope', 'injectFiles', function ($scope, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, configDashbrd.permissions);
	
	$scope.gotoEnv = function () {
		$scope.$parent.go("#/environments");
	};
	$scope.$parent.reRenderMenu('deployment');
	injectFiles.injectCss('modules/dashboard/home/home.css');
}]);