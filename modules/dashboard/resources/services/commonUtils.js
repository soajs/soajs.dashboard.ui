"use strict";
var commonUtilsService = soajsApp.components;
commonUtilsService.service('commonUtils', ['ngDataApi', function (ngDataApi) {

	function listResources($scope, cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources/list', // must edit the path
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

	function deleteResource ($scope, params, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'delete',
            routeName: '/dashboard/resources/delete', // must edit the path
            params: {
                env: $scope.envCode.toUpperCase(),
                id: params.resource._id
            }
        }, function (error) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
               return cb();
            }
        });
	}

    function togglePlugResource ($scope, params, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'put',
            routeName: '/dashboard/resources/update', // update the path if any
            params: {
                id: params.resourceId,
                env: $scope.envCode.toUpperCase(),
            },
            data: { resource: params.resourceRecord }
        }, function (error) {

            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
            	return cb();
            }
        });
    }

    function upgradeAll ($scope, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/resources/upgrade',
            params: {
                env: $scope.envCode
            }
        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                return cb();
            }
        });
    }

	return {
		listResources,
        deleteResource,
        togglePlugResource,
        upgradeAll
	};
	
}]);