"use strict";
var commonService = soajsApp.components;
commonService.service('commonService', ['ngDataApi', function (ngDataApi) {

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
    
    function addEditResourceApi($scope, apiParam, cb) {
	    var options = {};
	    if ($scope.options.formAction === 'add') {
		    options = {
			    method: 'post',
			    routeName: '/dashboard/resources/add',
			    data: {
				    env: apiParam.envCode,
				    resource: apiParam.saveOptions
			    }
		    };
	    }
	    else {
		    options = {
			    method: 'put',
			    routeName: '/dashboard/resources/update',
			    params: {
				    env: apiParam.envCode,
				    id: apiParam.id
			    },
			    data: {
				    resource: apiParam.saveOptions
			    }
		    };
	    }
	
	    getSendDataFromServer(currentScope, ngDataApi, options, function (error, result) {
		    if (error) {
			    overlayLoading.hide();
			    $scope.displayAlert('danger', error.message);
		    }
		    else {
			    return cb(result);
		    }
	    });
    }

	return {
		listResources,
        deleteResource,
        togglePlugResource,
        listVms,
		addEditResourceApi
	};
	
}]);