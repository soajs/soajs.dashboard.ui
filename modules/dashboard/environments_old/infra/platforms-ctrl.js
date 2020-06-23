"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('platformsCtrl', ['$scope', '$cookies', 'envPlatforms', 'ngDataApi', 'injectFiles', function ($scope, $cookies, envPlatforms, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.environmentWizard = false;
	$scope.containerWizard = false;
	$scope.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
	$scope.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";
	$scope.includeVMErrors = true;
	$scope.errorVMLayers = null;
	$scope.getEnvPlatform = function(overlay){
		if(overlay){
			overlayLoading.show();
		}
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			//"routeName": "/dashboard/environment/platforms/list",
			"routeName": "/console/registry/deployer",
			"params": {
				"env": $scope.envCode
			}
		}, function (error, response) {
			if(overlay){
				overlayLoading.hide();
			}
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.environment = response;
				$scope.calculateType(response);
				envPlatforms.go($scope);
			}
		});
	};
	
	
	$scope.calculateType = function(response){
		//calculate environment type
		if(response.restriction && Object.keys(response.restriction).length > 0){
			//single cloud clustering
			$scope.environment.type = 'singleInfra';
		}
		else if(response.selected === 'manual'){
			//manual
			$scope.environment.type = 'manual';
		}
		else {
			//containerized
			$scope.environment.type = 'container';
		}
	};
	
	if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
		$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
		$scope.envDescription = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).description;
		
		if($scope.envCode && $scope.access.platforms.getEnvironment){
			$scope.getEnvPlatform();
		}
	}
	
	injectFiles.injectCss("modules/dashboard/environments/environments.css");
}]);
