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
		}
	};
	constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);

	$scope.listResources = function (cb) {
		let apiParams = {
		    env : $scope.context.envCode,
            envType: $scope.context.envType
        };

		commonService.listResourcesApi($scope, apiParams, function (response) {
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

					if(oneResource.status && oneResource.status !== 'ready') {
						oneResource.allowEdit = false;
					}

					if (oneResource.name === 'dash_cluster') {
						oneResource.sensitive = true;
					}
					if (oneResource.config && Object.keys(oneResource.config).length === 0) {
						delete oneResource.config;
					}
					resources.types[oneResource.type][oneResource.category].push(oneResource);
				});
			}

			if (cb) {
				return cb();
			}
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
			id: resource._id,
			env : $scope.context.envCode.toUpperCase()
		};
		// for service
        if (resource.isDeployed && resource.instance && resource.instance.id) {
        	apiParams['serviceId'] = resource.instance.id;
        	apiParams['name'] = resource.instance.name;
		}
		//for cicd
        if (resource.canBeDeployed && resource.deployOptions) {
            apiParams['envCode'] = resource.created;
            apiParams['config'] = {
                deploy: false
            };
            apiParams['resourceName'] = resource.name
        }

		commonService.deleteResourceApi($scope, apiParams, function () {
			$scope.displayAlert('success', 'Resource deleted successfully');
			$scope.listResources();
		});
	};

	$scope.addResource = function () {
		addService.addNewPopUp($scope);
	};

	$scope.deployResource = function (resource) {
		if (!resource.canBeDeployed || !resource.deployOptions || Object.keys(resource.deployOptions).length === 0) {
			$scope.displayAlert('danger', 'This resource is missing deployment configuration');
		}

		let deployOptions = angular.copy(resource.deployOptions);
		if (!deployOptions.custom) {
			deployOptions.custom = {};
		}
		deployOptions.custom.resourceId = resource._id;
		deployOptions.env = resource.created;
		deployOptions.custom.type = "resource";

		let apiParams = {
            'deployOptions' : deployOptions
		};
        commonService.deployResource($scope, apiParams, function () {
            $scope.displayAlert('success', 'Resource deployed successfully. Check the High Availability - Cloud section to see it running');
            $scope.listResources();
        });

	};

	$scope.getEnvPlatform = function(cb){
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/platforms/list",
			"params": {
				"env": $scope.context.envCode
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.context.envDeployer = response;
				return cb();
			}
		});
	};

	//start here
	if ($scope.access.list) {
		injectFiles.injectCss("modules/dashboard/resources/resources.css");
		if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
			$scope.context.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
			$scope.getEnvPlatform(() => {
				$scope.context.envType = $scope.context.envDeployer.type;
				$scope.context.envPlatform = '';
				if ($scope.context.envType !== 'manual') {
					$scope.context.envPlatform = $scope.context.envDeployer.selected.split('.')[1];
				}
				$scope.listResources();
			});
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
