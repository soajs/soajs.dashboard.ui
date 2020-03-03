"use strict";
var membersApp = soajsApp.components;
membersApp.controller('mainMembersCtrl', ['$scope', '$cookies', '$localStorage', 'injectFiles', '$timeout', '$routeParams', 'ngDataApi', function ($scope, $cookies, $localStorage, injectFiles, $timeout, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);
	$scope.userCookie = $localStorage.soajs_user;
	$scope.tenantEnvironments = [];
	if ($localStorage.environments) {
		$localStorage.environments.forEach((oneEnv) => {
			if (oneEnv.code !== 'DASHBOARD') {
				$scope.tenantEnvironments.push(oneEnv);
			}
		});
	}
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
	
	$scope.getTenantExtKeys = function (env, tenant) {
		$scope.tenantExtKeys = [];
		if (env && tenant && tenant.applications && tenant.applications.length > 0) {
			tenant.applications.forEach((oneApp) => {
				if (oneApp && oneApp.keys && oneApp.keys.length > 0) {
					oneApp.keys.forEach((oneKey) => {
						if (oneKey && oneKey.extKeys && oneKey.extKeys.length > 0) {
							oneKey.extKeys.forEach((oneExt) => {
								if (oneExt && oneExt.extKey && (oneExt.env.toUpperCase() === env.toUpperCase() || oneExt.env === null || !oneExt.env)) {
									$scope.tenantExtKeys.push({
										v: oneExt.extKey,
										l: oneApp.product + " " + oneApp.package + " " + (oneExt.label ? oneExt.label : oneExt.extKey.substring(0, 10) + "..." + oneExt.extKey.substring(oneExt.extKey.length - 10, oneExt.extKey.length))
									});
								}
							});
						}
					});
				}
			});
		}
		
		$scope.selectedTenant = $scope.mainTenants.find(function (element) {
			return element.code === tenant.code;
		});
		$scope.getSubTenants(tenant);
	};
	
	$scope.getSubTenantExtKeys = function (env, tenant) {
		$scope.subtenantExtKeys = [];
		if (tenant && tenant.v && tenant.v.applications && tenant.v.applications.length > 0) {
			tenant.v.applications.forEach((oneApp) => {
				if (oneApp && oneApp.keys && oneApp.keys.length > 0) {
					oneApp.keys.forEach((oneKey) => {
						if (oneKey && oneKey.extKeys && oneKey.extKeys.length > 0) {
							oneKey.extKeys.forEach((oneExt) => {
								if (oneExt && oneExt.extKey && (oneExt.env.toUpperCase() === env.toUpperCase() || oneExt.env === null || !oneExt.env)) {
									$scope.subtenantExtKeys.push({
										v: oneExt.extKey,
										l: oneApp.product + " " + oneApp.package + " " + (oneExt.label ? oneExt.label : oneExt.extKey.substring(0, 10) + "..." + oneExt.extKey.substring(oneExt.extKey.length - 10, oneExt.extKey.length))
									});
								}
							});
						}
					});
				}
			});
			$scope.selectedSubTenant = $scope.subTenants.find(function (element) {
				return element.code === tenant.v.code;
			});
		}
	};
	
	$scope.getSubTenants = function (tenant) {
		$scope.subTenantsForTenant = [];
		$scope.subTenants.forEach((oneTenant) => {
			if (oneTenant.tenant && oneTenant.tenant.code && oneTenant.tenant.code === tenant.code) {
				$scope.subTenantsForTenant.push({
					l: oneTenant.code,
					v: oneTenant
				});
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

membersApp.controller('tenantsMembersCtrl', ['$scope', '$routeParams', 'ngDataApi', 'injectFiles', 'membersHelper', function ($scope, $routeParams, ngDataApi, injectFiles, membersHelper) {
	
	let users = [];
	$scope.getTenantUsers = function (tenantRecord, env, ext) {
		if ($scope.access.adminUser) {
			$scope.showGet = true;
			$scope.getAllUsers(env, ext, () => {
				if (tenantRecord) {
					$scope.tenantMembers = angular.extend($scope);
					$scope.tenantMembers.tenant = tenantRecord;
					$scope.tenantMembers.tId = tenantRecord['_id'];
					$scope.tenantMembers.users = users;
					if ($scope.tenantMembers.users && $scope.tenantMembers.users[$scope.tId]) {
						var myUsers = $scope.tenantMembers.users[$scope.tenantMembers.tId].list;
						membersHelper.printMembers($scope.tenantMembers, membersConfig, myUsers, true);
					}
				}
				
				$scope.tenantMembers.listMembers = function () {
					membersHelper.listMembers($scope.tenantMembers, membersConfig, env, ext, function (response) {
						membersHelper.printMembers($scope.tenantMembers, membersConfig, response, true);
					});
				};
				
				$scope.tenantMembers.listSubMembers = function () {
					membersHelper.listSubMembers($scope.tenantMembers, membersConfig, env, ext, function (response) {
						membersHelper.printMembers($scope.tenantMembers, membersConfig, response, true);
					});
				};
				
				$scope.tenantMembers.addMember = function () {
					membersHelper.addMember($scope.tenantMembers, membersConfig, false, env, ext);
				};
				
				$scope.tenantMembers.inviteUser = function () {
					membersHelper.inviteUser($scope.tenantMembers, membersConfig, false, env, ext);
				};
				
				$scope.tenantMembers.unInviteUser = function () {
					membersHelper.unInviteUser($scope.tenantMembers, membersConfig, false, env, ext);
				};
				
				$scope.tenantMembers.editMember = function (data) {
					membersHelper.editMember($scope.tenantMembers, membersConfig, data, false, env, ext);
				};
				
				$scope.tenantMembers.editSubMember = function (data) {
					membersHelper.editSubMember($scope.tenantMembers, membersConfig, data, false, env, ext);
				};
				
				$scope.tenantMembers.editMemberPin = function (data) {
					membersHelper.editMemberPin($scope.tenantMembers, membersConfig, data, false, env, ext);
				};
				
				$scope.tenantMembers.activateMembers = function () {
					membersHelper.activateMembers($scope.tenantMembers, env, ext);
				};
				
				$scope.tenantMembers.deactivateMembers = function () {
					membersHelper.deactivateMembers($scope.tenantMembers, env, ext);
				};
				
				$scope.$parent.$on('reloadTenantMembers', function (event, args) {
					$scope.listMembers();
				});
			});
		}
	};
	
	$scope.getAllUsers = function (env, extKey, cb) {
		function arrGroupByTenant(arr) {
			let result = {};
			if (arr) {
				for (let i = 0; i < arr.length; i++) {
					let tenant;
					if (arr[i].config && arr[i].config.allowedTenants && arr[i].config.allowedTenants.length > 0) {
						arr[i].config.allowedTenants.forEach((one) => {
							if (one.tenant && one.tenant.id) {
								tenant = one.tenant.id;
								if (!result[tenant]) {
									result[tenant] = {};
									result[tenant].list = [];
								}
								result[tenant].list.push(arr[i]);
							}
						});
					}
				}
			}
			return result;
		}
		
		let opts = {};
		if (env && extKey) {
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/users',
					"extKey": extKey
				},
				"headers": {
					"__env": env.toLowerCase()
				}
			};
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				users = arrGroupByTenant(response);
				return cb();
			}
		});
	};
}]);

membersApp.controller('tenantsGroupsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', 'injectFiles', 'groupsHelper', function ($scope, $timeout, $routeParams, ngDataApi, injectFiles, groupsHelper) {
	let groups = {};
	$scope.getTenantGroups = function (tenantRecord, env, ext) {
		if ($scope.access.adminGroup) {
			$scope.showGet = true;
			$scope.getAllGroups(env, ext, () => {
				if (tenantRecord) {
					$scope.groupsMembers = angular.extend($scope);
					$scope.groupsMembers.tenant = tenantRecord;
					$scope.groupsMembers.tId = tenantRecord['_id'];
					$scope.groupsMembers.groups = groups;
					if ($scope.groupsMembers.groups && $scope.groupsMembers.groups[$scope.groupsMembers.tId]) {
						let myGroups = $scope.groupsMembers.groups[$scope.tId].list;
						groupsHelper.printGroups($scope.groupsMembers, groupsConfig, myGroups);
					}
				}
				
				$scope.groupsMembers.listGroups = function () {
					groupsHelper.listGroups($scope.groupsMembers, groupsConfig, env, ext, function (response) {
						groupsHelper.printGroups($scope.groupsMembers, groupsConfig, response);
					});
				};
				
				$scope.groupsMembers.editGroup = function (data) {
					groupsHelper.editGroup($scope.groupsMembers, groupsConfig, data, false, env, ext);
				};
				
				$scope.groupsMembers.addGroup = function () {
					groupsHelper.addGroup($scope.groupsMembers, groupsConfig, false, env, ext);
				};
				
				$scope.groupsMembers.deleteGroups = function () {
					groupsHelper.deleteGroups($scope.groupsMembers, env, ext);
				};
				
				$scope.groupsMembers.delete1Group = function (data) {
					groupsHelper.delete1Group($scope.groupsMembers, data, false, env, ext);
				};
			});
		}
	};
	
	$scope.getAllGroups = function (env, extKey, cb) {
		function arrGroupByTenant(arr) {
			let result = {};
			if (arr) {
				for (let i = 0; i < arr.length; i++) {
					let subTenant;
					if (arr[i].config && arr[i].config.allowedTenants && arr[i].config.allowedTenants.length > 0) {
						arr[i].config.allowedTenants.forEach((one) => {
							if (one.tenant && one.tenant.id) {
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
			}
			return result;
		}
		
		let opts = {};
		if (env && extKey) {
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/groups',
					"__env": env.toLowerCase(),
					"extKey": extKey
				}
			};
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				groups = arrGroupByTenant(response);
				return cb();
			}
		});
	};
	
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('subTenantsMembersCtrl', ['$scope', '$routeParams', 'ngDataApi', 'injectFiles', 'membersHelper', function ($scope, $routeParams, ngDataApi, injectFiles, membersHelper) {
	
	let users = [];
	$scope.getSubTenantUsers = function (tenantRecord, mainTenantRecord, env, mainExt, subExt) {
		if ($scope.access.adminUser) {
			$scope.showGet= true;
			$scope.getAllSubUsers(tenantRecord, mainTenantRecord, env, mainExt, () => {
				if (tenantRecord) {
					$scope.subTenantMembers = angular.extend($scope);
					$scope.subTenantMembers.tenant = tenantRecord;
					$scope.subTenantMembers.tId = tenantRecord['_id'];
					$scope.subTenantMembers.users = users;
					$scope.subTenantMembers.mainTenant = mainTenantRecord;
					if ($scope.subTenantMembers.users && $scope.subTenantMembers.users[$scope.tId]) {
						let myUsers = $scope.subTenantMembers.users[$scope.subTenantMembers.tId].list;
						membersHelper.printMembers($scope.subTenantMembers, membersConfig, myUsers, true);
					}
				}
				
				$scope.subTenantMembers.listSubMembers = function () {
					membersHelper.listSubMembers($scope.subTenantMembers, membersConfig, env, mainExt, function (response) {
						membersHelper.printMembers($scope.subTenantMembers, membersConfig, response, true);
					});
				};
				
				$scope.subTenantMembers.inviteUser = function () {
					membersHelper.inviteUser($scope.subTenantMembers, membersConfig, false, env, mainExt, subExt);
				};
				
				$scope.subTenantMembers.unInviteUser = function () {
					membersHelper.unInviteUser($scope.subTenantMembers, membersConfig, false, env, subExt);
				};
				
				$scope.subTenantMembers.editSubMember = function (data) {
					membersHelper.editSubMember($scope.subTenantMembers, membersConfig, data, false, env, subExt);
				};
				
				$scope.subTenantMembers.editSubMemberPin = function (data) {
					membersHelper.editSubMemberPin($scope.subTenantMembers, membersConfig, data, false, env, subExt);
				};
				$scope.subTenantMembers.removePin = function (data) {
					membersHelper.removePin($scope.subTenantMembers, membersConfig, data, env, subExt);
				};
			});
		}
	};
	
	$scope.getAllSubUsers = function (tenantRecord, mainTenantRecord, env, extKey, cb) {
		function arrGroupByTenant(arr) {
			let result = {};
			if (arr) {
				for (let i = 0; i < arr.length; i++) {
					let subTenant;
					if (arr[i].config && arr[i].config.allowedTenants && arr[i].config.allowedTenants.length > 0) {
						arr[i].config.allowedTenants.forEach((one) => {
							if (one.tenant && one.tenant.id) {
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
			}
			return result;
		}
		
		let opts = {
			"method": "get",
			"routeName": "/soajs/proxy",
			"params": {
				'proxyRoute': '/urac/admin/users',
				"extKey": extKey,
				"config": true,
			},
			"headers": {
				"__env": env.toLowerCase()
			}
		};
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			}
			else {
				users = arrGroupByTenant(response);
				return cb();
			}
		});
	};
}]);

membersApp.controller('subTenantsGroupsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', 'injectFiles', 'groupsHelper', function ($scope, $timeout, $routeParams, ngDataApi, injectFiles, groupsHelper) {
	let groups = [];
	$scope.getSubTenantGroups = function (tenantRecord, env, ext) {
		if ($scope.access.adminGroup) {
			$scope.showGet = true;
			$scope.getAllSubGroups(env, ext, () => {
				if (tenantRecord) {
					$scope.subGroupsSubMembers = angular.extend($scope);
					$scope.subGroupsSubMembers.tenant = tenantRecord;
					$scope.subGroupsSubMembers.tId = tenantRecord['_id'];
					$scope.subGroupsSubMembers.groups = groups;
					if ($scope.subGroupsSubMembers.groups && $scope.subGroupsSubMembers.groups[$scope.subGroupsSubMembers.tId]) {
						let myGroups = $scope.subGroupsSubMembers.groups[$scope.tId].list;
						groupsHelper.printGroups($scope.subGroupsSubMembers, groupsConfig, myGroups);
					}
				}
				
				$scope.subGroupsSubMembers.listGroups = function () {
					groupsHelper.listGroups($scope.subGroupsSubMembers, groupsConfig, env, ext, function (response) {
						groupsHelper.printGroups($scope.subGroupsSubMembers, groupsConfig, response);
					});
				};
				
				$scope.subGroupsSubMembers.editGroup = function (data) {
					groupsHelper.editGroup($scope.subGroupsSubMembers, groupsConfig, data, false, env, ext);
				};
				
				$scope.subGroupsSubMembers.addGroup = function () {
					groupsHelper.addGroup($scope.subGroupsSubMembers, groupsConfig, false, env, ext);
				};
				
				$scope.subGroupsSubMembers.deleteGroups = function () {
					groupsHelper.deleteGroups($scope.subGroupsSubMembers, env, ext);
				};
				
				$scope.subGroupsSubMembers.delete1Group = function (data) {
					groupsHelper.delete1Group($scope.subGroupsSubMembers, data, false, env, ext);
				};
			});
		}
	};
	
	$scope.getAllSubGroups = function (env, extKey, cb) {
		function arrGroupByTenant(arr) {
			let result = {};
			if (arr) {
				for (let i = 0; i < arr.length; i++) {
					let subTenant;
					
					if (arr[i].config && arr[i].config.allowedTenants && arr[i].config.allowedTenants.length > 0) {
						arr[i].config.allowedTenants.forEach((one) => {
							if (one.tenant && one.tenant.id) {
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
			}
			return result;
		}
		
		let opts = {};
		if (env && extKey) {
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/groups',
					"__env": env.toLowerCase(),
					"extKey": extKey
				}
			};
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				groups = arrGroupByTenant(response);
				return cb();
			}
		});
	};
	
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('mainMembersConsoleCtrl', ['$scope', '$cookies', '$localStorage', 'injectFiles', function ($scope, $cookies, $localStorage, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);
	$scope.userCookie = $localStorage.soajs_user;
	$scope.tenantEnvironments = [];
	if ($localStorage.environments) {
		$localStorage.environments.forEach((oneEnv) => {
			if (oneEnv.code !== 'DASHBOARD') {
				$scope.tenantEnvironments.push(oneEnv);
			}
		});
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
				if (response) {
					for (let i = 0; i < response.length; i++) {
						if (response[i].oauth && response[i].oauth.loginMode === "urac") {
							$scope.tenantsList = response[i];
						}
					}
				}
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

membersApp.controller('tenantConsoleMembersCtrl', ['$scope', 'membersHelper', '$timeout', 'injectFiles', function ($scope, membersHelper, $timeout, injectFiles) {
	
	$timeout(function () {
		$scope.tenantMembers = angular.extend($scope);
		let env = null;
		let ext = null;
		$scope.tenantMembers.initialize = function (tenantRecord, environment, extKey) {
			$scope.tenantMembers.tenant = tenantRecord;
			$scope.tenantMembers.tId = tenantRecord['_id'];
			if (environment) {
				env = environment;
			}
			if (extKey) {
				ext = extKey;
			}
			$timeout(function () {
				if ($scope.tenantMembers.users && $scope.tenantMembers.users[$scope.tenantMembers.tId]) {
					var myUsers = $scope.tenantMembers.users[$scope.tenantMembers.tId].list;
					membersHelper.printMembers($scope.tenantMembers, membersConfig, myUsers);
				}
			}, 1000);
		};
		
		
		$scope.tenantMembers.listMembers = function () {
			membersHelper.listMembers($scope.tenantMembers, membersConfig, env, ext, function (response) {
				membersHelper.printMembers($scope.tenantMembers, membersConfig, response);
			});
		};
		
		$scope.tenantMembers.listSubMembers = function () {
			membersHelper.listSubMembers($scope.tenantMembers, membersConfig, env, ext, function (response) {
				membersHelper.printMembers($scope.tenantMembers, membersConfig, response);
			});
		};
		
		$scope.tenantMembers.addMember = function () {
			membersHelper.addMember($scope.tenantMembers, membersConfig, false, env, ext);
		};
		
		$scope.tenantMembers.inviteUser = function () {
			membersHelper.inviteUser($scope.tenantMembers, membersConfig, false, env, ext);
		};
		
		$scope.tenantMembers.unInviteUser = function () {
			membersHelper.unInviteUser($scope.tenantMembers, membersConfig, false, env, ext);
		};
		
		$scope.tenantMembers.editAcl = function (data) {
			membersHelper.editAcl($scope.tenantMembers, data, env, ext);
		};
		
		$scope.tenantMembers.editMember = function (data) {
			membersHelper.editMember($scope.tenantMembers, membersConfig, data, false, env, ext);
		};
		
		$scope.tenantMembers.editSubMember = function (data) {
			membersHelper.editSubMember($scope.tenantMembers, membersConfig, data, false, env, ext);
		};
		
		$scope.tenantMembers.activateMembers = function () {
			membersHelper.activateMembers($scope.tenantMembers, env, ext);
		};
		
		$scope.tenantMembers.deactivateMembers = function () {
			membersHelper.deactivateMembers($scope.tenantMembers, env, ext);
		};
		
		$scope.tenantMembers.$parent.$on('reloadTenantMembers', function (event, args) {
			$scope.tenantMembers.listMembers();
		});
	}, 1000);
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('tenantConsoleGroupsCtrl', ['$scope', 'groupsHelper', '$timeout', 'injectFiles', function ($scope, groupsHelper, $timeout, injectFiles) {
	
	$timeout(function () {
		$scope.tenantGroups = angular.extend($scope);
		let env = null;
		let ext = null;
		$scope.tenantGroups.initialize = function (tenantRecord, environment, extKey) {
			$scope.tenantGroups.tenant = tenantRecord;
			$scope.tenantGroups.tId = tenantRecord['_id'];
			if (environment) {
				env = environment;
			}
			if (extKey) {
				ext = extKey;
			}
			$timeout(function () {
				if ($scope.tenantGroups.groups && $scope.tenantGroups.groups[$scope.tenantGroups.tId]) {
					var myGroups = $scope.tenantGroups.groups[$scope.tenantGroups.tId].list;
					groupsHelper.printGroups($scope.tenantGroups, groupsConfig, myGroups);
				}
			}, 1000);
		};
		
		$scope.tenantGroups.listGroups = function () {
			groupsHelper.listGroups($scope.tenantGroups, groupsConfig, env, ext, function (response) {
				groupsHelper.printGroups($scope.tenantGroups, groupsConfig, response);
			});
		};
		
		$scope.tenantGroups.editGroup = function (data) {
			groupsHelper.editGroup($scope.tenantGroups, groupsConfig, data, false, env, ext);
		};
		
		$scope.tenantGroups.addGroup = function () {
			groupsHelper.addGroup($scope.tenantGroups, groupsConfig, false, env, ext);
		};
		
		$scope.tenantGroups.deleteGroups = function () {
			groupsHelper.deleteGroups($scope.tenantGroups, env, ext);
		};
		
		$scope.tenantGroups.delete1Group = function (data) {
			groupsHelper.delete1Group($scope.tenantGroups, data, false, env, ext);
		};
	}, 1000);
	
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);
