"use strict";
var CDApp = soajsApp.components;
CDApp.controller('releaseCtrl', ['$scope', 'ngDataApi', 'injectFiles', function ($scope, ngDataApi, injectFiles) {
	$scope.$parent.isUserNameLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, settingAppConfig.permissions);
	$scope.getConsoleVersion = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/console/release',
			'params': {
				'soajs': true
			}
		}, function (error, release) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
			} else {
				$scope.currentRelease = release;
			}
		});
	};
	injectFiles.injectCss("modules/dashboard/settings/settings.css");
	if ($scope.access.getCurrentRelease){
		$scope.getConsoleVersion();
	}
	
}]);
