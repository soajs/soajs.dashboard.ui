"use strict";
var membersApp = soajsApp.components;
membersApp.controller('mainMembersCtrl', ['$scope', '$cookies', '$localStorage', function ($scope, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.userCookie = $localStorage.soajs_user;
}]);

membersApp.controller('tenantsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', function ($scope, $timeout, $routeParams, ngDataApi) {
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
			"routeName": "/urac/owner/admin/listUsers"
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
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
			}
			else {
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

}]);

membersApp.controller('tenantsConsoleCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', function ($scope, $timeout, $routeParams, ngDataApi) {
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
			}
			else {
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
			}
			else {
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
	
}]);

membersApp.controller('tenantMembersCtrl', ['$scope', 'membersHelper', '$timeout', function ($scope, membersHelper, $timeout) {

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

}]);

membersApp.controller('tenantGroupsCtrl', ['$scope', 'groupsHelper', '$timeout', function ($scope, groupsHelper, $timeout) {

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

	$scope.tenantGroups.assignUsers = function (data) {
		groupsHelper.assignUsers($scope.tenantGroups, groupsConfig, data, {
			'name': 'reloadTenantMembers',
			params: {'name': 'tIdReload', 'params': $scope.tenantGroups.tId}
		});
	};

}]);

membersApp.controller('memberAclCtrl', ['$scope', '$routeParams', 'ngDataApi', '$cookies', 'membersAclHelper', '$route', '$localStorage',
	function ($scope, $routeParams, ngDataApi, $cookies, membersAclHelper, $route, $localStorage) {
		$scope.key = apiConfiguration.key;
		$scope.$parent.isUserLoggedIn();
		$scope.msg = {};
		$scope.user = {};
		$scope.tenantApp = {};
		$scope.allGroups = [];
		$scope.pckName = '';
		$scope.environments_codes = [];

		$scope.userCookie = $localStorage.soajs_user;

		$scope.minimize = function (application, service, oneEnv) {
			application.aclFill[oneEnv][service.name].collapse = true;
		};

		$scope.expand = function (application, service, oneEnv) {
			application.aclFill[oneEnv][service.name].collapse = false;
		};
		//TODO: need more work
		$scope.selectService = function (application, service, oneEnv) {
			if (application.aclFill[oneEnv][service.name]) {
				if (application.aclFill[oneEnv][service.name].include) {
					if (application.aclFill[oneEnv][service.name].forceRestricted) {
						application.aclFill[oneEnv][service.name].apisRestrictPermission = true;
					}
					application.aclFill[oneEnv][service.name].collapse = false;
				}
				else {
					application.aclFill[oneEnv][service.name].collapse = true;
				}
			}
		};

		$scope.getEnvironments = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/list",
				"params": {"short": true}
			}, function (error, response) {
				if (error) {
					overlayLoading.hide();
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					for (let x = response.length -1; x >= 0; x--) {
						if(response && response[x] && response[x].code && response[x].code.toUpperCase() === "DASHBOARD"){
							response.splice(x, 1);
							break;
						}
					}
					$scope.environments_codes = response;
					$scope.getTenantAppInfo();
				}
			});
		};

		$scope.openApi = function (application, serviceName, oneEnv) {
			var status = false;
			for (var oneService in application.aclFill[oneEnv]) {
				if (oneService === serviceName) {
					if (application.aclFill[oneEnv][oneService].include && !application.aclFill[oneEnv][oneService].collapse) {
						status = true;
					}
				}
			}
			return status;
		};

		$scope.checkForGroupDefault = function (aclFill, service, grp, val, myApi) {
			membersAclHelper.checkForGroupDefault(aclFill, service, grp, val, myApi);
		};

		$scope.applyRestriction = function (aclFill, service) {
			membersAclHelper.applyRestriction(aclFill, service);
		};

		$scope.getTenantAppInfo = function () {
			getUserGroupInfo(function () {
				var opts = {
					"method": "send",
					"headers": {
						"key": $scope.key
					},
					"routeName": "/dashboard/tenant/acl/get",
					"params": {"id": $scope.user.tenant.id}
				};

				getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						$scope.tenantApp = response;
						$scope.tenantApp.applications.forEach(function (oneApplication) {
							if ($scope.user.config && $scope.user.config.packages && $scope.user.config.packages[oneApplication.package]) {
								if ($scope.user.config.packages[oneApplication.package].acl) {
									oneApplication.userPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
									//oneApplication.parentPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
								}
							}
							membersAclHelper.renderPermissionsWithServices($scope, oneApplication);
							overlayLoading.hide();
						});
						delete $scope.tenantApp.services;
					}
				});
			});

			function getUserGroupInfo(cb) {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/getUser",
					"params": {"uId": $routeParams.uId}
				}, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
					}
					else {
						$scope.user = response;
						getSendDataFromServer($scope, ngDataApi, {
							"method": "get",
							"routeName": "/urac/admin/group/list",
							"params": {'tId': $scope.user.tenant.id}
						}, function (error, response) {
							if (error) {
								overlayLoading.hide();
								$scope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
							}
							else {
								response.forEach(function (grpObj) {
									$scope.allGroups.push(grpObj.code);
								});
								cb();
							}
						});
					}
				});
			}
		};

		$scope.clearUserAcl = function () {
			var postData = $scope.user;

			if (typeof(postData.config) === 'object') {
				if (typeof(postData.config.packages) === 'object') {
					$scope.tenantApp.applications.forEach(function (oneApplication) {
						if (postData.config.packages[oneApplication.package]) {
							if (postData.config.packages[oneApplication.package].acl) {
								delete postData.config.packages[oneApplication.package].acl;
							}
						}
					});
				}
				else {
					postData.config.packages = {};
				}
			}
			else {
				postData.config = {};
			}

			overlayLoading.show();
			var opts = {
				"method": "send",
				"routeName": "/urac/admin/editUserConfig",
				"params": {"uId": $scope.user['_id']},
				"data": postData
			};
			if ($scope.key) {
				opts.headers = {
					"key": $scope.key
				};
			}
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.msg.type = '';
					$scope.msg.msg = '';
					$scope.$parent.displayAlert('success', translation.userAclDeletedSuccessfully[LANG]);
					$route.reload();
				}
			});
		};

		$scope.saveUserAcl = function () {
			var postData = $scope.user;
			if (typeof(postData.config) === 'object') {
				if (typeof(postData.config.packages) !== 'object') {
					postData.config.packages = {};
				}
			}
			else {
				postData.config = {
					packages: {}
				};
			}

			var counter = 0;
			$scope.tenantApp.applications.forEach(function (oneApplication) {
				var tmpObj = {services: oneApplication.aclFill};
				var result = membersAclHelper.prepareAclObjToSave(tmpObj);
				if (result.valid) {
					var packageName = oneApplication.package;
					if (!postData.config.packages[packageName]) {
						postData.config.packages[packageName] = {};
					}
					if (!postData.config.packages[packageName].acl) {
						postData.config.packages[packageName].acl = {};
					}
					postData.config.packages[packageName].acl = result.data;
					counter++;
				}
				else {
					$scope.$parent.displayAlert('danger', translation.needToChooseGroupAccessTypeSetGroups[LANG]);
				}
			});

			if (counter === $scope.tenantApp.applications.length) {
				overlayLoading.show();
				var opts = {
					"method": "send",
					"routeName": "/urac/admin/editUserConfig",
					"params": {"uId": $scope.user['_id']},
					"data": postData
				};
				if ($scope.key) {
					opts.headers = {
						"key": $scope.key
					};
				}
				getSendDataFromServer($scope, ngDataApi, opts, function (error) {
					overlayLoading.hide();
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
					}
					else {
						$scope.msg.type = '';
						$scope.msg.msg = '';
						$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
					}
				});
			}
		};
		//call default method
		overlayLoading.show(function () {
			$scope.getEnvironments();
		});

	}]);

membersApp.controller('memberConsoleAclCtrl', ['$scope', '$routeParams', 'ngDataApi', '$cookies', 'membersAclHelper', '$route', '$localStorage',
	function ($scope, $routeParams, ngDataApi, $cookies, membersAclHelper, $route, $localStorage) {
		$scope.key = apiConfiguration.key;
		$scope.$parent.isUserLoggedIn();
		$scope.msg = {};
		$scope.user = {};
		$scope.tenantApp = {};
		$scope.allGroups = [];
		$scope.pckName = '';
		$scope.environments_codes = [];
		
		$scope.userCookie = $localStorage.soajs_user;
		
		$scope.minimize = function (application, service, oneEnv) {
			application.aclFill[oneEnv][service.name].collapse = true;
		};
		
		$scope.expand = function (application, service, oneEnv) {
			application.aclFill[oneEnv][service.name].collapse = false;
		};
		//TODO: need more work
		$scope.selectService = function (application, service, oneEnv) {
			if (application.aclFill[oneEnv][service.name]) {
				if (application.aclFill[oneEnv][service.name].include) {
					if (application.aclFill[oneEnv][service.name].forceRestricted) {
						application.aclFill[oneEnv][service.name].apisRestrictPermission = true;
					}
					application.aclFill[oneEnv][service.name].collapse = false;
				}
				else {
					application.aclFill[oneEnv][service.name].collapse = true;
				}
			}
		};
		
		$scope.getEnvironments = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/list",
				"params": {"short": true}
			}, function (error, response) {
				if (error) {
					overlayLoading.hide();
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					for (let x = response.length - 1; x >= 0; x--) {
						if(response && response[x] && response[x].code && response[x].code.toUpperCase() !== "DASHBOARD"){
							response.splice(x, 1);
						}
					}
					$scope.environments_codes = response;
					$scope.getTenantAppInfo();
				}
			});
		};
		
		$scope.openApi = function (application, serviceName, oneEnv) {
			var status = false;
			for (var oneService in application.aclFill[oneEnv]) {
				if (oneService === serviceName) {
					if (application.aclFill[oneEnv][oneService].include && !application.aclFill[oneEnv][oneService].collapse) {
						status = true;
					}
				}
			}
			return status;
		};
		
		$scope.checkForGroupDefault = function (aclFill, service, grp, val, myApi) {
			membersAclHelper.checkForGroupDefault(aclFill, service, grp, val, myApi);
		};
		
		$scope.applyRestriction = function (aclFill, service) {
			membersAclHelper.applyRestriction(aclFill, service);
		};
		
		$scope.getTenantAppInfo = function () {
			getUserGroupInfo(function () {
				var opts = {
					"method": "send",
					"headers": {
						"key": $scope.key
					},
					"routeName": "/dashboard/tenant/acl/get",
					"params": {"id": $scope.user.tenant.id}
				};
				
				getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						$scope.tenantApp = response;
						$scope.tenantApp.applications.forEach(function (oneApplication) {
							if ($scope.user.config && $scope.user.config.packages && $scope.user.config.packages[oneApplication.package]) {
								if ($scope.user.config.packages[oneApplication.package].acl) {
									oneApplication.userPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
									//oneApplication.parentPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
								}
							}
							membersAclHelper.renderPermissionsWithServices($scope, oneApplication);
							overlayLoading.hide();
						});
						delete $scope.tenantApp.services;
					}
				});
			});
			
			function getUserGroupInfo(cb) {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/getUser",
					"params": {"uId": $routeParams.uId}
				}, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
					}
					else {
						$scope.user = response;
						getSendDataFromServer($scope, ngDataApi, {
							"method": "get",
							"routeName": "/urac/admin/group/list",
							"params": {'tId': $scope.user.tenant.id}
						}, function (error, response) {
							if (error) {
								overlayLoading.hide();
								$scope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
							}
							else {
								response.forEach(function (grpObj) {
									$scope.allGroups.push(grpObj.code);
								});
								cb();
							}
						});
					}
				});
			}
		};
		
		$scope.clearUserAcl = function () {
			var postData = $scope.user;
			
			if (typeof(postData.config) === 'object') {
				if (typeof(postData.config.packages) === 'object') {
					$scope.tenantApp.applications.forEach(function (oneApplication) {
						if (postData.config.packages[oneApplication.package]) {
							if (postData.config.packages[oneApplication.package].acl) {
								delete postData.config.packages[oneApplication.package].acl;
							}
						}
					});
				}
				else {
					postData.config.packages = {};
				}
			}
			else {
				postData.config = {};
			}
			
			overlayLoading.show();
			var opts = {
				"method": "send",
				"routeName": "/urac/admin/editUserConfig",
				"params": {"uId": $scope.user['_id']},
				"data": postData
			};
			if ($scope.key) {
				opts.headers = {
					"key": $scope.key
				};
			}
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.msg.type = '';
					$scope.msg.msg = '';
					$scope.$parent.displayAlert('success', translation.userAclDeletedSuccessfully[LANG]);
					$route.reload();
				}
			});
		};
		
		$scope.saveUserAcl = function () {
			var postData = $scope.user;
			if (typeof(postData.config) === 'object') {
				if (typeof(postData.config.packages) !== 'object') {
					postData.config.packages = {};
				}
			}
			else {
				postData.config = {
					packages: {}
				};
			}
			
			var counter = 0;
			$scope.tenantApp.applications.forEach(function (oneApplication) {
				var tmpObj = {services: oneApplication.aclFill};
				var result = membersAclHelper.prepareAclObjToSave(tmpObj);
				if (result.valid) {
					var packageName = oneApplication.package;
					if (!postData.config.packages[packageName]) {
						postData.config.packages[packageName] = {};
					}
					if (!postData.config.packages[packageName].acl) {
						postData.config.packages[packageName].acl = {};
					}
					postData.config.packages[packageName].acl = result.data;
					counter++;
				}
				else {
					$scope.$parent.displayAlert('danger', translation.needToChooseGroupAccessTypeSetGroups[LANG]);
				}
			});
			
			if (counter === $scope.tenantApp.applications.length) {
				overlayLoading.show();
				var opts = {
					"method": "send",
					"routeName": "/urac/admin/editUserConfig",
					"params": {"uId": $scope.user['_id']},
					"data": postData
				};
				if ($scope.key) {
					opts.headers = {
						"key": $scope.key
					};
				}
				getSendDataFromServer($scope, ngDataApi, opts, function (error) {
					overlayLoading.hide();
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
					}
					else {
						$scope.msg.type = '';
						$scope.msg.msg = '';
						$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
					}
				});
			}
		};
		//call default method
		overlayLoading.show(function () {
			$scope.getEnvironments();
		});
		
	}]);