"use strict";
var commonUtilsService = soajsApp.components;
commonUtilsService.service('commonUtils', ['ngDataApi', function (ngDataApi) {
	function listResources($scope, cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources/list',
			params: {
				env: $scope.envCode
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				cb(response);
			}
		});
	}
	
	return {
		listResources
	};
	
}]);