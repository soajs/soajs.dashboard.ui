"use strict";
let membersService = soajsApp.components;
membersService.service('membersHelper', ['ngDataApi', '$timeout', '$modal', '$localStorage', function (ngDataApi, $timeout, $modal, $localStorage) {
	function listMembers(currentScope, moduleConfig, env, ext, callback) {
		let opts = {
			"method": "get",
			"routeName": "/urac/admin/users"
		};
		let proxy = false;
		if (env && ext) {
			proxy = true;
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/users',
					"extKey": ext,
					"scope": "myTenancy",
					"config": true
				},
				"headers": {
					"__env": env
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			} else {
				if (callback && typeof (callback) === 'function') {
					return callback(response);
				} else {
					printMembers(currentScope, moduleConfig, response, proxy);
				}
			}
		});
	}
	
	function listInvitedMembers(currentScope, moduleConfig, env, ext, callback) {
		let opts = {
			"method": "get",
			"routeName": "/urac/admin/users"
		};
		let proxy = false;
		if (env && ext) {
			proxy = true;
			opts = {
				"method": "get",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/users',
					"extKey": ext,
					"scope": "otherTenancy",
					"config": true
				},
				"headers": {
					"__env": env
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			} else {
				if (response && response.length > 0) {
					response.forEach((oneUser) => {
						let index = -1;
						if (oneUser.config && oneUser.config.allowedTenants && oneUser.config.allowedTenants.length > 0) {
							index = oneUser.config.allowedTenants.map(x => {
								return x.tenant ? x.tenant.id : null
							}).indexOf((currentScope.tenant['_id'].toString()));
						}
						oneUser.invited = (index !== -1);
					});
				}
				if (callback && typeof (callback) === 'function') {
					return callback(response);
				} else {
					printMembers(currentScope, moduleConfig, response, proxy, true);
				}
			}
		});
	}
	
	function listSubMembers(currentScope, moduleConfig, env, ext, callback) {
		let proxy = false;
		let opts = {
			"method": "get",
			"routeName": "/urac/admin/users",
			"params": {"config": true}
		};
		if (env && ext) {
			proxy = true;
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
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			} else {
				if (callback && typeof (callback) === 'function') {
					return callback(response);
				} else {
					printMembers(currentScope, moduleConfig, response, proxy);
				}
			}
		});
	}
	
	function printMembers(currentScope, moduleConfig, response, proxy, showInvited) {
		// Check if pinLogin is turned ON, by default is OFF
		let pinLogin = false;
		if ($localStorage.ui_setting) {
			if ($localStorage.ui_setting.pinLogin) {
				pinLogin = $localStorage.ui_setting.pinLogin;
			}
		}
		let grid = angular.copy(moduleConfig.grid);
		if (showInvited) {
			grid.columns.push({'label': "Invited", 'field': 'invited'})
		}
		let options = {
			grid: grid,
			data: response,
			defaultSortField: 'username',
			left: [],
			top: []
		};
		if (currentScope.access.adminUser.editUser && currentScope.tenant
			&& currentScope.tenant.type === 'product' && !showInvited) {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'pencil2',
				'handler': 'editMember'
			});
		}
		if (currentScope.access.adminUser.editUser && currentScope.tenant
			&& currentScope.tenant.type === 'product' && showInvited) {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'pencil2',
				'handler': 'editSubMember'
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
		if (currentScope.access.adminUser.delete && currentScope.tenant
			&& currentScope.tenant.type === 'product' && !showInvited) {
			options.left.push({
				'label': translation.delete[LANG],
				'msg': "Are you sure you want to delete this member?",
				'icon': 'cross',
				'handler': 'deleteMember'
			});
		}
		if (pinLogin && proxy && currentScope.access.adminUser.editPinCode && currentScope.tenant.type === 'client') {
			options.left.push({
				'label': translation.editPin[LANG],
				'icon': 'calculator',
				'handler': 'editSubMemberPin'
			});
		}
		if (pinLogin && proxy && currentScope.access.adminUser.editPinCode && currentScope.tenant.type !== 'client') {
			options.left.push({
				'label': translation.editPin[LANG],
				'icon': 'calculator',
				'handler': 'editMemberPin'
			});
		}
		if (pinLogin && currentScope.access.adminUser.editPinCode && currentScope.tenant) {
			options.left.push({
				'label': translation.removePin[LANG],
				'icon': 'cancel-circle',
				'handler': 'removePin',
				'msg': translation.areYouSureWantDeletePin[LANG],
			});
		}
		
		if (currentScope.access.adminUser.changeStatusAccess && currentScope.tenant
			&& currentScope.tenant.type === 'product' && !showInvited) {
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
		if (currentScope.access.adminUser.unInviteUser && currentScope.tenant
			&& currentScope.tenant.type === 'product' && showInvited) {
			options.top = [
				{
					'label': translation.uninvite[LANG],
					'msg': translation.areYouSureWantUnInvite[LANG],
					'handler': 'unInviteUser'
				}
			];
		}
		if (currentScope.access.adminUser.unInviteUser && currentScope.tenant.type === 'client') {
			options.top = [{
				'label': translation.uninvite[LANG],
				'msg': translation.areYouSureWantUnInvite[LANG],
				'handler': 'unInviteUser'
			}];
		}
		buildGrid(currentScope, options);
	}
	
	function addMember(currentScope, moduleConfig, useCookie, env, ext) {
		// Check if pinLogin is turned ON, by default is OFF
		let pinLogin = false;
		if ($localStorage.ui_setting) {
			if ($localStorage.ui_setting.pinLogin) {
				pinLogin = $localStorage.ui_setting.pinLogin;
			}
		}
		let config = angular.copy(moduleConfig.form);
		overlayLoading.show();
		let opts = {
			"method": "get",
			"routeName": "/urac/admin/groups",
		};
		if (env && ext) {
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
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				let grps = [];
				for (let x = 0; x < response.length; x++) {
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': false});
				}
				if (pinLogin && env && ext) {
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
				
				if (grps.length > 0) {
					let groupEntry = {
						'name': 'groups',
						'label': translation.groups[LANG],
						'type': 'checkbox',
						'value': grps,
						'tooltip': translation.assignGroups[LANG]
					};
					config.entries.push(groupEntry);
				}
				let options = {
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
								let postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email
								};
								if (formData.groups) {
									if (angular.isArray(formData.groups)) {
										postData.groups = formData.groups;
									} else {
										postData.groups = [formData.groups];
									}
								} else {
									postData.groups = [];
								}
								if (formData.profile) {
									postData.profile = formData.profile;
								}
								if (formData.pin) {
									postData.pin = {
										code: formData.pin,
										allowed: !!formData.allowedLogin
									}
								}
								overlayLoading.show();
								let opts = {
									"method": "post",
									"routeName": "/urac/admin/user",
									"data": postData
								};
								if (env && ext) {
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
									if (!opts.headers) {
										opts.headers = {};
									}
									opts.headers.key = currentScope.key;
								}
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									overlayLoading.hide();
									if (error) {
										currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
									} else {
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
	
	function inviteMainUser(currentScope, moduleConfig, useCookie, env, ext) {
		overlayLoading.show();
		let opts = {
			"method": "get",
			"routeName": "/urac/admin/groups"
		};
		//this should use the subtenanant ext key
		if (env && ext) {
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
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				let groups = [];
				if (response.length > 0) {
					response.forEach((oneGroup) => {
						if (oneGroup) {
							groups.push({
								l: oneGroup.code,
								v: oneGroup.code
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
						$scope.formData = {
							"group": []
						};
						$scope.toggleSelection = function toggleSelection(group) {
							let idx = $scope.formData.group.indexOf(group);
							if (idx > -1) {
								$scope.formData.group.splice(idx, 1);
							}
							else {
								$scope.formData.group.push(group);
							}
						};
						$scope.checkUsername = function (username) {
							let opts = {
								"method": "get",
								"routeName": "/urac/user",
								"params": {
									"username": username
								}
							};
							if (env && ext) {
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
								if (!opts.headers) {
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
						$scope.onSubmit = function () {
							let opts = {
								"method": "put",
								"routeName": "/urac/admin/users/invite",
								"data": {
									"users": []
								}
							};
							if (env && ext) {
								opts = {
									"method": "put",
									"routeName": "/soajs/proxy",
									"params": {
										'proxyRoute': "/urac/admin/users/invite",
										"extKey": ext
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
								user: {
									username: $scope.formData.username,
								}
							};
							if ($scope.formData.group) {
								if (angular.isArray($scope.formData.group)) {
									userRecord.groups = $scope.formData.group;
								} else {
									userRecord.groups = [$scope.formData.group]
								}
							}
							if ($scope.formData.pinCode) {
								userRecord.pin = {
									code: $scope.formData.pinCode,
									allowed: !!$scope.formData.allowLogin
								}
							}
							opts.data.users.push(userRecord);
							if (currentScope.key) {
								if (!opts.headers) {
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
									if (response && response.succeeded && response.succeeded.length > 0) {
										currentScope.$parent.displayAlert('success', translation.memberInvitedSuccessfully[LANG]);
										overlayLoading.hide();
										currentScope.listMembers();
										modal.close();
									} else {
										$scope.displayAlert('danger', response.failed[0].reason);
									}
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
	
	function inviteUser(currentScope, moduleConfig, useCookie, env, ext, subExt) {
		overlayLoading.show();
		let opts = {
			"method": "get",
			"routeName": "/urac/admin/groups"
		};
		//this should use the subtenanant ext key
		if (env && subExt) {
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
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				let groups = [];
				if (response.length > 0) {
					response.forEach((oneGroup) => {
						if (oneGroup) {
							groups.push({
								l: oneGroup.code,
								v: oneGroup.code
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
						$scope.formData = {
							"group": []
						};
						$scope.toggleSelection = function toggleSelection(group) {
							let idx = $scope.formData.group.indexOf(group);
							if (idx > -1) {
								$scope.formData.group.splice(idx, 1);
							}
							else {
								$scope.formData.group.push(group);
							}
						};
						$scope.checkUsername = function (username) {
							let opts = {
								"method": "get",
								"routeName": "/urac/user",
								"params": {
									"username": username
								}
							};
							if (env && ext) {
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
								if (!opts.headers) {
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
						$scope.onSubmit = function () {
							let opts = {
								"method": "put",
								"routeName": "/urac/admin/users/invite",
								"data": {
									"users": []
								}
							};
							if (env && subExt) {
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
								user: {
									username: $scope.formData.username,
								}
							};
							if ($scope.formData.group) {
								if (angular.isArray($scope.formData.group)) {
									userRecord.groups = $scope.formData.group;
								} else {
									userRecord.groups = [$scope.formData.group]
								}
							}
							if ($scope.formData.pinCode) {
								userRecord.pin = {
									code: $scope.formData.pinCode,
									allowed: !!$scope.formData.allowLogin
								}
							}
							opts.data.users.push(userRecord);
							if (currentScope.key) {
								if (!opts.headers) {
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
	
	function unInviteUser(currentScope, moduleConfig, useCookie, env, subExt) {
		let users = [];
		for (let i = currentScope.grid.rows.length - 1; i >= 0; i--) {
			if (currentScope.grid.rows[i].selected) {
				users.push({"user": {"username": currentScope.grid.rows[i].username}});
			}
		}
		overlayLoading.show();
		let opts = {
			"method": "put",
			"routeName": "/urac/admin/users/uninvite",
			"data": {
				"users": users
			}
		};
		if (env && subExt) {
			opts = {
				"method": "put",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': "/urac/admin/users/uninvite",
					"extKey": subExt
				},
				"headers": {
					"__env": env
				},
				"data": {
					"users": users
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers) {
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
		let config = angular.copy(moduleConfig.form);
		let opts = {
			"method": "get",
			"routeName": "/urac/admin/groups",
		};
		if (env && ext) {
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
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				let grps = [];
				let datagroups = [];
				if (data.groups) {
					datagroups = data.groups;
				}
				let sel = false;
				for (let x = 0; x < response.length; x++) {
					sel = datagroups.indexOf(response[x].code) > -1;
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': sel});
				}
				
				// if (grps.length === 0) {
				// 	grps.push({
				// 		l: "N/A",
				// 		v: "N/A"
				// 	})
				// }
				if (grps.length > 0) {
					let groupEntry = {
						'name': 'groups',
						'label': translation.groups[LANG],
						'type': 'checkbox',
						'value': grps,
						'tooltip': translation.assignGroups[LANG]
					};
					config.entries.push(groupEntry);
				}
				config.entries.push({
					'name': 'status',
					'label': translation.status[LANG],
					'type': 'radio',
					'value': [{'v': 'pendingNew'}, {'v': 'active'}, {'v': 'inactive'}, {'v': 'pendingJoin'}],
					'tooltip': translation.selectStatusUser[LANG]
				});
				let options = {
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
								let postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'id': data['_id'],
									'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
								};
								if (formData.groups) {
									if (angular.isArray(formData.groups)) {
										postData.groups = formData.groups;
									} else {
										postData.groups = [formData.groups]
									}
								}
								if (formData.profile) {
									postData.profile = formData.profile;
								}
								let opts = {
									"method": "put",
									"routeName": "/urac/admin/user",
									"data": postData
								};
								if (env && ext) {
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
									if (!opts.headers) {
										opts.headers = {};
									}
									opts.headers.key = currentScope.key;
								}
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									if (error) {
										currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
									} else {
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
		let opts = {
			"method": "get",
			"routeName": "/urac/admin/groups",
		};
		if (env && subExt) {
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
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key;
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			} else {
				let groups = [];
				let fomrDataGroup = [];
				let index;
				if (data.config && data.config.allowedTenants && data.config.allowedTenants.length > 0) {
					index = data.config.allowedTenants.map(x => {
						return x.tenant ? x.tenant.id : null;
					}).indexOf(currentScope.tenant['_id']);
				}
				
				if (response.length > 0) {
					response.forEach((oneGroup) => {
						if (oneGroup) {
							let temp = {
								l: oneGroup.code,
								v: oneGroup.code
							};
							if (index !== -1 && data.config.allowedTenants[index]
								&& data.config.allowedTenants[index].groups
								&& data.config.allowedTenants[index].groups.includes(oneGroup.code)) {
								temp.selected = true;
								fomrDataGroup.push(oneGroup.code);
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
						$scope.formData = {
							"group": fomrDataGroup
						};
						$scope.toggleSelection = function toggleSelection(group) {
							let idx = $scope.formData.group.indexOf(group);
							if (idx > -1) {
								$scope.formData.group.splice(idx, 1);
							}
							else {
								$scope.formData.group.push(group);
							}
						};
						$scope.onSubmit = function () {
							let opts = {
								"method": "put",
								"routeName": "/urac/admin/user/groups",
								"data": {
									"user": {username: $scope.username}
								}
							};
							if (env && subExt) {
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
										"user": {username: $scope.username}
									}
								};
							}
							
							if (currentScope.key) {
								if (!opts.headers) {
									opts.headers = {};
								}
								opts.headers.key = currentScope.key;
							}
							if ($scope.formData.group) {
								if (angular.isArray($scope.formData.group)) {
									opts.data.groups = $scope.formData.group;
								} else {
									opts.data.groups = [$scope.formData.group]
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
							} else {
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
		if (data.config && data.config.allowedTenants && data.config.allowedTenants.length > 0) {
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
				if (data.config && data.config.allowedTenants && data.config.allowedTenants.length > 0) {
					if (index !== -1) {
						if (data.config.allowedTenants[index].tenant) {
							if (data.config.allowedTenants[index].tenant.pin) {
								if (data.config.allowedTenants[index].tenant.pin.hasOwnProperty("allowed")) {
									$scope.allowedLogin = data.config.allowedTenants[index].tenant.pin.allowed;
								}
							}
						}
					}
				}
				$scope.formData = {};
				$scope.onSubmit = function () {
					let opts = {
						"method": "put",
						"routeName": "/urac/admin/user/pin",
						"data": {
							"user": {username: $scope.username}
						}
					};
					if (env && subExt) {
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
								"user": {username: $scope.username}
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
				if (data.tenant && data.tenant.pin) {
					if (data.tenant.pin.hasOwnProperty("allowed")) {
						$scope.allowedLogin = data.tenant.pin.allowed;
					}
				}
				$scope.formData = {};
				$scope.onSubmit = function () {
					let opts = {
						"method": "put",
						"routeName": "/urac/admin/user/pin",
						"data": {
							"user": {username: $scope.username}
						}
					};
					if (env && ext) {
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
								"user": {username: $scope.username}
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
		let config = {
			"headers": {},
			'method': 'delete',
		};
		if (env && ext) {
			config = {
				"method": "put",
				"routeName": "/soajs/proxy",
				"params": {
					'proxyRoute': '/urac/admin/user/pin',
					"extKey": ext
				},
				"data": {
					"pin": {
						"delete": true
					},
					"user": {
						"username": data.username
					}
				},
				"headers": {
					"__env": env,
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers) {
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
		let config = {
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
		if (env && ext) {
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
		let config = {
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
		if (env && ext) {
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
	
	function deleteMember(currentScope, data, env, ext) {
		let opts = {
			"method": "delete",
			"routeName": "/urac/admin/user",
			"params": {
				"id": data._id,
			}
		};
		if (env && ext) {
			opts = {
				"method": "delete",
				"routeName": "/soajs/proxy",
				"params": {
					'id': data._id,
					'proxyRoute': '/urac/admin/user',
					"extKey": ext
				},
				"headers": {
					"__env": env,
				}
			};
		}
		if (currentScope.key) {
			if (!opts.headers) {
				opts.headers = {};
			}
			opts.headers.key = currentScope.key
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				currentScope.$parent.displayAlert('success', "Selected user has been removed");
				currentScope.listMembers();
			}
		});
	}
	
	return {
		'listMembers': listMembers,
		'listInvitedMembers': listInvitedMembers,
		'listSubMembers': listSubMembers,
		'inviteUser': inviteUser,
		'inviteMainUser': inviteMainUser,
		'unInviteUser': unInviteUser,
		'printMembers': printMembers,
		'addMember': addMember,
		'editMember': editMember,
		'editSubMember': editSubMember,
		'editSubMemberPin': editSubMemberPin,
		'editMemberPin': editMemberPin,
		'activateMembers': activateMembers,
		'deactivateMembers': deactivateMembers,
		'removePin': removePin,
		'deleteMember': deleteMember
	};
}]);