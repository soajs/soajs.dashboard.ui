"use strict";
var commonService = soajsApp.components;
commonService.service('commonService', ['ngDataApi', function (ngDataApi) {

	function listResourcesApi($scope, apiParams, cb) {
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

	function deleteResourceApi($scope, apiParams, cb) {
        overlayLoading.show();
        return cb();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'delete',
            routeName: '/dashboard/resources/delete', // must edit the path
            params: {
                env: $scope.context.envCode.toUpperCase(),
                id: apiParams.resource._id
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

    function togglePlugResourceApi ($scope, apiParams, cb) {
        return cb();
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'put',
            routeName: '/dashboard/resources/update', // update the path if any
            params: {
                id: apiParams.resourceId,
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

    function listVmsApi ($scope, apiParams, cb) {
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
    
    function addEditResourceApi($scope, apiParams, cb) {
	    var options = {};
	    if ($scope.options.formAction === 'add') {
		    options = {
			    method: 'post',
			    routeName: '/dashboard/resources/add',
			    data: {
				    env: apiParams.envCode,
				    resource: apiParams.saveOptions
                    //add input for cd records apiParams.options
                    // add input for deploy apiParams.deployOptions
			    }
		    };
	    }
	    else {
		    options = {
			    method: 'put',
			    routeName: '/dashboard/resources/update',
			    params: {
				    env: apiParams.envCode,
				    id: apiParams.id
                    // add inputs for cd records apiParams.options
                    // add input for rebuild apiParmas.rebuildOptions
			    },
			    data: {
				    resource: apiParams.saveOptions
                    //add input for cd records [apiParams.deployOptions]
			    }
		    };
	    }
        return cb();
	    getSendDataFromServer($scope, ngDataApi, options, function (error, result) {
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
		listResourcesApi,
        deleteResourceApi,
        togglePlugResourceApi,
		listVmsApi,
		addEditResourceApi
	};
	
}]);