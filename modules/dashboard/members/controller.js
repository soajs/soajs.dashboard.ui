"use strict";
var membersApp = soajsApp.components;
membersApp.controller('mainMembersCtrl', ['$scope', '$cookies', '$localStorage', 'injectFiles', function ($scope, $cookies, $localStorage, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);
	
	$scope.userCookie = $localStorage.soajs_user;
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('tenantsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $routeParams, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);
	
	$scope.tenantsList = [];
	$scope.users = {};
	$scope.groups = {};
	
	$scope.getAllUsersGroups = function () {
		function arrGroupByTenant(arr) {
			var result = {};
			for (var i = 0; i < arr.length; i++) {
				var group;
				if (arr[i].tenant.id) {
					group = arr[i].tenant.id;
				}
				if (group) {
					if (!result[group]) {
						result[group] = {};
						result[group].list = [];
					}
					result[group].list.push(arr[i]);
				}
			}
			return result;
		}
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/all"
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				$scope.users = arrGroupByTenant(response.users);
				$scope.groups = arrGroupByTenant(response.groups);
			}
		});
	};
	
	$scope.listTenants = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.tenantsList = response;
			}
		});
	};
	
	if ($scope.access.adminAll) {
		$scope.getAllUsersGroups();
		$timeout(function () {
			$scope.listTenants();
		}, 10);
	}
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('tenantsConsoleCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $routeParams, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);
	
	$scope.tenantsList = {};
	$scope.users = {};
	$scope.groups = {};
	
	$scope.getAllUsersGroups = function () {
		function arrGroupByTenant(arr) {
			var result = {};
			for (var i = 0; i < arr.length; i++) {
				var group;
				if (arr[i].tenant.id) {
					group = arr[i].tenant.id;
				}
				if (group) {
					if (!result[group]) {
						result[group] = {};
						result[group].list = [];
					}
					result[group].list.push(arr[i]);
				}
			}
			return result;
		}
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/all"
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				$scope.users = arrGroupByTenant(response.users);
				$scope.groups = arrGroupByTenant(response.groups);
			}
		});
	};
	
	$scope.listTenants = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/console/tenant/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.tenantsList = response;
			}
		});
	};
	
	if ($scope.access.adminAll) {
		$scope.getAllUsersGroups();
		$timeout(function () {
			$scope.listTenants();
		}, 10);
	}
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('tenantMembersCtrl', ['$scope', 'membersHelper', '$timeout', 'injectFiles', function ($scope, membersHelper, $timeout, injectFiles) {
	
	$timeout(function () {
		$scope.tenantMembers = angular.extend($scope);
		$scope.tenantMembers.initialize = function (tenantRecord) {
			$scope.tenantMembers.tenant = tenantRecord;
			$scope.tenantMembers.tId = tenantRecord['_id'];
			
			$timeout(function () {
				if ($scope.tenantMembers.users && $scope.tenantMembers.users[$scope.tenantMembers.tId]) {
					var myUsers = $scope.tenantMembers.users[$scope.tenantMembers.tId].list;
					membersHelper.printMembers($scope.tenantMembers, membersConfig, myUsers);
				}
			}, 1000);
		};
		
		
		$scope.tenantMembers.listMembers = function () {
			membersHelper.listMembers($scope.tenantMembers, membersConfig, function (response) {
				membersHelper.printMembers($scope.tenantMembers, membersConfig, response);
			});
		};
		
		$scope.tenantMembers.addMember = function () {
			membersHelper.addMember($scope.tenantMembers, membersConfig, false);
		};
		
		$scope.tenantMembers.editAcl = function (data) {
			membersHelper.editAcl($scope.tenantMembers, data);
		};
		
		$scope.tenantMembers.editMember = function (data) {
			membersHelper.editMember($scope.tenantMembers, membersConfig, data, false);
		};
		
		$scope.tenantMembers.activateMembers = function () {
			membersHelper.activateMembers($scope.tenantMembers);
		};
		
		$scope.tenantMembers.deactivateMembers = function () {
			membersHelper.deactivateMembers($scope.tenantMembers);
		};
		
		$scope.tenantMembers.$parent.$on('reloadTenantMembers', function (event, args) {
			$scope.tenantMembers.listMembers();
		});
	}, 1000);
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('tenantGroupsCtrl', ['$scope', 'groupsHelper', '$timeout', 'injectFiles', function ($scope, groupsHelper, $timeout, injectFiles) {
	
	$timeout(function () {
		$scope.tenantGroups = angular.extend($scope);
		$scope.tenantGroups.initialize = function (tenantRecord) {
			$scope.tenantGroups.tenant = tenantRecord;
			$scope.tenantGroups.tId = tenantRecord['_id'];
			
			$timeout(function () {
				if ($scope.tenantGroups.groups && $scope.tenantGroups.groups[$scope.tenantGroups.tId]) {
					var myGroups = $scope.tenantGroups.groups[$scope.tenantGroups.tId].list;
					groupsHelper.printGroups($scope.tenantGroups, groupsConfig, myGroups);
				}
			}, 1000);
		};
		
		$scope.tenantGroups.listGroups = function () {
			groupsHelper.listGroups($scope.tenantGroups, groupsConfig, function (response) {
				groupsHelper.printGroups($scope.tenantGroups, groupsConfig, response);
			});
		};
		
		$scope.tenantGroups.editGroup = function (data) {
			groupsHelper.editGroup($scope.tenantGroups, groupsConfig, data, false);
		};
		
		$scope.tenantGroups.addGroup = function () {
			groupsHelper.addGroup($scope.tenantGroups, groupsConfig, false);
		};
		
		$scope.tenantGroups.deleteGroups = function () {
			groupsHelper.deleteGroups($scope.tenantGroups);
		};
		
		$scope.tenantGroups.delete1Group = function (data) {
			groupsHelper.delete1Group($scope.tenantGroups, data, false);
		};
	}, 1000);
	
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);