"use strict";
let membersApp = soajsApp.components;
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
	
	$scope.filters = {
		"tenant": null,
		"env": null,
		"ext": null,
		"subExt": null,
		"subTenant": null,
		"mlist": {
			"user": false,
			"invite": false,
			"group": false,
			"showget": {
				"user": false,
				"invite": false,
				"group": false
			}
		},
		"slist": {
			"user": false,
			"group": false,
			"showget": {
				"user": false,
				"group": false
			}
		}
	};
	$scope.tenantTabs = [
		{
			'pagination': {
				"start": 0,
				"limit": 50,
				"keywords": null
			},
			'label': translation.mainTenants[LANG],
			'type': 'product',
			'tenants': []
		},
		{
			'pagination': {
				"start": 0,
				"limit": 50,
				"keywords": null
			},
			'label': translation.subTenants[LANG],
			'type': 'client',
			'tenants': []
		}
	];
	
	$scope.access = {};
	
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);
	
	$scope.changeEnv = function (env) {
		$scope.filters = {
			"tenant": null,
			"env": env,
			"ext": null,
			"subExt": null,
			"subTenant": null
		};
		jQuery('#mainTenant').find('> option').each(function () {
			$(this).removeAttr('selected');
		});
		jQuery('#extKey').find('> option').each(function () {
			$(this).removeAttr('selected');
		});
		jQuery('#subTenant').find('> option').each(function () {
			$(this).removeAttr('selected');
		});
		jQuery('#extKeySub').find('> option').each(function () {
			$(this).removeAttr('selected');
		});
	};
	
	$scope.getTenantExtKeys = function (env, tenantindex) {
		let tenant = $scope.mainTenants[tenantindex];
		$scope.selectedTenant = tenant;
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
		if (tenant && tenant.code) {
			$scope.getSubTenants(tenantindex);
		}
	};
	
	$scope.getSubTenantExtKeys = function (env, tenantindex) {
		let tenant = $scope.subTenants[tenantindex];
		$scope.selectedSubTenant = tenant;
		$scope.subtenantExtKeys = [];
		if (tenant && tenant.applications && tenant.applications.length > 0) {
			tenant.applications.forEach((oneApp) => {
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
		}
	};
	
	$scope.turnOffmList = function () {
		$scope.filters.mlist = {
			"user": false,
			"invite": false,
			"group": false,
			"showget": {
				"user": false,
				"invite": false,
				"group": false
			}
		};
	};
	$scope.turnOffsList = function () {
		$scope.filters.slist = {
			"user": false,
			"group": false,
			"showget": {
				"user": false,
				"group": false
			}
		};
	};
	
	$scope.getSubTenants = function (tenantindex) {
		let tenant = $scope.mainTenants[tenantindex];
		overlayLoading.show();
		$scope.subTenants = [];
		$scope.filters = {
			"env": $scope.filters.env,
			"tenant": $scope.filters.tenant,
			"ext": $scope.filters.ext,
			"subExt": null,
			"subTenant": null
		};
		$scope.subtenantExtKeys = [];
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/tenant/tenants",
			"params": {
				"code": tenant.code,
				"start": $scope.tenantTabs[1].pagination.start,
				"limit": $scope.tenantTabs[1].pagination.limit,
				"keywords": $scope.tenantTabs[1].pagination.keywords || null
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				if (response && response.items) {
					$scope.subTenants = response.items;
				}
			}
		});
	};
	
	$scope.listTenants = function () {
		overlayLoading.show();
		$scope.mainTenants = [];
		$scope.filters = {
			"env": $scope.filters.env,
			"tenant": null,
			"ext": null,
			"subExt": null,
			"subTenant": null
		};
		$scope.tenantExtKeys = [];
		$scope.subtenantExtKeys = [];
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/tenants",
			"params": {
				"type": $scope.tenantTabs[0].type,
				"start": $scope.tenantTabs[0].pagination.start,
				"limit": $scope.tenantTabs[0].pagination.limit,
				"keywords": $scope.tenantTabs[0].pagination.keywords || null
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				//NOTE: added this since the API did not support pagination before
				$scope.mainTenants = response;
				if (response && response.items) {
					$scope.mainTenants = response.items
				}
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
	
	$scope.getTenantUsers = function (tenantRecord, env, ext, filters) {
		if ($scope.access.adminUser) {
			filters.mlist.showget.user = true;
			$scope.filters.mlist.user = true;
			$scope.tenantMembers = angular.extend($scope);
			$scope.tenantMembers.tenant = tenantRecord;
			$scope.tenantMembers.tId = tenantRecord['_id'];
			
			$scope.tenantMembers.listMembers = function () {
				membersHelper.listMembers($scope.tenantMembers, membersConfig, env, ext, function (response) {
					if (response && Array.isArray(response) && response.length > 0) {
						membersHelper.printMembers($scope.tenantMembers, membersConfig, response, true);
					} else {
						membersHelper.printMembers($scope.tenantMembers, membersConfig, [], true);
					}
				});
			};
			
			$scope.tenantMembers.addMember = function () {
				membersHelper.addMember($scope.tenantMembers, membersConfig, false, env, ext);
			};
			
			$scope.tenantMembers.editMember = function (data) {
				membersHelper.editMember($scope.tenantMembers, membersConfig, data, false, env, ext);
			};
			
			$scope.tenantMembers.activateMembers = function () {
				membersHelper.activateMembers($scope.tenantMembers, env, ext);
			};
			
			$scope.tenantMembers.deactivateMembers = function () {
				membersHelper.deactivateMembers($scope.tenantMembers, env, ext);
			};
			
			$scope.tenantMembers.deleteMember = function (data) {
				membersHelper.deleteMember($scope.tenantMembers, data, env, ext);
			};
			
			$scope.tenantMembers.editMemberPin = function (data) {
				membersHelper.editMemberPin($scope.tenantMembers, membersConfig, data, false, env, ext);
			};
			
			$scope.tenantMembers.removePin = function (data) {
				membersHelper.removePin($scope.tenantMembers, membersConfig, data, env, ext);
			};
			
			$scope.tenantMembers.listMembers();
		}
	};
}]);

membersApp.controller('tenantsInvitedMembersCtrl', ['$scope', '$routeParams', 'ngDataApi', 'injectFiles', 'membersHelper', function ($scope, $routeParams, ngDataApi, injectFiles, membersHelper) {
	
	$scope.getTenantUsers = function (tenantRecord, env, ext, filters) {
		if ($scope.access.adminUser) {
			filters.mlist.showget.invite = true;
			$scope.filters.mlist.invite = true;
			$scope.tenantsInvitedMembers = angular.extend($scope);
			$scope.tenantsInvitedMembers.tenant = tenantRecord;
			$scope.tenantsInvitedMembers.tId = tenantRecord['_id'];
			
			$scope.tenantsInvitedMembers.listMembers = function () {
				membersHelper.listInvitedMembers($scope.tenantsInvitedMembers, membersConfig, env, ext, function (response) {
					if (response && Array.isArray(response) && response.length > 0) {
						membersHelper.printMembers($scope.tenantsInvitedMembers, membersConfig, response, true, true);
					} else {
						membersHelper.printMembers($scope.tenantsInvitedMembers, membersConfig, [], true, true);
					}
				});
			};
			
			$scope.tenantsInvitedMembers.listSubMembers = function () {
				$scope.tenantsInvitedMembers.listMembers();
			};
			
			$scope.tenantsInvitedMembers.inviteUser = function () {
				membersHelper.inviteMainUser($scope.tenantsInvitedMembers, membersConfig, false, env, ext);
			};
			
			$scope.tenantsInvitedMembers.unInviteUser = function () {
				membersHelper.unInviteUser($scope.tenantsInvitedMembers, membersConfig, false, env, ext);
			};
			
			$scope.tenantsInvitedMembers.editSubMember = function (data) {
				if (!data.invited) {
					$scope.$parent.displayAlert('danger', "Make sure the user is invited first!");
				} else {
					membersHelper.editSubMember($scope.tenantsInvitedMembers, membersConfig, data, false, env, ext);
				}
			};
			
			$scope.tenantsInvitedMembers.editMemberPin = function (data) {
				if (!data.invited) {
					$scope.$parent.displayAlert('danger', "Make sure the user is invited first!");
				} else {
					membersHelper.editSubMemberPin($scope.tenantsInvitedMembers, membersConfig, data, false, env, ext);
				}
			};
			
			$scope.tenantsInvitedMembers.removePin = function (data) {
				if (!data.invited) {
					$scope.$parent.displayAlert('danger', "Make sure the user is invited first!");
				} else {
					membersHelper.removePin($scope.tenantsInvitedMembers, membersConfig, data, env, ext);
				}
			};
			
			$scope.tenantsInvitedMembers.listMembers();
		}
	};
}]);

membersApp.controller('tenantsGroupsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', 'injectFiles', 'groupsHelper', function ($scope, $timeout, $routeParams, ngDataApi, injectFiles, groupsHelper) {
	
	$scope.getTenantGroups = function (tenantRecord, env, ext, filters) {
		if ($scope.access.adminGroup) {
			filters.mlist.showget.group = true;
			$scope.filters.mlist.group = true;
			$scope.groupsMembers = angular.extend($scope);
			$scope.groupsMembers.tenant = tenantRecord;
			$scope.groupsMembers.tId = tenantRecord['_id'];
			
			$scope.groupsMembers.listGroups = function () {
				groupsHelper.listGroups($scope.groupsMembers, groupsConfig, env, ext, function (response) {
					if (response && Array.isArray(response) && response.length > 0) {
						groupsHelper.printGroups($scope.groupsMembers, groupsConfig, response);
					} else {
						groupsHelper.printGroups($scope.groupsMembers, groupsConfig, []);
					}
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
			
			$scope.groupsMembers.listGroups();
		}
	};
	
	injectFiles.injectCss("modules/dashboard/members/members.css");
}]);

membersApp.controller('subTenantsMembersCtrl', ['$scope', '$routeParams', 'ngDataApi', 'injectFiles', 'membersHelper', function ($scope, $routeParams, ngDataApi, injectFiles, membersHelper) {
	
	$scope.getSubTenantUsers = function (tenantRecord, mainTenantRecord, env, mainExt, subExt, filters) {
		if ($scope.access.adminUser) {
			filters.slist.showget.user = true;
			$scope.filters.slist.user = true;
			$scope.subTenantMembers = angular.extend($scope);
			$scope.subTenantMembers.tenant = tenantRecord;
			$scope.subTenantMembers.tId = tenantRecord['_id'];
			$scope.subTenantMembers.mainTenant = mainTenantRecord;
			
			$scope.subTenantMembers.listSubMembers = function () {
				membersHelper.listSubMembers($scope.subTenantMembers, membersConfig, env, subExt, function (response) {
					if (response && Array.isArray(response) && response.length > 0) {
						membersHelper.printMembers($scope.subTenantMembers, membersConfig, response, true);
					} else {
						membersHelper.printMembers($scope.subTenantMembers, membersConfig, [], true);
					}
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
			
			$scope.subTenantMembers.listSubMembers();
		}
	};
}]);

membersApp.controller('subTenantsGroupsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', 'injectFiles', 'groupsHelper', function ($scope, $timeout, $routeParams, ngDataApi, injectFiles, groupsHelper) {
	
	$scope.getSubTenantGroups = function (tenantRecord, env, subExt, filters) {
		if ($scope.access.adminGroup) {
			filters.slist.showget.group = true;
			$scope.filters.slist.group = true;
			$scope.subGroupsSubMembers = angular.extend($scope);
			$scope.subGroupsSubMembers.tenant = tenantRecord;
			$scope.subGroupsSubMembers.tId = tenantRecord['_id'];
			
			
			$scope.subGroupsSubMembers.listGroups = function () {
				groupsHelper.listGroups($scope.subGroupsSubMembers, groupsConfig, env, subExt, function (response) {
					if (response && Array.isArray(response) && response.length > 0) {
						groupsHelper.printGroups($scope.subGroupsSubMembers, groupsConfig, response);
					} else {
						groupsHelper.printGroups($scope.subGroupsSubMembers, groupsConfig, []);
					}
				});
			};
			
			$scope.subGroupsSubMembers.editGroup = function (data) {
				groupsHelper.editGroup($scope.subGroupsSubMembers, groupsConfig, data, false, env, subExt);
			};
			
			$scope.subGroupsSubMembers.addGroup = function () {
				groupsHelper.addGroup($scope.subGroupsSubMembers, groupsConfig, false, env, subExt);
			};
			
			$scope.subGroupsSubMembers.deleteGroups = function () {
				groupsHelper.deleteGroups($scope.subGroupsSubMembers, env, subExt);
			};
			
			$scope.subGroupsSubMembers.delete1Group = function (data) {
				groupsHelper.delete1Group($scope.subGroupsSubMembers, data, false, env, subExt);
			};
			
			$scope.subGroupsSubMembers.listGroups();
		}
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
			let result = {};
			for (let i = 0; i < arr.length; i++) {
				let group;
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
			"routeName": "/multitenant/tenants/console"
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
					let myUsers = $scope.tenantMembers.users[$scope.tenantMembers.tId].list;
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
		
		$scope.tenantMembers.deleteMember = function (data) {
			membersHelper.deleteMember($scope.tenantMembers, data, env, ext);
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
					let myGroups = $scope.tenantGroups.groups[$scope.tenantGroups.tId].list;
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
