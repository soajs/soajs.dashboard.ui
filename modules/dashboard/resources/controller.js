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
	};
	constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);

    $scope.listResources = function (isInBetween, cb) {

        commonUtils.listResources($scope, function (response) {
            $scope.resources = {list: response};
            $scope.resources.original = angular.copy($scope.resources.list); //keep a copy of the original resources records

            if ($scope.deployedServices) {
                markDeployed();
            }

            groupByType();

            function groupByType() {
                $scope.resources.types = {};
                $scope.resources.list.forEach(function (oneResource) {
                    if (!$scope.resources.types[oneResource.type]) {
                        $scope.resources.types[oneResource.type] = {};
                    }
                    if (!$scope.resources.types[oneResource.type][oneResource.category]) {
                        $scope.resources.types[oneResource.type][oneResource.category] = [];
                    }

                    if (oneResource.created === $scope.envCode.toUpperCase()) {
                        oneResource.allowEdit = true;
                    }

                    if (oneResource.name === 'dash_cluster') {
                        oneResource.sensitive = true;
                    }

                    $scope.resources.types[oneResource.type][oneResource.category].push(oneResource);
                });
            }

            function markDeployed() {
                $scope.resources.list.forEach(function (oneResource) {
                    if ($scope.deployConfig && $scope.deployConfig[$scope.envCode.toUpperCase()]) {
                        if ($scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name]) {
                            var resourceConfig = $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name];

                            if (!resourceConfig.deploy) return;
                            if (!resourceConfig.options || !resourceConfig.options.recipe) return;

                            oneResource.canBeDeployed = true;
                            oneResource.deployOptions = $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name].options;

                            if ($scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name].status && oneResource.deployOptions.deployConfig.type === 'vm') {
                                if (!oneResource.instance) {
                                    oneResource.isDeployed = true;
                                    oneResource.instance = {
                                        id: oneResource.name
                                    };
                                    oneResource.status = $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name].status;
                                }
                            }
                        }
                    }

                    for (var i = 0; i < $scope.deployedServices.length; i++) {
                        if ($scope.deployedServices[i].labels && $scope.deployedServices[i].labels['soajs.resource.id'] === oneResource._id.toString()) {
                            oneResource.isDeployed = true;
                            oneResource.instance = $scope.deployedServices[i];
                        }
                        else if ($scope.deployedServices[i].name === oneResource.name && $scope.deployedServices[i].labels["soajs.service.technology"] === "vm") {
                            oneResource.isDeployed = true;
                            oneResource.instance = $scope.deployedServices[i];
                            oneResource.canBeDeployed = true;
                            if ($scope.deployConfig && $scope.deployConfig[$scope.envCode.toUpperCase()] && $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name]) {
                                oneResource.deployOptions = $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name].options;
                                oneResource.status = $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name].status;
                            }
                        }
                    }
                });
            }

            if (cb) return cb();
        });

    };

    $scope.deleteResource = function (resource) {
    	let params = {
    		resource : resource,
		};

        if (resource.isDeployed && resource.instance && resource.instance.id) {
            params.env = $scope.envCode;
            params.serviceId = resource.instance.id;
            params.name = resource.instance.name;

            if (resource && resource.instance && resource.instance.labels && resource.instance.labels['soajs.service.mode'] && resource.instance.labels['soajs.service.technology'] !== 'vm') {
                params.mode = resource.instance.labels['soajs.service.mode'];
            }

            if (resource.instance.labels && resource.instance.labels['soajs.service.technology'] === 'vm') {
                params.infraAccountId = resource.instance.labels['soajs.infra.id'];
                params.location = resource.instance.labels['soajs.service.vm.location'];
                params.technology = resource.instance.labels['soajs.service.technology'];
                delete params.mode;
            }
        }

        commonUtils.deleteResources($scope, params, function () {
            $scope.displayAlert('success', 'Resource deleted successfully');
            $scope.listResources();
        });
    };

    $scope.togglePlugResource = function (resource, plug) {
        var resourceRecord = {};
        //get the original resource record
        for (var i = 0; i < $scope.resources.original.length; i++) {
            if ($scope.resources.original[i]._id === resource._id) {
                resourceRecord = angular.copy($scope.resources.original[i]);
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
            resourceId : resourceId,
            resourceRecord : resourceRecord
		};

        commonUtils.togglePlugResource($scope, params, function () {
            $scope.displayAlert('success', 'Resource updated successfully');
            $scope.listResources(false);
        });
    };

    $scope.upgradeAll = function () {
        commonUtils.upgradeAll($scope, function () {
            $scope.displayAlert('success', "Resources have been upgraded to the latest version.");
            $scope.listResources();
		})
    };
	
	$scope.addResource = function () {};

	//start here
	if ($scope.access.list) {
		injectFiles.injectCss("modules/dashboard/resources/resources.css");
		if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
			$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
			$scope.envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
			$scope.envType = $scope.envDeployer.type;
			$scope.envPlatform = '';
			if ($scope.envType !== 'manual') {
				$scope.envPlatform = $scope.envDeployer.selected.split('.')[1];
			}
			
			$scope.listResources();
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
