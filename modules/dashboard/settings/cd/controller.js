"use strict";
var CDApp = soajsApp.components;
CDApp.controller('continuousDeliveryCtrl', ['$scope', function ($scope) {
	$scope.$parent.isUserNameLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, settingAppConfig.permissions);
}]);
