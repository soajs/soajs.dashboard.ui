"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('platformsCtrl', ['$scope', '$cookies', 'envPlatforms', 'platformsVM', 'ngDataApi', 'injectFiles', function ($scope, $cookies, envPlatforms, platformsVM, ngDataApi, injectFiles) {
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
				if($scope.environment.selected !== 'manual'){
					envPlatforms.renderDisplay($scope);
				}
			}
		});
	};
	
	$scope.editDriverConfig = function (driver) {
		envPlatforms.editDriverConfig($scope, driver);
	};

	$scope.updateNamespaceConfig = function (driver) {
		envPlatforms.updateNamespaceConfig($scope, driver);
	};
	
	$scope.attachContainerTechnology = function(){
		console.log("need to load the same ui that the add environment wizard is using and ask the user for details.");
		console.log("call api to deploy the infra and update the environment deployer object once done.");
	};
	
	$scope.detachContainerTechnology = function(){
		console.log('call api and switch the deployer config object to manual');
		console.log('if no previous manual was configured, set the ip to 127.0.0.1');
	};
	
	function listInfraProviders(cb) {
		//get the available providers
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra"
		}, function (error, providers) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				delete providers.soajsauth;
				$scope.infraProviders = providers;
			}
		});
		return cb();
	}
	
	/** VM Operations **/
	$scope.listVMs = function() {
		platformsVM.listVMs($scope);
	};
	
	
	if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
		$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
	}
	
	if($scope.access.platforms.getEnvironment){
		listInfraProviders(() => {
			$scope.getEnvPlatform();
		});
	}
	
	injectFiles.injectCss("modules/dashboard/environments/environments.css");
}]);
