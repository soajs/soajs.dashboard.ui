"use strict";
var groupsService = soajsApp.components;
groupsService.service('groupsHelper', ['ngDataApi', '$timeout', '$modal', '$localStorage', function (ngDataApi, $timeout, $modal, $localStorage) {
	
	function listConsoleProducts (currentScope, callback) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/console/product/list"
		}, function (error, response) {
			if (!error) {
				currentScope.products = [response];
			}
			return callback (error, response);
		});
	}
	
	function listProducts (currentScope, callback) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/list"
		}, function (error, response) {
			if (!error) {
				currentScope.products = response;
			}
			return callback (error, response);
		});
	}
	
	function listGroups(currentScope, groupsConfig, env, ext, callback) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (callback) ? currentScope.tId : userCookie.tenant.id;
		
		if (currentScope.access.adminGroup.list) {
			var opts = {
				"method": "get",
				"routeName": "/urac/admin/group/list",
				"params": {'tId': tenantId}
			};
			if (env && ext){
				opts = {
					"method": "get",
					"routeName": "/proxy/redirect",
					"params": {
						'tId': tenantId,
						'proxyRoute': '/urac/admin/group/list',
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
						printGroups(currentScope, groupsConfig, response);
					}
				}
			});
		}
	}
	
	function listEnvironments(currentScope, callback) {
		var options = {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": {}
		};
		getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			}
			else {
				if (callback && typeof(callback) === 'function') {
					return callback(response);
				}
				else {
					$localStorage.environments = angular.copy(response);
				}
			}
		});
	}
	
	function printGroups(currentScope, groupsConfig, response) {
		var options = {
			grid: groupsConfig.grid,
			data: response,
			defaultSortField: 'code',
			left: [],
			top: []
		};

		if (currentScope.access.adminGroup.edit) {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'pencil2',
				'handler': 'editGroup'
			});
		}
		if (currentScope.access.adminGroup.delete) {
			options.top.push({
				'label': translation.delete[LANG],
				'msg': translation.areYouSureWantDeleteSelectedGroup[LANG],
				'handler': 'deleteGroups'
			});

			options.left.push({
				'label': translation.delete[LANG],
				'icon': 'cross',
				'msg': translation.areYouSureWantDeleteGroup[LANG],
				'handler': 'delete1Group'
			});
		}
		buildGrid(currentScope, options);
	}

	function addGroup(currentScope, groupsConfig, useCookie, env, ext) {
		var userCookie = currentScope.$parent.userCookie;
		var config = angular.copy(groupsConfig.form);
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;
		var tenantCode = (useCookie) ? userCookie.tenant.code : currentScope.tenant.code;
		overlayLoading.show();
		if (currentScope.tenant.code === groupsConfig.consoleTenant){
			listConsoleProducts (currentScope, (error)=>{
				overlayLoading.hide();
				if (error) {
					currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					let selectablePackages = [];
					currentScope.products.forEach((OneProduct)=>{
						if (OneProduct.packages){
							OneProduct.packages.forEach((onePack)=>{
								let temp = {};
								temp.l = onePack.code;
								temp.v = onePack.code + "$%$" + OneProduct.code;
								selectablePackages.push(temp)
							});
						}
					});
					config.entries[3].value = selectablePackages;
					let envs = [];
					if ($localStorage.environments){
						$localStorage.environments.forEach((env)=>{
							envs.push({l: env.code, v:env.code});
						});
					}
					config.entries.push({
						'name': 'allowedEnvironments',
						'label': translation.environments[LANG],
						'type': 'checkbox',
						'value': envs,
						'required': false,
						'tooltip': 'Specify which environment this group have access to use',
						'labelMsg': 'Specify which environment this group have access to use'
					});
					var options = {
						timeout: $timeout,
						form: config,
						name: 'addGroup',
						label: translation.addNewGroup[LANG],
						actions: [
							{
								'type': 'submit',
								'label': translation.addGroup[LANG],
								'btn': 'primary',
								'action': function (formData) {
									let allowedPackages = {};
									let allowedEnvironments = {};
									Object.keys(formData).forEach((key)=>{
										if(key && key.indexOf("package")!== -1){
											if (formData[key] && formData[key].split("$%$")[1] && formData[key].split("$%$")[0]){
												allowedPackages[formData[key].split("$%$")[1]] = [formData[key].split("$%$")[0]];
											}
										}
										if(key && key.indexOf("allowedEnvironments")!== -1){
											formData[key].forEach((oneKey)=>{
												allowedEnvironments[oneKey] = {};
											});
										}
									});
									var postData = {
										'name': formData.name,
										'code': formData.code,
										'description': formData.description,
										'tId': tenantId,
										'tCode': tenantCode,
										'config' : {
											allowedPackages : allowedPackages,
											allowedEnvironments: allowedEnvironments
										}
									};
									
									var opts = {
										"method": "post",
										"routeName": "/urac/admin/group/add",
										"data": postData
									};
									if (currentScope.key) {
										opts.headers = {
											"key": currentScope.key
										}
									}
									getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
										if (error) {
											currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
										}
										else {
											listEnvironments(currentScope, ()=>{
												currentScope.$parent.displayAlert('success', translation.groupAddedSuccessfully[LANG]);
												currentScope.modalInstance.close();
												currentScope.form.formData = {};
												currentScope.listGroups();
											});
										}
									});
								}
							},
							{
								'type': 'reset',
								'label': 'Cancel',
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
		else {
			let prodCod = [];
			if (currentScope.tenant && currentScope.tenant.applications) {
				currentScope.tenant.applications.forEach((prod)=>{
					prodCod.push(prod.product);
				});
			}
			listProducts (currentScope, (error)=>{
				overlayLoading.hide();
				if (error) {
					currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				} else {
					let count = 0;
					let selectablePackages = [];
					let postData = {};
					let allowedPackages = {};
					
					let modal = $modal.open({
						templateUrl: "modules/dashboard/members/directives/addGroup.tmpl",
						size: 'lg',
						backdrop: true,
						keyboard: true,
						controller: function ($scope) {
							
							$scope.title = translation.addNewGroup[LANG];
							$scope.message = {};
							$scope.displayAlert = function (type, message) {
								$scope.message[type] = message;
								$timeout(() => {
									$scope.message = {};
								}, 5000);
							};
							$scope.products = [];
							let allowedPackages = {};
							currentScope.products.forEach((OneProduct)=>{
								let packageForm = {
									packages: []
								};
								if (prodCod.indexOf(OneProduct.code) !== -1){
									if (OneProduct.packages){
										OneProduct.packages.forEach((onePack)=>{
											let temp = {};
											temp.label = onePack.name;
											temp.value = onePack.code;
											packageForm.packages.push(temp);
										});
									}
									packageForm.label = "Product: " + OneProduct.name;
									packageForm.value = OneProduct.code;
									count++;
								}
								$scope.products.push(packageForm)
							});
							
							$scope.toggleSelection = function (pack, prod){
								if(!allowedPackages[prod]){
									allowedPackages[prod] = [];
								}
								let index = allowedPackages[prod].indexOf(pack.value);
								if (index > -1) {
									jQuery('#product_package_' + pack.value).removeClass('onClickPack');
									allowedPackages[prod].splice(index, 1);
									if (allowedPackages[prod].length  === 0){
										delete allowedPackages[prod];
									}
								}
								else {
									jQuery('#product_package_' + pack.value).addClass('onClickPack');
									allowedPackages[prod].push(pack.value)
								}
							};
							$scope.onSubmit = function () {
								postData = {
									'name': $scope.formData.name,
									'code': $scope.formData.code,
									'description': $scope.formData.description,
									'tId': tenantId,
									'tCode': tenantCode,
									'config' : {
										allowedPackages
									}
								};
								let opts = {
									"method": "post",
									"routeName": "/urac/admin/group/add",
									"data": postData
								};
								if (env && ext){
									opts = {
										"method": "post",
										"routeName": "/proxy/redirect",
										"params": {
											'proxyRoute': '/urac/admin/group/add',
											"extKey": ext
										},
										"data": postData,
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
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									if (error) {
										currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', translation.groupAddedSuccessfully[LANG]);
										currentScope.listGroups();
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
	}

	function editGroup(currentScope, groupsConfig, data, useCookie, env, ext) {
		var config = angular.copy(groupsConfig.form);
		config.entries[0].type = 'readonly';
		delete data.tenant;
		overlayLoading.show();
		let prod, pack;
		
		if (currentScope.tenant.code === groupsConfig.consoleTenant){
			listConsoleProducts (currentScope, (error)=>{
				overlayLoading.hide();
				if (error) {
					currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					if (data.config && data.config.allowedPackages && Object.keys(data.config.allowedPackages).length>0 ){
						prod = Object.keys(data.config.allowedPackages)[0];
						if (data.config.allowedPackages[prod]){
							pack = data.config.allowedPackages[prod][0];
						}
					}
					let selectablePackages = [];
					currentScope.products.forEach((oneProd)=>{
						if (oneProd.packages){
							oneProd.packages.forEach((onePack)=>{
								let temp = {};
								temp.l = onePack.code;
								temp.v = onePack.code + "$%$" + oneProd.code;
								temp.group = "Product " + oneProd.code;
								if (onePack.code === pack && oneProd.code === prod){
									temp.selected = true;
								}
								selectablePackages.push(temp)
							});
						}
					});
					config.entries[3].value = selectablePackages;
					
					let envs = [];
					if ($localStorage.environments){
						$localStorage.environments.forEach((env)=>{
							let temp = {l: env.code, v:env.code};
							if (data.config && data.config.allowedEnvironments &&  data.config.allowedEnvironments[env.code]){
								temp.selected = true;
							}
							envs.push(temp);
						});
						delete data.config.allowedEnvironments;
					}
					
					config.entries.push({
						'name': 'allowedEnvironments',
						'label': translation.environments[LANG],
						'type': 'checkbox',
						'value': envs,
						'required': false,
						'tooltip': 'Specify which environment this group have access to use',
						'labelMsg': 'Specify which environment this group have access to use'
					});
					
					var options = {
						timeout: $timeout,
						form: config,
						'name': 'editGroup',
						'label': translation.editGroup[LANG],
						'data': data,
						'actions': [
							{
								'type': 'submit',
								'label': translation.editGroup[LANG],
								'btn': 'primary',
								'action': function (formData) {
									let allowedPackages = {};
									let allowedEnvironments = {};
									Object.keys(formData).forEach((key)=>{
										if(key && key.indexOf("package")!== -1){
											if (formData[key] && formData[key].split("$%$")[1] && formData[key].split("$%$")[0]){
												allowedPackages[formData[key].split("$%$")[1]] = [formData[key].split("$%$")[0]];
											}
										}
										if(key && key.indexOf("allowedEnvironments")!== -1){
											formData[key].forEach((oneKey)=>{
												allowedEnvironments[oneKey] = {};
											});
										}
									});
									var postData = {
										'name': formData.name,
										'description': formData.description,
										'config': {
											allowedPackages : allowedPackages,
											allowedEnvironments: allowedEnvironments
										}
									};
									var opts = {
										"method": "post",
										"routeName": "/urac/admin/group/edit",
										"params": {"gId": data['_id']},
										"data": postData
									};
									if (env && ext){
										opts = {
											"method": "post",
											"routeName": "/proxy/redirect",
											"params": {
												"gId": data['_id'],
												'proxyRoute': '/urac/admin/group/edit',
												"extKey": ext
											},
											"data": postData,
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
									getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
										if (error) {
											currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
										}
										else {
											listEnvironments(currentScope, ()=>{
												currentScope.$parent.displayAlert('success', translation.groupAddedSuccessfully[LANG]);
												currentScope.modalInstance.close();
												currentScope.form.formData = {};
												currentScope.listGroups();
											});
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
		else {
			let prodCod = [];
			if (currentScope.tenant && currentScope.tenant.applications){
				currentScope.tenant.applications.forEach((prod)=>{
					prodCod.push(prod.product);
				});
			}
			listProducts (currentScope, (error)=>{
				overlayLoading.hide();
				if (error) {
					currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				} else {
					if (data.config && data.config.allowedPackages && Object.keys(data.config.allowedPackages).length>0 ){
						prod = Object.keys(data.config.allowedPackages) ;
					}
					let count = 0;
					let selectablePackages = [];
					let postData = {};
					let allowedPackages = {};
					
					let modal = $modal.open({
						templateUrl: "modules/dashboard/members/directives/editGroup.tmpl",
						size: 'lg',
						backdrop: true,
						keyboard: true,
						controller: function ($scope) {
							$scope.formData = {
								code : data.code,
								name : data.name,
								description : data.description
							};
							$scope.title = "Edit Group";
							$scope.message = {};
							$scope.displayAlert = function (type, message) {
								$scope.message[type] = message;
								$timeout(() => {
									$scope.message = {};
								}, 5000);
							};
							$scope.products = [];
							let allowedPackages = data.config.allowedPackages;
							currentScope.products.forEach((OneProduct)=>{
								let packageForm = {
									packages: []
								};
								if (prodCod.indexOf(OneProduct.code) !== -1){
									if (OneProduct.packages){
										OneProduct.packages.forEach((onePack)=>{
											let temp = {};
											temp.label = onePack.name;
											temp.value = onePack.code;
											if (allowedPackages && allowedPackages[OneProduct.code] && allowedPackages[OneProduct.code].indexOf(onePack.code) > -1) {
												temp.selected = true;
											}
											packageForm.packages.push(temp);
										});
									}
									packageForm.label = "Product: " + OneProduct.name;
									packageForm.value = OneProduct.code;
									count++;
								}
								$scope.products.push(packageForm)
							});
							
							$scope.toggleSelection = function (pack, prod){
								if(!allowedPackages[prod]){
									allowedPackages[prod] = [];
								}
								let index = allowedPackages[prod].indexOf(pack.value);
								if (index > -1) {
									jQuery('#product_package_' + pack.value).removeClass('onClickPack');
									allowedPackages[prod].splice(index, 1);
									if (allowedPackages[prod].length  === 0){
										delete allowedPackages[prod];
									}
								}
								else {
									jQuery('#product_package_' + pack.value).addClass('onClickPack');
									allowedPackages[prod].push(pack.value)
								}
							};
							$scope.onSubmit = function () {
								postData = {
									'name': $scope.formData.name,
									'code': $scope.formData.code,
									'description': $scope.formData.description,
									'config' : {allowedPackages}
								};
								let opts = {
									"method": "post",
									"routeName": "/urac/admin/group/add",
									"data": postData
								};
								if (env && ext){
									opts = {
										"method": "post",
										"routeName": "/proxy/redirect",
										"params": {
											'proxyRoute': '/urac/admin/group/add',
											"extKey": ext
										},
										"data": postData,
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
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									if (error) {
										currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', translation.groupAddedSuccessfully[LANG]);
										currentScope.listGroups();
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
		

	}

	function deleteGroups(currentScope, env, ext) {
		var config = {
			"method": "delete",
			'routeName': "/urac/admin/group/delete",
			"headers": {
				"key": currentScope.key
			},
			"params": {'gId': '%id%'},
			'msg': {
				'error': translation.errorMessageDeleteGroup[LANG],
				'success': translation.successMessageDeleteGroup[LANG]
			}
		};
		if (env && ext){
			config = {
				"method": "delete",
				"routeName": "/proxy/redirect",
				"params": {
					'gId': '%id%',
					'proxyRoute': '/urac/admin/group/delete',
					"extKey": ext
				},
				"headers": {
					"__env": env,
					"key": currentScope.key
				},
				'msg': {
					'error': translation.errorMessageDeleteGroup[LANG],
					'success': translation.successMessageDeleteGroup[LANG]
				}
			};
		}
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			currentScope.listGroups();
		});
	}
	
	function delete1Group(currentScope, data, useCookie, env, ext) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;
		var opts = {
			"method": "delete",
			"routeName": "/urac/admin/group/delete",
			"params": {
				"gId": data._id,
				'tId': tenantId
			}
		};
		if (env && ext){
			opts = {
				"method": "delete",
				"routeName": "/proxy/redirect",
				"params": {
					'gId': data._id,
					'tId': tenantId,
					'proxyRoute': '/urac/admin/group/delete',
					"extKey": ext
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
			opts.headers.key = currentScope.key
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				currentScope.$parent.displayAlert('success', translation.selectedGroupRemoved[LANG]);
				currentScope.listGroups();
			}
		});
	}
	
	return {
		'listGroups': listGroups,
		'printGroups': printGroups,
		'addGroup': addGroup,
		'editGroup': editGroup,
		'deleteGroups': deleteGroups,
		'delete1Group': delete1Group,
	}
}]);