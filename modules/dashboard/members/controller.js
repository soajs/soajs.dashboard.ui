"use strict";
var membersApp = soajsApp.components;
membersApp.controller('mainMembersCtrl', ['$scope', '$cookies', '$localStorage', 'injectFiles', function ($scope, $cookies, $localStorage, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);
	$scope.userCookie = $localStorage.soajs_user;
	$scope.tenantEnvironments = [];
	if ($localStorage.environments){
		$localStorage.environments.forEach((oneEnv)=>{
			if (oneEnv.code !== 'DASHBOARD'){
				$scope.tenantEnvironments.push(oneEnv);
			}
		});
	}
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('tenantsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $routeParams, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.tenantTabs = [
		/*{
		 'label': 'Administration',
		 'type': 'admin',
		 'tenants': []
		 },*/
		// {
		// 	'label': translation.client[LANG],
		// 	'type': 'client',
		// 	'tenants': []
		// },
		{
			'label': translation.mainTenants[LANG],
			'type': 'product',
			'tenants': []
		},
		{
			'label': translation.subTenants[LANG],
			'type': 'client',
			'tenants': []
		}
	];
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);
	
	$scope.tenantsList = [];
	$scope.users = {};
	$scope.groups = {};
	
	$scope.changeEnvPerTenant = function(env){
		if ($scope.access.adminAll) {
			$scope.getAllUsersGroups(env);
		}
	};
	
	$scope.getAllUsersGroups = function (env) {
		function arrGroupByTenant(arr) {
			let result = {};
			for (let i = 0; i < arr.length; i++) {
				let group, subTenant;
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
				if (arr[i].config && arr[i].config.allowedTenants && arr[i].config.allowedTenants.length > 0) {
					arr[i].config.allowedTenants.forEach((one) => {
						if (one.tenant && one.tenant.id){
							subTenant = one.tenant.id;
							if (!result[subTenant]) {
								result[subTenant] = {};
								result[subTenant].list = [];
							}
							result[subTenant].list.push(arr[i]);
						}
					});
				}
			}
			return result;
		}
		var opts = {
			"method": "get",
			"routeName": "/urac/admin/all"
		};
		if (env){
			opts = {
				"method": "get",
				"routeName": "/proxy/redirect",
				"params": {
					'proxyRoute': '/urac/admin/all',
					"__env": env.toLowerCase()
				}
			};
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
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
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.tenantsList = response;
				$scope.subTenants = [];
				$scope.mainTenants = [];
				response.forEach((oneTenant) => {
					if (oneTenant.type === "product") {
						$scope.mainTenants.push(oneTenant);
					} else if (oneTenant.type === "client") {
						$scope.subTenants.push(oneTenant);
					}
				});
			}
		});
	};
	if ($scope.access.adminAll) {
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
		let env = null;
		$scope.tenantMembers.initialize = function (tenantRecord, environment) {
			$scope.tenantMembers.tenant = tenantRecord;
			$scope.tenantMembers.tId = tenantRecord['_id'];
			if (environment){
				env = environment;
			}
			$timeout(function () {
				if ($scope.tenantMembers.users && $scope.tenantMembers.users[$scope.tenantMembers.tId]) {
					var myUsers = $scope.tenantMembers.users[$scope.tenantMembers.tId].list;
					membersHelper.printMembers($scope.tenantMembers, membersConfig, myUsers);
				}
			}, 1000);
		};
		
		
		$scope.tenantMembers.listMembers = function () {
			membersHelper.listMembers($scope.tenantMembers, membersConfig, env, function (response) {
				membersHelper.printMembers($scope.tenantMembers, membersConfig, response);
			});
		};
		
		$scope.tenantMembers.listSubMembers = function () {
			membersHelper.listSubMembers($scope.tenantMembers, membersConfig, env, function (response) {
				membersHelper.printMembers($scope.tenantMembers, membersConfig, response);
			});
		};
		
		$scope.tenantMembers.addMember = function () {
			membersHelper.addMember($scope.tenantMembers, membersConfig, false, env);
		};
		
		$scope.tenantMembers.inviteUser = function () {
			membersHelper.inviteUser($scope.tenantMembers, membersConfig, false, env);
		};
		
		$scope.tenantMembers.unInviteUser = function () {
			membersHelper.unInviteUser($scope.tenantMembers, membersConfig, false, env);
		};
		
		$scope.tenantMembers.editAcl = function (data) {
			membersHelper.editAcl($scope.tenantMembers, data, env);
		};
		
		$scope.tenantMembers.editMember = function (data) {
			membersHelper.editMember($scope.tenantMembers, membersConfig, data, false, env);
		};
		
		$scope.tenantMembers.editSubMember = function (data) {
			membersHelper.editSubMember($scope.tenantMembers, membersConfig, data, false), env;
		};
		
		$scope.tenantMembers.activateMembers = function () {
			membersHelper.activateMembers($scope.tenantMembers, env);
		};
		
		$scope.tenantMembers.deactivateMembers = function () {
			membersHelper.deactivateMembers($scope.tenantMembers, env);
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
		let env= null;
		$scope.tenantGroups.initialize = function (tenantRecord, environment) {
			$scope.tenantGroups.tenant = tenantRecord;
			$scope.tenantGroups.tId = tenantRecord['_id'];
			if (environment){
				env = environment;
			}
			$timeout(function () {
				if ($scope.tenantGroups.groups && $scope.tenantGroups.groups[$scope.tenantGroups.tId]) {
					var myGroups = $scope.tenantGroups.groups[$scope.tenantGroups.tId].list;
					groupsHelper.printGroups($scope.tenantGroups, groupsConfig, myGroups);
				}
			}, 1000);
		};
		
		$scope.tenantGroups.listGroups = function () {
			groupsHelper.listGroups($scope.tenantGroups, groupsConfig, env, function (response) {
				groupsHelper.printGroups($scope.tenantGroups, groupsConfig, response);
			});
		};
		
		$scope.tenantGroups.editGroup = function (data) {
			groupsHelper.editGroup($scope.tenantGroups, groupsConfig, data, false, env);
		};
		
		$scope.tenantGroups.addGroup = function () {
			groupsHelper.addGroup($scope.tenantGroups, groupsConfig, false, env);
		};
		
		$scope.tenantGroups.deleteGroups = function () {
			groupsHelper.deleteGroups($scope.tenantGroups, env);
		};
		
		$scope.tenantGroups.delete1Group = function (data) {
			groupsHelper.delete1Group($scope.tenantGroups, data, false, env);
		};
	}, 1000);
	
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);