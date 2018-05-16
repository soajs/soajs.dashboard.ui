"use strict";
var commonUtilsService = soajsApp.components;
commonUtilsService.service('commonUtils', ['ngDataApi', function (ngDataApi) {

	function listResources($scope, params, cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources/list', // must edit the path
			params: {
				env: $scope.context.envCode
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
			    return cb(response);
			}
		});
	}

	function deleteResource ($scope, params, cb) {
        overlayLoading.show();
        return cb();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'delete',
            routeName: '/dashboard/resources/delete', // must edit the path
            params: {
                env: $scope.context.envCode.toUpperCase(),
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
        return cb();
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'put',
            routeName: '/dashboard/resources/update', // update the path if any
            params: {
                id: params.resourceId,
                env: $scope.context.envCode.toUpperCase(),
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

    function listVms ($scope, params, cb) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/cloud/vm/list",
            "params": {
                "env": $scope.context.envCode
            }
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                return cb(response)
            }
        });
    }

	return {
		listResources,
        deleteResource,
        togglePlugResource,
        listVms
	};
	
}]);