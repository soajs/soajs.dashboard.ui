"use strict";
var addService = soajsApp.components;
addService.service('addService', ['$timeout', 'ngDataApi', '$modal', 'resourceDeploy', 'commonService', 'resourceConfiguration', function ($timeout, ngDataApi, $modal, resourceDeploy, commonService, resourceConfiguration) {

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

				$scope.save = function (type) {
					let formData = $scope.formData;
					let deployOptions = {};
					let rebuildOptions = {};
					let apiParams = {
						type: $scope.options.formAction, // add or edit
						envCode: $scope.options.envCode.toUpperCase(),
						id: formData._id, // only for edit
						canBeDeployed: $scope.formData.canBeDeployed,
						deployType: "save"
					};

					function updateApiParamsBeforeSave() {
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

						if (formData.shared && !$scope.mainData.envs.sharedWithAll) {
							saveOptions.sharedEnv = {};
							formData.sharedEnv = {};
							$scope.mainData.envs.list.forEach(function (oneEnv) {
								if (oneEnv.selected) {
									saveOptions.sharedEnv[oneEnv.code.toUpperCase()] = true;
									saveOptions.sharedEnv[oneEnv.code.toUpperCase()] = true;
								}
							});
						}

						if (saveOptions.config && saveOptions.config.ports) {
							delete saveOptions.config.ports;
						}

						apiParams.saveOptions = saveOptions;

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
							apiParams['deploy'] = formData.canBeDeployed || false;
							apiParams['options'] = deployOptions;

							if (!formData.canBeDeployed) {
								delete apiParams['options'];
							}
						}
					}

					function updateApiParams(type) {
						deployOptions = angular.copy(formData.deployOptions);
						if (!deployOptions.custom) {
							deployOptions.custom = {};
						}

						deployOptions.custom.type = 'resource';
						deployOptions.custom.sourceCode = $scope.reformatSourceCodeForCicd(deployOptions.sourceCode);
						delete deployOptions.sourceCode;
						if (formData.deployOptions.deployConfig.type === "vm" && formData.deployOptions.deployConfig.vmConfiguration && formData.deployOptions.deployConfig.vmConfiguration.vmLayer) {
							formData.vms = [];
							$scope.mainData.deploymentData.vmLayers[formData.deployOptions.deployConfig.vmConfiguration.vmLayer].forEach((oneInstance) => {
								formData.vms.push(oneInstance.name);
							});
						}
						if (type === "saveAndDeploy" && $scope.formData.canBeDeployed && $scope.formData.deployOptions && Object.keys($scope.formData.deployOptions).length > 0) {
							apiParams['deployType'] = "saveAndDeploy";
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
								deployOptions.custom.resourceId = formData._id;
								deployOptions.env = formData.created;

								if (deployOptions.deployConfig && deployOptions.deployConfig.memoryLimit) {
									deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit to bytes
								}
							}
							apiParams["deployOptions"] = deployOptions;
							if (formData.deployOptions.deployConfig.type === "vm" && formData.deployOptions.deployConfig.vmConfiguration && formData.deployOptions.deployConfig.vmConfiguration.vmLayer) {
								apiParams["vms"] = [];
								$scope.mainData.deploymentData.vmLayers[formData.deployOptions.deployConfig.vmConfiguration.vmLayer].forEach((oneInstance) => {
									apiParams.vms.push(oneInstance.name);

									if(apiParams.options && apiParams.options.deployConfig && apiParams.options.deployConfig.vmConfiguration) {
										if(!apiParams.options.deployConfig.vmConfiguration.group) {
											apiParams.options.deployConfig.vmConfiguration.group = oneInstance.labels['soajs.service.vm.group'];
										}
									}
								});
							}
						}
					}

					if (type === "saveAndRebuild" && formData.isDeployed && formData.canBeDeployed && formData.instance && formData.instance.id) {
						rebuildOptions = angular.copy(deployOptions.custom);
						apiParams['deployType'] = "saveAndRebuild";
						rebuildOptions.memory = formData.deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit back to bytes
						rebuildOptions.cpuLimit = formData.deployOptions.deployConfig.cpuLimit;
						apiParams["rebuildOptions"] = rebuildOptions;
						apiParams["serviceId"] = formData.instance.id;
						apiParams["mode"] = formData.instance.labels['soajs.service.mode'];
					}

					if (!$scope.options.allowEdit) {
						$scope.displayAlert('warning', 'Configuring this resource is only allowed in the ' + formData.created + ' environment');
						return;
					}

					if (formData.deployOptions && formData.deployOptions.custom) {
						formData.deployOptions.custom.type = 'resource';
					}

					let validDeploy = resourceDeploy.updateFormDataBeforeSave($scope, formData.deployOptions);
					if (!validDeploy) {
						return;
					}

					resourceConfiguration.mapConfigurationFormDataToConfig($scope);
					updateApiParamsBeforeSave();

					if (type === 'saveAndDeploy') {
						updateApiParams('saveAndDeploy');
					}

					if (type === 'saveAndRebuild') {
						updateApiParams('saveAndRebuild');
					}

					commonService.addEditResourceApi($scope, apiParams, function (response) {
						$scope.newResource = response;
						if (type === 'saveAndRebuild') {
							currentScope.displayAlert('success', 'Resource updated successfully. Check the High Availability - Cloud section to see it running');
						}
						if (type === 'saveAndDeploy') {
							currentScope.displayAlert('success', 'Resource deployed successfully. Check the High Availability - Cloud section to see it running');
						}
						if (type === 'save') {
							currentScope.displayAlert('success', 'Resource added successfully');
						}
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
