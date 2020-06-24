"use strict";
var soajsDeployCatalogApp = soajsApp.components;
soajsDeployCatalogApp.controller('soajsDeployCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'kubeServicesSrv', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, kubeServicesSrv) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsDeployCatalogConfig.permissions);
	$scope.mainTabs = {};
	let defaultGroup = "SOAJS Core Services";
	
	$scope.selectedEnvironment = $cookies.getObject('myEnv', {'domain': interfaceDomain});
	$scope.envDeployer = angular.copy($scope.selectedEnvironment).deployer;
	$scope.envDeployeType = $scope.selectedEnvironment.technology;
	if ($scope.selectedEnvironment.type) {
		$scope.envDeployeType = $scope.selectedEnvironment.type;
	}
	
	
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
			if ($scope.envDeployeType === 'kubernetes' && $scope.access.infra.kubernetes.item.get) {
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
							getSendDataFromServer($scope, ngDataApi, {
								"method": "get",
								"routeName": "/infra/manual/awareness",
								"params": {
									"env": $scope.selectedEnvironment.code.toLowerCase()
								}
							}, function (error, awareness) {
								if (error) {
									$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
								} else {
									$scope.awareness = awareness;
								}
							});
						}
					}
				});
				
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
	
	$scope.executeOperation = function (service, v, operation) {
		let options = {};
		
		if ($scope.envDeployeType === 'manual') {
			options.method = "get";
			options.routeName = "/infra/manual/maintenance";
			options.params = {
				"env": $scope.selectedEnvironment.code.toLowerCase(),
				"type": service.type,
				"version": v.version,
				"operation": operation
			};
			if (v.maintenance.port) {
				if (v.maintenance.port.type) {
					options.params.portType = v.maintenance.port.type;
				}
				if (v.maintenance.port.type === "custom" && v.maintenance.port.value) {
					options.params.portValue = v.maintenance.port.value;
				}
			}
			
		} else {
			options.method = "put";
			options.routeName = "/infra/kubernetes/item/maintenance";
			options.params = {
				"env": $scope.selectedEnvironment.code.toLowerCase(),
				"name": service.name,
				"maintenancePort": v.version,
				"operation": {
					"route" : operation
				}
			};
			// if (v.maintenance.port) {
			// 	if (v.maintenance.port.type) {
			// 		options.params.portType = v.maintenance.port.type;
			// 	}
			// 	if (v.maintenance.port.type === "custom" && v.maintenance.port.value) {
			// 		options.params.portValue = v.maintenance.port.value;
			// 	}
			// }
		}
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				let formConfig = angular.copy(soajsDeployCatalogConfig.form.multiServiceInfo);
				formConfig.entries = [
					{
						'name': service.name,
						'type': 'jsoneditor',
						'height': '200px',
						"value": response.data || response
					}
				];
				
				let options = {
					timeout: $timeout,
					form: formConfig,
					name: "heartbeat",
					label: service.name + ": " + "heartbeat",
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
	
	$scope.getDeployment = function (service) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/infra/kubernetes/item/inspect",
			"params": {
				"item": {
					"env": "new",
					"name": "schedulercellsite2",
					"version": "3.0",
				},
				"configuration": {
					"env": "new"
				}
				// "item" : {
				// 	"env": "new",
				// 	"name": "schedulercellsite2",
				// 	"version": "3.0",
				// },
				// "configuration": {
				// 	"env": "new"
				// }
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				delete response.soajsauth;
				$scope.itemLists = response;
				$scope.deployed = false;
				if ($scope.itemLists.daemonsets.items.length > 0) {
					$scope.deployed = true;
					$scope.itemLists.daemonsets.items.forEach((oneItem) => {
						if (oneItem.spec && oneItem.spec.template && oneItem.spec.template.spec &&
							oneItem.spec.template.spec && oneItem.spec.template.spec.containers &&
							oneItem.spec.template.spec.containers[0] &&
							oneItem.spec.template.spec.containers[0].image) {
							$scope.deployedImage = {
								prefix: ""
							};
							if (oneItem.spec.template.spec.containers[0].image.indexOf('/') !== -1) {
								$scope.deployedImage.prefix = oneItem.spec.template.spec.containers[0].image.split('/')[0];
								$scope.deployedImage.name = oneItem.spec.template.spec.containers[0].image.split('/')[1].split(':')[0];
								$scope.deployedImage.tag = oneItem.spec.template.spec.containers[0].image.split('/')[1].split(':')[1];
							} else {
								$scope.deployedImage.name = oneItem.spec.template.spec.containers[0].image.split(':')[0];
								$scope.deployedImage.tag = oneItem.spec.template.spec.containers[0].image.split(':')[1];
							}
						}
					});
				} else if ($scope.itemLists.deployments.items.length > 0) {
					$scope.deployed = true;
					$scope.itemLists.deployments.items.forEach((oneItem) => {
						if (oneItem.spec && oneItem.spec.template && oneItem.spec.template.spec &&
							oneItem.spec.template.spec && oneItem.spec.template.spec.containers &&
							oneItem.spec.template.spec.containers[0] &&
							oneItem.spec.template.spec.containers[0].image) {
							$scope.deployedImage = {
								prefix: ""
							};
							if (oneItem.spec.template.spec.containers[0].image.indexOf('/') !== -1) {
								$scope.deployedImage.prefix = oneItem.spec.template.spec.containers[0].image.split('/')[0];
								$scope.deployedImage.name = oneItem.spec.template.spec.containers[0].image.split('/')[1].split(':')[0];
								$scope.deployedImage.tag = oneItem.spec.template.spec.containers[0].image.split('/')[1].split(':')[1];
							} else {
								$scope.deployedImage.name = oneItem.spec.template.spec.containers[0].image.split(':')[0];
								$scope.deployedImage.tag = oneItem.spec.template.spec.containers[0].image.split(':')[1];
							}
						}
					});
				} else if ($scope.itemLists.cronjobs.items.length > 0) {
					$scope.deployed = true;
					$scope.itemLists.daemonsets.items.forEach((oneItem) => {
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
								$scope.deployedImage.prefix = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split('/')[0];
								$scope.deployedImage.name = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split('/')[1].split(':')[0];
								$scope.deployedImage.tag = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split('/')[1].split(':')[1];
							} else {
								$scope.deployedImage.name = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split(':')[0];
								$scope.deployedImage.tag = oneItem.spec.jobTemplate.spec.template.spec.containers[0].image.split(':')[1];
							}
						}
					});
				}
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
						$scope.displayAlert('danger', err.message);
					}
				});
				
				$scope.cancel = function () {
					deployService.close();
				};
				
				$scope.configure = function (service, version) {
					kubeServicesSrv.saveConfiguration(service, version, $scope, currentScope);
				};
				
				$scope.build = function (service, version) {
					kubeServicesSrv.buildConfiguration(service, version, $scope, currentScope);
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
						$scope.displayAlert('danger', err.message);
					}
				});
				
				$scope.cancel = function () {
					deployService.close();
				};
				
				$scope.build = function (service, version) {
					kubeServicesSrv.redeploy(service, version, $scope, currentScope);
				};
			}
		});
	};
	
	
	if ($scope.access.items.list) {
		injectFiles.injectCss("modules/dashboard/deployMarketplace/deployMarketplace.css");
		$scope.listSoajsCatalog();
	}
	
}]);

soajsDeployCatalogApp.filter('timeInMillisConverter', function () {
	return function (time) {
		var convert = {
			"msecToSec": {"unit": "sec", "divideBy": 1000},
			"secToMin": {"unit": "min", "divideBy": 60},
			"minToH": {"unit": "h", "divideBy": 60},
			"hToDays": {"unit": "days", "divideBy": 24},
			"daysToWeeks": {"unit": "weeks", "divideBy": 7},
			"weeksToMonths": {"unit": "months", "divideBy": 4.34825},
			"monthsToYears": {"unit": "years", "divideBy": 12}
		};
		var unit = "msec";
		for (var i in convert) {
			if (Math.floor(time / convert[i].divideBy) > 1) {
				time = time / convert[i].divideBy;
				unit = convert[i].unit;
			} else {
				return time.toFixed(2) + " " + unit;
			}
		}
		return time.toFixed(2) + " " + unit;
	};
});

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

