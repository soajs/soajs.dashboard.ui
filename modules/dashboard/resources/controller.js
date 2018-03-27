'use strict';

var resourcesApp = soajsApp.components;
resourcesApp.controller('resourcesAppCtrl', ['$scope', '$http', '$timeout', '$modal', 'ngDataApi', '$cookies', 'injectFiles', 'resourceConfiguration', 'resourceDeploy', function ($scope, $http, $timeout, $modal, ngDataApi, $cookies, injectFiles, resourceConfiguration, resourceDeploy) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);
	
	$scope.listResources = function (cb) {
		$scope.oldStyle = false;
		getEnvironment(function () {
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/resources/list',
				params: {
					env: $scope.envCode
				}
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				else {
					$scope.resources = { list: response };
					$scope.resources.original = angular.copy($scope.resources.list); //keep a copy of the original resources records
					
					if ($scope.deployConfig && $scope.deployedServices) {
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
						break;
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
	
	function decodeRepoNameAndSubName(name) {
		let splits = name.split('__SOAJS_DELIMITER__');
		
		let output = {
			name : splits[0]
		};
		
		if(splits.length > 0){
			let subName = splits[1];
			if(subName){
				output.subName = splits[1];
			}
		}
		
		return output;
	}
	
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
				
				function reformatSourceCodeForCicd(record) {
					if(record.configuration && record.configuration.repo){
						let selectedRepo = record.configuration.repo;
						if(selectedRepo === '-- Leave Empty --'){
							record.configuration.repo = "";
							record.configuration.branch = "";
						}else{
							$scope.configRepos.config.forEach(function (eachConf) {
								if(eachConf.name === selectedRepo){
									record.configuration.commit = eachConf.configSHA;
									record.configuration.owner = eachConf.owner;
								}
							});
						}
					}
					
					if(record.custom && record.custom.repo){
						let selectedRepoComposed = record.custom.repo;
						let decoded = decodeRepoNameAndSubName(selectedRepoComposed);
						
						let selectedRepo = decoded.name;
						let subName = decoded.subName;
						
						record.custom.repo = selectedRepo; // save clear value
						
						if(selectedRepo === '-- Leave Empty --'){
							record.custom.repo = "";
							record.custom.branch = "";
						}else {
							$scope.configRepos.customType.forEach(function (eachConf) {
								if (eachConf.name === selectedRepo) {
									record.custom.owner = eachConf.owner;
									record.custom.subName = subName; // for multi
									
									if (eachConf.configSHA && typeof eachConf.configSHA === 'object') { // for multi
										eachConf.configSHA.forEach(function (eachConfig) {
											if (eachConfig.contentName === subName) {
												record.custom.commit = eachConfig.sha;
											}
										});
									} else {
										record.custom.commit = eachConf.configSHA;
									}
								}
							});
						}
					}
					
					return record;
				}
				
				$scope.save = function (cb) {
					if (!$scope.options.allowEdit) {
						$scope.displayAlert('warning', 'Configuring this resource is only allowed in the ' + $scope.formData.created + ' environment');
						return;
					}
					
					if ($scope.formData.deployOptions && $scope.formData.deployOptions.custom) {
						$scope.formData.deployOptions.custom.type = 'resource';
					}
					
					resourceConfiguration.mapConfigurationFormDataToConfig($scope, function () {
						saveResource(function () {
							saveResourceDeployConfig(function () {
								if (cb) return cb();
								
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
						if ($scope.formData.shared && !$scope.envs.sharedWithAll) {
							saveOptions.sharedEnv = {};
							$scope.envs.list.forEach(function (oneEnv) {
								if (oneEnv.selected) {
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
						
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, options, function (error, result) {
							overlayLoading.hide();
							if (error) {
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
						
						deployOptions.custom.sourceCode = reformatSourceCodeForCicd(deployOptions.sourceCode);
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
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
							overlayLoading.hide();
							if (error) {
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
					
					if (deployOnly) {
						deployResource(function () {
							currentScope.load();
						});
					}
					else {
						$scope.save(function () {
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
						
						deployOptions.custom.type = 'resource';
						
						deployOptions.custom.sourceCode = reformatSourceCodeForCicd(deployOptions.sourceCode);
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
					
					$scope.save(function () {
						rebuildService(function () {
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
						
						$scope.formData.deployOptions.custom.sourceCode = reformatSourceCodeForCicd($scope.formData.deployOptions.sourceCode);
						delete $scope.formData.deployOptions.sourceCode;
						
						var rebuildOptions = angular.copy($scope.formData.deployOptions.custom);
						rebuildOptions.memory = $scope.formData.deployOptions.deployConfig.memoryLimit *= 1048576; //convert memory limit back to bytes
						rebuildOptions.cpuLimit = $scope.formData.deployOptions.deployConfig.cpuLimit;
						
						overlayLoading.show();
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
							overlayLoading.hide();
							if (error) {
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
				$scope.listResources();
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
				$scope.deployedServices = response;
				if (cb) return cb();
			}
		});
	};
	
	$scope.getDeployConfig = function (cb) {
		if ($scope.envType === 'manual') {
			if (cb) return cb();
			else return;
		}
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources/config'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.deployConfig = response;
				
				if (cb) return cb();
			}
		});
	};
	
	$scope.load = function (cb) {
		$scope.listDeployedServices(function () {
			$scope.getDeployConfig(function () {
				$scope.listResources(function () {
					if (cb) return cb;
					
					return;
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
