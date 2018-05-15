'use strict';

var resourcesApp = soajsApp.components;
resourcesApp.controller('resourcesAppCtrl', ['$scope', '$http', '$timeout', '$modal', 'ngDataApi', '$cookies', 'injectFiles', 'resourceConfiguration', 'resourceDeploy', 'commonUtils', function ($scope, $http, $timeout, $modal, ngDataApi, $cookies, injectFiles, resourceConfiguration, resourceDeploy, commonUtils) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.context = {
		envCode: '',
		envDeployer: '',
		envType: '',
		envPlatform: '',
	};
	constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);
	
	// $scope.listResources = function () {
	//
	// };
	
	$scope.listResources = function (isInBetween, cb) {
		function groupByType() {
			$scope.resources.types = {};
			$scope.resources.list.forEach(function (oneResource) {
				if (!$scope.resources.types[oneResource.type]) {
					$scope.resources.types[oneResource.type] = {};
				}
				if (!$scope.resources.types[oneResource.type][oneResource.category]) {
					$scope.resources.types[oneResource.type][oneResource.category] = [];
				}
				
				if (oneResource.created === $scope.envCode.toUpperCase()) {
					oneResource.allowEdit = true;
				}
				
				if (oneResource.name === 'dash_cluster') {
					oneResource.sensitive = true;
				}
				
				$scope.resources.types[oneResource.type][oneResource.category].push(oneResource);
			});
		}
		
		commonUtils.listResources($scope, function (response) {
			$scope.resources = {list: response};
			$scope.resources.original = angular.copy($scope.resources.list); //keep a copy of the original resources records
			
			if ($scope.deployedServices) {
				$scope.markDeployed();
			}
			
			groupByType();
			
			if (cb) return cb();
		});
		
	};
	
	$scope.addResource = function () {
		
	};
	
	$scope.deleteResource = function (id) {
		
	};
	
	$scope.deleteResource = function () {
		
	};
	
	//start here
	if ($scope.access.list) {
		injectFiles.injectCss("modules/dashboard/resources/resources.css");
		if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
			$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
			$scope.envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
			$scope.envType = $scope.envDeployer.type;
			$scope.envPlatform = '';
			if ($scope.envType !== 'manual') {
				$scope.envPlatform = $scope.envDeployer.selected.split('.')[1];
			}
			
			$scope.listResources();
		}
	}
}]);

resourcesApp.filter('capitalizeFirst', function () {
	return function (input) {
		if (input && typeof input === 'string' && input.length > 0) {
			return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
		}
	}
});
