"use strict";
var membersService = soajsApp.components;
membersService.service('membersHelper', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function listMembers(currentScope, moduleConfig, env, ext, callback) {
		var opts = {
			"method": "get",
			"routeName": "/urac/admin/users"
		};
		let proxy= false;
		if (env && ext){
			proxy =true;
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/users',
					"extKey": ext
				},
				"headers": {
					"__env": env
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers){
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			}
			else {
				if (callback && typeof(callback) === 'function') {
					return callback(response);
				}
				else {
					printMembers(currentScope, moduleConfig, response, proxy);
				}
			}
		});
	}
	
	function listSubMembers(currentScope, moduleConfig, env, ext, callback) {
		let proxy= false;
		let tenantId = currentScope.tenant._id;
		var opts = {
			"method": "get",
			"routeName": "/urac/admin/users",
			"params": {"config": true}
		};
		if (env && ext){
			proxy =true;
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/users',
					"config": true,
					"extKey": ext
				},
				"headers": {
					"__env": env
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers){
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			}
			else {
				let users = [];
				if (response && response.length > 0){
					response.forEach ((oneUser)=>{
						if (oneUser.config && oneUser.config.allowedTenants && oneUser.config.allowedTenants.length> 0){
							let index =  oneUser.config.allowedTenants.map(x => {
								return x.tenant ? x.tenant.id : null;
							}).indexOf(tenantId);
							if (index !== -1){
								users.push(oneUser);
							}
						}
					});
				}
				if (callback && typeof(callback) === 'function') {
					return callback(users);
				}
				else {
					printMembers(currentScope, moduleConfig, users, proxy);
				}
			}
		});
	}

	function printMembers(currentScope, moduleConfig, response, proxy) {
		for (var x = 0; x < response.length; x++) {
			if (response[x].groups) {
				response[x].grpsArr = response[x].groups.join(', ');
			}
			else {
				response[x].grpsArr = '';
			}
		}

		var options = {
			grid: moduleConfig.grid,
			data: response,
			defaultSortField: 'username',
			left: [],
			top: []
		};
		if (currentScope.access.adminUser.editUser && currentScope.tenant
			&& currentScope.tenant.type === 'product') {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'pencil2',
				'handler': 'editMember'
			});
		}
		if (currentScope.access.adminUser.editUserGroup && currentScope.tenant
			&& currentScope.tenant.type === 'client') {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'pencil2',
				'handler': 'editSubMember'
			});
		}
		if (proxy && currentScope.access.adminUser.editPinCode && currentScope.tenant.type === 'client') {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'calculator',
				'handler': 'editSubMemberPin'
			});
		}
		if (proxy && currentScope.access.adminUser.editPinCode && currentScope.tenant.type !== 'client') {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'calculator',
				'handler': 'editMemberPin'
			});
		}
		if (currentScope.access.adminUser.editPinCode && currentScope.tenant
			&& currentScope.tenant.type === 'client') {
			options.left.push({
				'label': translation.removePin[LANG],
				'icon': 'cross',
				'handler': 'removePin',
				'msg': translation.areYouSureWantDeletePin[LANG],
			});
		}
	
		if (currentScope.access.adminUser.changeStatusAccess && currentScope.tenant
			&& currentScope.tenant.type === 'product') {
			options.top = [
				{
					'label': translation.activate[LANG],
					'msg': translation.areYouSureWantActivateSelectedMember[LANG],
					'handler': 'activateMembers'
				},
				{
					'label': translation.deactivate[LANG],
					'msg': translation.areYouSureWantDeactivateSelectedMember[LANG],
					'handler': 'deactivateMembers'
				}
			];
		}
		if (currentScope.access.adminUser.unInviteUser 	&& currentScope.tenant.type === 'client') {
			options.top = [{
				'label': translation.uninvite[LANG],
				'msg': translation.areYouSureWantUnInvite[LANG],
				'handler': 'unInviteUser'
			}];
		}
		buildGrid(currentScope, options);
	}
	
	function addMember(currentScope, moduleConfig, useCookie, env, ext) {
		var config = angular.copy(moduleConfig.form);
		overlayLoading.show();
		var opts ={
			"method": "get",
			"routeName": "/urac/admin/groups",
		};
		if (env && ext){
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/groups',
					"extKey": ext
				},
				"headers": {
					"__env": env
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers){
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				var grps = [];
				for (var x = 0; x < response.length; x++) {
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': false});
				}
				if (env && ext){
					config.entries.push({
						'name': 'pinConfiguration',
						'type': 'group',
						'label': translation.pinConfiguration[LANG],
						'entries': [
							{
								'name': 'pin',
								'label': 'PIN',
								'type': 'buttonSlider',
								'value': '',
								'tooltip': 'Enter Pin Code',
								'required': false
							},
							{
								'name': 'allowedLogin',
								'label': 'Check if this user is allowed to start Pin Code login:',
								'type': 'buttonSlider',
								'value': '',
								'tooltip': 'Check if this user is allowed to start Pin Code login:',
								'required': false
							}
						]
					});
				}
				
				let groupEntry = {
					'name': 'groups',
					'label': translation.groups[LANG],
					'type': 'radio',
					'value': grps,
					'tooltip': translation.assignGroups[LANG]
				};
				if (grps.length === 0){
					grps.push({
						l: "N/A",
						v: "N/A"
					})
				}
				config.entries.push(groupEntry);
				var options = {
					timeout: $timeout,
					form: config,
					name: 'addMember',
					label: translation.addNewMember[LANG],
					actions: [
						{
							'type': 'submit',
							'label': translation.addMember[LANG],
							'btn': 'primary',
							'action': function (formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'groups': formData.groups ? [formData.groups] : [],
								};
								if (formData.pin){
									postData.pin = {
										code: formData.pin,
										allowed: !!formData.allowedLogin
									}
								}
								overlayLoading.show();
								var opts = {
									"method": "post",
									"routeName": "/urac/admin/user",
									"data": postData
								};
								if (env && ext){
									opts = {
										"method": "post",
										"routeName": "/soajs/proxy",
										"params": {
											'proxyRoute': '/urac/admin/user',
											"extKey": ext
										},
										"headers": {
											"__env": env
										},
										"data": postData
									};
								}
								if (currentScope.key) {
									if (!opts.headers){
										opts.headers = {};
									}
									opts.headers.key = currentScope.key;
								}
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									overlayLoading.hide();
									if (error) {
										currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', translation.memberAddedSuccessfully[LANG]);
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listMembers();
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal(currentScope, $modal, options);
			}
		});

	}
	
	function inviteUser(currentScope, moduleConfig, useCookie, env, ext, subExt) {
		overlayLoading.show();
		let opts ={
			"method": "get",
			"routeName": "/urac/admin/groups"
		};
		//this should use the subtenanant ext key
		if (env && ext){
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/groups',
					"extKey": subExt
				},
				"headers": {
					"__env": env
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers){
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				let groups = [];
				if (response.length > 0){
					response.forEach((oneGroup) =>{
						if(oneGroup){
							groups.push({
								l : oneGroup.code,
								v : oneGroup.code
							});
						}
					});
				}
				let modal = $modal.open({
					templateUrl: "modules/dashboard/members/directives/inviteUsers.tmpl",
					size: 'lg',
					backdrop: true,
					keyboard: true,
					controller: function ($scope) {
						fixBackDrop();
						$scope.title = 'Invite User';
						$scope.checkUsernameButton = "danger";
						$scope.usernameFound = false;
						$scope.message = {};
						$scope.displayAlert = function (type, message) {
							$scope.message[type] = message;
							$timeout(() => {
								$scope.message = {};
							}, 5000);
						};
						$scope.groups = groups;
						$scope.checkUsername = function (username){
							let opts ={
								"method": "get",
								"routeName": "/urac/user",
								"params": {
									"username": username
								}
							};
							if (env && ext){
								opts = {
									"method": "get",
									"routeName": "/soajs/proxy",
									"params": {
										"username": username,
										'proxyRoute': '/urac/user',
										"extKey": ext
									},
									"headers": {
										"__env": env
									}
								};
							}
							if (currentScope.key) {
								if (!opts.headers){
									opts.headers = {};
								}
								opts.headers.key = currentScope.key;
							}
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
								overlayLoading.hide();
								if (error) {
									$scope.displayAlert('danger', error.message);
								} else if (response) {
									$scope.checkUsernameButton = "success";
									$scope.usernameFound = true;
								}
							});
						};
						$scope.onSubmit= function () {
							let opts ={
								"method": "put",
								"routeName": "/urac/admin/users/invite",
								"data": {
									"users": []
								}
							};
							if (env && ext){
								opts = {
									"method": "put",
									"routeName": "/soajs/proxy",
									"params": {
										'proxyRoute': "/urac/admin/users/invite",
										"extKey": subExt
									},
									"headers": {
										"__env": env
									},
									"data": {
										"users": []
									}
								};
							}
							let userRecord = {
								user : {
								username : $scope.formData.username,
								}
							};
							if ($scope.formData.group){
								userRecord.groups = [$scope.formData.group]
							}
							if ($scope.formData.pinCode){
								userRecord.pin = {
									code: $scope.formData.pinCode,
									allowed : !!$scope.formData.allowLogin
								}
							}
							opts.data.users.push(userRecord);
							if (currentScope.key) {
								if (!opts.headers){
									opts.headers = {};
								}
								opts.headers.key = currentScope.key;
							}
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
								overlayLoading.hide();
								if (error) {
									$scope.displayAlert('danger', error.message);
								} else if (response) {
									currentScope.$parent.displayAlert('success', translation.memberInvitedSuccessfully[LANG]);
									overlayLoading.hide();
									currentScope.listSubMembers();
									modal.close();
								}
							});
						};
						
						$scope.closeModal = function () {
							modal.close();
						};
					}
				});
			}
		});
	}
	
	function unInviteUser(currentScope, moduleConfig, useCookie, env, ext) {
		let usernames = [];
		for (var i = currentScope.grid.rows.length - 1; i >= 0; i--) {
			if (currentScope.grid.rows[i].selected) {
				usernames.push(currentScope.grid.rows[i].username);
			}
		}
		overlayLoading.show();
		let opts ={
			"method": "put",
			"routeName": "/urac/admin/users/uninvite",
			"data": {
				"username": usernames
			}
		};
		if (env && ext){
			opts = {
				"method": "put",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': "/urac/admin/users/uninvite",
					"extKey": ext
				},
				"headers": {
					"__env": env
				},
				"data": {
					"users": [{
						"user" :{
							"username": usernames
						}
					}]
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers){
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.message);
			} else if (response) {
				currentScope.$parent.displayAlert('success', translation.memberUnInvitedSuccessfully[LANG]);
				currentScope.listSubMembers();
			}
		});
	}
	
	function editMember(currentScope, moduleConfig, mainData, useCookie, env, ext) {
		let data = angular.copy(mainData);
		var config = angular.copy(moduleConfig.form);
		var opts = {
			"method": "get",
			"routeName": "/urac/admin/groups",
		};
		if (env && ext){
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/groups',
					"extKey": ext
				},
				"headers": {
					"__env": env
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers){
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				var grps = [];
				var datagroups = [];
				if (data.groups) {
					datagroups = data.groups;
				}
				var sel = false;
				for (var x = 0; x < response.length; x++) {
					sel = datagroups.indexOf(response[x].code) > -1;
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': sel});
				}
				let groupEntry = {
					'name': 'groups',
					'label': translation.groups[LANG],
					'type': 'radio',
					'value': grps,
					'tooltip': translation.assignGroups[LANG]
				};
				if (grps.length === 0){
					grps.push({
						l: "N/A",
						v: "N/A"
					})
				}
				
				config.entries.push(groupEntry);
				config.entries.push({
					'name': 'status',
					'label': translation.status[LANG],
					'type': 'radio',
					'value': [{'v': 'pendingNew'}, {'v': 'active'}, {'v': 'inactive'}],
					'tooltip': translation.selectStatusUser[LANG]
				});
				var options = {
					timeout: $timeout,
					form: config,
					'name': 'editMember',
					'label': translation.editMember[LANG],
					'data': data,
					'actions': [
						{
							'type': 'submit',
							'label': translation.editMember[LANG],
							'btn': 'primary',
							'action': function (formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'id': data['_id'],
									'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
								};
								if (formData.groups){
									postData.groups = [formData.groups];
								}
								var opts = {
									"method": "put",
									"routeName": "/urac/admin/user",
									"data": postData
								};
								if (env && ext){
									opts = {
										"method": "put",
										"routeName": "/soajs/proxy",
										"params": {
											'proxyRoute': '/urac/admin/user',
											"extKey": ext
										},
										"headers": {
											"__env": env
										},
										"data": postData
									};
								}
								if (currentScope.key) {
									if (!opts.headers){
										opts.headers = {};
									}
									opts.headers.key = currentScope.key;
								}
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									if (error) {
										currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', translation.memberUpdatedSuccessfully[LANG]);
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listMembers();
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function editSubMember(currentScope, moduleConfig, data, useCookie, env, subExt) {
		overlayLoading.show();
		let opts ={
			"method": "get",
			"routeName": "/urac/admin/groups",
		};
		if (env && subExt){
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/groups',
					"extKey": subExt
				},
				"headers": {
					"__env": env
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers){
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				let groups = [];
				
				let index;
				if (data.config && data.config.allowedTenants && data.config.allowedTenants.length > 0){
					index = data.config.allowedTenants.map(x => {
						return  x.tenant ? x.tenant.id: null;
					}).indexOf(currentScope.tenant['_id']);
				}
				
				if (response.length > 0){
					response.forEach((oneGroup) =>{
						if(oneGroup){
							let temp = {
								l : oneGroup.code,
								v : oneGroup.code
							};
							
							if (index !== -1 && data.config.allowedTenants[index]
								&&  data.config.allowedTenants[index].groups
								&&  data.config.allowedTenants[index].groups[0]
								&& data.config.allowedTenants[index].groups[0] === oneGroup.code){
								temp.selected = true;
							}
							groups.push(temp);
						}
					});
				}
				let modal = $modal.open({
					templateUrl: "modules/dashboard/members/directives/editInviteUser.tmpl",
					size: 'lg',
					backdrop: true,
					keyboard: true,
					controller: function ($scope) {
						fixBackDrop();
						$scope.title = 'Edit User';
						$scope.message = {};
						$scope.displayAlert = function (type, message) {
							$scope.message[type] = message;
							$timeout(() => {
								$scope.message = {};
							}, 5000);
						};
						$scope.groups = groups;
						$scope.username = data.username;
						$scope.email = data.email;
						$scope.formData = {};
						$scope.onSubmit= function () {
							let opts ={
								"method": "put",
								"routeName": "/urac/admin/user/groups",
								"data": {
									"user": {username : $scope.username}
								}
							};
							if (env && subExt){
								opts = {
									"method": "put",
									"routeName": "/soajs/proxy",
									"params": {
										'proxyRoute': '/urac/admin/user/groups',
										"extKey": subExt
									},
									"headers": {
										"__env": env
									},
									"data": {
										"user": {username : $scope.username}
									}
								};
							}
							
							if (currentScope.key) {
								if (!opts.headers) {
									opts.headers = {};
								}
								opts.headers.key = currentScope.key;
							}
							if ($scope.formData.group){
								opts.data.groups = [$scope.formData.group];
								overlayLoading.show();
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
									if (error) {
										overlayLoading.hide();
										$scope.displayAlert('danger', error.message);
									} else if (response) {
										currentScope.$parent.displayAlert('success', translation.memberInvitedSuccessfully[LANG]);
										overlayLoading.hide();
										currentScope.listSubMembers();
										modal.close();
									}
								});
							}
							else {
								modal.close();
							}
						};
						
						$scope.closeModal = function () {
							modal.close();
						};
					}
				});
			}
		});
	}
	
	function editSubMemberPin(currentScope, moduleConfig, data, useCookie, env, subExt) {
		let index;
		if (data.config && data.config.allowedTenants && data.config.allowedTenants.length > 0){
			index = data.config.allowedTenants.map(x => {
				return x.tenant.id;
			}).indexOf(currentScope.tenant['_id']);
		}
		let modal = $modal.open({
			templateUrl: "modules/dashboard/members/directives/editInviteUserPin.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				$scope.title = 'Edit User Pin';
				$scope.message = {};
				$scope.displayAlert = function (type, message) {
					$scope.message[type] = message;
					$timeout(() => {
						$scope.message = {};
					}, 5000);
				};
				$scope.username = data.username;
				$scope.email = data.email;
				if (data.config && data.config.allowedTenants && data.config.allowedTenants.length > 0){
					if (index !== -1){
						if (data.config.allowedTenants[index].tenant){
							if (data.config.allowedTenants[index].tenant.pin) {
								if (data.config.allowedTenants[index].tenant.pin.hasOwnProperty("allowed")) {
									$scope.allowedLogin = data.config.allowedTenants[index].tenant.pin.allowed;
								}
							}
						}
					}
				}
				$scope.formData = {};
				$scope.onSubmit= function () {
					let opts ={
						"method": "put",
						"routeName": "/urac/admin/user/pin",
						"data": {
							"user": {username : $scope.username}
						}
					};
					if (env && subExt){
						opts = {
							"method": "put",
							"routeName": "/soajs/proxy",
							"params": {
								'proxyRoute': '/urac/admin/user/pin',
								"extKey": subExt
							},
							"headers": {
								"__env": env
							},
							"data": {
								"user": {username : $scope.username}
							}
						};
					}
					
					opts.data.pin = {
						reset: $scope.formData.pinCode,
						allowed: !!$scope.formData.allowLogin
					};
					if (currentScope.key) {
						if (!opts.headers) {
							opts.headers = {};
						}
						opts.headers.key = currentScope.key;
					}
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
						if (error) {
							overlayLoading.hide();
							$scope.displayAlert('danger', error.message);
						} else if (response) {
							currentScope.$parent.displayAlert('success', translation.memberInvitedSuccessfully[LANG]);
							overlayLoading.hide();
							currentScope.listSubMembers();
							modal.close();
						}
					});
				};
				
				$scope.closeModal = function () {
					modal.close();
				};
			}
		});
	}
	
	function editMemberPin(currentScope, moduleConfig, data, useCookie, env, ext) {
		let modal = $modal.open({
			templateUrl: "modules/dashboard/members/directives/editInviteUserPin.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				$scope.title = 'Edit User Pin';
				$scope.message = {};
				$scope.displayAlert = function (type, message) {
					$scope.message[type] = message;
					$timeout(() => {
						$scope.message = {};
					}, 5000);
				};
				$scope.username = data.username;
				$scope.email = data.email;
				if (data.tenant && data.tenant.pin){
					if ( data.tenant.pin.hasOwnProperty("allowed")) {
						$scope.allowedLogin =  data.tenant.pin.allowed;
					}
				}
				$scope.formData = {};
				$scope.onSubmit= function () {
					let opts ={
						"method": "put",
						"routeName": "/urac/admin/user/pin",
						"data": {
							"user": {username : $scope.username}
						}
					};
					if (env && ext){
						opts = {
							"method": "put",
							"routeName": "/soajs/proxy",
							"params": {
								'proxyRoute': '/urac/admin/user/pin',
								"extKey": ext
							},
							"headers": {
								"__env": env
							},
							"data": {
								"user": {username : $scope.username}
							}
						};
					}
					
					opts.data.pin = {
						reset: $scope.formData.pinCode,
						allowed: !!$scope.formData.allowLogin
					};
					if (currentScope.key) {
						if (!opts.headers) {
							opts.headers = {};
						}
						opts.headers.key = currentScope.key;
					}
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
						if (error) {
							overlayLoading.hide();
							$scope.displayAlert('danger', error.message);
						} else if (response) {
							currentScope.$parent.displayAlert('success', translation.memberInvitedSuccessfully[LANG]);
							overlayLoading.hide();
							currentScope.listMembers();
							modal.close();
						}
					});
				};
				
				$scope.closeModal = function () {
					modal.close();
				};
			}
		});
	}
	
	function removePin(currentScope, moduleConfig, data, env, ext) {
		overlayLoading.show();
		var config = {
			"headers": {
			},
			'method': 'delete',
		};
		if (env && ext){
			config = {
				"method": "put",
				"routeName": "/soajs/proxy",
				"params": {
					'username': data.username,
					'proxyRoute': '/urac/admin/user/pin',
					"extKey": ext
				},
				"data": {
					"delete": true
				},
				"headers": {
					"__env": env,
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers){
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, config, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.message);
			} else if (response) {
				currentScope.$parent.displayAlert('success', translation.memberUnInvitedSuccessfully[LANG]);
				currentScope.listSubMembers();
			}
		});
	}
	
	function activateMembers(currentScope, env, ext) {
		overlayLoading.show();
		var config = {
			"headers": {
				"key": currentScope.key
			},
			'method': 'put',
			'routeName': "/urac/admin/user/status",
			"data": {'id': '%id%', 'status': 'active'},
			'msg': {
				'error': translation.errorMessageActivateMembers[LANG],
				'success': translation.successMessageActivateMembers[LANG]
			}
		};
		if (env && ext){
			config = {
				"method": "put",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/user/status',
					"extKey": ext
				},
				"data": {'id': '%id%', 'status': 'active'},
				"headers": {
					"__env": env,
					"key": currentScope.key
				},
				'msg': {
					'error': translation.errorMessageActivateMembers[LANG],
					'success': translation.successMessageActivateMembers[LANG]
				}
			};
		}
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			overlayLoading.hide();
			currentScope.listMembers();
		});
	}
	
	function deactivateMembers(currentScope, env, ext) {
		overlayLoading.show();
		var config = {
			"headers": {
				"key": currentScope.key
			},
			'method': 'put',
			'routeName': "/urac/admin/user/status",
			"data": {'id': '%id%', 'status': 'inactive'},
			'msg': {
				'error': translation.errorMessageDeactivateMembers[LANG],
				'success': translation.successMessageDeactivateMembers[LANG]
			}
		};
		if (env && ext){
			config = {
				"method": "put",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/user/status',
					"extKey": ext
				},
				"data": {'id': '%id%', 'status': 'inactive'},
				"headers": {
					"__env": env,
					"key": currentScope.key
				},
				'msg': {
					'error': translation.errorMessageActivateMembers[LANG],
					'success': translation.successMessageActivateMembers[LANG]
				}
			};
		}
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			overlayLoading.hide();
			currentScope.listMembers();
		});
	}
	
	return {
		'listMembers': listMembers,
		'listSubMembers': listSubMembers,
		'inviteUser': inviteUser,
		'unInviteUser': unInviteUser,
		'printMembers': printMembers,
		'addMember': addMember,
		'editMember': editMember,
		'editSubMember': editSubMember,
		'editSubMemberPin': editSubMemberPin,
		'editMemberPin': editMemberPin,
		'activateMembers': activateMembers,
		'deactivateMembers': deactivateMembers,
		'removePin': removePin
	};
}]);