"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('platformsCtrl', ['$scope', '$cookies', 'envPlatforms', 'ngDataApi', 'injectFiles', function ($scope, $cookies, envPlatforms, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
	$scope.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";

	$scope.getEnvPlatform = function(){
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/platforms/list",
			"params": {
				"env": $scope.envCode
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.environment = response;
				envPlatforms.renderDisplay($scope);
			}
		});
	};
	
	$scope.editDriverConfig = function (driver) {
		envPlatforms.editDriverConfig($scope, driver);
	};

	$scope.updateDockerConfiguration = function(driver){
		envPlatforms.updateDockerConfiguration($scope, driver);
	};
	
	$scope.updateNamespaceConfig = function (driver) {
		envPlatforms.updateNamespaceConfig($scope, driver);
	};

	if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
		$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
	}
	
	if($scope.access.platforms.getEnvironment){
		$scope.getEnvPlatform();
	}
	
	injectFiles.injectCss("modules/dashboard/environments/environments.css");
}]);
