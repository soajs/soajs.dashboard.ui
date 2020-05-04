"use strict";
var soajsCatalogApp = soajsApp.components;
soajsCatalogApp.controller('soajsCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParam, detectBrowser) {
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
							$scope.mainTabs = getCatalogs(response.records, favoriteResponse);
						}
					}
				});
				
			}
		});
	};
	
	function getCatalogs(records, favoriteRecords){
		let tabs = {};
		
		records.forEach((record)=>{
			let main = record.ui && record.ui.main ? record.ui.main : "Console";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]){
				tabs[main] = {
					"All": {},
					"Favorites" : {}
				};
			}
			if (record.versions && record.versions.length  > 0 ){
				record.versions.forEach((version)=>{
					version.fixList = $scope.arrGroupByField(version.apis, 'group');
				});
			}
			let group = record.configuration && record.configuration.group ?  record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]){
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0){
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found){
					if (!tabs[main]["Favorites"][group]){
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub){
				if (!tabs[main][sub]){
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]){
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
				"type": 'soajs'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = true;
				let main = service.ui && service.ui.main ? service.ui.main : "Console";
				let group = service.configuration && service.configuration.group ?  service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]){
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]){
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]){
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
				"type": 'soajs'
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				service.favorite = false;
				let main = service.ui && service.ui.main ? service.ui.main : "Console";
				let group = service.configuration && service.configuration.group ?  service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]){
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listSoajsCatalog();
	}
	
}]);

soajsCatalogApp.controller('staticCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParam, detectBrowser) {
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
	
	$scope.listStaticCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type" : "static"
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
	
	function getCatalogs(records, favoriteRecords){
		let tabs = {};
		
		records.forEach((record)=>{
			let main = record.ui && record.ui.main ? record.ui.main : "Static";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]){
				tabs[main] = {
					"All": {},
					"Favorites" : {}
				};
			}
			if (record.versions && record.versions.length  > 0 ){
				record.versions.forEach((version)=>{
					version.fixList = $scope.arrGroupByField(version.apis, 'group');
				});
			}
			let group = record.configuration && record.configuration.group ?  record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]){
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0){
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found){
					if (!tabs[main]["Favorites"][group]){
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub){
				if (!tabs[main][sub]){
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]){
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
				let group = service.configuration && service.configuration.group ?  service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]){
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]){
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]){
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
				let group = service.configuration && service.configuration.group ?  service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]){
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listStaticCatalog();
	}
	
}]);

soajsCatalogApp.controller('configCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParam, detectBrowser) {
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
	
	$scope.listConfigCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type" : "config"
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
	
	function getCatalogs(records, favoriteRecords){
		let tabs = {};
		
		records.forEach((record)=>{
			let main = record.ui && record.ui.main ? record.ui.main : "Config";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]){
				tabs[main] = {
					"All": {},
					"Favorites" : {}
				};
			}
			if (record.versions && record.versions.length  > 0 ){
				record.versions.forEach((version)=>{
					version.fixList = $scope.arrGroupByField(version.apis, 'group');
				});
			}
			let group = record.configuration && record.configuration.group ?  record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]){
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0){
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found){
					if (!tabs[main]["Favorites"][group]){
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub){
				if (!tabs[main][sub]){
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]){
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
				let group = service.configuration && service.configuration.group ?  service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]){
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]){
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]){
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
				let group = service.configuration && service.configuration.group ?  service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]){
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listConfigCatalog();
	}
	
}]);

soajsCatalogApp.controller('customCatalogCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', 'detectBrowser', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParam, detectBrowser) {
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
	
	$scope.listCustomCatalog = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/marketplace/items",
			"params": {
				"type" : "custom"
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
	
	function getCatalogs(records, favoriteRecords){
		let tabs = {};
		
		records.forEach((record)=>{
			let main = record.ui && record.ui.main ? record.ui.main : "Custom";
			let sub = record.ui && record.ui.sub ? record.ui.sub : null;
			if (!tabs[main]){
				tabs[main] = {
					"All": {},
					"Favorites" : {}
				};
			}
			if (record.versions && record.versions.length  > 0 ){
				record.versions.forEach((version)=>{
					version.fixList = $scope.arrGroupByField(version.apis, 'group');
				});
			}
			let group = record.configuration && record.configuration.group ?  record.configuration.group : defaultGroup;
			if (!tabs[main]["All"][group]){
				tabs[main]["All"][group] = [];
			}
			tabs[main]["All"][group].push(record);
			if (favoriteRecords && favoriteRecords.favorites && favoriteRecords.favorites.length > 0){
				let found = favoriteRecords.favorites.find(element => element === record.name);
				if (found){
					if (!tabs[main]["Favorites"][group]){
						tabs[main]["Favorites"][group] = [];
					}
					record.favorite = true;
					tabs[main]["Favorites"][group].push(record);
				}
			}
			
			if (sub){
				if (!tabs[main][sub]){
					tabs[main][sub] = {};
				}
				if (!tabs[main][sub][group]){
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
				let group = service.configuration && service.configuration.group ?  service.configuration.group : defaultGroup;
				if (!$scope.mainTabs[main]["Favorites"]){
					$scope.mainTabs[main]["Favorites"] = {};
				}
				if (!$scope.mainTabs[main]["Favorites"][group]){
					$scope.mainTabs[main]["Favorites"][group] = [];
				}
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]){
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
				let group = service.configuration && service.configuration.group ?  service.configuration.group : defaultGroup;
				if ($scope.mainTabs && $scope.mainTabs[main] && $scope.mainTabs[main]["Favorites"] && $scope.mainTabs[main]["Favorites"][group]){
					for (let i = 0; i < $scope.mainTabs[main]["Favorites"][group].length; i++) {
						if ($scope.mainTabs[main]["Favorites"][group][i].name === service.name) {
							$scope.mainTabs[main]["Favorites"][group].splice(i, 1);
						}
					}
				}
			}
		});
	};
	
	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/marketplace/marketplace.css");
		$scope.listCustomCatalog();
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

