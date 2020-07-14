"use strict";
var soajsCatalogApp = soajsApp.components;
soajsCatalogApp.controller('soajsCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	$scope.mainTabs = {};
	let defaultGroup = "SOAJS Core Services";
	
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
		}
	};
	
	$scope.arrGroupByField = function (arr, f) {
		var result = {groups: {}};
		var l = (arr) ? arr.length : 0;
		var g = 'General';
		let m = 'Read';
		for (var i = 0; i < l; i++) {
			if (arr[i][f]) {
				g = arr[i][f];
			}
			if (arr[i].m) {
				switch (arr[i].m.toLowerCase()) {
					case 'get':
						m = 'Read';
						break;
					case 'post':
						m = 'Add';
						break;
					case 'put':
						m = 'Update';
						break;
					case 'delete':
						m = 'Delete';
						break;
					case 'patch':
						m = 'Patch';
						break;
					case 'head':
						m = 'Head';
						break;
					default:
						m = 'Other';
				}
			}
			if (!result.groups[g]) {
				result.groups[g] = {};
				result.groups[g][m] = {};
				result.groups[g][m].apis = [];
			}
			if (!result.groups[g][m]) {
				result.groups[g][m] = {};
				result.groups[g][m].apis = [];
			}
			result.groups[g][m].apis.push(arr[i]);
		}
		return result;
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
							$scope.getEnvironments();
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
			if (record.versions && record.versions.length > 0) {
				record.versions.forEach((version) => {
					version.fixList = $scope.arrGroupByField(version.apis, 'group');
				});
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
	
	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/environment"
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.envs = [];
				$scope.envList = response;
				$scope.envList.forEach((env) => {
					$scope.envs.push(env.code.toLowerCase());
				});
			}
		});
	};
	
	$scope.updateServiceSettings = function (env, version, serviceRecord) {
		var currentScope = $scope;
		$modal.open({
			templateUrl: "updateServiceSettings.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				$scope.title = 'Update ' + serviceRecord.name + ' service settings in ' + env + ' Environment';
				let versionedRecord = serviceRecord.versions.find(element => element.version === version);
				$scope.settings = {
					extKeyRequired: versionedRecord.extKeyRequired || false,
					oauth: versionedRecord.oauth || false,
					urac: versionedRecord.urac || false,
					urac_Profile: versionedRecord.urac_Profile || false,
					urac_ACL: versionedRecord.urac_ACL || false,
					provision_ACL: versionedRecord.provision_ACL || false
				};
				if (versionedRecord.customByEnv && versionedRecord.customByEnv[env]) {
					var versionEnvRecord = versionedRecord.customByEnv[env];
					$scope.settings.extKeyRequired = versionEnvRecord.extKeyRequired || false;
					$scope.settings.oauth = versionEnvRecord.oauth || false;
				}
				
				$scope.onOff = function (oneSetting) {
					$scope.settings[oneSetting] = !$scope.settings[oneSetting];
				};
				
				$scope.onSubmit = function () {
					overlayLoading.show();
					getSendDataFromServer($scope, ngDataApi, {
						"method": "put",
						"routeName": "/marketplace/item/version/configuration",
						"data": {
							"env": env,
							"version": version,
							"settings": {
								extKeyRequired: $scope.settings.extKeyRequired,
								oauth: $scope.settings.oauth
							},
							"name": serviceRecord.name,
							"type": serviceRecord.type
						}
					}, function (error) {
						overlayLoading.hide();
						$modalInstance.close();
						if (error) {
							currentScope.displayAlert('danger', error.code, true, 'marketplace', error.message);
						} else {
							currentScope.displayAlert('success', 'Item settings updated successfully');
							currentScope.listServices();
						}
					});
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};
	
	$scope.openServiceView = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/serviceDetailView/" + type + '/' + serviceName, "_blank");
	};
	$scope.openSettings = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/configDetailView/" + type + '/' + serviceName, "_blank");
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listSoajsCatalog();
	}
	
}]);

soajsCatalogApp.controller('staticCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, detectBrowser) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	$scope.mainTabs = {};
	let defaultGroup = "Default";
	
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
		}
	};
	
	$scope.listStaticCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type": "static"
			}
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
						"type": 'static'
					}
				}, function (error, favoriteResponse) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					} else {
						if (response.records) {
							$scope.showCatalog = response.records.length > 0;
							$scope.mainTabs = getCatalogs(response.records, favoriteResponse);
						}
					}
				});
				
			}
		});
	};
	
	function getCatalogs(records, favoriteRecords) {
		let tabs = {};
		
		records.forEach((record) => {
			let main = record.ui && record.ui.main ? record.ui.main : "Static";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]) {
				tabs[main] = {
					"All": {},
					"Favorites": {}
				};
			}
			let group = record.configuration && record.configuration.group ? record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]) {
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0) {
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found) {
					if (!tabs[main]["Favorites"][group]) {
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub) {
				if (!tabs[main][sub]) {
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]) {
					tabs[main][sub][group] = [];
				}
				tabs[main][sub][group].push(record);
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
				"type": 'static'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = true;
				let main = service.ui && service.ui.main ? service.ui.main : "Static";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]) {
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group].push(service);
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
				"type": 'static'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = false;
				let main = service.ui && service.ui.main ? service.ui.main : "Static";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	$scope.openServiceView = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/serviceDetailView/" + type + '/' + serviceName, "_blank");
	};
	$scope.openSettings = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/configDetailView/" + type + '/' + serviceName, "_blank");
	};
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listStaticCatalog();
	}
	
}]);

soajsCatalogApp.controller('configCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, detectBrowser) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	$scope.mainTabs = {};
	let defaultGroup = "Default";
	
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
		}
	};
	
	$scope.listConfigCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type": "config"
			}
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
						"type": 'config'
					}
				}, function (error, favoriteResponse) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					} else {
						if (response.records) {
							$scope.showCatalog = response.records.length > 0;
							$scope.mainTabs = getCatalogs(response.records, favoriteResponse);
						}
					}
				});
				
			}
		});
	};
	
	function getCatalogs(records, favoriteRecords) {
		let tabs = {};
		
		records.forEach((record) => {
			let main = record.ui && record.ui.main ? record.ui.main : "Config";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]) {
				tabs[main] = {
					"All": {},
					"Favorites": {}
				};
			}
			let group = record.configuration && record.configuration.group ? record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]) {
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0) {
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found) {
					if (!tabs[main]["Favorites"][group]) {
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub) {
				if (!tabs[main][sub]) {
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]) {
					tabs[main][sub][group] = [];
				}
				tabs[main][sub][group].push(record);
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
				"type": 'config'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = true;
				let main = service.ui && service.ui.main ? service.ui.main : "Config";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]) {
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group].push(service);
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
				"type": 'config'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = false;
				let main = service.ui && service.ui.main ? service.ui.main : "Config";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	$scope.openServiceView = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/serviceDetailView/" + type + '/' + serviceName, "_blank");
	};
	$scope.openSettings = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/configDetailView/" + type + '/' + serviceName, "_blank");
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listConfigCatalog();
	}
	
}]);

soajsCatalogApp.controller('daemonCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, detectBrowser) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	$scope.mainTabs = {};
	let defaultGroup = "Daemon";
	
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
		}
	};
	
	$scope.listDaemonCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type": "daemon"
			}
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
						"type": 'daemon'
					}
				}, function (error, favoriteResponse) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					} else {
						if (response.records) {
							$scope.showCatalog = response.records.length > 0;
							$scope.mainTabs = getCatalogs(response.records, favoriteResponse);
						}
					}
				});
				
			}
		});
	};
	
	function getCatalogs(records, favoriteRecords) {
		let tabs = {};
		
		records.forEach((record) => {
			let main = record.ui && record.ui.main ? record.ui.main : "Daemon";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]) {
				tabs[main] = {
					"All": {},
					"Favorites": {}
				};
			}
			let group = record.configuration && record.configuration.group ? record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]) {
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0) {
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found) {
					if (!tabs[main]["Favorites"][group]) {
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub) {
				if (!tabs[main][sub]) {
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]) {
					tabs[main][sub][group] = [];
				}
				tabs[main][sub][group].push(record);
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
				"type": 'daemon'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = true;
				let main = service.ui && service.ui.main ? service.ui.main : "Daemon";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]) {
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group].push(service);
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
				"type": 'daemon'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = false;
				let main = service.ui && service.ui.main ? service.ui.main : "Daemon";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	$scope.openServiceView = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/serviceDetailView/" + type + '/' + serviceName, "_blank");
	};
	$scope.openSettings = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/configDetailView/" + type + '/' + serviceName, "_blank");
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listDaemonCatalog();
	}
	
}]);

soajsCatalogApp.controller('customCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, detectBrowser) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	$scope.mainTabs = {};
	let defaultGroup = "Default";
	
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
		}
	};
	
	$scope.listCustomCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type": "custom"
			}
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
						"type": 'custom'
					}
				}, function (error, favoriteResponse) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					} else {
						if (response.records) {
							$scope.showCatalog = response.records.length > 0;
							$scope.mainTabs = getCatalogs(response.records, favoriteResponse);
						}
					}
				});
				
			}
		});
	};
	
	function getCatalogs(records, favoriteRecords) {
		let tabs = {};
		
		records.forEach((record) => {
			let main = record.ui && record.ui.main ? record.ui.main : "Custom";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]) {
				tabs[main] = {
					"All": {},
					"Favorites": {}
				};
			}
			let group = record.configuration && record.configuration.group ? record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]) {
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0) {
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found) {
					if (!tabs[main]["Favorites"][group]) {
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub) {
				if (!tabs[main][sub]) {
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]) {
					tabs[main][sub][group] = [];
				}
				tabs[main][sub][group].push(record);
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
				"type": 'custom'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = true;
				let main = service.ui && service.ui.main ? service.ui.main : "Custom";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]) {
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group].push(service);
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
				"type": 'custom'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = false;
				let main = service.ui && service.ui.main ? service.ui.main : "Custom";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	$scope.openServiceView = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/serviceDetailView/" + type + '/' + serviceName, "_blank");
	};
	$scope.openSettings = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/configDetailView/" + type + '/' + serviceName, "_blank");
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listCustomCatalog();
	}
	
}]);

soajsCatalogApp.controller('resourceCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, detectBrowser) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	$scope.mainTabs = {};
	let defaultGroup = "Default";
	
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
		}
	};
	
	$scope.listResourceCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type": "resource"
			}
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
						"type": 'resource'
					}
				}, function (error, favoriteResponse) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					} else {
						if (response.records) {
							$scope.showCatalog = response.records.length > 0;
							$scope.mainTabs = getCatalogs(response.records, favoriteResponse);
						}
					}
				});
				
			}
		});
	};
	
	function getCatalogs(records, favoriteRecords) {
		let tabs = {};
		
		records.forEach((record) => {
			let main = record.ui && record.ui.main ? record.ui.main : "Resource";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]) {
				tabs[main] = {
					"All": {},
					"Favorites": {}
				};
			}
			let group = record.configuration && record.configuration.group ? record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]) {
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0) {
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found) {
					if (!tabs[main]["Favorites"][group]) {
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub) {
				if (!tabs[main][sub]) {
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]) {
					tabs[main][sub][group] = [];
				}
				tabs[main][sub][group].push(record);
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
				"type": 'resource'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = true;
				let main = service.ui && service.ui.main ? service.ui.main : "Resource";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]) {
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group].push(service);
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
				"type": 'resource'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = false;
				let main = service.ui && service.ui.main ? service.ui.main : "Resource";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	$scope.removeResource = function (service) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/marketplace/item/",
			"params": {
				"name": service.name,
				"type": 'resource'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.listResourceCatalog();
			}
		});
	};
	
	$scope.editResource = function (name, v) {
		$scope.$parent.go("#/catalog/resource/edit/" + name + "/" + v);
	};
	
	$scope.addResourceCatalog = function () {
		$scope.$parent.go("#/catalog/resource/add");
	};
	
	$scope.openServiceView = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/serviceDetailView/" + type + '/' + serviceName, "_blank");
	};
	$scope.openSettings = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/configDetailView/" + type + '/' + serviceName, "_blank");
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listResourceCatalog();
	}
	
}]);

soajsCatalogApp.controller('apiCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, detectBrowser) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	$scope.mainTabs = {};
	let defaultGroup = "Service";
	
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
		}
	};
	
	$scope.arrGroupByField = function (arr, f) {
		var result = {groups: {}};
		var l = (arr) ? arr.length : 0;
		var g = 'General';
		let m = 'Read';
		for (var i = 0; i < l; i++) {
			if (arr[i][f]) {
				g = arr[i][f];
			}
			if (arr[i].m) {
				switch (arr[i].m.toLowerCase()) {
					case 'get':
						m = 'Read';
						break;
					case 'post':
						m = 'Add';
						break;
					case 'put':
						m = 'Update';
						break;
					case 'delete':
						m = 'Delete';
						break;
					case 'patch':
						m = 'Patch';
						break;
					case 'head':
						m = 'Head';
						break;
					default:
						m = 'Other';
				}
			}
			if (!result.groups[g]) {
				result.groups[g] = {};
				result.groups[g][m] = {};
				result.groups[g][m].apis = [];
			}
			if (!result.groups[g][m]) {
				result.groups[g][m] = {};
				result.groups[g][m].apis = [];
			}
			result.groups[g][m].apis.push(arr[i]);
		}
		return result;
	};
	
	$scope.listApiCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type": "service"
			}
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
						"type": 'service'
					}
				}, function (error, favoriteResponse) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					} else {
						if (response.records) {
							$scope.showCatalog = response.records.length > 0;
							$scope.mainTabs = getCatalogs(response.records, favoriteResponse);
						}
					}
				});
				
			}
		});
	};
	
	function getCatalogs(records, favoriteRecords) {
		let tabs = {};
		
		records.forEach((record) => {
			let main = record.ui && record.ui.main ? record.ui.main : "Service";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]) {
				tabs[main] = {
					"All": {},
					"Favorites": {}
				};
			}
			if (record.versions && record.versions.length > 0) {
				record.versions.forEach((version) => {
					version.fixList = $scope.arrGroupByField(version.apis, 'group');
				});
			}
			let group = record.configuration && record.configuration.group ? record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]) {
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0) {
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found) {
					if (!tabs[main]["Favorites"][group]) {
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub) {
				if (!tabs[main][sub]) {
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]) {
					tabs[main][sub][group] = [];
				}
				tabs[main][sub][group].push(record);
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
				"type": 'service'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = true;
				let main = service.ui && service.ui.main ? service.ui.main : "Service";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]) {
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					$scope.mainTabs[main]["Favorites"][group].push(service);
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
				"type": 'service'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = false;
				let main = service.ui && service.ui.main ? service.ui.main : "Service";
				let group = service.configuration && service.configuration.group ? service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]) {
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	$scope.removeResource = function (service) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/marketplace/item/",
			"params": {
				"name": service.name,
				"type": 'service'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.listResourceCatalog();
			}
		});
	};
	
	$scope.openServiceView = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/serviceDetailView/" + type + '/' + serviceName, "_blank");
	};
	$scope.openSettings = function (serviceName, type) {
		$scope.$parent.go("#/catalogs/configDetailView/" + type + '/' + serviceName, "_blank");
	};
	$scope.updateServiceSettings = function (env, version, serviceRecord) {
		var currentScope = $scope;
		$modal.open({
			templateUrl: "updateServiceSettings.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				$scope.title = 'Update ' + serviceRecord.name + ' service settings in ' + env + ' Environment';
				let versionedRecord = serviceRecord.versions.find(element => element.version === version);
				$scope.settings = {
					extKeyRequired: versionedRecord.extKeyRequired || false,
					oauth: versionedRecord.oauth || false,
					urac: versionedRecord.urac || false,
					urac_Profile: versionedRecord.urac_Profile || false,
					urac_ACL: versionedRecord.urac_ACL || false,
					provision_ACL: versionedRecord.provision_ACL || false
				};
				if (versionedRecord.customByEnv && versionedRecord.customByEnv[env]) {
					var versionEnvRecord = versionedRecord.customByEnv[env];
					$scope.settings.extKeyRequired = versionEnvRecord.extKeyRequired || false;
					$scope.settings.oauth = versionEnvRecord.oauth || false;
				}
				
				$scope.onOff = function (oneSetting) {
					$scope.settings[oneSetting] = !$scope.settings[oneSetting];
				};
				
				$scope.onSubmit = function () {
					overlayLoading.show();
					getSendDataFromServer($scope, ngDataApi, {
						"method": "put",
						"routeName": "/marketplace/item/version/configuration",
						"data": {
							"env": env,
							"version": version,
							"settings": {
								extKeyRequired: $scope.settings.extKeyRequired,
								oauth: $scope.settings.oauth
							},
							"name": serviceRecord.name,
							"type": serviceRecord.type
						}
					}, function (error) {
						overlayLoading.hide();
						$modalInstance.close();
						if (error) {
							currentScope.displayAlert('danger', error.code, true, 'marketplace', error.message);
						} else {
							currentScope.displayAlert('success', 'Item settings updated successfully');
							currentScope.listServices();
						}
					});
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listApiCatalog();
	}
	
}]);

soajsCatalogApp.controller('addResourceCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, detectBrowser) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	
	$scope.soa = '';
	$scope.readme = '';
	$scope.release = '';
	$scope.aceLoaded = function (_editor) {
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
		_editor.$blockScrolling = Infinity;
	};
	$scope.addItem = {
		"soa": {
			icon: "minus",
			active: true,
			id: "soa"
		},
		"release": {
			icon: "plus",
			active: false,
			id: "release"
		},
		"readme": {
			icon: "plus",
			active: false,
			id: "readme"
		}
	};
	$scope.showHide = function (account) {
		if (account.active) {
			jQuery('#' + account.id).addClass("closeGroup");
			account.icon = 'plus';
			account.active = false;
		} else {
			jQuery('#' + account.id).removeClass("closeGroup");
			account.icon = 'minus';
			account.active = true;
		}
	};
	
	$scope.save = function () {
		let opts = {
			"item": {
				"src": {
					"provider": "manual"
				}
			}
		};
		try {
			opts.item.soa = JSON.parse($scope.soa);
			if ($scope.readme !== '' || $scope.release !== '') {
				opts.item.documentation = {};
			}
			if ($scope.readme !== '') {
				opts.item.documentation.readme = $scope.readme;
			}
			if ($scope.release !== '') {
				opts.item.documentation.release = $scope.release;
			}
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"routeName": "/marketplace/item/resource",
				"data": opts
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
				} else {
					$scope.$parent.go("#/resourceCatalog");
				}
			});
		} catch (e) {
			console.log(e);
		}
	};
	
	$scope.close = function () {
		$scope.$parent.go("#/resourceCatalog");
	};
}]);

soajsCatalogApp.controller('editResourceCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, detectBrowser) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	
	$scope.soa = '';
	$scope.readme = '';
	$scope.release = '';
	$scope.aceLoaded = function (_editor) {
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
		_editor.$blockScrolling = Infinity;
	};
	$scope.addItem = {
		"soa": {
			icon: "minus",
			active: true,
			id: "soa"
		},
		"release": {
			icon: "plus",
			active: false,
			id: "release"
		},
		"readme": {
			icon: "plus",
			active: false,
			id: "readme"
		}
	};
	$scope.showHide = function (account) {
		if (account.active) {
			jQuery('#' + account.id).addClass("closeGroup");
			account.icon = 'plus';
			account.active = false;
		} else {
			jQuery('#' + account.id).removeClass("closeGroup");
			account.icon = 'minus';
			account.active = true;
		}
	};
	
	$scope.save = function () {
		let opts = {
			"item": {
				"src": {
					"provider": "manual"
				}
			}
		};
		try {
			opts.item.soa = JSON.parse($scope.soa);
			if ($scope.readme !== '' || $scope.release !== '') {
				opts.item.documentation = {};
			}
			if ($scope.readme !== '') {
				opts.item.documentation.readme = $scope.readme;
			}
			if ($scope.release !== '') {
				opts.item.documentation.release = $scope.release;
			}
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"routeName": "/marketplace/item/resource",
				"data": opts
			}, function (error, response) {
				overlayLoading.show();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
				} else {
					$scope.$parent.go("#/resourceCatalog");
				}
			});
		} catch (e) {
			console.log(e);
		}
	};
	
	$scope.getResource = function (name, version) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/item/type",
			"params": {
				"name": name,
				"type": 'resource'
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				if (response && response.versions) {
					response.versions.forEach((oneVersion) => {
						if (oneVersion.version === version) {
							try {
								$scope.soa = JSON.stringify(JSON.parse(oneVersion.soa), null, 2);
							} catch (e) {
								$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', e.message);
							}
							if (oneVersion.documentation) {
								if (oneVersion.documentation.release) {
									$scope.release = oneVersion.documentation.release;
								}
								if (oneVersion.documentation.readme) {
									$scope.readme = oneVersion.documentation.readme;
								}
							}
						}
					});
				}
			}
		});
	};
	
	$scope.close = function () {
		$scope.$parent.go("#/resourceCatalog");
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.getResource($routeParams.name, $routeParams.version);
	}
}]);

soajsCatalogApp.controller('detailViewCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', '$localStorage', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	
	$scope.addItem = {
		"profile": {
			icon: "minus",
			active: true,
			id: "profile"
		},
		"readme": {
			icon: "plus",
			active: true,
			id: "readme"
		},
		"release": {
			icon: "minus",
			active: false,
			id: "release"
		}
	};
	$scope.showHide = function (account) {
		if (account.active) {
			jQuery('#' + account.id).addClass("closeGroup");
			account.icon = 'plus';
			account.active = false;
		} else {
			jQuery('#' + account.id).removeClass("closeGroup");
			account.icon = 'minus';
			account.active = true;
		}
	};
	
	$scope.aceLoaded = function (_editor) {
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
		_editor.setReadOnly(true);
		_editor.$blockScrolling = Infinity;
	};
	
	$scope.changetoJSON = function (object) {
		if (object) {
			try {
				return JSON.stringify(object, null, 2);
			} catch (e) {
				console.log(e);
				return object;
			}
		}
	};
	
	$scope.parseObject = function (object) {
		if (object) {
			try {
				return JSON.parse(object, null, 2);
			} catch (e) {
				console.log(e);
				return object;
			}
		}
	};
	if ($localStorage.ApiCatalog && $localStorage.ApiCatalog.query) {
		$scope.showBackButton = true;
	}
	if ($localStorage.serviceCatalog && $localStorage.serviceCatalog.query) {
		$scope.showBackButton = true;
	}
	$scope.returnToDashboard = function () {
		$scope.$parent.go("#/analytics", "_blank");
	};
	
	$scope.getCatalog = function (name, type) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/item/type",
			"params": {
				"name": name,
				"type": type
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				$scope.service = response;
				if (response) {
					$scope.service = response;
					if ($scope.service.metadata && $scope.service.metadata.attributes) {
						$scope.service.metadata.attributes = $scope.changetoJSON($scope.service.metadata.attributes);
					}
					if ($scope.service.configuration && $scope.service.configuration.prerequisites) {
						$scope.service.configuration.prerequisites = $scope.changetoJSON($scope.service.configuration.prerequisites);
					}
					if ($scope.service.versions) {
						$scope.service.versions.forEach((oneVersion) => {
							oneVersion.swagger = $scope.parseObject(oneVersion.swagger);
							oneVersion.maintenance = $scope.changetoJSON(oneVersion.maintenance);
							oneVersion.profile = $scope.changetoJSON(oneVersion.profile);
						});
					}
				}
			}
		});
	};
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.getCatalog($routeParams.serviceName, $routeParams.serviceType);
	}
	
}]);

soajsCatalogApp.controller('configViewCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, soajsCatalogConfig.permissions);
	
	$scope.envs = {
		envType: false,
		selectedEnvs: []
	};
	$scope.groups = {
		groupType: false,
		selectedGroups: []
	};
	$scope.recipes = {
		selectedRecipes: []
	};
	$scope.limit = 10;
	$scope.recipeSize = 10;
	$scope.getCatalog = function (name, type) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/item/type",
			"params": {
				"name": name,
				"type": type
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'marketplace', error.message);
			} else {
				$scope.service = response;
				if ($scope.service.settings) {
					if ($scope.service.settings.acl) {
						if ($scope.service.settings.acl.groups) {
							$scope.showGroupButtonSlider = true;
							if ($scope.service.settings.acl.groups.value) {
								$scope.groups.selectedGroups = $scope.service.settings.acl.groups.value;
							}
							$scope.groups.groupType = $scope.service.settings.acl.groups.type === "blacklist";
						}
					}
					if ($scope.service.settings.environments) {
						$scope.showEnvButtonSlider = true;
						if ($scope.service.settings.environments.value) {
							$scope.envs.selectedEnvs = $scope.service.settings.environments.value;
						}
						$scope.envs.envType = $scope.service.settings.environments.type === "blacklist";
					}
					if ($scope.service.settings.recipes) {
						$scope.recipes.selectedRecipes = $scope.service.settings.recipes;
						if ($scope.service.settings.recipes.length > 0) {
							let opts = {
								"method": "post",
								routeName: '/dashboard/catalog/recipes/list',
								data: {
									ids: $scope.service.settings.recipes
								}
							};
							getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
								if (error) {
									$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
								} else {
									$scope.recipes.selectedRecipes = response;
								}
							});
						}
					}
				}
				$scope.getGroups();
			}
		});
	};
	
	$scope.getGroups = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/groups",
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				$scope.groupsList = angular.copy(response);
				$scope.getEnvironments();
				$scope.groupsList.forEach((oneGroup) => {
					if ($scope.groups.selectedGroups.indexOf(oneGroup.code) !== -1) {
						oneGroup.allowed = true;
					}
				});
			}
		});
	};
	
	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/environment"
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.environmentsList = angular.copy(response);
				$scope.environmentsList.forEach((oneEnv) => {
					if ($scope.envs.selectedEnvs.indexOf(oneEnv.code) !== -1) {
						oneEnv.allowed = true;
					}
				});
				$scope.getRecipes();
			}
		});
	};
	
	$scope.getRecipes = function (loadMore) {
		if (loadMore) {
			$scope.recipeSize = $scope.recipeSize + $scope.limit;
		}
		let opts = {
			"method": "get",
			routeName: '/dashboard/catalog/recipes/list',
			params: {
				limit: $scope.recipeSize
			}
		};
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.recipeList = angular.copy(response);
				if ($scope.recipeList.length < $scope.recipeSize) {
					$scope.hideLoadMore = true;
				}
			}
		});
	};
	
	function removeA(arr) {
		var what, a = arguments, L = a.length, ax;
		while (L > 1 && arr.length) {
			what = a[--L];
			while ((ax = arr.indexOf(what)) !== -1) {
				arr.splice(ax, 1);
			}
		}
		return arr;
	}
	
	$scope.selectEnv = function (env) {
		$scope.showEnvButtonSlider = true;
		if (env.allowed) {
			removeA($scope.envs.selectedEnvs, env.code);
			env.allowed = false;
		} else {
			$scope.envs.selectedEnvs.push(env.code);
			env.allowed = true;
		}
	};
	$scope.selectGroup = function (group) {
		$scope.showGroupButtonSlider = true;
		if (group.allowed) {
			removeA($scope.groups.selectedGroups, group.code);
			group.allowed = false;
		} else {
			group.allowed = true;
			$scope.groups.selectedGroups.push(group.code);
		}
	};
	$scope.selectRecipes = function (recipe) {
		let found = false;
		for (let i = 0; i < $scope.recipes.selectedRecipes.length; i++) {
			if ($scope.recipes.selectedRecipes[i]._id === recipe._id) {
				found = true;
				break;
			}
		}
		if (!found) {
			$scope.recipes.selectedRecipes.push(recipe);
		}
		
	};
	$scope.removeRecipes = function (recipe) {
		for (let i = 0; i < $scope.recipes.selectedRecipes.length; i++) {
			if ($scope.recipes.selectedRecipes[i]._id === recipe._id) {
				$scope.recipes.selectedRecipes.splice(i, 1);
				break;
			}
		}
	};
	
	$scope.saveACl = function () {
		let opts = {
			"method": "put",
			"routeName": '/marketplace/item/acl',
			"data": {
				id: $scope.service._id.toString(),
				type: $scope.groups.groupType ? 'blacklist' : "whitelist",
				groups: $scope.groups.selectedGroups
			}
		};
		if ($scope.service.type === "service" && $scope.service.configuration && $scope.service.configuration.subType === "soajs") {
			opts.routeName = '/marketplace/soajs/item/acl';
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.$parent.displayAlert('success', "Acl updated Successfully for Item");
			}
			$scope.getCatalog($routeParams.serviceName, $routeParams.serviceType);
		});
	};
	
	$scope.saveEnv = function () {
		let opts = {
			"method": "put",
			"routeName": '/marketplace/item/environments',
			"data": {
				id: $scope.service._id.toString(),
				type: $scope.envs.envType ? 'blacklist' : "whitelist",
				environments: $scope.envs.selectedEnvs
			}
		};
		if ($scope.service.configuration && $scope.service.configuration.subType === "soajs") {
			opts.routeName = '/marketplace/soajs/item/environments';
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.$parent.displayAlert('success', "Environments updated Successfully for Item");
			}
			$scope.getCatalog($routeParams.serviceName, $routeParams.serviceType);
		});
	};
	
	$scope.saveRecipes = function () {
		let opts = {
			"method": "put",
			"routeName": '/marketplace/item/recipes',
			data: {
				id: $scope.service._id.toString(),
				recipes: []
			},
			
		};
		if ($scope.service.configuration && $scope.service.configuration.subType === "soajs") {
			opts.routeName = '/marketplace/soajs/item/recipes';
		}
		$scope.recipes.selectedRecipes.forEach((oneRecipe) => {
			opts.data.recipes.push(oneRecipe._id);
		});
		getSendDataFromServer($scope, ngDataApi, opts, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.$parent.displayAlert('success', "Recipes updated Successfully for Item");
			}
			$scope.getCatalog($routeParams.serviceName, $routeParams.serviceType);
		});
	};
	
	$scope.close = function (service) {
		switch (service.type) {
			case "service":
				if (service.configuration && service.configuration.subType === "soajs") {
					$scope.$parent.go("#/soajsCatalog", "_blank");
				} else {
					$scope.$parent.go("#/apiCatalog", "_blank");
				}
				break;
			case "config":
				$scope.$parent.go("#/configCatalog", "_blank");
				break;
			case "static":
				$scope.$parent.go("#/staticCatalog", "_blank");
				break;
			case "daemon":
				$scope.$parent.go("#/daemonCatalog", "_blank");
				break;
			case "custom":
				$scope.$parent.go("#/customCatalog", "_blank");
				break;
			case "resource":
				$scope.$parent.go("#/resourceCatalog", "_blank");
				break;
			default:
				$scope.$parent.go("#/soajsCatalog", "_blank");
		}
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.getCatalog($routeParams.serviceName, $routeParams.serviceType);
	}
	
}]);

soajsCatalogApp.filter('timeInMillisConverter', function () {
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

soajsCatalogApp.filter('recipesSearchFilter', function () {
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

