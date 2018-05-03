'use strict';

// isInBetween : is a flag added to some functions to signal that the api is called in between other apis or not
// if set to false: no overlay will be shown / hidden and vice versa

var resourcesApp = soajsApp.components;
resourcesApp.controller('resourcesAppCtrl', ['$scope', '$http', '$timeout', '$modal', 'ngDataApi', '$cookies', 'injectFiles', 'resourceConfiguration', 'resourceDeploy', function ($scope, $http, $timeout, $modal, ngDataApi, $cookies, injectFiles, resourceConfiguration, resourceDeploy) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);
	
	$scope.listResources = function (isInBetween, cb) {
		$scope.oldStyle = false;
		getEnvironment(function () {
			if(!isInBetween){
				overlayLoading.show();
			}
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/resources/list',
				params: {
					env: $scope.envCode
				}
			}, function (error, response) {
				if (error) {
					overlayLoading.hide();
					$scope.displayAlert('danger', error.message);
				}
				else {
					if(!isInBetween){
						overlayLoading.hide();
					}
					$scope.resources = { list: response };
					$scope.resources.original = angular.copy($scope.resources.list); //keep a copy of the original resources records
					
					if ($scope.deployedServices) {
						markDeployed();
					}
					
					groupByType();
					
					if (cb) return cb();
				}
			});
			
		});
		
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
		
		function getEnvironment(cb) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment",
				"params": {
					"code": $scope.envCode
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					if (response.dbs.clusters && Object.keys(response.dbs.clusters).length > 0) {
						$scope.oldStyle = true;
					}
					return cb();
				}
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
					}
				}
				
				for (var i = 0; i < $scope.deployedServices.length; i++) {
					if ($scope.deployedServices[i].labels && $scope.deployedServices[i].labels['soajs.resource.id'] === oneResource._id.toString()) {
						oneResource.isDeployed = true;
						oneResource.instance = $scope.deployedServices[i];
					}
					else if ($scope.deployedServices[i].name === oneResource.name && $scope.deployedServices[i].labels["soajs.service.technology"] === "vm"){
						oneResource.isDeployed = true;
						oneResource.instance = $scope.deployedServices[i];
						oneResource.canBeDeployed = true;
						if($scope.deployConfig && $scope.deployConfig[$scope.envCode.toUpperCase()] && $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name]){
							oneResource.deployOptions = $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name].options;
						}
					}
				}
			});
		}
	};
	
	$scope.addResource = function () {
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
						$scope.manageResource({}, 'add', formData);
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
	};
	
	$scope.manageResource = function (resource, action, settings) {
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
					
					if (!isInBetween) {
						overlayLoading.show();
					}
					
					if ($scope.formData.deployOptions && $scope.formData.deployOptions.custom) {
						$scope.formData.deployOptions.custom.type = 'resource';
					}
					
					resourceDeploy.updateFormDataBeforeSave($scope.formData.deployOptions);
					
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
							&& $scope.formData.deployOptions.custom.ports.length > 0){
							$scope.formData.deployOptions.custom.ports.forEach(function (onePort) {
								if(Object.hasOwnProperty.call(onePort, 'loadBalancer')){
									delete onePort.loadBalancer
								}
								if(!saveOptions.config.ports){
									saveOptions.config.ports = []
								}
								saveOptions.config.ports.push(onePort);
							});
						}
						if ($scope.formData.deployOptions.custom
							&& $scope.formData.deployOptions.custom.secrets
							&& $scope.formData.deployOptions.custom.secrets.length > 0){
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
					
					overlayLoading.show();
					
					resourceDeploy.updateFormDataBeforeSave($scope.formData.deployOptions);
					
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
						
						if(deployOptions.custom && deployOptions.custom.ports && deployOptions.custom.ports.length > 0){
							deployOptions.custom.ports.forEach(function (onePort) {
								if(onePort.hasOwnProperty.call(onePort, 'LoadBalancer')){
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
								if ($scope.newResource && $scope.newResource._id){
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
					
					overlayLoading.show();
					
					resourceDeploy.updateFormDataBeforeSave($scope.formData.deployOptions);
					
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
	};
	
	$scope.deleteResource = function (resource) {
		deleteInstance(function () {
			deleteDeployConfig(function () {
				overlayLoading.show();
				getSendDataFromServer($scope, ngDataApi, {
					method: 'delete',
					routeName: '/dashboard/resources/delete',
					params: {
						env: $scope.envCode.toUpperCase(),
						id: resource._id
					}
				}, function (error) {
					overlayLoading.hide();
					if (error) {
						$scope.displayAlert('danger', error.message);
					}
					else {
						$scope.displayAlert('success', 'Resource deleted successfully');
						$scope.load();
					}
				});
			});
		});
		
		function deleteInstance(cb) {
			if (resource.isDeployed && resource.instance && resource.instance.id) {
				overlayLoading.show();
				getSendDataFromServer($scope, ngDataApi, {
					method: 'delete',
					routeName: '/dashboard/cloud/services/delete',
					params: {
						env: $scope.envCode,
						serviceId: resource.instance.id,
						mode: resource.instance.labels['soajs.service.mode'],
						name: resource.instance.name,
					}
				}, function (error) {
					overlayLoading.hide();
					if (error) {
						$scope.displayAlert('danger', error.message);
					}
					else {
						$scope.displayAlert('success', 'Resource instance deleted successfully');
						return cb();
					}
				});
			}
			else {
				return cb();
			}
		}
		
		function deleteDeployConfig(cb) {
			if (resource.canBeDeployed && resource.deployOptions) {
				overlayLoading.show();
				getSendDataFromServer($scope, ngDataApi, {
					method: 'put',
					routeName: '/dashboard/resources/config/update',
					data: {
						env: resource.created,
						resourceName: resource.name,
						config: {
							deploy: false
						}
					}
				}, function (error) {
					overlayLoading.hide();
					if (error) {
						$scope.displayAlert('danger', error.message);
					}
					else {
						$scope.displayAlert('success', 'Resource instance deleted successfully');
						return cb();
					}
				});
			}
			else {
				return cb();
			}
		}
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
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/resources/update',
			params: {
				id: resourceId,
				env: $scope.envCode.toUpperCase(),
			},
			data: { resource: resourceRecord }
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Resource updated successfully');
				$scope.listResources(false);
			}
		});
	};
	
	$scope.deployResource = function (resource) {
		if (!resource.canBeDeployed || !resource.deployOptions || Object.keys(resource.deployOptions).length === 0) {
			$scope.displayAlert('danger', 'This resource is missing deployment configuration');
		}
		
		var deployOptions = angular.copy(resource.deployOptions);
		if (!deployOptions.custom) {
			deployOptions.custom = {};
		}
		deployOptions.custom.resourceId = resource._id;
		deployOptions.env = resource.created;
		deployOptions.custom.type = "resource";
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cloud/services/soajs/deploy',
			data: deployOptions
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Resource deployed successfully. Check the High Availability - Cloud section to see it running');
				$scope.load();
			}
		});
	};
	
	$scope.upgradeAll = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources/upgrade',
			params: {
				env: $scope.envCode
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', "Resources have been upgraded to the latest version.");
				$scope.load();
			}
		});
	};
	
	$scope.listVms = function(cb) {
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cloud/vm/list",
			"params": {
				"env": $scope.envCode
			}
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				let response = {
					azure: {
						label: "My Azure Provider",
						list:[
							{
								"type": "vm",
								"name": "mikemongovm",
								"id": "mikemongovm",
								"labels": {
									"soajs.content": "true",
									"soajs.env.code": "dashboard",
									"soajs.service.technology": "vm",
									"soajs.infra.id": "5ae9e5cd55dc7960e796823b",
									"soajs.resource.id": "5ae9f082e371a7632ded1243",
									"soajs.image.prefix": "Canonical",
									"soajs.image.name": "UbuntuServer",
									"soajs.image.tag": "17.10",
									"soajs.service.name": "mikemongovm",
									"soajs.service.label": "mikemongovm",
									"soajs.service.type": "cluster",
									"soajs.service.subtype": "mongo"
								},
								"ports": [
									{
										"protocol": "tcp",
										"target": 27017,
										"published": 27017
									},
									{
										"protocol": "tcp",
										"target": 22,
										"published": 22
									}
								],
								"voluming": {},
								"tasks": [
									{
										"id": "mikemongovm",
										"name": "mikemongovm",
										"status": {
											"state": "succeeded",
											"ts": 1525338149668
										},
										"ref": {
											"os": {
												"type": "Linux",
												"diskSizeGB": 30
											}
										}
									}
								],
								"env": [],
								"servicePortType": "nodePort",
								"ip": "xxx-xxx-xxx-xxx"
							}
						]
					}
				};
				
				if(!$scope.deployedServices || !Array.isArray($scope.deployedServices)) {
					$scope.deployedServices = [];
				}
				for(let infra in response){
					$scope.deployedServices = $scope.deployedServices.concat(response[infra].list);
				}
				return cb();
			}
		});
	};
	
	$scope.listDeployedServices = function (cb) {
		if ($scope.envType === 'manual') {
			if (cb) return cb();
			else return;
		}
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cloud/services/list',
			params: { env: $scope.envCode }
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				if($scope.deployedServices && Array.isArray($scope.deployedServices)){
					$scope.deployedServices = $scope.deployedServices.concat(response);
				}
				else{
					$scope.deployedServices = response;
				}
				if (cb) return cb();
			}
		});
	};
	
	$scope.getDeployConfig = function (cb) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources/config'
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.deployConfig = response;
				
				if (cb) return cb();
			}
		});
	};
	
	$scope.load = function (cb) {
		overlayLoading.show();
		$scope.listVms(() => {
			$scope.listDeployedServices(function () {
				$scope.getDeployConfig(function () {
					$scope.listResources(true, function () {
						overlayLoading.hide();
						if (cb) return cb;
						return;
					});
				});
			});
		});
	};
	
	//start here
	if ($scope.access.list) {
		injectFiles.injectCss("modules/dashboard/resources/resources.css");
		if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
			$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
			$scope.envDeployer = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).deployer;
			$scope.envType = $scope.envDeployer.type;
			$scope.envPlatform = '';
			if($scope.envType !== 'manual') {
				$scope.envPlatform = $scope.envDeployer.selected.split('.')[1];
			}
			
			$scope.load();
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
