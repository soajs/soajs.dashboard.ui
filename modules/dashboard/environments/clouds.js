"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('cloudsCtrl', ['$scope', '$cookies', function ($scope, $cookies) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.directiveToLoad = '';
	$scope.envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
	if($scope.envDeployer.type === 'container'){
		$scope.directiveToLoad = "list-cloud.tmpl";
	}
	else{
		$scope.directiveToLoad = "list-hosts.tmpl";
	}
}]);