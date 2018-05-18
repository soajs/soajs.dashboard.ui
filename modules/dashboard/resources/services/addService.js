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
				
				resourceDeploy.buildDeployForm(currentScope, $scope, $modalInstance, resource, action, settings);

				$scope.saveNew = function (type, deployOnly, cb) {
                    let apiParams = {};
					
					/**
					 * using formData, $scope(options, envs)
					 */
					function saveResource(formData) {
                        let saveOptions = {
                            name: formData.name,
                            type: formData.type,
                            category: formData.category,
                            locked: formData.locked || false,
                            plugged: formData.plugged || false,
                            shared: formData.shared || false,
                            config: formData.config
                        };

                        if (formData.deployOptions.custom && formData.deployOptions.custom.ports && formData.deployOptions.custom.ports.length > 0) {
                            formData.deployOptions.custom.ports.forEach(function (onePort) {
                                if (Object.hasOwnProperty.call(onePort, 'loadBalancer')) {
                                    delete onePort.loadBalancer
                                }
                                if (!saveOptions.config.ports) {
                                    saveOptions.config.ports = [];
                                }
                                saveOptions.config.ports.push(onePort);
                            });
                        }

                        if (formData.deployOptions.custom && formData.deployOptions.custom.secrets && formData.deployOptions.custom.secrets.length > 0) {
                            saveOptions.config.secrets = formData.deployOptions.custom.secrets
                        }

                        if (formData.shared && !$scope.envs.sharedWithAll) {
                            saveOptions.sharedEnv = {};
                            formData.sharedEnv = {};
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
                            id: formData._id, // for edit
                        };

                        let deployOptions = {};

                        if (formData.deployOptions && Object.keys(formData.deployOptions).length !== 0) {
                            deployOptions = angular.copy(formData.deployOptions);

                            if (!deployOptions.custom) {
                                deployOptions.custom = {};
                            }

                            deployOptions.custom.type = 'resource';

                            deployOptions.custom.sourceCode = $scope.reformatSourceCodeForCicd(deployOptions.sourceCode);
                            delete deployOptions.sourceCode;

                            if (deployOptions.deployConfig && deployOptions.deployConfig.memoryLimit) {
                                deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit to bytes
                            }
                            apiParams['resourceName'] = formData.name;
                            apiParams['deploy'] =formData.canBeDeployed || false;
                            apiParams['options'] = deployOptions;

                            if (!formData.canBeDeployed) {
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
                    //ask etiennos about
                    resourceConfiguration.mapConfigurationFormDataToConfig($scope, function () {
                            saveResource($scope.formData);
                        });

                    let deployOptions = {};
                    let rebuildOptions = {};

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
                        return cb();
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
		// apiparamss type save save and delpol aw rebuild
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