"use strict";
var addService = soajsApp.components;
addService.service('addService', ['$timeout', '$modal', 'resourceDeploy', function ($timeout, $modal, resourceDeploy) {
	
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
				
				$scope.save = function (isInBetween, cb) {
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
					
					if (!isInBetween) {
						overlayLoading.show();
					}
					
					resourceConfiguration.mapConfigurationFormDataToConfig($scope, function () {
						saveResource(function () {
							saveResourceDeployConfig(function () {
								if (cb) return cb();
								
								if (!isInBetween) {
									overlayLoading.hide();
								}
								$scope.formData = {};
								$modalInstance.close();
								currentScope.load();
							});
						});
					});
					
					function saveResource(cb) {
						var saveOptions = {
							name: $scope.formData.name,
							type: $scope.formData.type,
							category: $scope.formData.category,
							locked: $scope.formData.locked || false,
							plugged: $scope.formData.plugged || false,
							shared: $scope.formData.shared || false,
							config: $scope.formData.config
						};
						if ($scope.formData.deployOptions.custom
							&& $scope.formData.deployOptions.custom.ports
							&& $scope.formData.deployOptions.custom.ports.length > 0) {
							$scope.formData.deployOptions.custom.ports.forEach(function (onePort) {
								if (Object.hasOwnProperty.call(onePort, 'loadBalancer')) {
									delete onePort.loadBalancer
								}
								if (!saveOptions.config.ports) {
									saveOptions.config.ports = []
								}
								saveOptions.config.ports.push(onePort);
							});
						}
						if ($scope.formData.deployOptions.custom
							&& $scope.formData.deployOptions.custom.secrets
							&& $scope.formData.deployOptions.custom.secrets.length > 0) {
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
						
						var options = {};
						if ($scope.options.formAction === 'add') {
							options = {
								method: 'post',
								routeName: '/dashboard/resources/add',
								data: {
									env: $scope.options.envCode.toUpperCase(),
									resource: saveOptions
								}
							};
						}
						else {
							options = {
								method: 'put',
								routeName: '/dashboard/resources/update',
								params: {
									env: $scope.options.envCode.toUpperCase(),
									id: $scope.formData._id
								},
								data: {
									resource: saveOptions
								}
							};
						}
						
						getSendDataFromServer(currentScope, ngDataApi, options, function (error, result) {
							if (error) {
								overlayLoading.hide();
								$scope.displayAlert('danger', error.message);
							}
							else {
								$scope.newResource = result;
								$scope.displayAlert('success', 'Resource updated successfully');
								return cb();
							}
						});
					}
					
					function saveResourceDeployConfig(cb) {
						
						if (!$scope.formData.deployOptions || Object.keys($scope.formData.deployOptions).length === 0) {
							if (cb) return cb();
							else return;
						}
						
						var deployOptions = angular.copy($scope.formData.deployOptions);
						if (!deployOptions.custom) {
							deployOptions.custom = {};
						}
						deployOptions.custom.type = 'resource';
						
						deployOptions.custom.sourceCode = $scope.reformatSourceCodeForCicd(deployOptions.sourceCode);
						delete deployOptions.sourceCode;
						
						if (deployOptions.deployConfig && deployOptions.deployConfig.memoryLimit) {
							deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit to bytes
						}
						
						var options = {
							method: 'put',
							routeName: '/dashboard/resources/config/update',
							data: {
								env: (($scope.options.formAction === 'update') ? $scope.formData.created.toUpperCase() : $scope.options.envCode.toUpperCase()),
								resourceName: $scope.formData.name,
								config: {
									deploy: $scope.formData.canBeDeployed || false,
									options: deployOptions
								}
							}
						};
						if (!$scope.formData.canBeDeployed) {
							delete options.data.config.options;
						}
						
						getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
							if (error) {
								overlayLoading.hide();
								$scope.displayAlert('danger', error.message);
							}
							else {
								$scope.displayAlert('success', 'Resource deployment configuration updated successfully');
								if (cb) return cb();
							}
						});
					}
				};
				
				$scope.saveAndDeploy = function (deployOnly) {
					if (!$scope.options.allowEdit) {
						$scope.displayAlert('warning', 'Deploying this resource is only allowed in the ' + $scope.formData.created + ' environment');
						return;
					}
					
					let validDeploy = resourceDeploy.updateFormDataBeforeSave($scope, $scope.formData.deployOptions);
					if (!validDeploy) {
						return;
					}
					
					overlayLoading.show();
					
					if (deployOnly) {
						deployResource(function () {
							currentScope.load();
						});
					}
					else {
						$scope.save(true, function () {
							deployResource(function () {
								$scope.formData = {};
								$modalInstance.close();
								currentScope.load();
							});
						});
					}
					
					function deployResource(cb) {
						if (!$scope.formData.canBeDeployed || !$scope.formData.deployOptions || Object.keys($scope.formData.deployOptions).length === 0) {
							if (cb) return cb();
							else return;
						}
						var deployOptions = angular.copy($scope.formData.deployOptions);
						if (!deployOptions.custom) {
							deployOptions.custom = {};
						}
						
						if (deployOptions.custom && deployOptions.custom.ports && deployOptions.custom.ports.length > 0) {
							deployOptions.custom.ports.forEach(function (onePort) {
								if (onePort.hasOwnProperty.call(onePort, 'LoadBalancer')) {
									delete onePort.LoadBalancer
								}
							});
						}
						deployOptions.custom.type = 'resource';
						
						deployOptions.custom.sourceCode = $scope.reformatSourceCodeForCicd(deployOptions.sourceCode);
						delete deployOptions.sourceCode;
						
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
						
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, {
							method: 'post',
							routeName: '/dashboard/cloud/services/soajs/deploy',
							data: deployOptions
						}, function (error) {
							overlayLoading.hide();
							if (error) {
								$scope.displayAlert('danger', error.message);
								if ($scope.newResource && $scope.newResource._id) {
									getSendDataFromServer($scope, ngDataApi, {
										method: 'delete',
										routeName: '/dashboard/resources/delete',
										params: {
											env: currentScope.envCode.toUpperCase(),
											id: $scope.newResource._id
										}
									}, function (error) {
										if (error) {
											$scope.displayAlert('danger', error.message);
										}
									});
								}
							}
							else {
								$scope.displayAlert('success', 'Resource deployed successfully. Check the High Availability - Cloud section to see it running');
								if (cb) return cb();
							}
						});
					}
				};
				
				$scope.saveAndRebuild = function () {
					if (!$scope.options.allowEdit) {
						$scope.displayAlert('warning', 'Rebuilding this resource is only allowed in the ' + $scope.formData.created + ' environment');
						return;
					}
					
					let validDeploy = resourceDeploy.updateFormDataBeforeSave($scope, $scope.formData.deployOptions);
					if (!validDeploy) {
						return;
					}
					
					overlayLoading.show();
					
					$scope.save(true, function () {
						rebuildService(function () {
							overlayLoading.hide();
							$scope.formData = {};
							$modalInstance.close();
							currentScope.load();
						});
					});
					
					function rebuildService(cb) {
						if (!$scope.formData.isDeployed || !$scope.formData.canBeDeployed || (!$scope.formData.instance && !$scope.formData.instance.id)) {
							if (cb) return cb();
							else return;
						}
						
						if (!$scope.formData.deployOptions.custom) {
							$scope.formData.deployOptions.custom = {};
						}
						
						$scope.formData.deployOptions.custom.type = 'resource';
						
						$scope.formData.deployOptions.custom.sourceCode = $scope.reformatSourceCodeForCicd($scope.formData.deployOptions.sourceCode);
						delete $scope.formData.deployOptions.sourceCode;
						
						var rebuildOptions = angular.copy($scope.formData.deployOptions.custom);
						rebuildOptions.memory = $scope.formData.deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit back to bytes
						rebuildOptions.cpuLimit = $scope.formData.deployOptions.deployConfig.cpuLimit;
						
						getSendDataFromServer(currentScope, ngDataApi, {
							method: 'put',
							routeName: '/dashboard/cloud/services/redeploy',
							data: {
								env: $scope.formData.created,
								serviceId: $scope.formData.instance.id,
								mode: $scope.formData.instance.labels['soajs.service.mode'],
								action: 'rebuild',
								custom: rebuildOptions
							}
						}, function (error) {
							if (error) {
								overlayLoading.hide();
								$scope.displayAlert('danger', error.message);
							}
							else {
								$scope.displayAlert('success', 'Resource rebuilt successfully');
								if (cb) return cb();
							}
						});
					}
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