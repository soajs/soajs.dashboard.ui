"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('platformsCtrl', ['$scope', '$localStorage', '$routeParams', '$cookies', '$timeout', 'envPlatforms', 'platformsVM', 'platformCntnr', 'ngDataApi', 'injectFiles', function ($scope, $localStorage, $routeParams, $cookies, $timeout, envPlatforms, platformsVM, platformCntnr, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.environmentWizard = false;
	$scope.containerWizard = false;
	$scope.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
	$scope.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";

	$scope.getEnvPlatform = function(overlay){
		if(overlay){
			overlayLoading.show();
		}
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/platforms/list",
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
		$scope.containerWizard = true;
		platformCntnr.openContainerWizard($scope);
	};
	
	$scope.detachContainerTechnology = function(){
		platformCntnr.detachContainerTechnology($scope);
	};
	
	$scope.checkAttachContainerProgress = function(autoRefresh){
		platformCntnr.checkAttachContainerProgress($scope, autoRefresh);
	};
	
	/** VM Operations **/
	$scope.listVMLayers = function() {
		platformsVM.listVMLayers($scope);
	};

	$scope.getOnBoard = function(vmLayer, release) {
		platformsVM.getOnBoard($scope, vmLayer, release);
	};
	
	$scope.addVMLayer = function(){
		platformsVM.addVMLayer($scope);
	};
	
	$scope.inspectVMLayer = function(oneVMLayer){
		platformsVM.inspectVMLayer($scope, oneVMLayer);
	};
	
	$scope.editVMLayer = function(oneVMLayer){
		platformsVM.editVMLayer($scope, oneVMLayer);
	};
	
	$scope.deleteVMLayer = function(oneVMLayer){
		platformsVM.deleteVMLayer($scope, oneVMLayer);
	};
	
	if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
		$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
		if($routeParams){
			
			//get the code from local storage
			if($routeParams.envCode && $routeParams.envCode !== $scope.envCode){
				$localStorage.environments.forEach((oneEnv) => {
					if(oneEnv.code.toUpperCase() === $routeParams.envCode.toUpperCase()){
						let data = {
							"_id": oneEnv._id,
							"code": oneEnv.code,
							"sensitive": oneEnv.sensitive,
							"domain": oneEnv.domain,
							"profile": oneEnv.profile,
							"sitePrefix": oneEnv.sitePrefix,
							"apiPrefix": oneEnv.apiPrefix,
							"description": oneEnv.description,
							"deployer": oneEnv.deployer,
							"pending": oneEnv.pending,
							"error": oneEnv.error
						};
						$cookies.putObject('myEnv', data, { 'domain': interfaceDomain });
						$scope.$parent.switchEnvironment(data);
						$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
					}
				});
			}
			
			if($routeParams.tab && $routeParams.tab === 'vm'){
				$scope.openVMs = true;
				$timeout(() => {
					$scope.listVMLayers();
				}, 300);
			}
		}
		
		if($scope.envCode && $scope.access.platforms.getEnvironment){
			$scope.getEnvPlatform();
		}
	}
	
	
	injectFiles.injectCss("modules/dashboard/environments/environments.css");
}]);
