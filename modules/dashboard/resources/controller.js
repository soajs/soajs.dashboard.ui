'use strict';

var resourcesApp = soajsApp.components;
resourcesApp.controller('resourcesAppCtrl', ['$scope', '$http', '$timeout', '$modal', 'ngDataApi', '$cookies', 'injectFiles', 'resourceConfiguration', 'resourceDeploy', 'commonUtils', function ($scope, $http, $timeout, $modal, ngDataApi, $cookies, injectFiles, resourceConfiguration, resourceDeploy, commonUtils) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.context = {
		envCode: '',
		envDeployer: '',
		envType: '',
		envPlatform: '',
        deployConfig : {},
        deployedServices : [],
        resources : {
            original : []
        },
	};
	constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);
	
	$scope.listResources = function (cb) {
		let params = {};
		commonUtils.listResources($scope, params, function (response) {
			$scope.context.resources = {list: response};
			$scope.context.resources.original = angular.copy($scope.context.resources.list); //keep a copy of the original resources records
			groupByType($scope.context.resources, $scope.context.envCode);
			
			function groupByType(resources, envCode) {
				resources.types = {};
				resources.list.forEach(function (oneResource) {
					if (!resources.types[oneResource.type]) {
						resources.types[oneResource.type] = {};
					}
					if (!resources.types[oneResource.type][oneResource.category]) {
						resources.types[oneResource.type][oneResource.category] = [];
					}
					
					if (oneResource.created === envCode.toUpperCase()) {
						oneResource.allowEdit = true;
					}
					
					if (oneResource.name === 'dash_cluster') {
						oneResource.sensitive = true;
					}
					resources.types[oneResource.type][oneResource.category].push(oneResource);
				});
			}

			if (cb) return cb();
		});
		
	};

    $scope.togglePlugResource = function (resource, plug) {
        var resourceRecord = {};
        //get the original resource record
        for (var i = 0; i < $scope.context.resources.original.length; i++) {
            if ($scope.context.resources.original[i]._id === resource._id) {
            	let
                resourceRecord = angular.copy($scope.context.resources.original[i]);
                break;
            }
        }

        var resourceId = resourceRecord._id;
        delete resourceRecord._id;
        delete resourceRecord.created;
        delete resourceRecord.author;
        delete resourceRecord.permission;
        resourceRecord.plugged = plug;

        let params = {
            resourceId: resourceId,
            resourceRecord: resourceRecord
        };

        commonUtils.togglePlugResource($scope, params, function () {
            $scope.displayAlert('success', 'Resource updated successfully');
            $scope.listResources();
        });
    };

    $scope.deleteResource = function (resource) {
        let params = {
            resource: resource,
        };
        commonUtils.deleteResource($scope, params, function () {
            $scope.displayAlert('success', 'Resource deleted successfully');
            $scope.listResources();
        });
    };

	$scope.addResource = function () {
	};
	
	//start here
	if ($scope.access.list) {
		injectFiles.injectCss("modules/dashboard/resources/resources.css");
		if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
			$scope.context.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
			$scope.context.envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
			$scope.context.envType = $scope.context.envDeployer.type;
			$scope.context.envPlatform = '';
			if ($scope.context.envType !== 'manual') {
				$scope.context.envPlatform = $scope.context.envDeployer.selected.split('.')[1];
			}
            //$scope.listVms(function (){
                $scope.listResources();
           // });
		}
	}
}]);

resourcesApp.filter('capitalizeFirst', function () {
	return function (input) {
		if (input && typeof input === 'string' && input.length > 0) {
			return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
		}
	}
});
