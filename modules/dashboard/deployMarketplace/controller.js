"use strict";
var soajsDeployCatalogApp = soajsApp.components;
soajsDeployCatalogApp.controller('soajsDeployCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'kubeServicesSrv', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, kubeServicesSrv) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsDeployCatalogConfig.permissions);
	$scope.mainTabs = {};
	$scope.autoScale = "danger";
	let defaultGroup = "SOAJS Core Services";
	
	$scope.selectedEnvironment = $cookies.getObject('myEnv', {'domain': interfaceDomain});
	$scope.envDeployer = angular.copy($scope.selectedEnvironment).deployer;
	$scope.envDeployeTechnology = $scope.selectedEnvironment.technology;
	if ($scope.selectedEnvironment.type) {
		$scope.envDeployeType = $scope.selectedEnvironment.type;
	}
	$scope.deployments = {};
	$scope.showHide = function (service) {
		if (!service.hide) {
			jQuery('#s_' + service._id + " .body").slideUp();
			service.icon = 'plus';
			service.hide = true;
			jQuery('#s_' + service._id + " .header").addClass("closed");
		} else {
			jQuery('#s_' + service._id + " .body").slideDown();
			jQuery('#s_' + service._id + " .header").removeClass("closed");
			service.icon = 'minus';
			service.hide = false;
			if ($scope.envDeployeTechnology === 'kubernetes' && $scope.access.infra.kubernetes.item.get) {
				$scope.getDeployment(service);
			}
		}
	};
	
	$scope.listSoajsCatalog = function () {
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/soajs/items"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				
				$scope.soajsCatalogs = angular.copy(response);
				let user = $cookies.get('soajs_username', {'domain': interfaceDomain});
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/dashboard/favorite",
					"params": {
						"username": user,
						"type": 'soajs'
					}
				}, function (error, favoriteResponse) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					} else {
						if (response.records) {
							$scope.showCatalog = response.records.length > 0;
							$scope.soajsTabs = getCatalogs(response.records, favoriteResponse);
						}
						if ($scope.envDeployeType === 'manual') {
							$scope.awarenessStat();
						}
					}
				});
				
			}
		});
	};
	
	$scope.awarenessStat = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/infra/manual/awareness",
			"params": {
				"env": $scope.selectedEnvironment.code.toLowerCase()
			}
		}, function (error, awareness) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				$scope.awareness = awareness;
			}
		});
	};
	
	function getCatalogs(records, favoriteRecords) {
		let tabs = {};
		let type;
		records.forEach((record) => {
			if (record.type === "service") {
				type = "API";
				if (!tabs[type]) {
					tabs[type] = {};
				}
			} else if (record.type === "static") {
				type = "Static";
				if (!tabs[type]) {
					tabs[type] = {};
				}
			} else if (record.type === "resource") {
				type = "Resource";
				if (!tabs[type]) {
					tabs[type] = {};
				}
			}
			let main = record.ui && record.ui.main ? record.ui.main : "Console";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[type][main]) {
				tabs[type][main] = {
					"All": {},
					"Favorites": {}
				};
			}
			let group = record.configuration && record.configuration.group ? record.configuration.group : defaultGroup;
			if (!tabs[type][main]["All"][group]) {
				tabs[type][main]["All"][group] = [];
			}
			tabs[type][main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0) {
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found) {
					if (!tabs[type][main]["Favorites"][group]) {
						tabs[type][main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[type][main]["Favorites"][group].push(record);
				}
			}
			
			if (sub) {
				if (!tabs[type][main][sub]) {
					tabs[type][main][sub] = {};
				}
				if (!tabs[type][main][sub][group]) {
					tabs[type][main][sub][group] = [];
				}
				tabs[type][main][sub][group].push(record);
			}
		});
		return tabs;
	}
	
	$scope.setFavorite = function (service) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/favorite",
			"params": {
				"service": service.name,
				"type": 'soajs'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = true;
				let main = service.ui && service.ui.main ? service.ui.main : "Console";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				let type;
				if (service.type === "service") {
					type = "API";
				} else if (service.type === "static") {
					type = "Static";
				} else if (service.type === "resource") {
					type = "Resource";
				}
				if (!$scope.soajsTabs[type][main]["Favorites"]) {
					$scope.soajsTabs[type][main]["Favorites"] = {};
				}
				if (!$scope.soajsTabs[type][main]["Favorites"][group]) {
					$scope.soajsTabs[type][main]["Favorites"][group] = [];
				}
				if ($scope.soajsTabs[type] && $scope.soajsTabs[type][main] && $scope.soajsTabs[type][main]["Favorites"] && $scope.soajsTabs[type][main]["Favorites"][group]) {
					$scope.soajsTabs[type][main]["Favorites"][group].push(service);
				}
				
			}
		});
	};
	
	$scope.removeFavorite = function (service) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/favorite",
			"params": {
				"service": service.name,
				"type": 'soajs'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = false;
				let type;
				if (service.type === "service") {
					type = "API";
				} else if (service.type === "static") {
					type = "Static";
				} else if (service.type === "resource") {
					type = "Resource";
				}
				let main = service.ui && service.ui.main ? service.ui.main : "Console";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if ($scope.soajsTabs[type] && $scope.soajsTabs[type][main] && $scope.soajsTabs[type][main]["Favorites"] && $scope.soajsTabs[type][main]["Favorites"][group]) {
					for (let i = 0; i < $scope.soajsTabs[type][main]["Favorites"][group].length; i++) {
						if ($scope.soajsTabs[type][main]["Favorites"][group][i].name === service.name) {
							$scope.soajsTabs[type][main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	$scope.inspectItem = function (service) {
		kubeServicesSrv.inspectItem($scope, service);
	};
	
	$scope.getLogs = function (pod) {
		kubeServicesSrv.getLogs($scope, pod);
	};
	
	$scope.execCommand = function (pod) {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "execCommandPod.tmpl",
			size: 'lg',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				kubeServicesSrv.execCommand($scope, $modalInstance, currentScope, pod);
			}
		});
	};
	
	$scope.execCommandPods = function (service, version) {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "execCommandPod.tmpl",
			size: 'lg',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				kubeServicesSrv.execCommands($scope, $modalInstance, currentScope, service, version);
			}
		});
	};
	
	$scope.executeOperation = function (service, v, operation, label) {
		overlayLoading.show();
		let options = {};
		options.method = "put";
		options.routeName = "/marketplace/item/maintenance";
		options.params = {
			"env": $scope.selectedEnvironment.code.toLowerCase(),
			"type": service.type,
			"version": v.version,
			"operation": operation,
			"name": service.name
		};
		options.data = {
			port: {}
		};
		if (v.maintenance.port) {
			if (v.maintenance.port.type) {
				options.data.port.portType = v.maintenance.port.type;
			}
			if (v.maintenance.port.type === "custom" && v.maintenance.port.value) {
				options.data.port.portValue = v.maintenance.port.value;
			}
		}
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				let formConfig = angular.copy(soajsDeployCatalogConfig.form.multiServiceInfo);
				response.forEach(function (host) {
					formConfig.entries[0].tabs.push({
						'label': host.id,
						'entries': [
							{
								'name': service.name + "-service",
								'type': 'jsoneditor',
								'height': '500px',
								"value": host.response
							}
						]
					});
				});
				let options = {
					timeout: $timeout,
					form: formConfig,
					name: label,
					label: label + " " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								$scope.modalInstance.dismiss('cancel');
								$scope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal($scope, $modal, options);
			}
		});
	};
	
	$scope.deleteService = function (service, version) {
		overlayLoading.show();
		let options = {};
		options.method = "delete";
		options.routeName = "/infra/kubernetes/item";
		options.data = {
			configuration: {
				env: $scope.selectedEnvironment.code.toLowerCase(),
			},
			mode: version.deployedItem.type,
			name: version.deployedItem.name
		};
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				$scope.$parent.displayAlert('success', "Item deleted!");
			}
		});
	};
	
	$scope.restartService = function (service, version) {
		let options = {};
		overlayLoading.show();
		options.method = "put";
		options.routeName = "/infra/kubernetes/resource/restart";
		options.data = {
			configuration: {
				env: $scope.selectedEnvironment.code.toLowerCase(),
			},
			mode: version.deployedItem.type,
			name: version.deployedItem.name
		};
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				$scope.$parent.displayAlert('success', "Item restarted!");
			}
		});
	};
	
	$scope.getMetrics = function (pod) {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "showMetrics.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				overlayLoading.show();
				$scope.selectedInterval = {
					v: 5,
					l: '5 Seconds',
					selected: true
				};
				kubeServicesSrv.autoRefreshMetrics($scope, $modalInstance, currentScope, pod);
			}
		});
	};
	
	$scope.scaleService = function (service, version) {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "scaleService.tmpl",
			size: 'm',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				$scope.currentScale = version.deployedItem.scale;
				$scope.title = service.name + ' | Scale Service';
				
				$scope.onSubmit = function () {
					overlayLoading.show();
					let options = {};
					options.method = "put";
					options.routeName = '/infra/kubernetes/deployment/scale';
					options.data = {
						configuration: {
							env: currentScope.selectedEnvironment.code.toLowerCase(),
						},
						mode: version.deployedItem.type,
						name: version.deployedItem.name,
						scale: $scope.newScale
					};
					getSendDataFromServer($scope, ngDataApi, options, function (error, result) {
						overlayLoading.hide();
						$modalInstance.close();
						if (error) {
							currentScope.$parent.displayAlert('danger', error.message);
						} else {
							currentScope.$parent.displayAlert('success', 'Service scaled successfully! If scaling up, new instances will appear as soon as they are ready or on the next refresh');
						}
					});
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};
	
	$scope.getDeployment = function (service, v) {
		if ($scope.envDeployeType === 'manual') {
			return;
		}
		if (service.versions.length === 0) {
			return;
		}
		overlayLoading.show();
		let options = {
			"method": "get",
			"routeName": "/infra/kubernetes/item/inspect",
			"params": {
				"item": {
					"env": $scope.selectedEnvironment.code.toLowerCase(),
					"name": service.name,
					"version": service.versions[0].version,
				},
				"configuration": {
					"env": $scope.selectedEnvironment.code.toLowerCase()
				}
			}
		};
		if (v) {
			options.params.item.version = v.version;
		} else {
			v = service.versions[0];
		}
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				if (!$scope.deployments[service.name]){
					$scope.deployments[service.name] = {};
				}
				if (!$scope.deployments[service.name][v.version]){
					$scope.deployments[service.name][v.version] = {};
				}
				delete response.soajsauth;
				$scope.deployments[service.name][v.version].itemLists = response;
				$scope.deployments[service.name][v.version].deployed = false;
				$scope.deployments[service.name][v.version].autoScale = "danger";
				if ($scope.deployments[service.name][v.version].itemLists.hpas.items.length > 0) {
					$scope.deployments[service.name][v.version].autoScale = "success";
					$scope.deployments[service.name][v.version].itemLists.hpas.items.forEach((oneItem) => {
						v.hpas = oneItem;
					});
					delete $scope.deployments[service.name][v.version].itemLists.hpas;
				}
				if ($scope.deployments[service.name][v.version].itemLists.daemonsets.items.length > 0) {
					$scope.deployments[service.name][v.version].deployed = true;
					$scope.deployments[service.name][v.version].itemLists.daemonsets.items.forEach((oneItem) => {
						v.deployedItem = {
							type: 'DaemonSet',
							name: oneItem.metadata.name,
							scale: 0
						};
						if ($scope.deployments[service.name][v.version].itemLists.pods && $scope.deployments[service.name][v.version].itemLists.pods.items && $scope.deployments[service.name][v.version].itemLists.pods.items.length > 0) {
							v.deployedItem.scale = $scope.itemLists.pods.items.length;
						}
						if (oneItem.spec && oneItem.spec.template && oneItem.spec.template.spec &&
							oneItem.spec.template.spec && oneItem.spec.template.spec.containers &&
							oneItem.spec.template.spec.containers[0] &&
							oneItem.spec.template.spec.containers[0].image) {
							$scope.deployments[service.name][v.version].deployedImage = {
								prefix: ""
							};
							if (oneItem.spec.template.spec.containers[0].image.indexOf('/') !== -1) {
								$scope.deployments[service.name][v.version].deployedImage.prefix = oneItem.spec.template.spec.containers[0].image.split('/')[0];
								$scope.deployments[service.name][v.version].deployedImage.name = oneItem.spec.template.spec.containers[0].image.split('/')[1].split(':')[0];
								$scope.deployments[service.name][v.version].deployedImage.tag = oneItem.spec.template.spec.containers[0].image.split('/')[1].split(':')[1];
							} else {
								$scope.deployments[service.name][v.version].deployedImage.name = oneItem.spec.template.spec.containers[0].image.split(':')[0];
								$scope.deployments[service.name][v.version].deployedImage.tag = oneItem.spec.template.spec.containers[0].image.split(':')[1];
							}
						}
					});
				} else if ($scope.deployments[service.name][v.version].itemLists.deployments.items.length > 0) {
					$scope.deployments[service.name][v.version].deployed = true;
					$scope.deployments[service.name][v.version].itemLists.deployments.items.forEach((oneItem) => {
						v.deployedItem = {
							type: 'Deployment',
							name: oneItem.metadata.name,
							scale: 0
						};
						if ($scope.deployments[service.name][v.version].itemLists.pods && $scope.deployments[service.name][v.version].itemLists.pods.items && $scope.deployments[service.name][v.version].itemLists.pods.items.length > 0) {
							v.deployedItem.scale = $scope.deployments[service.name][v.version].itemLists.pods.items.length;
						}
						if (oneItem.spec && oneItem.spec.template && oneItem.spec.template.spec &&
							oneItem.spec.template.spec && oneItem.spec.template.spec.containers &&
							oneItem.spec.template.spec.containers[0] &&
							oneItem.spec.template.spec.containers[0].image) {
							$scope.deployments[service.name][v.version].deployedImage = {
								prefix: ""
							};
							if (oneItem.spec.template.spec.containers[0].image.indexOf('/') !== -1) {
								$scope.deployments[service.name][v.version].deployedImage.prefix = oneItem.spec.template.spec.containers[0].image.split('/')[0];
								$scope.deployments[service.name][v.version].deployedImage.name = oneItem.spec.template.spec.containers[0].image.split('/')[1].split(':')[0];
								$scope.deployments[service.name][v.version].deployedImage.tag = oneItem.spec.template.spec.containers[0].image.split('/')[1].split(':')[1];
							} else {
								$scope.deployments[service.name][v.version].deployedImage.name = oneItem.spec.template.spec.containers[0].image.split(':')[0];
								$scope.deployments[service.name][v.version].deployedImage.tag = oneItem.spec.template.spec.containers[0].image.split(':')[1];
							}
						}
					});
				} else if ($scope.deployments[service.name][v.version].itemLists.cronjobs.items.length > 0) {
					$scope.deployments[service.name][v.version].deployed = true;
					$scope.deployments[service.name][v.version].itemLists.daemonsets.items.forEach((oneItem) => {
						v.deployedItem = {
							type: 'CronJob',
							name: oneItem.metadata.name
						};
						if (oneItem.spec && oneItem.spec.jobTemplate && oneItem.spec.jobTemplate.spec &&
							oneItem.spec.jobTemplate.spec.template &&
							oneItem.spec.jobTemplate.spec.template.spec &&
							oneItem.spec.jobTemplate.spec.template.spec.containers &&
							oneItem.spec.jobTemplate.spec.template.spec.containers[0] &&
							oneItem.spec.jobTemplate.spec.template.spec.containers[0].image) {
							oneItem.spec.deployedImage = {
								prefix: ""
							};
							if (oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.indexOf('/') !== -1) {
								$scope.deployments[service.name][v.version].deployedImage.prefix = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split('/')[0];
								$scope.deployments[service.name][v.version].deployedImage.name = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split('/')[1].split(':')[0];
								$scope.deployments[service.name][v.version].deployedImage.tag = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split('/')[1].split(':')[1];
							} else {
								$scope.deployments[service.name][v.version].deployedImage.name = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split(':')[0];
								$scope.deployments[service.name][v.version].deployedImage.tag = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split(':')[1];
							}
						}
					});
				}
			}
		});
	};
	
	$scope.autoScaleService = function autoScale(service, version) {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "autoScale.tmpl",
			size: 'm',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				$scope.currentScope = currentScope;
				$scope.title = service.name;
				$scope.autoScaleObject = {
					"replica": {},
					"metrics": {
						"cpu": {}
					}
				};
				$scope.title += ' | Auto Scale';
				$scope.autoScaleStatus = currentScope.deployments[service.name][version.version].autoScale === "success";
				
				if ($scope.autoScaleStatus && version.hpas && version.hpas.spec){
					$scope.autoScaleObject.replica.min = version.hpas.spec.minReplicas;
					$scope.autoScaleObject.replica.max = version.hpas.spec.maxReplicas;
					version.hpas.spec.metrics.forEach((metric)=>{
						if (metric.type === "Resource" && metric.resource && metric.resource.name === "cpu" &&
							metric.resource.target && metric.resource.target.type === "Utilization" &&
							metric.resource.target.averageUtilization){
							$scope.autoScaleObject.metrics.cpu.percent = metric.resource.target.averageUtilization;
						}
					});
				}
				$scope.onSubmit = function (action) {
					overlayLoading.show();
					let options = {};
					if (action === "update"){
						options = {
							"method": "post",
							"routeName": "/infra/kubernetes/item/hpa",
							"data": {
								"item": {
									"env": currentScope.selectedEnvironment.code.toLowerCase(),
									"name": service.name,
									"version": service.versions[0].version,
								},
								"configuration": {
									"env": currentScope.selectedEnvironment.code.toLowerCase()
								},
								"replica": $scope.autoScaleObject.replica,
								"metrics": [{
									type : "Resource",
									name : "cpu",
									target : "AverageValue",
									percentage: $scope.autoScaleObject.metrics.cpu.percent
								}]
							}
						};
					}
					else {
						options = {
							"method": "delete",
							"routeName": "/infra/kubernetes/workload/HPA",
							"params": {
								"configuration": {
									"env": currentScope.selectedEnvironment.code.toLowerCase()
								},
								"name": version.hpas.metadata.name,
								"mode": "HPA"
							}
						};
					}
					
					getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
						overlayLoading.hide();
						if (error) {
							currentScope.$parent.displayAlert('danger', error.message);
						}
						else {
							if (action === 'update') {
								currentScope.$parent.displayAlert('success', 'Auto Scale is Enabled successfully');
							} else {
								currentScope.$parent.displayAlert('success', 'Auto Scale turned off successfully');
							}
							$modalInstance.close();
						}
					});
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};
	
	$scope.displayAlert = function (currentScope, type, msg, isCode, service, orgMesg) {
		currentScope.alerts = [];
		if (isCode) {
			let msgT = getCodeMessage(msg, service, orgMesg);
			if (msgT) {
				msg = msgT;
			}
		}
		currentScope.alerts.push({'type': type, 'msg': msg});
	};
	
	$scope.configure = function (service, version) {
		let currentScope = $scope;
		let deployService = $modal.open({
			templateUrl: 'configure.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				kubeServicesSrv.configureDeployment($scope, currentScope, service, version, $modalInstance, function (err) {
					if (err) {
						$scope.$parent.displayAlert('danger', err.message);
					}
				});
				
				$scope.cancel = function () {
					deployService.close();
				};
				
				$scope.configure = function (service, version) {
					kubeServicesSrv.saveConfiguration(service, version, $scope, currentScope, $modalInstance);
				};
				
				$scope.build = function (service, version) {
					kubeServicesSrv.buildConfiguration(service, version, $scope, currentScope, $modalInstance);
				};
			}
		});
	};
	
	$scope.redeploy = function (service, version) {
		let currentScope = $scope;
		let deployService = $modal.open({
			templateUrl: 'reconfigure.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				kubeServicesSrv.reConfigureDeployment($scope, currentScope, service, version, $modalInstance, function (err) {
					if (err) {
						$scope.$parent.displayAlert('danger', err.message);
					}
				});
				
				$scope.cancel = function () {
					deployService.close();
				};
				
				$scope.redeploy = function (service, version) {
					kubeServicesSrv.redeploy(service, version, $scope, currentScope, $modalInstance);
				};
			}
		});
	};
	
	
	if ($scope.access.items.list) {
		injectFiles.injectCss("modules/dashboard/deployMarketplace/deployMarketplace.css");
		$scope.listSoajsCatalog();
	}
	
}]);

soajsDeployCatalogApp.filter('recipesSearchFilter', function () {
	return function (input, searchKeyword) {
		if (!searchKeyword) return input;
		if (!input || !Array.isArray(input) || input.length === 0) return input;
		
		var output = [];
		input.forEach(function (oneInput) {
			if (oneInput) {
				//using full_name since it's composed of owner + name
				if (oneInput.name && oneInput.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
					output.push(oneInput);
				}
			}
		});
		return output;
	}
});

soajsDeployCatalogApp.filter('capitalizeFirst', function () {
	return function (input) {
		if (input && typeof input === 'string' && input.length > 0) {
			return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
		}
	}
});

