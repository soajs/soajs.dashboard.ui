"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('cloudsCtrl', ['$scope', '$cookies', '$localStorage', function ($scope, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.directiveToLoad = '';
	$scope.envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
	if($scope.envDeployer.type === 'container'){
		$scope.directiveToLoad = "list-cloud.tmpl";
	}
	else{
		$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
		if ($localStorage.environments){
			let env = $localStorage.environments.find((oneEnv)=>{
				return oneEnv.code.toUpperCase() === $scope.envCode.toUpperCase()
			});
			if (env){
				if (env.services && env.services.config && env.services.config.ports && env.services.config.ports.controller){
					$scope.controllerPort = env.services.config.ports.controller;
				}
				if (env.deployer && env.deployer.type === 'manual' && env.deployer.manual && env.deployer.manual.nodes){
					$scope.SRVIP = env.deployer.manual.nodes;
				}
			}
			
		}
		$scope.directiveToLoad = "list-hosts.tmpl";
	}
}]);