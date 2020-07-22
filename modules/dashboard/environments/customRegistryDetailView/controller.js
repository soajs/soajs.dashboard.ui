"use strict";
let customRegistryConfig = soajsApp.components;
customRegistryConfig.controller('customRegistryConfigViewCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', '$routeParams', '$localStorage',
	function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, $routeParams, $localStorage) {
		$scope.$parent.isUserLoggedIn();
		
		$scope.groups = {
			groupType: false,
			selectedGroups: []
		};
		$scope.limit = 10;
		$scope.recipeSize = 10;
		$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
		$scope.getGroups = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/urac/admin/groups",
			}, function (error, response) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'urac', error.message);
				} else {
					$scope.groupsList = angular.copy(response);
					$scope.groupsList.forEach((oneGroup) => {
						if ($scope.groups.selectedGroups.indexOf(oneGroup.code) !== -1) {
							oneGroup.allowed = true;
						}
					});
				}
			});
		};
		
		$scope.getCustomRegistry = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/registry/custom",
				"params": {
					"env": $scope.envCode
				}
			}, function (error, response) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					if (response && response.length > 0){
						for (let i = 0; i < response.length; i++) {
							if (response[i]._id.toString() === $routeParams.id){
								$scope.item = response[i];
								break;
							}
						}
					}
					if ($scope.item.settings) {
						if ($scope.item.settings.acl) {
							if ($scope.item.settings.acl.groups) {
								$scope.showGroupButtonSlider = true;
								if ($scope.item.settings.acl.groups.value) {
									$scope.groups.selectedGroups = $scope.item.settings.acl.groups.value;
								}
								$scope.groups.groupType = $scope.item.settings.acl.groups.type === "blacklist";
							}
						}
					}
					$scope.getGroups();
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
		
		$scope.saveACl = function () {
			let opts = {
				"method": "put",
				"routeName": '/console/registry/custom/acl',
				"data": {
					id: $scope.item._id.toString(),
					type: $scope.groups.groupType ? 'blacklist' : "whitelist",
					groups: $scope.groups.selectedGroups
				}
			};
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					$scope.$parent.displayAlert('success', "Acl updated Successfully for this item");
					let user = $localStorage.soajs_user;
					let groups = user.groups;
					let found = groups.some((val) => opts.data.groups.indexOf(val) !== -1);
					console.log("found: " + found);
					if ((found && opts.data.type === "blacklist") || (!found && opts.data.type === "whitelist")) {
						$scope.$parent.go("/registry");
					}
				}
			});
		};
		
		$scope.deleteAcl = function () {
			let opts = {
				"method": "delete",
				"routeName": '/console/registry/custom/acl',
				"params": {
					id: $scope.item._id.toString(),
				}
			};
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					$scope.$parent.displayAlert('success', "Acl deleted Successfully for this item");
					$scope.showGroupButtonSlider = false;
					$scope.groupsList.forEach((oneGroup) => {
						oneGroup.allowed = false;
					});
				}
			});
		};
		
		$scope.close = function () {
			$scope.$parent.go("#/registry", "_blank");
		};
		injectFiles.injectCss("modules/dashboard/environments/customRegistryDetailView/customRegistryAcl.css");
		$scope.getCustomRegistry();
		
	}]);

