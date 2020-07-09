"use strict";
var CDApp = soajsApp.components;
CDApp.controller('notificationCtrl', ['$scope', '$location', function ($scope, $location) {
	$scope.$parent.isUserNameLoggedIn();
	
	$scope.access = {};
	$scope.go = function (route){
		$location.path(route);
	};
	constructModulePermissions($scope, $scope.access, settingAppConfig.permissions);
}]);