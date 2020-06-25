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
		if (record.type) {
			data.type = record.type;
		}
		if (record.technology) {
			data.technology = record.technology;
		}
		if (record.deployer) {
			data.deployer = record.deployer;
		}
		$cookies.putObject('myEnv', data, {'domain': interfaceDomain});
		$scope.$parent.switchEnvironment(data);
		$timeout(() => {
			$scope.$parent.rebuildMenus(function () {
			});
		}, 100);
	}
	
	$scope.listEnvironments = function (afterDelete) {
		
		let continue_fn = (environments) => {
			if (afterDelete && (environments.length === 0)) {
				$scope.$parent.rebuildMenus(function () {
				});
			}
			
			let myEnvCookie = $cookies.getObject('myEnv', {'domain': interfaceDomain});
			let found = false;
			let environment = null;
			if (myEnvCookie) {
				for (let i = environments.length - 1; i >= 0; i--) {
					if (environments[i].code === myEnvCookie.code) {
						$scope.envCode = environments[i].code;
						environment = environments[i];
						found = true;
					}
				}
			}
			if (!found && environments && environments[0]) {
				$scope.envCode = environments[0].code;
				environment = environments[0];
			}
			if ($scope.envCode) {
				$scope.getEnvPlatform(environment);
			}
		};
		
		if ($localStorage.environments) {
			continue_fn($localStorage.environments);
		} else {
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
					continue_fn($localStorage.environments);
				}
			});
		}
	};
	
	$scope.getEnvPlatform = function (envRecord) {
		let continue_fn = (response) => {
			$scope.containers = {};
			if (response.selected === 'manual') {
				$scope.envType = 'manual';
			} else {
				$scope.envType = 'container';
				platformCntnr.checkContainerTechnology($scope);
			}
			if (envRecord) {
				envRecord.type = $scope.envType;
				envRecord.deployer = $scope.deployer;
				if ($scope.envType === "container") {
					envRecord.technology = "kubernetes";
				}
				putMyEnv(envRecord);
			}
		};
		if (envRecord.deployer) {
			$scope.deployer = envRecord.deployer;
			continue_fn(envRecord.deployer);
		} else {
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
					continue_fn(response);
				}
			});
		}
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
	
	injectFiles.injectCss("modules/dashboard/environments/environments.css");
}]);
