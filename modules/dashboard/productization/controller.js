"use strict";
var productizationApp = soajsApp.components;
productizationApp.controller('productCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $routeParams, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, productizationConfig.permissions);
	
	$scope.viewPackage = function (pack) {
		pack.showDetails = true;
	};
	$scope.closePackage = function (pack) {
		pack.showDetails = false;
	};
	
	$scope.listProducts = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				for (var i = 0; i < response.length; i++) {
					if (response[i].locked) {
						var lockedProd = response[i];
						response.splice(i, 1);
						response.unshift(lockedProd);
					}
				}
				$scope.grid = {
					rows: response
				};
				
				$scope.grid.actions = {
					'edit': {
						'label': translation.edit[LANG],
						'command': function (row) {
							$scope.editProduct(row);
						}
					},
					'delete': {
						'label': translation.remove[LANG],
						'commandMsg': translation.areYouSureWantRemoveProduct[LANG],
						'command': function (row) {
							$scope.removeProduct(row);
						}
					}
				};
			}
		});
	};
	
	$scope.removeProduct = function (row) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/product/delete",
			"params": {"id": row._id}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.$parent.displayAlert('success', translation.productRemovedSuccessfully[LANG]);
				$scope.listProducts();
			}
		});
	};
	
	$scope.addProduct = function () {
		var options = {
			timeout: $timeout,
			form: productizationConfig.form.product,
			type: 'product',
			name: 'addProduct',
			label: translation.addNewProduct[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.addProduct[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'code': formData.code,
							'name': formData.name,
							'description': formData.description
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/product/add",
							"data": postData
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.$parent.displayAlert('success', translation.productAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listProducts();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}]
		};
		
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.editProduct = function (row) {
		
		var formConfig = {};
		formConfig.form = angular.copy(productizationConfig.form.product);
		formConfig.form.entries[0].type = 'readonly';
		formConfig.name = 'editProduct';
		formConfig.label = translation.editProduct[LANG];
		formConfig.timeout = $timeout;
		
		var keys = Object.keys(row);
		for (var i = 0; i < formConfig.form.entries.length; i++) {
			keys.forEach(function (inputName) {
				if (formConfig.form.entries[i].name === inputName) {
					formConfig.form.entries[i].value = row[inputName];
				}
			});
			if (formConfig.form.entries[i].name === "code") {
				formConfig.form.entries[i].required = true;
			}
		}
		
		formConfig.actions = [
			{
				'type': 'submit',
				'label': translation.editProduct[LANG],
				'btn': 'primary',
				'action': function (formData) {
					var postData = {
						'name': formData.name,
						'description': formData.description
					};
					getSendDataFromServer($scope, ngDataApi, {
						"method": "put",
						"routeName": "/dashboard/product/update",
						"data": postData,
						"params": {"id": row['_id']}
					}, function (error) {
						if (error) {
							$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
						} else {
							$scope.$parent.displayAlert('success', translation.productUpdatedSuccessfully[LANG]);
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listProducts();
						}
					});
				}
			},
			{
				'type': 'reset',
				'label': translation.cancel[LANG],
				'btn': 'danger',
				'action': function () {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}];
		
		buildFormWithModal($scope, $modal, formConfig);
	};
	
	$scope.reloadPackages = function (productId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/packages/list",
			"params": {"id": productId}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				for (var i = 0; i < $scope.grid.rows.length; i++) {
					if ($scope.grid.rows[i]['_id'] === productId) {
						$scope.grid.rows[i].packages = response;
					}
				}
			}
		});
	};
	
	$scope.addPackage = function (productId) {
		var formConf = angular.copy(productizationConfig.form.package);
		formConf.entries.forEach(function (oneEn) {
			if (oneEn.type === 'select') {
				oneEn.value[0].selected = true;
			}
		});
		
		var options = {
			timeout: $timeout,
			form: formConf,
			name: 'addPackage',
			label: translation.addNewPackage[LANG],
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': translation.addPackage[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'code': formData.code,
							'name': formData.name,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL.toString()
						};
						
						postData.acl = {};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/product/packages/add",
							"data": postData,
							"params": {"id": productId}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.$parent.displayAlert('success', translation.productAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.$parent.$emit('reloadProducts', {});
								$scope.reloadPackages(productId);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.editPackAcl = function (productId, code) {
		$scope.$parent.go("/productization/" + productId + "/editPackageAcl/" + code);
	};
	$scope.editProdAcl = function (productId) {
		$scope.$parent.go("/productization/" + productId + "/editProdAcl");
	};
	
	$scope.editPackage = function (productId, data) {
		var formConfig = angular.copy(productizationConfig.form.package);
		var recordData = angular.copy(data);
		delete recordData.acl;
		recordData._TTL = recordData._TTL / 3600000;
		
		formConfig.entries[0].type = 'readonly';
		for (var i = 0; i < formConfig.entries.length; i++) {
			if (formConfig.entries[i].name === "code") {
				formConfig.entries[i].required = true;
			}
		}
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editPackage',
			label: translation.editPackage[LANG],
			data: recordData,
			actions: [
				{
					'type': 'submit',
					'label': translation.editPackage[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'name': formData.name,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL.toString()
						};
						postData.acl = data.acl;
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/product/packages/update",
							"data": postData,
							"params": {"id": productId, "code": data.code.split("_")[1]}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.$parent.displayAlert('success', translation.productUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadPackages(productId);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.removeProductPackage = function (productId, packageCode) {
		packageCode = packageCode.split("_")[1];
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/product/packages/delete",
			"params": {"id": productId, "code": packageCode}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.$parent.displayAlert('success', translation.selectedPackageRemoved[LANG]);
				$scope.reloadPackages(productId);
			}
		});
	};
	
	//default operation
	if ($scope.access.listProduct) {
		$scope.listProducts();
	}
	
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
}]);

productizationApp.controller('consoleCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $routeParams, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, productizationConfig.permissions);
	
	$scope.viewPackage = function (pack) {
		pack.showDetails = true;
	};
	$scope.closePackage = function (pack) {
		pack.showDetails = false;
	};
	
	$scope.listConsoleProducts = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/console/product/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.grid = {
					row: response
				};
				
				$scope.grid.actions = {
					'edit': {
						'label': translation.edit[LANG],
						'command': function (row) {
							$scope.editProduct(row);
						}
					},
					'delete': {
						'label': translation.remove[LANG],
						'commandMsg': translation.areYouSureWantRemoveProduct[LANG],
						'command': function (row) {
							$scope.removeProduct(row);
						}
					}
				};
			}
		});
	};
	
	$scope.removeProduct = function (row) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/product/delete",
			"params": {"id": row._id}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.$parent.displayAlert('success', translation.productRemovedSuccessfully[LANG]);
				$scope.listConsoleProducts();
			}
		});
	};
	
	$scope.addProduct = function () {
		var options = {
			timeout: $timeout,
			form: productizationConfig.form.product,
			type: 'product',
			name: 'addProduct',
			label: translation.addNewProduct[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.addProduct[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'code': formData.code,
							'name': formData.name,
							'description': formData.description
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/product/add",
							"data": postData
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.$parent.displayAlert('success', translation.productAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listConsoleProducts();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}]
		};
		
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.editProduct = function (row) {
		var formConfig = {};
		formConfig.form = angular.copy(productizationConfig.form.product);
		if (row.locked) {
			formConfig.form.entries.forEach((oneEntry) => {
				oneEntry.type = 'readonly';
			});
		} else {
			formConfig.form.entries[0].type = 'readonly';
		}
		
		formConfig.name = 'editProduct';
		formConfig.label = translation.editProduct[LANG];
		formConfig.timeout = $timeout;
		
		var keys = Object.keys(row);
		for (var i = 0; i < formConfig.form.entries.length; i++) {
			keys.forEach(function (inputName) {
				if (formConfig.form.entries[i].name === inputName) {
					formConfig.form.entries[i].value = row[inputName];
				}
			});
		}
		formConfig.actions = [];
		if (!row.locked) {
			formConfig.actions.push({
				'type': 'submit',
				'label': translation.editProduct[LANG],
				'btn': 'primary',
				'action': function (formData) {
					var postData = {
						'name': formData.name,
						'description': formData.description
					};
					getSendDataFromServer($scope, ngDataApi, {
						"method": "put",
						"routeName": "/dashboard/product/update",
						"data": postData,
						"params": {"id": row['_id']}
					}, function (error) {
						if (error) {
							$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
						} else {
							$scope.$parent.displayAlert('success', translation.productUpdatedSuccessfully[LANG]);
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listConsoleProducts();
						}
					});
				}
			});
		}
		formConfig.actions.push({
			'type': 'reset',
			'label': translation.cancel[LANG],
			'btn': 'danger',
			'action': function () {
				$scope.modalInstance.dismiss('cancel');
				$scope.form.formData = {};
			}
		});
		buildFormWithModal($scope, $modal, formConfig);
	};
	
	$scope.reloadPackages = function (productId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/console/product/list",
			"params": {"id": productId}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				if ($scope.grid.row['_id'] === productId) {
					$scope.grid.row = response;
				}
			}
		});
	};
	
	$scope.addPackage = function (productId) {
		var formConf = angular.copy(productizationConfig.form.package);
		formConf.entries.forEach(function (oneEn) {
			if (oneEn.type === 'select') {
				oneEn.value[0].selected = true;
			}
		});
		
		var options = {
			timeout: $timeout,
			form: formConf,
			name: 'addPackage',
			label: translation.addNewPackage[LANG],
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': translation.addPackage[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'code': formData.code,
							'name': formData.name,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL.toString()
						};
						
						postData.acl = {};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/product/packages/add",
							"data": postData,
							"params": {"id": productId}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.$parent.displayAlert('success', translation.productAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.$parent.$emit('reloadProducts', {});
								$scope.reloadPackages(productId);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.editProdAcl = function (productId) {
		$scope.$parent.go("/consolePackages/" + productId + "/editConsoleProdAcl");
	};
	
	$scope.editPackAcl = function (productId, code) {
		$scope.$parent.go("/consolePackages/" + productId + "/editConsolePackageAcl/" + code);
	};
	
	$scope.editPackage = function (productId, data) {
		var formConfig = angular.copy(productizationConfig.form.package);
		var recordData = angular.copy(data);
		delete recordData.acl;
		recordData._TTL = recordData._TTL / 3600000;
		if (data.locked) {
			formConfig.entries.forEach((oneEntry) => {
				if (oneEntry.type === 'select') {
					oneEntry.value = '';
				}
				oneEntry.type = 'readonly';
			});
		} else {
			formConfig.entries[0].type = 'readonly';
		}
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editPackage',
			label: translation.editPackage[LANG],
			data: recordData,
			actions: []
		};
		if (!data.locked) {
			options.actions.push({
				'type': 'submit',
				'label': translation.editPackage[LANG],
				'btn': 'primary',
				'action': function (formData) {
					var postData = {
						'name': formData.name,
						'description': formData.description,
						'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL.toString()
					};
					postData.acl = data.acl;
					getSendDataFromServer($scope, ngDataApi, {
						"method": "put",
						"routeName": "/dashboard/product/packages/update",
						"data": postData,
						"params": {"id": productId, "code": data.code.split("_")[1]}
					}, function (error) {
						if (error) {
							$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
						} else {
							$scope.$parent.displayAlert('success', translation.productUpdatedSuccessfully[LANG]);
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.reloadPackages(productId);
						}
					});
				}
			})
		}
		options.actions.push({
			'type': 'reset',
			'label': translation.cancel[LANG],
			'btn': 'danger',
			'action': function () {
				$scope.modalInstance.dismiss('cancel');
				$scope.form.formData = {};
			}
		});
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.removeProductPackage = function (productId, packageCode) {
		packageCode = packageCode.split("_")[1];
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/product/packages/delete",
			"params": {"id": productId, "code": packageCode}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.$parent.displayAlert('success', translation.selectedPackageRemoved[LANG]);
				$scope.reloadPackages(productId);
			}
		});
	};
	
	//default operation
	if ($scope.access.listProduct) {
		$scope.listConsoleProducts();
	}
	
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
}]);

productizationApp.controller('aclCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', 'injectFiles', '$localStorage', function ($scope, $routeParams, ngDataApi, aclHelpers, injectFiles, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.environments_codes = [];
	$scope.serviceGroup = [];
	$scope.allServiceApis = {};
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	
	$scope.normalizeMethod = function (method) {
		if (!method) {
			return null
		}
		let newMethod;
		switch (method.toLowerCase()) {
			case 'get':
				newMethod = 'Read';
				break;
			case 'post':
				newMethod = 'Add';
				break;
			case 'put':
				newMethod = 'Update';
				break;
			case 'delete':
				newMethod = 'Delete';
				break;
			case 'patch':
				newMethod = 'Patch';
				break;
			case 'head':
				newMethod = 'Head';
				break;
			default:
				newMethod = 'Other';
		}
		return newMethod
	};
	$scope.minimize = function (envCode, service) {
		if (!$scope.aclFill[envCode][service.name]) {
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = false;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.expand = function (envCode, service) {
		if (!$scope.aclFill[envCode]) {
			$scope.aclFill[envCode] = {};
		}
		if (!$scope.aclFill[envCode][service.name]) {
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = true;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.itemsPerPage = 20;
	$scope.maxSize = 5;
	
	//default operation
	$scope.getAllServicesList = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/product/acl/ui",
			"params": {
				"id": $routeParams.pid
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.environments_codes = angular.copy($localStorage.environments);
				for (let x = $scope.environments_codes.length - 1; x >= 0; x--) {
					if ($scope.environments_codes && $scope.environments_codes[x] && $scope.environments_codes[x].code && $scope.environments_codes[x].code.toUpperCase() === "DASHBOARD") {
						$scope.environments_codes.splice(x, 1);
						break;
					}
				}
				$scope.paginations = response.paginations;
				$scope.serviceGroup = response.serviceGroup;
				$scope.allServiceApis = response.allServiceApis;
				$scope.aclFill = response.aclFill || {};
				$scope.product = response.product;
			}
		});
	};
	
	$scope.showHideServiceApi = function (envCode, group, serviceName, v) {
		$scope.allServiceApis[group].forEach((service) => {
			if (service.name === serviceName) {
				service.fixList.forEach((version) => {
					if (version["%v%"] === v) {
						version["%showApi%"] = true;
					}
				});
			}
		});
	};
	
	$scope.saveACL = function (env) {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		var result = aclHelpers.constructAclFromPost($scope.aclFill, null, env);
		postData.acl = result.data[env.toLowerCase()];
		if (!result.valid) {
			$scope.$parent.displayAlert('danger', translation.youNeedToChangeOneGroupAccessTypeGroups[LANG]);
			return;
		}
		overlayLoading.show();
		let options = {
			"method": "put",
			"routeName": "/dashboard/product/scope/env",
			"data": postData,
			"params": {
				"id": productId,
				"env": env.toLowerCase()
			}
		};
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG] + " for " + env);
			}
		});
	};
	
	$scope.checkForGroupDefault = function (envCode, service, grp, val, myApi) {
		aclHelpers.checkForGroupDefault($scope, envCode, service, grp, val, myApi);
	};
	
	$scope.applyRestriction = function (aclFill) {
		aclHelpers.applyPermissionRestriction(aclFill);
	};
	
	$scope.includeVersion = function (envCode, service, version, include) {
		if (include && $scope.aclFill && $scope.aclFill[envCode] && $scope.aclFill[envCode][service.name][version]) {
			$scope.aclFill[envCode][service.name][version].accessType = "public";
		}
	};
	$scope.purgeACL = function () {
		var productId = $routeParams.pid;
		let options = {
			"method": "get",
			"routeName": "/dashboard/product/purge",
			"params": {
				"id": productId
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				overlayLoading.hide();
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
				$scope.getAllServicesList();
			}
		});
	};
	$scope.preview = function (env, product) {
		$scope.$parent.go("/product/" + product.code + "/env/" + env.toLowerCase());
	};
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
	// default operation
	overlayLoading.show(function () {
		$scope.getAllServicesList();
	});
}]);

productizationApp.controller('aclConsoleCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', 'injectFiles', '$localStorage', function ($scope, $routeParams, ngDataApi, aclHelpers, injectFiles, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	$scope.environments_codes = [];
	$scope.serviceGroup = [];
	$scope.allServiceApis = {};
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	
	$scope.normalizeMethod = function (method) {
		let newMethod;
		switch (method.toLowerCase()) {
			case 'get':
				newMethod = 'Read';
				break;
			case 'post':
				newMethod = 'Add';
				break;
			case 'put':
				newMethod = 'Update';
				break;
			case 'delete':
				newMethod = 'Delete';
				break;
			case 'patch':
				newMethod = 'Patch';
				break;
			case 'head':
				newMethod = 'Head';
				break;
				break;
			default:
				newMethod = 'Other';
		}
		return newMethod
	};
	
	$scope.minimize = function (envCode, service) {
		if (!$scope.aclFill[envCode][service.name]) {
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = false;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.expand = function (envCode, service) {
		if (!$scope.aclFill[envCode]) {
			$scope.aclFill[envCode] = {};
		}
		if (!$scope.aclFill[envCode][service.name]) {
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = true;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.itemsPerPage = 20;
	$scope.maxSize = 5;
	//default operation
	
	$scope.getAllServicesList = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/product/acl/ui",
			"params": {
				"id": $routeParams.pid,
				"soajs": true
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.environments_codes = angular.copy($localStorage.environments);
				$scope.paginations = response.paginations;
				$scope.serviceGroup = response.serviceGroup;
				$scope.allServiceApis = response.allServiceApis;
				$scope.aclFill = response.aclFill;
				$scope.product = response.product;
			}
		});
	};
	
	
	$scope.showHideServiceApi = function (envCode, group, serviceName, v) {
		$scope.allServiceApis[group].forEach((service) => {
			if (service.name === serviceName) {
				service.fixList.forEach((version) => {
					if (version["%v%"] === v) {
						version["%showApi%"] = true;
					}
				});
			}
		});
	};
	
	$scope.saveACL = function (env) {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		var result = aclHelpers.constructAclFromPost($scope.aclFill, null, env);
		postData.acl = result.data[env.toLowerCase()];
		if (!result.valid) {
			$scope.$parent.displayAlert('danger', translation.youNeedToChangeOneGroupAccessTypeGroups[LANG]);
			return;
		}
		overlayLoading.show();
		let options = {
			"method": "put",
			"routeName": "/dashboard/product/scope/env",
			"data": postData,
			"params": {
				"id": productId,
				"env": env.toLowerCase()
			}
		};
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG] + " for " + env);
			}
		});
	};
	$scope.checkForGroupDefault = function (envCode, service, grp, val, myApi, v) {
		aclHelpers.checkForGroupDefault($scope, envCode, service, grp, val, myApi, v);
	};
	
	$scope.applyRestriction = function (aclFill) {
		aclHelpers.applyPermissionRestriction(aclFill);
	};
	
	$scope.includeVersion = function (envCode, service, version, include) {
		if (include && $scope.aclFill && $scope.aclFill[envCode] && $scope.aclFill[envCode][service.name][version]) {
			$scope.aclFill[envCode][service.name][version].accessType = "public";
		}
	};
	$scope.purgeACL = function () {
		var productId = $routeParams.pid;
		let options = {
			"method": "get",
			"routeName": "/dashboard/product/purge",
			"params": {
				"id": productId
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				overlayLoading.hide();
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
				$scope.getAllServicesList();
			}
		});
	};
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
	// default operation
	overlayLoading.show(function () {
		$scope.getAllServicesList();
		$scope.consoleAclConfig = consoleAclConfig;
	});
}]);

productizationApp.controller('aclPackageCtrl', ['$scope', '$routeParams', '$modal', 'ngDataApi', 'aclHelpers', 'injectFiles', '$localStorage', function ($scope, $routeParams, $modal, ngDataApi, aclHelpers, injectFiles, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.environments_codes = [];
	$scope.allServiceApis = [];
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	$scope.itemsPerPage = 20;
	$scope.maxSize = 5;
	$scope.serviceGroup = [];
	$scope.packageAclMode = [
		{
			l: "API Group based on product scope",
			v: "apiGroup"
		},
		{
			l: "Granular API",
			v: "granular"
		}
	];
	
	$scope.applyMode = function (aclMode, env) {
		overlayLoading.show();
		if (aclMode === 'granular') {
			$scope.aclMode[env.toLowerCase()] = $scope.packageAclMode[1];
			$scope.getPackageAcl(env.toLowerCase(), () => {
				overlayLoading.hide();
			});
		} else {
			$scope.aclMode[env.toLowerCase()] = $scope.packageAclMode[0];
			$scope.getPackageAcl(env.toLowerCase(), () => {
				overlayLoading.hide();
			});
		}
	};
	$scope.normalizeMethod = function (method) {
		let newMethod;
		if (!method) {
			return null;
		}
		switch (method.toLowerCase()) {
			case 'get':
				newMethod = 'Read';
				break;
			case 'post':
				newMethod = 'Add';
				break;
			case 'put':
				newMethod = 'Update';
				break;
			case 'delete':
				newMethod = 'Delete';
				break;
			case 'patch':
				newMethod = 'Patch';
				break;
			case 'head':
				newMethod = 'Head';
				break;
			default:
				newMethod = 'Other';
		}
		return newMethod;
	};
	
	$scope.viewGroupDetails = function (env, service, grp, version) {
		let data = {
			grp: grp
		};
		for (let i = 0; i < $scope.allServiceApis.length; i++) {
			if ($scope.allServiceApis[i].name === service) {
				data.name = service;
				data.methods = {};
				let versionObject;
				if ($scope.allServiceApis[i].versions) {
					for (let j = 0; j < $scope.allServiceApis[i].versions.length; j++) {
						if ($scope.allServiceApis[i].versions[j].version === version) {
							versionObject = $scope.allServiceApis[i].versions[j];
						}
					}
					if (versionObject && versionObject.apis) {
						for (let j = 0; j < versionObject.apis.length; j++) {
							if (versionObject.apis[j].group === grp) {
								let m = versionObject.apis[j].m;
								let api = angular.copy(versionObject.apis[j]);
								if ($scope.scopeFill && $scope.scopeFill[env.toLowerCase()]
									&& $scope.scopeFill[env.toLowerCase()][service]
									&& $scope.scopeFill[env.toLowerCase()][service][version]) {
									data.access = $scope.scopeFill[env.toLowerCase()][service][version].access;
									data.apisPermission = $scope.scopeFill[env.toLowerCase()][service][version].apisPermission;
									if ($scope.scopeFill[env.toLowerCase()][service][version][versionObject.apis[j].m]) {
										let acl = $scope.scopeFill[env.toLowerCase()][service][version][versionObject.apis[j].m];
										for (let a = 0; a < acl.length; a++) {
											if (acl[a].apis && acl[a].apis[api.v]) {
												api.appeneded = true;
												api.showAppended = acl[a].apis && acl[a].apis[api.v].hasOwnProperty('access');
												api.access = !!acl[a].apis[api.v].access;
											}
										}
									}
								}
								if (api.appeneded || data.apisPermission !== "restricted") {
									if (!data.methods[m]) {
										data.methods[m] = [];
									}
									data.methods[m].push(api);
								}
							}
						}
					}
				}
				break;
			}
		}
		$modal.open({
			templateUrl: 'aclDescription.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				$scope.data = data;
				$scope.normalizeMethod = function (method) {
					let newMethod;
					if (!method) {
						return null;
					}
					switch (method.toLowerCase()) {
						case 'get':
							newMethod = 'Read';
							break;
						case 'post':
							newMethod = 'Add';
							break;
						case 'put':
							newMethod = 'Update';
							break;
						case 'delete':
							newMethod = 'Delete';
							break;
						case 'patch':
							newMethod = 'Patch';
							break;
						case 'head':
							newMethod = 'Head';
							break;
						default:
							newMethod = 'Other';
					}
					return newMethod;
				};
				fixBackDrop();
				$scope.ok = function () {
					$modalInstance.dismiss('ok');
				};
			}
		});
	};
	
	$scope.minimize = function (envCode, service) {
		if ($scope.aclMode[envCode.toLowerCase()].v === "granular") {
			if (!$scope.aclFill[envCode][service.name]) {
				$scope.aclFill[envCode][service.name] = {};
			}
			$scope.aclFill[envCode][service.name].collapse = false;
			$scope.aclFill[envCode][service.name].include = true;
		} else {
			if (!$scope.aclFill[envCode]) {
				$scope.aclFill[envCode] = {};
			}
			if (!$scope.aclFill[envCode][service]) {
				$scope.aclFill[envCode][service] = {};
			}
			$scope.aclFill[envCode][service].collapse = false;
			$scope.aclFill[envCode][service].include = true;
		}
	};
	
	$scope.expand = function (envCode, service) {
		if ($scope.aclMode[envCode.toLowerCase()].v === "granular") {
			if (!$scope.aclFill[envCode]) {
				$scope.aclFill[envCode] = {};
			}
			if (!$scope.aclFill[envCode][service.name]) {
				$scope.aclFill[envCode][service.name] = {};
			}
			$scope.aclFill[envCode][service.name].collapse = true;
			$scope.aclFill[envCode][service.name].include = true;
		} else {
			if (!$scope.aclFill[envCode]) {
				$scope.aclFill[envCode] = {};
			}
			if (!$scope.aclFill[envCode][service]) {
				$scope.aclFill[envCode][service] = {};
			}
			$scope.aclFill[envCode][service].collapse = true;
			$scope.aclFill[envCode][service].include = true;
		}
	};
	
	$scope.checkApiPermission = function (version) {
		if (version && version.apisPermission === 'restricted') {
			return false;
		} else {
			return true;
		}
	};
	
	$scope.checkGroupEmpty = function (version) {
		let empty = true;
		if (version && version.apisPermission) {
			if (Object.keys(version).length > 1) {
				empty = false;
			}
		} else {
			if (Object.keys(version).length > 0) {
				empty = false;
			}
		}
		return empty;
	};
	$scope.setActive = function (env) {
		for (let x = $scope.environments_codes.length - 1; x >= 0; x--) {
			if ($scope.environments_codes && $scope.environments_codes[x] && $scope.environments_codes[x].code && $scope.environments_codes[x].code.toUpperCase() === env.toUpperCase()) {
				$scope.environments_codes[x].active = true;
			} else {
				$scope.environments_codes[x].active = false;
			}
		}
	};
	$scope.getPackageAcl = function (customEnv) {
		$scope.environments_codes = angular.copy($localStorage.environments);
		let envs = [];
		for (let x = $scope.environments_codes.length - 1; x >= 0; x--) {
			$scope.environments_codes[x].active = customEnv && $scope.environments_codes[x].code.toUpperCase() === customEnv.toUpperCase();
			if ($scope.environments_codes && $scope.environments_codes[x] && $scope.environments_codes[x].code && $scope.environments_codes[x].code.toUpperCase() === "DASHBOARD") {
				$scope.environments_codes.splice(x, 1);
			} else {
				envs.push($scope.environments_codes[x].code);
			}
		}
		let options = {
			"method": "get",
			"routeName": "/multitenant/product/package/acl/ui",
			"params": {
				"id": $routeParams.pid,
				"package": $routeParams.code,
				"config": {
					envs: envs
				}
			}
		};
		if (customEnv) {
			options.params.config.envs = [customEnv];
			if ($scope.aclMode[customEnv.toLowerCase()].v === "granular") {
				options.params.config.type = "granular";
			} else {
				options.params.config.type = "apiGroup";
			}
		} else {
			$scope.environments_codes[0].active = true;
		}
		
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.product = response.product;
				$scope.currentPackage = response.package;
				if (customEnv) {
					if (response.aclFill) {
						$scope.aclFill[customEnv.toUpperCase()] = response.aclFill[customEnv.toUpperCase()];
					}
					if (response.scopeFill) {
						$scope.scopeFill[customEnv.toUpperCase()] = response.scopeFill[customEnv.toUpperCase()];
					}
					if (response.fixList) {
						$scope.fixList[customEnv.toUpperCase()] = response.fixList[customEnv.toUpperCase()];
					}
					$scope.paginations = response.paginations;
					$scope.serviceGroup = response.serviceGroup;
					$scope.allServiceApis = response.allServiceApis;
					$scope.allServiceApisGranular = response.allServiceApisGranular;
				} else {
					$scope.aclFill = response.aclFill;
					$scope.scopeFill = response.scopeFill;
					$scope.paginations = response.paginations;
					$scope.serviceGroup = response.serviceGroup;
					$scope.allServiceApis = response.allServiceApis;
					$scope.allServiceApisGranular = response.allServiceApisGranular;
					$scope.aclTypeByEnv = response.aclTypeByEnv;
					$scope.fixList = response.fixList;
					$scope.aclMode = {};
					envs.forEach((oneEnv) => {
						if ($scope.aclFill[oneEnv.toLowerCase()]) {
							if ($scope.aclTypeByEnv && $scope.aclTypeByEnv[oneEnv.toLowerCase()] === "granular") {
								$scope.aclMode[oneEnv.toLowerCase()] = $scope.packageAclMode[1];
							} else {
								$scope.aclMode[oneEnv.toLowerCase()] = $scope.packageAclMode[0];
							}
						} else {
							if ($scope.aclTypeByEnv && $scope.aclTypeByEnv[oneEnv.toLowerCase()] === "granular") {
								$scope.aclMode[oneEnv.toLowerCase()] = $scope.packageAclMode[1];
							} else {
								$scope.aclMode[oneEnv.toLowerCase()] = $scope.packageAclMode[0];
							}
						}
					});
				}
			}
		});
	};
	
	$scope.saveACL = function (env) {
		var productId = $routeParams.pid;
		var result;
		
		if ($scope.aclMode[env.toLowerCase()].v === "granular") {
			result = aclHelpers.constructAclFromPost($scope.aclFill, "granular", env);
		} else {
			result = aclHelpers.constructAclFromPost($scope.aclFill, "apiGroup", env);
		}
		if (!result.valid) {
			$scope.$parent.displayAlert('danger', translation.youNeedToChangeOneGroupAccessTypeGroups[LANG]);
			return;
		}
		overlayLoading.show();
		let options = {
			"method": "put",
			"routeName": "/dashboard/product/packages/acl/env",
			"data": {
				acl: result.data[env.toLowerCase()],
			},
			"params": {
				"id": productId,
				"code": $routeParams.code.split("_")[1],
				"env": env.toLowerCase(),
			}
		};
		if ($scope.aclMode[env.toLowerCase()].v === "granular") {
			options.params.type = "granular";
		}
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG] + "for ", env.toUpperCase());
			}
		});
	};
	
	$scope.purgeACL = function () {
		var productId = $routeParams.pid;
		let options = {
			"method": "get",
			"routeName": "/dashboard/product/purge",
			"params": {
				"id": productId
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
				$scope.$parent.go("/productization");
			}
		});
	};
	
	$scope.checkForGroupDefault = function (envCode, service, grp, val, myApi) {
		aclHelpers.checkForGroupDefault($scope, envCode, service, grp, val, myApi);
	};
	
	$scope.showHideServiceApi = function (envCode, group, serviceName, v) {
		$scope.allServiceApisGranular[group].forEach((service) => {
			if (service.name === serviceName) {
				service.fixList.forEach((version) => {
					if (version["%v%"] === v) {
						version["%showApi%"] = true;
					}
				});
			}
		});
	};
	$scope.preview = function (env, packCode, product) {
		$scope.$parent.go("/product/" + product.code + "/package/" + packCode.code + "/env/" + env.toLowerCase());
	};
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
	// default operation
	overlayLoading.show(function () {
		$scope.getPackageAcl();
	});
}]);

productizationApp.controller('aclConsolePackageCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', 'injectFiles', '$modal', '$localStorage', function ($scope, $routeParams, ngDataApi, aclHelpers, injectFiles, $modal, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	$scope.environments_codes = [];
	$scope.allServiceApis = [];
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	$scope.itemsPerPage = 20;
	$scope.serviceGroup = [];
	
	$scope.packageAclMode = [
		{
			l: "API Group based on product scope",
			v: "apiGroup"
		},
		{
			l: "Granular API",
			v: "granular"
		}
	];
	
	$scope.applyMode = function (aclMode, env) {
		overlayLoading.show();
		if (aclMode === 'granular') {
			$scope.aclMode[env.toLowerCase()] = $scope.packageAclMode[1];
			$scope.getPackageAcl(env.toLowerCase(), () => {
				overlayLoading.hide();
			});
		} else {
			$scope.aclMode[env.toLowerCase()] = $scope.packageAclMode[0];
			$scope.getPackageAcl(env.toLowerCase(), () => {
				overlayLoading.hide();
			});
		}
	};
	
	$scope.normalizeMethod = function (method) {
		let newMethod;
		if (!method) {
			return null;
		}
		switch (method.toLowerCase()) {
			case 'get':
				newMethod = 'Read';
				break;
			case 'post':
				newMethod = 'Add';
				break;
			case 'put':
				newMethod = 'Update';
				break;
			case 'delete':
				newMethod = 'Delete';
				break;
			case 'patch':
				newMethod = 'Patch';
				break;
			case 'head':
				newMethod = 'Head';
				break;
			default:
				newMethod = 'Other';
		}
		return newMethod
	};
	
	$scope.minimize = function (envCode, service) {
		if ($scope.aclMode[envCode.toLowerCase()].v === "granular") {
			if (!$scope.aclFill[envCode][service.name]) {
				$scope.aclFill[envCode][service.name] = {};
			}
			$scope.aclFill[envCode][service.name].collapse = false;
			$scope.aclFill[envCode][service.name].include = true;
		} else {
			if (!$scope.aclFill[envCode]) {
				$scope.aclFill[envCode] = {};
			}
			if (!$scope.aclFill[envCode][service]) {
				$scope.aclFill[envCode][service] = {};
			}
			$scope.aclFill[envCode][service].collapse = false;
			$scope.aclFill[envCode][service].include = true;
		}
	};
	
	$scope.expand = function (envCode, service) {
		if ($scope.aclMode[envCode.toLowerCase()].v === "granular") {
			if (!$scope.aclFill[envCode]) {
				$scope.aclFill[envCode] = {};
			}
			if (!$scope.aclFill[envCode][service.name]) {
				$scope.aclFill[envCode][service.name] = {};
			}
			$scope.aclFill[envCode][service.name].collapse = true;
			$scope.aclFill[envCode][service.name].include = true;
		} else {
			if (!$scope.aclFill[envCode]) {
				$scope.aclFill[envCode] = {};
			}
			if (!$scope.aclFill[envCode][service]) {
				$scope.aclFill[envCode][service] = {};
			}
			$scope.aclFill[envCode][service].collapse = true;
			$scope.aclFill[envCode][service].include = true;
		}
	};
	
	$scope.checkApiPermission = function (version) {
		if (version && version.apisPermission === 'restricted') {
			return false;
		} else {
			return true;
		}
	};
	
	$scope.checkGroupEmpty = function (version) {
		let empty = true;
		if (version && version.apisPermission) {
			if (Object.keys(version).length > 1) {
				empty = false;
			}
		} else {
			if (Object.keys(version).length > 0) {
				empty = false;
			}
		}
		return empty;
	};
	
	$scope.setActive = function (env) {
		for (let x = $scope.environments_codes.length - 1; x >= 0; x--) {
			if ($scope.environments_codes && $scope.environments_codes[x] && $scope.environments_codes[x].code && $scope.environments_codes[x].code.toUpperCase() === env.toUpperCase()) {
				$scope.environments_codes[x].active = true;
			} else {
				$scope.environments_codes[x].active = false;
			}
		}
	};
	
	$scope.getPackageAcl = function (customEnv) {
		$scope.environments_codes = angular.copy($localStorage.environments);
		let envs = [];
		for (let x = $scope.environments_codes.length - 1; x >= 0; x--) {
			$scope.environments_codes[x].active = customEnv && $scope.environments_codes[x].code.toUpperCase() === customEnv.toUpperCase();
			envs.push($scope.environments_codes[x].code);
		}
		let options = {
			"method": "get",
			"routeName": "/multitenant/product/package/acl/ui",
			"params": {
				"id": $routeParams.pid,
				"package": $routeParams.code,
				"soajs": true,
				"config": {
					envs: envs
				}
			}
		};
		if (customEnv) {
			options.params.config.envs = [customEnv];
			if ($scope.aclMode[customEnv.toLowerCase()].v === "granular") {
				options.params.config.type = "granular";
			} else {
				options.params.config.type = "apiGroup";
			}
		} else {
			$scope.environments_codes[0].active = true;
		}
		
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.product = response.product;
				$scope.currentPackage = response.package;
				if (customEnv) {
					if (response.aclFill) {
						$scope.aclFill[customEnv.toUpperCase()] = response.aclFill[customEnv.toUpperCase()];
					}
					if (response.scopeFill) {
						$scope.scopeFill[customEnv.toUpperCase()] = response.scopeFill[customEnv.toUpperCase()];
					}
					if (response.fixList) {
						$scope.fixList[customEnv.toUpperCase()] = response.fixList[customEnv.toUpperCase()];
					}
					$scope.paginations = response.paginations;
					$scope.serviceGroup = response.serviceGroup;
					$scope.allServiceApis = response.allServiceApis;
					$scope.allServiceApisGranular = response.allServiceApisGranular;
				} else {
					$scope.aclFill = response.aclFill;
					$scope.scopeFill = response.scopeFill;
					$scope.paginations = response.paginations;
					$scope.serviceGroup = response.serviceGroup;
					$scope.allServiceApis = response.allServiceApis;
					$scope.allServiceApisGranular = response.allServiceApisGranular;
					$scope.aclTypeByEnv = response.aclTypeByEnv;
					$scope.fixList = response.fixList;
					$scope.aclMode = {};
					envs.forEach((oneEnv) => {
						if ($scope.aclFill[oneEnv.toLowerCase()]) {
							if ($scope.aclTypeByEnv && $scope.aclTypeByEnv[oneEnv.toLowerCase()] === "granular") {
								$scope.aclMode[oneEnv.toLowerCase()] = $scope.packageAclMode[1];
							} else {
								$scope.aclMode[oneEnv.toLowerCase()] = $scope.packageAclMode[0];
							}
						} else {
							if ($scope.aclTypeByEnv && $scope.aclTypeByEnv[oneEnv.toLowerCase()] === "granular") {
								$scope.aclMode[oneEnv.toLowerCase()] = $scope.packageAclMode[1];
							} else {
								$scope.aclMode[oneEnv.toLowerCase()] = $scope.packageAclMode[0];
							}
						}
					});
				}
			}
		});
	};
	
	$scope.saveACL = function (env) {
		var productId = $routeParams.pid;
		var result;
		
		if ($scope.aclMode[env.toLowerCase()].v === "granular") {
			result = aclHelpers.constructAclFromPost($scope.aclFill, "granular", env);
		} else {
			result = aclHelpers.constructAclFromPost($scope.aclFill, "apiGroup", env);
		}
		if (!result.valid) {
			$scope.$parent.displayAlert('danger', translation.youNeedToChangeOneGroupAccessTypeGroups[LANG]);
			return;
		}
		overlayLoading.show();
		let options = {
			"method": "put",
			"routeName": "/dashboard/product/packages/acl/env",
			"data": {
				acl: result.data[env.toLowerCase()],
			},
			"params": {
				"id": productId,
				"code": $routeParams.code.split("_")[1],
				"env": env.toLowerCase(),
			}
		};
		if ($scope.aclMode[env.toLowerCase()].v === "granular") {
			options.params.type = "granular";
		}
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG] + "for ", env.toUpperCase());
			}
		});
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
			} else {
				$scope.environments_codes = response;
				$scope.getPackageAcl();
			}
		});
	};
	
	$scope.purgeACL = function () {
		var productId = $routeParams.pid;
		let options = {
			"method": "get",
			"routeName": "/dashboard/product/purge",
			"params": {
				"id": productId
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
				$scope.$parent.go("/consolePackages");
			}
		});
	};
	
	$scope.checkForGroupDefault = function (envCode, service, grp, val, myApi, v) {
		aclHelpers.checkForGroupDefault($scope, envCode, service, grp, val, myApi, v);
	};
	$scope.showHideServiceApi = function (envCode, group, serviceName, v) {
		$scope.allServiceApisGranular[group].forEach((service) => {
			if (service.name === serviceName) {
				service.fixList.forEach((version) => {
					if (version["%v%"] === v) {
						version["%showApi%"] = true;
					}
				});
			}
		});
	};
	$scope.applyRestriction = function () {
	
	};
	$scope.viewGroupDetails = function (env, service, grp, version) {
		let data = {
			grp: grp
		};
		for (let i = 0; i < $scope.allServiceApis.length; i++) {
			if ($scope.allServiceApis[i].name === service) {
				data.name = service;
				data.methods = {};
				let versionObject;
				if ($scope.allServiceApis[i].versions) {
					for (let j = 0; j < $scope.allServiceApis[i].versions.length; j++) {
						if ($scope.allServiceApis[i].versions[j].version === version) {
							versionObject = $scope.allServiceApis[i].versions[j];
						}
					}
					if (versionObject && versionObject.apis) {
						for (let j = 0; j < versionObject.apis.length; j++) {
							if (versionObject.apis[j].group === grp) {
								let m = versionObject.apis[j].m;
								let api = angular.copy(versionObject.apis[j]);
								if ($scope.scopeFill && $scope.scopeFill[env.toLowerCase()]
									&& $scope.scopeFill[env.toLowerCase()][service]
									&& $scope.scopeFill[env.toLowerCase()][service][version]) {
									data.access = $scope.scopeFill[env.toLowerCase()][service][version].access;
									data.apisPermission = $scope.scopeFill[env.toLowerCase()][service][version].apisPermission;
									if ($scope.scopeFill[env.toLowerCase()][service][version][versionObject.apis[j].m]) {
										let acl = $scope.scopeFill[env.toLowerCase()][service][version][versionObject.apis[j].m];
										for (let a = 0; a < acl.length; a++) {
											if (acl[a].apis && acl[a].apis[api.v]) {
												api.appeneded = true;
												api.showAppended = acl[a].apis && acl[a].apis[api.v].hasOwnProperty('access');
												api.access = !!acl[a].apis[api.v].access;
											}
										}
									}
								}
								if (api.appeneded || data.apisPermission !== "restricted") {
									if (!data.methods[m]) {
										data.methods[m] = [];
									}
									data.methods[m].push(api);
								}
							}
						}
					}
				}
				break;
			}
		}
		$modal.open({
			templateUrl: 'aclConsoleDescription.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				$scope.data = data;
				$scope.normalizeMethod = function (method) {
					let newMethod;
					if (!method) {
						return null;
					}
					switch (method.toLowerCase()) {
						case 'get':
							newMethod = 'Read';
							break;
						case 'post':
							newMethod = 'Add';
							break;
						case 'put':
							newMethod = 'Update';
							break;
						case 'delete':
							newMethod = 'Delete';
							break;
						case 'patch':
							newMethod = 'Patch';
							break;
						case 'head':
							newMethod = 'Head';
							break;
						default:
							newMethod = 'Other';
					}
					return newMethod;
				};
				fixBackDrop();
				$scope.ok = function () {
					$modalInstance.dismiss('ok');
				};
			}
		});
	};
	
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
	// default operation
	overlayLoading.show(function () {
		$scope.getPackageAcl();
	});
}]);

productizationApp.controller('compactViewCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $routeParams, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	$scope.page = 1;
	$scope.currentPackage = $routeParams.code;
	constructModulePermissions($scope, $scope.access, productizationConfig.permissions);
	
	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": {"short": true}
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				for (let x = response.length - 1; x >= 0; x--) {
					if (response && response[x] && response[x].code && response[x].code.toUpperCase() === "DASHBOARD") {
						response.splice(x, 1);
						break;
					}
				}
				$scope.environments_codes = response;
				$scope.getPreviewService();
			}
		});
	};
	$scope.getPreviewService = function (env) {
		let opts = {
			"method": "get",
			"routeName": "/dashboard/product/packages/aclPreview/service",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"mainEnv": $routeParams.env,
			}
		};
		if ($scope.mainEnv[1]) {
			opts.params.secEnv = env || $scope.mainEnv[1];
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.compactViewService = response
			}
		});
	};
	
	$scope.getPreviewApi = function (env) {
		let opts = {
			"method": "get",
			"routeName": "/dashboard/product/packages/aclPreview/api",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"mainEnv": $routeParams.env,
			}
		};
		if ($scope.mainEnv[1]) {
			opts.params.secEnv = env || $scope.mainEnv[1];
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.compactViewApi = response
			}
		});
	};
	$scope.showLoadMore = true;
	$scope.loadMoreApi = function (env) {
		$scope.page++;
		let opts = {
			"method": "get",
			"routeName": "/dashboard/product/packages/aclPreview/api",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"mainEnv": $routeParams.env,
				"page": $scope.page
			}
		};
		if ($scope.mainEnv[1]) {
			opts.params.secEnv = env || $scope.mainEnv[1];
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				if (response.acl.length !== 0) {
					$scope.compactViewApi.acl = $scope.compactViewApi.acl.concat(response.acl);
					$scope.showLoadMore = true;
				} else {
					$scope.showLoadMore = false;
				}
				
			}
		});
	};
	$scope.loadMoreService = function (env) {
		$scope.page++;
		let opts = {
			"method": "get",
			"routeName": "/dashboard/product/packages/aclPreview/service",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"mainEnv": $routeParams.env,
				"page": $scope.page
			}
		};
		if ($scope.mainEnv[1]) {
			opts.params.secEnv = env || $scope.mainEnv[1];
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				if (response.acl.length !== 0) {
					$scope.compactViewService.acl = $scope.compactViewService.acl.concat(response.acl);
					$scope.showLoadMore = true;
				} else {
					$scope.showLoadMore = false;
				}
				
			}
		});
	};
	
	$scope.previewType = [
		{
			l: "Service Compact Preview",
			v: "service"
		},
		{
			l: "APi Compact Preview",
			v: "api"
		}
	];
	
	$scope.previewMode = $scope.previewType[0];
	$scope.mainEnv = [$routeParams.env];
	
	$scope.selectPreview = function (previewMode) {
		$scope.page = 1;
		$scope.showLoadMore = true;
		if (previewMode === "service") {
			$scope.getPreviewService();
		} else {
			$scope.getPreviewApi();
		}
	};
	
	$scope.saveEnvApi = function (env, acl) {
		$scope.page = 1;
		$scope.showLoadMore = true;
		let opts = {
			"method": "put",
			"routeName": "/dashboard/product/packages/aclPreview/api",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"env": env
			},
			"data": {
				"acl": acl
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.getPreviewApi();
			}
		});
	};
	
	$scope.saveEnvService = function (env, acl) {
		$scope.page = 1;
		$scope.showLoadMore = true;
		let opts = {
			"method": "put",
			"routeName": "/dashboard/product/packages/aclPreview/service",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"env": env
			},
			"data": {
				"acl": acl
			}
			
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.getPreviewService();
			}
		});
	};
	$scope.showRestriction = function (acl, key) {
		//jQuery('[id^="restriction_message_"]').removeClass("showMessageRestrictionApi");
		$(document.querySelectorAll('[id^="restriction_message_"]')).removeClass("showMessageRestrictionApi");
		$(document.getElementById('restriction_message_' + key + "_" + acl.service + "_" + acl.version + "_" + acl.method + "_" + acl.api.substr(1).replace("/", "_"))).addClass('showMessageRestrictionApi');
		//jQuery(jQuery('#restriction_message_' + key + "_" + acl.service + "_" +  acl.version + "_" +  acl.method + "_" +  acl.api.substr(1).replace("/", "_")).addClass('showMessageRestrictionApi');
	};
	$scope.compareEnv = function () {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "compareEnv.tmpl",
			size: 'm',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				$scope.envList = [];
				$scope.mainEnv = $routeParams.env;
				$scope.secEnv = currentScope.mainEnv[1];
				$scope.previewMode = currentScope.previewMode.v;
				if (currentScope.previewMode.v === "service") {
					currentScope.environments_codes.forEach((env) => {
						if (env.code.toLowerCase() !== $routeParams.env.toLowerCase()) {
							if (currentScope.compactViewService.aclTypeByEnv && currentScope.compactViewService.aclTypeByEnv[$routeParams.env]) {
								if (currentScope.compactViewService.aclTypeByEnv[env.code.toLowerCase()]) {
									$scope.envList.push({
										code: env.code.toLowerCase(),
										allowed: true
									});
								} else {
									$scope.envList.push({
										code: env.code.toLowerCase(),
										allowed: false
									});
								}
							} else {
								if ((!currentScope.compactViewService.aclTypeByEnv || !currentScope.compactViewService.aclTypeByEnv[env.code.toLowerCase()])) {
									$scope.envList.push({
										code: env.code.toLowerCase(),
										allowed: true
									});
								} else {
									$scope.envList.push({
										code: env.code.toLowerCase(),
										allowed: false
									});
								}
							}
						}
					});
				} else {
					currentScope.environments_codes.forEach((env) => {
						if (env.code.toLowerCase() !== $routeParams.env.toLowerCase()) {
							if (currentScope.compactViewApi.aclTypeByEnv && currentScope.compactViewApi.aclTypeByEnv[$routeParams.env]) {
								if (currentScope.compactViewApi.aclTypeByEnv[env.code.toLowerCase()]) {
									$scope.envList.push({
										code: env.code.toLowerCase(),
										allowed: true
									});
								} else {
									$scope.envList.push({
										code: env.code.toLowerCase(),
										allowed: false
									});
								}
							} else {
								if ((!currentScope.compactViewApi.aclTypeByEnv || !currentScope.compactViewApi.aclTypeByEnv[env.code.toLowerCase()])) {
									$scope.envList.push({
										code: env.code.toLowerCase(),
										allowed: true
									});
								} else {
									$scope.envList.push({
										code: env.code.toLowerCase(),
										allowed: false
									});
								}
							}
						}
					});
				}
				$scope.selectEnv = function (env) {
					if (env.allowed) {
						$scope.selectedEnv = env.code;
						jQuery('[id^="env_code_"]').removeClass("onClickEnv");
						jQuery('#env_code_' + env.code).addClass('onClickEnv');
						$scope.showWarning = false;
					} else {
						$scope.selectedEnv = null;
						jQuery('[id^="env_code_"]').removeClass("onClickEnv");
						$scope.showWarning = true;
					}
				};
				
				$scope.onSubmit = function () {
					//call the apis
					currentScope.page = 1;
					currentScope.showLoadMore = true;
					currentScope.mainEnv[1] = $scope.selectedEnv;
					if ($scope.previewMode === "service") {
						currentScope.getPreviewService($scope.selectedEnv);
					} else {
						currentScope.getPreviewApi($scope.selectedEnv);
					}
					$scope.closeModal();
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};
	//default operation
	if ($scope.access.previewPackService) {
		$scope.getEnvironments();
	}
	
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
}]);

productizationApp.controller('compactViewProductCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $routeParams, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	$scope.page = 1;
	$scope.currentPackage = $routeParams.product;
	constructModulePermissions($scope, $scope.access, productizationConfig.permissions);
	
	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": {"short": true}
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				for (let x = response.length - 1; x >= 0; x--) {
					if (response && response[x] && response[x].code && response[x].code.toUpperCase() === "DASHBOARD") {
						response.splice(x, 1);
						break;
					}
				}
				$scope.environments_codes = response;
				$scope.getPreviewService();
			}
		});
	};
	$scope.getPreviewService = function (env) {
		let opts = {
			"method": "get",
			"routeName": "/dashboard/product/scope/aclPreview/service",
			"params": {
				"productCode": $routeParams.pid,
				"mainEnv": $routeParams.env,
			}
		};
		if ($scope.mainEnv[1]) {
			opts.params.secEnv = env || $scope.mainEnv[1];
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.compactViewService = response
			}
		});
	};
	
	$scope.getPreviewApi = function (env) {
		let opts = {
			"method": "get",
			"routeName": "/dashboard/product/scope/aclPreview/api",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"mainEnv": $routeParams.env,
			}
		};
		if ($scope.mainEnv[1]) {
			opts.params.secEnv = env || $scope.mainEnv[1];
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.compactViewApi = response
			}
		});
	};
	$scope.showLoadMore = true;
	$scope.loadMoreApi = function (env) {
		$scope.page++;
		let opts = {
			"method": "get",
			"routeName": "/dashboard/product/scope/aclPreview/api",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"mainEnv": $routeParams.env,
				"page": $scope.page
			}
		};
		if ($scope.mainEnv[1]) {
			opts.params.secEnv = env || $scope.mainEnv[1];
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				if (response.acl.length !== 0) {
					$scope.compactViewApi.acl = $scope.compactViewApi.acl.concat(response.acl);
					$scope.showLoadMore = true;
				} else {
					$scope.showLoadMore = false;
				}
				
			}
		});
	};
	$scope.loadMoreService = function (env) {
		$scope.page++;
		let opts = {
			"method": "get",
			"routeName": "/dashboard/product/scope/aclPreview/service",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"mainEnv": $routeParams.env,
				"page": $scope.page
			}
		};
		if ($scope.mainEnv[1]) {
			opts.params.secEnv = env || $scope.mainEnv[1];
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				if (response.acl.length !== 0) {
					$scope.compactViewService.acl = $scope.compactViewService.acl.concat(response.acl);
					$scope.showLoadMore = true;
				} else {
					$scope.showLoadMore = false;
				}
				
			}
		});
	};
	
	$scope.previewType = [
		{
			l: "Service Compact Preview",
			v: "service"
		},
		{
			l: "APi Compact Preview",
			v: "api"
		}
	];
	
	$scope.previewMode = $scope.previewType[0];
	$scope.mainEnv = [$routeParams.env];
	
	$scope.selectPreview = function (previewMode) {
		$scope.page = 1;
		$scope.showLoadMore = true;
		if (previewMode === "service") {
			$scope.getPreviewService();
		} else {
			$scope.getPreviewApi();
		}
	};
	
	$scope.saveEnvApi = function (env, acl) {
		$scope.page = 1;
		$scope.showLoadMore = true;
		let opts = {
			"method": "put",
			"routeName": "/dashboard/product/scope/aclPreview/api",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"env": env
			},
			"data": {
				"acl": acl
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.getPreviewApi();
			}
		});
	};
	
	$scope.saveEnvService = function (env, acl) {
		$scope.page = 1;
		$scope.showLoadMore = true;
		let opts = {
			"method": "put",
			"routeName": "/dashboard/product/scope/aclPreview/service",
			"params": {
				"packageCode": $routeParams.code,
				"productCode": $routeParams.pid,
				"env": env
			},
			"data": {
				"acl": acl
			}
			
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.getPreviewService();
			}
		});
	};
	$scope.showRestriction = function (acl, key) {
		//jQuery('[id^="restriction_message_"]').removeClass("showMessageRestrictionApi");
		$(document.querySelectorAll('[id^="restriction_message_"]')).removeClass("showMessageRestrictionApi");
		$(document.getElementById('restriction_message_' + key + "_" + acl.service + "_" + acl.version + "_" + acl.method + "_" + acl.api.substr(1).replace("/", "_"))).addClass('showMessageRestrictionApi');
		//jQuery(jQuery('#restriction_message_' + key + "_" + acl.service + "_" +  acl.version + "_" +  acl.method + "_" +  acl.api.substr(1).replace("/", "_")).addClass('showMessageRestrictionApi');
	};
	$scope.compareEnv = function () {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "compareEnv.tmpl",
			size: 'm',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				$scope.envList = [];
				$scope.mainEnv = $routeParams.env;
				$scope.secEnv = currentScope.mainEnv[1];
				$scope.previewMode = currentScope.previewMode.v;
				currentScope.environments_codes.forEach((env) => {
					if (env.code.toLowerCase() !== $routeParams.env.toLowerCase()) {
						$scope.envList.push({
							code: env.code.toLowerCase(),
							allowed: true
						});
					}
				});
				$scope.selectEnv = function (env) {
					if (env.allowed) {
						$scope.selectedEnv = env.code;
						jQuery('[id^="env_code_"]').removeClass("onClickEnv");
						jQuery('#env_code_' + env.code).addClass('onClickEnv');
					} else {
						$scope.selectedEnv = null;
						jQuery('[id^="env_code_"]').removeClass("onClickEnv");
					}
				};
				
				$scope.onSubmit = function () {
					//call the apis
					currentScope.page = 1;
					currentScope.showLoadMore = true;
					currentScope.mainEnv[1] = $scope.selectedEnv;
					if ($scope.previewMode === "service") {
						currentScope.getPreviewService($scope.selectedEnv);
					} else {
						currentScope.getPreviewApi($scope.selectedEnv);
					}
					$scope.closeModal();
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};
	//default operation
	if ($scope.access.previewPackService) {
		$scope.getEnvironments();
	}
	
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
}]);


productizationApp.filter('reposSearchFilter', function () {
	return function (input, searchKeyword) {
		if (!searchKeyword) return input;
		if (!input || !Array.isArray(input) || input.length === 0) return input;
		var output = [];
		input.forEach(function (oneInput) {
			if (oneInput) {
				//using full_name since it's composed of owner + name
				if (oneInput.name && oneInput.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
					output.push(oneInput);
				}
			}
		});
		
		return output;
	}
});