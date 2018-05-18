"use strict";
var addService = soajsApp.components;
addService.service('addService', ['$timeout','ngDataApi', '$modal', 'resourceDeploy', 'commonService', 'resourceConfiguration', function ($timeout, ngDataApi, $modal, resourceDeploy, commonService, resourceConfiguration) {
	
	function manageResource($scope, resource, action, settings) {
		var currentScope = $scope;
		$modal.open({
			templateUrl: "addEditResource.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				//bala callback bas hye zeta
				resourceDeploy.buildDeployForm(currentScope, $scope, $modalInstance, resource, action, settings);

				$scope.saveNew = function (type) {
				    
                    let apiParams = {};
                    let deployOptions = {};
                    let rebuildOptions = {};
                    
                    function saveResource() {
                        let saveOptions = {
                            name: $scope.formData.name,
                            type: $scope.formData.type,
                            category: $scope.formData.category,
                            locked: $scope.formData.locked || false,
                            plugged: $scope.formData.plugged || false,
                            shared: $scope.formData.shared || false,
                            config: $scope.formData.config
                        };

                        if ($scope.formData.deployOptions.custom && $scope.formData.deployOptions.custom.ports && $scope.formData.deployOptions.custom.ports.length > 0) {
                            $scope.formData.deployOptions.custom.ports.forEach(function (onePort) {
                                if (Object.hasOwnProperty.call(onePort, 'loadBalancer')) {
                                    delete onePort.loadBalancer
                                }
                                if (!saveOptions.config.ports) {
                                    saveOptions.config.ports = [];
                                }
                                saveOptions.config.ports.push(onePort);
                            });
                        }

                        if ($scope.formData.deployOptions.custom && $scope.formData.deployOptions.custom.secrets && $scope.formData.deployOptions.custom.secrets.length > 0) {
                            saveOptions.config.secrets = $scope.formData.deployOptions.custom.secrets
                        }

                        if ($scope.formData.shared && !$scope.envs.sharedWithAll) {
                            saveOptions.sharedEnv = {};
                            $scope.formData.sharedEnv = {};
                            $scope.envs.list.forEach(function (oneEnv) {
                                if (oneEnv.selected) {
                                    saveOptions.sharedEnv[oneEnv.code.toUpperCase()] = true;
                                    saveOptions.sharedEnv[oneEnv.code.toUpperCase()] = true;
                                }
                            });
                        }

                        if (saveOptions.config && saveOptions.config.ports) {
                            delete saveOptions.config.ports;
                        }

                        apiParams = {
                            type: $scope.options.formAction, // add or edit
                            envCode: $scope.options.envCode.toUpperCase(),
                            saveOptions,
                            id: $scope.formData._id, // for edit
                        };

                        let deployOptions = {};

                        if ($scope.formData.deployOptions && Object.keys($scope.formData.deployOptions).length !== 0) {
                            deployOptions = angular.copy($scope.formData.deployOptions);

                            if (!deployOptions.custom) {
                                deployOptions.custom = {};
                            }

                            deployOptions.custom.type = 'resource';

                            deployOptions.custom.sourceCode = $scope.reformatSourceCodeForCicd(deployOptions.sourceCode);
                            delete deployOptions.sourceCode;

                            if (deployOptions.deployConfig && deployOptions.deployConfig.memoryLimit) {
                                deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit to bytes
                            }
                            apiParams['resourceName'] = $scope.formData.name;
                            apiParams['deploy'] =$scope.formData.canBeDeployed || false;
                            apiParams['options'] = deployOptions;

                            if (!$scope.formData.canBeDeployed) {
                                delete apiParams['options'];
                            }
                        }
                    }

                    function updateApiParams(type) {
                        deployOptions = angular.copy($scope.formData.deployOptions);
                        if (!deployOptions.custom) {
                            deployOptions.custom = {};
                        }

                        deployOptions.custom.type = 'resource';
                        deployOptions.custom.sourceCode = $scope.reformatSourceCodeForCicd(deployOptions.sourceCode);
                        delete deployOptions.sourceCode;
                        if (type === "saveAndDeploy" && (!$scope.formData.canBeDeployed || !$scope.formData.deployOptions || Object.keys($scope.formData.deployOptions).length === 0)) {
                            if (deployOptions.custom && deployOptions.custom.ports && deployOptions.custom.ports.length > 0) {

                                deployOptions.custom.ports.forEach(function (onePort) {
                                    if (onePort.hasOwnProperty.call(onePort, 'LoadBalancer')) {
                                        delete onePort.LoadBalancer
                                    }
                                });
                            }
                            if ($scope.options.formAction === 'add') {
                                if ($scope.newResource && Object.keys($scope.newResource).length > 0) {
                                    deployOptions.custom.resourceId = $scope.newResource._id;
                                }

                                deployOptions.env = $scope.options.envCode;
                                if (deployOptions.deployConfig && deployOptions.deployConfig.memoryLimit) {
                                    deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit to bytes
                                }
                            }
                            else {
                                deployOptions.custom.resourceId = $scope.formData._id;
                                deployOptions.env = $scope.formData.created;

                                if (deployOptions.deployConfig && deployOptions.deployConfig.memoryLimit) {
                                    deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit to bytes
                                }
                            }
                            apiParams["deployOptions"] = deployOptions;
                        }

                        if (type === "saveAndRebuild" && (!$scope.formData.isDeployed || !$scope.formData.canBeDeployed || (!$scope.formData.instance && !$scope.formData.instance.id))) {
                            rebuildOptions = angular.copy(deployOptions.custom);
                            rebuildOptions.memory = $scope.formData.deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit back to bytes
                            rebuildOptions.cpuLimit = $scope.formData.deployOptions.deployConfig.cpuLimit;
                            apiParams["rebuildOptions"] = deployOptions;
                        }
                    }

                    if (!$scope.options.allowEdit) {
                        $scope.displayAlert('warning', 'Configuring this resource is only allowed in the ' + $scope.formData.created + ' environment');
                        return;
                    }

                    if ($scope.formData.deployOptions && $scope.formData.deployOptions.custom) {
                        $scope.formData.deployOptions.custom.type = 'resource';
                    }

                    let validDeploy = resourceDeploy.updateFormDataBeforeSave($scope, $scope.formData.deployOptions);
                    if (!validDeploy) {
                        return;
                    }
                    
                    resourceConfiguration.mapConfigurationFormDataToConfig($scope);
                    saveResource();
                    
					if (type === 'saveAndDeploy') {
                        updateApiParams('saveAndDeploy');
                    }

					if (type === 'saveAndRebuild') {
                        updateApiParams('saveAndRebuild');
                    }


                    commonService.addEditResourceApi($scope, apiParams, function (response) {
                        $scope.newResource = response;
                        $scope.displayAlert('success', 'Resource updated successfully');
                        $scope.formData = {};
                        $modalInstance.close();
                        currentScope.listResources();
                    });
                };

				$scope.cancel = function () {
					$modalInstance.close();
					if ($scope.form && $scope.form.formData) {
						$scope.form.formData = {};
						delete $scope.resourceDriverCounter;
					}
				};
			}
		});
	}
	
	function addNewPopUp($scope) {
		var formConfig = angular.copy(resourcesAppConfig.form.addResource);
		formConfig.entries[0].value = formConfig.data.types;
		formConfig.entries[0].onAction = function (id, value, form) {
			form.entries[1].value = [];
			formConfig.data.categories.forEach(function (oneCategory) {
				if (oneCategory.group === value.toLowerCase()) {
					form.entries[1].value.push(oneCategory);
				}
			});
			form.entries[1].hidden = false;
		};
		
		var currentScope = $scope;
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addResource',
			label: 'Add New Resource',
			actions: [
				{
					'type': 'submit',
					'label': 'Proceed',
					'btn': 'primary',
					'action': function (formData) {
						manageResource($scope, {}, 'add', formData);
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		
		buildFormWithModal(currentScope, $modal, options);
	}
	
	return {
		addNewPopUp,
		manageResource
	};
	
}]);