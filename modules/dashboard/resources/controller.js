'use strict';

var resourcesApp = soajsApp.components;
resourcesApp.controller('resourcesAppCtrl', ['$scope', '$http', '$timeout', '$modal', 'ngDataApi', '$cookies', 'injectFiles', 'resourceConfiguration', 'resourceDeploy', 'commonService', 'addService', function ($scope, $http, $timeout, $modal, ngDataApi, $cookies, injectFiles, resourceConfiguration, resourceDeploy, commonService, addService) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.context = {
		envCode: '',
		envDeployer: '',
		envType: '',
		envPlatform: '',
		resources: {
			original: []
		},
	};
	constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);
	
	$scope.listResources = function (cb) {
		let apiParams = {};
		commonService.listResourcesApi($scope, apiParams, function (response) {
            response = [{
                "_id": "5ae2f95948907d64edf3c6bb",
                "name": "dash_cluster",
                "type": "cluster",
                "category": "mongo",
                "created": "DASHBOARD",
                "author": "owner",
                "locked": true,
                "plugged": true,
                "shared": true,
                "config": {
                    "servers": [{
                        "host": "192.168.35.35",
                        "port": 27017
                    }],
                    "credentials": {},
                    "URLParam": {
                        "bufferMaxEntries": 0,
                        "maxPoolSize": 5
                    },
                    "extraParam": {
                        "db": {
                            "native_parser": true,
                            "bufferMaxEntries": 0
                        },
                        "server": {}
                    },
                    "streaming": {}
                },
                "permission": true,
                "sensitive": true
            },
				{
                    "_id": "5af96cdbceefe91a3386f1d2",
                    "name": "test",
                    "type": "cluster",
                    "category": "mongo",
                    "locked": false,
                    "plugged": false,
                    "shared": false,
                    "config": {
                        "servers": [{
                            "host": "dev",
                            "port": 4444
                        }],
                        "credentials": {
                            "username": "owner",
                            "password": "password"
                        },
                        "URLParam": {},
                        "extraParam": {},
                        "streaming": {}
                    },
                    "created": "dev",
                    "author": "owner",
                    "permission": true,
                    "canBeDeployed": true,
                    "deployOptions": {
                        "custom": {
                            "name": "test",
                            "ports": [{
                                "name": "mongo",
                                "target": 27017,
                                "isPublished": true
                            }],
                            "loadBalancer": true,
                            "type": "resource",
                            "sourceCode": {
                                "configuration": {
                                    "repo": "",
                                    "branch": ""
                                }
                            }
                        },
                        "recipe": "5ae2f95948907d64edf3c6c9",
                        "deployConfig": {
                            "type": "container",
                            "memoryLimit": 128974848,
                            "replication": {
                                "mode": "global"
                            }
                        }
                    },
                    "allowEdit": true
                }];
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
	
	$scope.manageResource = function (resource, action) {
		addService.manageResource($scope, resource, action);
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
		
		let apiParams = {
			resourceId: resourceId,
			resourceRecord: resourceRecord
		};
		
		commonService.togglePlugResourceApi($scope, apiParams, function () {
			$scope.displayAlert('success', 'Resource updated successfully');
			$scope.listResources();
		});
	};
	
	$scope.deleteResource = function (resource) {
		let apiParams = {
			resource: resource,
		};
		commonService.deleteResourceApi($scope, apiParams, function () {
			$scope.displayAlert('success', 'Resource deleted successfully');
			$scope.listResources();
		});
	};
	
	$scope.addResource = function () {
		addService.addNewPopUp($scope);
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
