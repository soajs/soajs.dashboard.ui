"use strict";
let platformsApp = soajsApp.components;
platformsApp.controller('platformsCtrl', ['$scope', '$timeout', '$cookies', 'ngDataApi', 'injectFiles', 'platformCntnr', '$localStorage', function ($scope, $timeout, $cookies, ngDataApi, injectFiles, platformCntnr, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";
	
	function putMyEnv(record) {
		let data = {
			"_id": record._id,
			"code": record.code,
			"description": record.description
		};
		
		$cookies.putObject('myEnv', data, {'domain': interfaceDomain});
		$scope.$parent.switchEnvironment(data);
		$timeout(() => {
			$scope.$parent.rebuildMenus(function () {
			});
		}, 100);
	}
	
	$scope.listEnvironments = function (afterDelete) {
		let options = {
			"method": "get",
			"routeName": "/console/environment",
			"params": {}
		};
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$localStorage.environments = angular.copy(response);
				if (afterDelete && (response.length === 0)) {
					$scope.$parent.rebuildMenus(function () {
					});
				}
				
				let myEnvCookie = $cookies.getObject('myEnv', {'domain': interfaceDomain});
				let found = false;
				if (myEnvCookie) {
					for (let i = response.length - 1; i >= 0; i--) {
						if (response[i].code === myEnvCookie.code) {
							$scope.envCode = response[i].code;
							putMyEnv(response[i]);
							found = true;
						}
					}
				}
				if (!found && response && response[0]) {
					$scope.envCode = response[0].code;
					putMyEnv(response[0]);
				}
				if ($scope.envCode) {
					$scope.getEnvPlatform();
				}
			}
		});
	};
	
	$scope.getEnvPlatform = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/registry/deployer",
			"params": {
				"env": $scope.envCode
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			}
			else {
				$scope.deployer = response;
				
				$scope.containers = {};
				if (response.selected === 'manual') {
					$scope.envType = 'manual';
				} else {
					$scope.envType = 'container';
					platformCntnr.checkContainerTechnology($scope);
				}
			}
		});
	};
	
	$scope.updateNamespace = function (driver) {
		platformCntnr.updateNamespace($scope, driver);
	};
	$scope.editEnvironment = function (envCode) {
	
	};
	$scope.deleteEnvironment = function (envCode) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/console/environment",
			"data": {
				"code": envCode
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Environment has been deleted.");
				$scope.listEnvironments(true);
			}
		});
	};
	
	if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
		$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
		$scope.envDescription = $cookies.getObject('myEnv', {'domain': interfaceDomain}).description;
		if ($scope.access.listEnvironments) {
			$scope.listEnvironments(null);
		}
	}
	
	injectFiles.injectCss("modules/dashboard/environments2/environments.css");
}]);
