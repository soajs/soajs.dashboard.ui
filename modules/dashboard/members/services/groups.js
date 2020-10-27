"use strict";
let groupsService = soajsApp.components;
groupsService.service('groupsHelper', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function printGroups(currentScope, groupsConfig, response) {
		let options = {
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
	
	function listProducts(currentScope, env, ext, callback) {
		let opts = {
			"method": "get",
			"routeName": "/multitenant/products/console"
		};
		if (env && ext) {
			opts = {
				"method": "get",
				"routeName": "/multitenant/products"
			};
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (!error) {
				currentScope.products = response;
			}
			return callback(error, response);
		});
	}
	
	function listGroups(currentScope, groupsConfig, env, ext, callback) {
		if (currentScope.access.adminGroup.list) {
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
	
	function addGroup(currentScope, groupsConfig, useCookie, env, ext) {
		//let config = angular.copy(groupsConfig.form);
		overlayLoading.show();
		
		let prodCod = [];
		if (currentScope.tenant && currentScope.tenant.applications) {
			currentScope.tenant.applications.forEach((prod) => {
				prodCod.push(prod.product);
			});
		}
		listProducts(currentScope, env, ext, (error) => {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				let count = 0;
				let postData = {};
				
				let modal = $modal.open({
					templateUrl: "modules/dashboard/members/directives/addGroup.tmpl",
					size: 'lg',
					backdrop: true,
					keyboard: true,
					controller: function ($scope) {
						fixBackDrop();
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
						currentScope.products.forEach((OneProduct) => {
							let packageForm = {
								packages: []
							};
							if (prodCod.indexOf(OneProduct.code) !== -1) {
								if (OneProduct.packages) {
									OneProduct.packages.forEach((onePack) => {
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
						
						$scope.toggleSelection = function (pack, prod) {
							if (!allowedPackages[prod]) {
								allowedPackages[prod] = [];
							}
							let index = allowedPackages[prod].indexOf(pack.value);
							if (index > -1) {
								jQuery('#product_package_' + pack.value).removeClass('onClickPack');
								jQuery('#product_package_group_icon_' + pack.value).addClass('showGroupIcon');
								allowedPackages[prod].splice(index, 1);
								if (allowedPackages[prod].length === 0) {
									delete allowedPackages[prod];
								}
							}
							else {
								jQuery('#product_package_' + pack.value).addClass('onClickPack');
								jQuery('#product_package_group_icon_' + pack.value).removeClass('showGroupIcon');
								allowedPackages[prod].push(pack.value)
							}
						};
						$scope.onSubmit = function () {
							let packages = [];
							for (let prod in allowedPackages) {
								if (allowedPackages.hasOwnProperty(prod)) {
									packages.push({
										product: prod,
										packages: allowedPackages[prod]
									});
								}
							}
							postData = {
								'name': $scope.formData.name,
								'code': $scope.formData.code,
								'description': $scope.formData.description,
								'packages': packages
							};
							let opts = {
								"method": "post",
								"routeName": "/urac/admin/group",
								"data": postData
							};
							if (env && ext) {
								opts = {
									"method": "post",
									"routeName": "/soajs/proxy",
									"params": {
										'proxyRoute': '/urac/admin/group',
										"extKey": ext
									},
									"data": postData,
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
	
	function editGroup(currentScope, groupsConfig, mainData, useCookie, env, ext) {
		let data = angular.copy(mainData);
		let config = angular.copy(groupsConfig.form);
		config.entries[0].type = 'readonly';
		delete data.tenant;
		overlayLoading.show();
		let prod;
		
		let prodCod = [];
		if (currentScope.tenant && currentScope.tenant.applications) {
			currentScope.tenant.applications.forEach((prod) => {
				prodCod.push(prod.product);
			});
		}
		listProducts(currentScope, env, ext, (error) => {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				if (data.config && data.config.allowedPackages && Object.keys(data.config.allowedPackages).length > 0) {
					prod = Object.keys(data.config.allowedPackages);
				}
				let count = 0;
				let postData = {};
				
				let modal = $modal.open({
					templateUrl: "modules/dashboard/members/directives/editGroup.tmpl",
					size: 'lg',
					backdrop: true,
					keyboard: true,
					controller: function ($scope) {
						fixBackDrop();
						$scope.formData = {
							code: data.code,
							name: data.name,
							description: data.description
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
						currentScope.products.forEach((OneProduct) => {
							let packageForm = {
								packages: []
							};
							if (prodCod.indexOf(OneProduct.code) !== -1) {
								if (OneProduct.packages) {
									OneProduct.packages.forEach((onePack) => {
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
						
						$scope.toggleSelection = function (pack, prod) {
							if (!allowedPackages[prod]) {
								allowedPackages[prod] = [];
							}
							let index = allowedPackages[prod].indexOf(pack.value);
							if (index > -1) {
								jQuery('#product_package_' + pack.value).removeClass('onClickPack');
								jQuery('#product_package_group_icon_' + pack.value).addClass('showGroupIcon');
								allowedPackages[prod].splice(index, 1);
								if (allowedPackages[prod].length === 0) {
									delete allowedPackages[prod];
								}
							}
							else {
								jQuery('#product_package_' + pack.value).addClass('onClickPack');
								jQuery('#product_package_group_icon_' + pack.value).removeClass('showGroupIcon');
								allowedPackages[prod].push(pack.value)
							}
						};
						$scope.onSubmit = function () {
							let packages = [];
							for (let prod in allowedPackages) {
								if (allowedPackages.hasOwnProperty(prod)) {
									packages.push({
										product: prod,
										packages: allowedPackages[prod]
									});
								}
							}
							postData = {
								'name': $scope.formData.name,
								'code': $scope.formData.code,
								'description': $scope.formData.description,
								'packages': packages,
								"id": data['_id']
							};
							let opts = {
								"method": "put",
								"routeName": "/urac/admin/group",
								"data": postData
							};
							if (env && ext) {
								opts = {
									"method": "put",
									"routeName": "/soajs/proxy",
									"params": {
										'proxyRoute': '/urac/admin/group',
										"extKey": ext
									},
									"data": postData,
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
		// }
	}
	
	function deleteGroups(currentScope, env, ext) {
		let config = {
			"method": "delete",
			'routeName': "/urac/admin/group",
			"headers": {
				"key": currentScope.key
			},
			"params": {'id': '%id%'},
			'msg': {
				'error': translation.errorMessageDeleteGroup[LANG],
				'success': translation.successMessageDeleteGroup[LANG]
			}
		};
		if (env && ext) {
			config = {
				"method": "delete",
				"routeName": "/soajs/proxy",
				"params": {
					'id': '%id%',
					'proxyRoute': '/urac/admin/group',
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
		let opts = {
			"method": "delete",
			"routeName": "/urac/admin/group",
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
					'proxyRoute': '/urac/admin/group',
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