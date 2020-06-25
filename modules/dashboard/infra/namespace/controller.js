"use strict";
var infraApp = soajsApp.components;
infraApp.controller('infraNameSpaceCtrl', ['$scope', function ($scope) {
	$scope.$parent.isUserNameLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraConfig.permissions);
}]);
