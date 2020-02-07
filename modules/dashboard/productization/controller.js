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

productizationApp.controller('aclCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', 'injectFiles', function ($scope, $routeParams, ngDataApi, aclHelpers, injectFiles) {
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
	
	$scope.getPackageAcl = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/get",
			"params": {
				"id": $routeParams.pid
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				var code = $routeParams.code;
				if (!response.locked) {
					for (var i = $scope.environments_codes.length - 1; i >= 0; i--) {
						if ($scope.environments_codes[i].code === 'DASHBOARD') {
							$scope.environments_codes.splice(i, 1);
							break;
						}
					}
				}
				for (var x = 0; x < response.packages.length; x++) {
					if (response.packages[x].code === code) {
						$scope.currentPackage = angular.copy(response.packages[x]);
						$scope.currentPackage._TTL = (response.packages[x]._TTL / 3600000).toString();
						break;
					}
				}
				if ($scope.environments_codes.length === 0) {
					overlayLoading.hide();
					return;
				}
				$scope.product = response;
				if (response.scope && response.scope.acl) {
					$scope.oldACL = false;
					$scope.aclFill = response.scope.acl;
					$scope.$evalAsync(function ($scope) {
						aclHelpers.fillAcl($scope);
					});
				} else {
					$scope.oldACL = true;
					overlayLoading.hide();
				}
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
				for (let x = response.length - 1; x >= 0; x--) {
					if (response && response[x] && response[x].code && response[x].code.toUpperCase() === "DASHBOARD") {
						response.splice(x, 1);
						break;
					}
				}
				$scope.environments_codes = response;
				$scope.getPackageAcl();
			}
		});
	};
	$scope.itemsPerPage = 20;
	$scope.maxSize = 5;
	
	//default operation
	$scope.getAllServicesList = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.paginations = {};
				let allServiceApis = {};
				response.records.forEach(function (serv) {
					let acl = [];
					if (serv.group) {
						if (!allServiceApis[serv.group]) {
							allServiceApis[serv.group] = []
						}
						if (!$scope.paginations[serv.group]) {
							$scope.paginations[serv.group] = {
								currentPage: 1,
								totalItems: 1
							}
						} else {
							$scope.paginations[serv.group].totalItems++;
						}
						if (serv.versions) {
							for (let version in serv.versions) {
								if (serv.versions.hasOwnProperty(version) && serv.versions[version]) {
									if ($scope.serviceGroup.indexOf(serv.group) === -1) {
										$scope.serviceGroup.push(serv.group);
									}
									let aclVersion = aclHelpers.groupApisForDisplay(serv.versions[version].apis, 'group');
									aclVersion["%v%"] = version;
									acl.push(aclVersion);
								}
							}
							serv.fixList = acl;
						}
						allServiceApis[serv.group].push(serv);
					}
				});
				$scope.allServiceApis = allServiceApis;
				$scope.getEnvironments();
			}
		});
	};
	
	$scope.saveACL = function () {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		var result = aclHelpers.constructAclFromPost($scope.aclFill);
		postData.scope = result.data;
		if (!result.valid) {
			$scope.$parent.displayAlert('danger', translation.youNeedToChangeOneGroupAccessTypeGroups[LANG]);
			return;
		}
		overlayLoading.show();
		let options = {
			"method": "put",
			"routeName": "/dashboard/product/scope/update",
			"data": postData,
			"params": {
				"id": productId
			}
		};
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
			}
		});
	};
	
	$scope.checkForGroupDefault = function (envCode, service, grp, val, myApi) {
		aclHelpers.checkForGroupDefault($scope, envCode, service, grp, val, myApi);
	};
	
	$scope.applyRestriction = function (envCode, service) {
		aclHelpers.applyPermissionRestriction($scope, envCode, service);
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
	});
}]);

productizationApp.controller('aclConsoleCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', 'injectFiles', function ($scope, $routeParams, ngDataApi, aclHelpers, injectFiles) {
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
	
	$scope.getConsoleScope = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/console/product/list",
			"params": {
				"id": $routeParams.pid
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				
				if ($scope.environments_codes.length === 0) {
					overlayLoading.hide();
					return;
				}
				$scope.product = response;
				if (response.scope && response.scope.acl) {
					$scope.aclFill = response.scope.acl;
					$scope.oldACL = false;
					$scope.$evalAsync(function ($scope) {
						aclHelpers.fillAcl($scope);
					});
				} else {
					$scope.oldACL = true;
					overlayLoading.hide();
				}
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
				$scope.getAllServicesList();
				
			}
		});
	};
	$scope.itemsPerPage = 20;
	$scope.maxSize = 5;
	//default operation
	$scope.getAllServicesList = function () {
		for (let x = $scope.environments_codes.length - 1; x >= 0; x--) {
			if ($scope.environments_codes && $scope.environments_codes[x] && $scope.environments_codes [x].code && $scope.environments_codes[x].code.toUpperCase() === "DASHBOARD") {
				if ($scope.environments_codes[x].services && $scope.environments_codes[x].services.controller && $scope.environments_codes[x].services.controller.services) {
					consoleAclConfig.DASHBOARD = $scope.environments_codes[x].services.controller.services;
				}
			}
		}
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list",
			"data": {
				"serviceNames": consoleAclConfig.DASHBOARD
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.paginations = {};
				let allServiceApis = {};
				response.records.forEach(function (serv) {
					let acl = [];
					if (serv.group) {
						if (!allServiceApis[serv.group]) {
							allServiceApis[serv.group] = []
						}
						if (!$scope.paginations[serv.group]) {
							$scope.paginations[serv.group] = {
								currentPage: 1,
								totalItems: 1
							}
						} else {
							$scope.paginations[serv.group].totalItems++;
						}
						if (serv.versions) {
							for (let version in serv.versions) {
								if (serv.versions.hasOwnProperty(version) && serv.versions[version]) {
									if ($scope.serviceGroup.indexOf(serv.group) === -1) {
										$scope.serviceGroup.push(serv.group);
									}
									let aclVersion = aclHelpers.groupApisForDisplay(serv.versions[version].apis, 'group');
									aclVersion["%v%"] = version;
									acl.push(aclVersion);
								}
							}
							serv.fixList = acl;
						}
						allServiceApis[serv.group].push(serv);
					}
				});
				$scope.allServiceApis = allServiceApis;
				$scope.getConsoleScope();
			}
		});
	};
	
	$scope.saveACL = function () {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		var result = aclHelpers.constructAclFromPost($scope.aclFill);
		postData.scope = result.data;
		if (!result.valid) {
			$scope.$parent.displayAlert('danger', translation.youNeedToChangeOneGroupAccessTypeGroups[LANG]);
			return;
		}
		overlayLoading.show();
		let options = {
			"method": "put",
			"routeName": "/dashboard/product/scope/update",
			"data": postData,
			"params": {
				"id": productId
			}
		};
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
			}
		});
	};
	
	$scope.checkForGroupDefault = function (envCode, service, grp, val, myApi, v) {
		aclHelpers.checkForGroupDefault($scope, envCode, service, grp, val, myApi, v);
	};
	
	$scope.applyRestriction = function (envCode, service) {
		aclHelpers.applyPermissionRestriction($scope, envCode, service);
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
		$scope.getEnvironments();
		$scope.consoleAclConfig = consoleAclConfig;
	});
}]);

productizationApp.controller('aclPackageCtrl', ['$scope', '$routeParams', '$modal', 'ngDataApi', 'aclHelpers', 'injectFiles', function ($scope, $routeParams, $modal, ngDataApi, aclHelpers, injectFiles) {
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
	
	function applyGranular() {
		$scope.paginations = {};
		let allServiceApis = {};
		let serviceResponse = angular.copy($scope.allServiceApisResponse);
		serviceResponse.records.forEach(function (serv) {
			let acl = [];
			if (serv.group) {
				if (!allServiceApis[serv.group]) {
					allServiceApis[serv.group] = []
				}
				if (!$scope.paginations[serv.group]) {
					$scope.paginations[serv.group] = {
						currentPage: 1,
						totalItems: 1
					}
				} else {
					$scope.paginations[serv.group].totalItems++;
				}
				if (serv.versions) {
					for (let version in serv.versions) {
						if (serv.versions.hasOwnProperty(version) && serv.versions[version]) {
							if ($scope.serviceGroup.indexOf(serv.group) === -1) {
								$scope.serviceGroup.push(serv.group);
							}
							let aclVersion = aclHelpers.groupApisForDisplay(serv.versions[version].apis, 'group');
							aclVersion["%v%"] = version;
							acl.push(aclVersion);
						}
					}
					serv.fixList = acl;
				}
				allServiceApis[serv.group].push(serv);
			}
		});
		$scope.allServiceApis = allServiceApis;
		
		var code = $routeParams.code;
		let response = angular.copy($scope.packageResponse);
		if (!response.locked) {
			for (var i = $scope.environments_codes.length - 1; i >= 0; i--) {
				if ($scope.environments_codes[i].code === 'DASHBOARD') {
					$scope.environments_codes.splice(i, 1);
					break;
				}
			}
		}
		for (var x = 0; x < response.packages.length; x++) {
			if (response.packages[x].code === code) {
				$scope.currentPackage = angular.copy(response.packages[x]);
				$scope.currentPackage._TTL = (response.packages[x]._TTL / 3600000).toString();
				break;
			}
		}
		if ($scope.environments_codes.length === 0) {
			return;
		}
		$scope.product = response;
		if (response.scope && response.scope.acl) {
			$scope.oldACL = false;
			$scope.aclFill =  $scope.currentPackage.aclType && $scope.currentPackage.aclType === 'granular' ? $scope.currentPackage.acl : {};
			$scope.$evalAsync(function ($scope) {
				aclHelpers.fillAcl($scope);
			});
		} else {
			$scope.oldACL = true;
		}
	}
	
	function applyApiGroup() {
		let response = angular.copy($scope.packageResponse);
		$scope.allServiceApis = angular.copy($scope.allServiceApisResponse).records;
		var code = $routeParams.code;
		if (!response.locked) {
			for (var i = $scope.environments_codes.length - 1; i >= 0; i--) {
				if ($scope.environments_codes[i].code === 'DASHBOARD') {
					$scope.environments_codes.splice(i, 1);
					break;
				}
			}
		}
		for (var x = 0; x < response.packages.length; x++) {
			if (response.packages[x].code === code) {
				$scope.currentPackage = angular.copy(response.packages[x]);
				$scope.currentPackage._TTL = (response.packages[x]._TTL / 3600000).toString();
				break;
			}
		}
		if ($scope.environments_codes.length === 0) {
			overlayLoading.hide();
			return;
		}
		$scope.product = angular.copy(response);
		$scope.aclFill = $scope.currentPackage.acl;
		$scope.aclFill =  !$scope.currentPackage.aclType || $scope.currentPackage.aclType !== 'granular' ? $scope.currentPackage.acl : {};
		if (response.scope && response.scope.acl) {
			$scope.scopeFill = response.scope.acl;
			$scope.oldACL = false;
			$scope.$evalAsync(function ($scope) {
				aclHelpers.fillPackageAcl($scope);
			});
		} else {
			$scope.oldACL = true;
		}
	}
	
	$scope.applyMode = function (aclMode) {
		overlayLoading.show();
		if (aclMode === 'granular') {
			$scope.aclMode = $scope.packageAclMode[1];
			applyGranular(()=>{
				overlayLoading.hide();
			});
		} else {
			$scope.aclMode = $scope.packageAclMode[0];
			applyApiGroup(()=>{
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
				if ($scope.allServiceApis[i].versions && $scope.allServiceApis[i].versions[version] && $scope.allServiceApis[i].versions[version].apis) {
					for (let j = 0; j < $scope.allServiceApis[i].versions[version].apis.length; j++) {
						if ($scope.allServiceApis[i].versions[version].apis[j].group === grp) {
							let m = $scope.allServiceApis[i].versions[version].apis[j].m;
							let api = angular.copy($scope.allServiceApis[i].versions[version].apis[j]);
							if ($scope.scopeFill && $scope.scopeFill[env.toLowerCase()]
								&& $scope.scopeFill[env.toLowerCase()][service]
								&& $scope.scopeFill[env.toLowerCase()][service][version]) {
								data.access = $scope.scopeFill[env.toLowerCase()][service][version].access;
								data.apisPermission = $scope.scopeFill[env.toLowerCase()][service][version].apisPermission;
								if ($scope.scopeFill[env.toLowerCase()][service][version][$scope.allServiceApis[i].versions[version].apis[j].m]) {
									let acl = $scope.scopeFill[env.toLowerCase()][service][version][$scope.allServiceApis[i].versions[version].apis[j].m];
									for (let a = 0; a < acl.length; a++) {
										if (acl[a].apis && acl[a].apis[api.v]) {
											api.appeneded = true;
											api.access = acl[a].apis[api.v].access;
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
		if ($scope.aclMode.v === "granular") {
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
		if ($scope.aclMode.v === "granular") {
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
	
	$scope.getPackageAcl = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/get",
			"params": {
				"id": $routeParams.pid
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				let currentPackage;
				for (var x = 0; x < response.packages.length; x++) {
					if (response.packages[x].code === $routeParams.code) {
						currentPackage = angular.copy(response.packages[x]);
						break;
					}
				}
				$scope.packageResponse = angular.copy(response);
				$scope.aclMode = $scope.packageAclMode[0];
				if (currentPackage.aclType === "granular") {
					$scope.aclMode = $scope.packageAclMode[1];
					applyGranular();
				} else {
					applyApiGroup();
				}
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
				for (let x = response.length - 1; x >= 0; x--) {
					if (response && response[x] && response[x].code && response[x].code.toUpperCase() === "DASHBOARD") {
						response.splice(x, 1);
						break;
					}
				}
				$scope.environments_codes = response;
				$scope.getPackageAcl();
			}
		});
	};
	
	//default operation
	$scope.getAllServicesList = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.allServiceApis = response.records;
				$scope.allServiceApisResponse = angular.copy(response);
				$scope.getEnvironments();
			}
		});
	};
	
	$scope.saveACL = function () {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		var result;
		
		if ($scope.aclMode.v === "granular") {
			result = aclHelpers.constructAclFromPost($scope.aclFill, false);
		} else {
			result = aclHelpers.constructAclFromPost($scope.aclFill, true);
		}
		postData.acl = result.data;
		if (!result.valid) {
			$scope.$parent.displayAlert('danger', translation.youNeedToChangeOneGroupAccessTypeGroups[LANG]);
			return;
		}
		overlayLoading.show();
		let options = {
			"method": "put",
			"routeName": "/dashboard/product/packages/update",
			"data": postData,
			"params": {
				"id": productId,
				"code": postData.code.split("_")[1],
				'_TTL': postData._TTL
			}
		};
		if ($scope.aclMode.v === "granular") {
			options.params.type = "granular";
		}
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
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
	
	$scope.applyRestriction = function (envCode, service) {
		aclHelpers.applyPermissionRestriction($scope, envCode, service);
	};
	
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
	// default operation
	overlayLoading.show(function () {
		$scope.getAllServicesList();
	});
}]);

productizationApp.controller('aclConsolePackageCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', 'injectFiles', '$modal', function ($scope, $routeParams, ngDataApi, aclHelpers, injectFiles, $modal) {
	$scope.$parent.isUserLoggedIn();
	$scope.environments_codes = [];
	$scope.allServiceApis = [];
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	$scope.serviceGroup = [];
	
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
		if (!$scope.aclFill[envCode]) {
			$scope.aclFill[envCode] = {};
		}
		if (!$scope.aclFill[envCode][service]) {
			$scope.aclFill[envCode][service] = {};
		}
		$scope.aclFill[envCode][service].collapse = false;
		$scope.aclFill[envCode][service].include = true;
	};
	
	$scope.expand = function (envCode, service) {
		if (!$scope.aclFill[envCode]) {
			$scope.aclFill[envCode] = {};
		}
		if (!$scope.aclFill[envCode][service]) {
			$scope.aclFill[envCode][service] = {};
		}
		$scope.aclFill[envCode][service].collapse = true;
		$scope.aclFill[envCode][service].include = true;
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
	$scope.getPackageAcl = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/get",
			"params": {
				"id": $routeParams.pid
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				var code = $routeParams.code;
				for (var x = 0; x < response.packages.length; x++) {
					if (response.packages[x].code === code) {
						$scope.currentPackage = angular.copy(response.packages[x]);
						$scope.currentPackage._TTL = (response.packages[x]._TTL / 3600000).toString();
						break;
					}
				}
				if ($scope.environments_codes.length === 0) {
					overlayLoading.hide();
					return;
				}
				$scope.product = response;
				$scope.aclFill = $scope.currentPackage.acl;
				if (response.scope && response.scope.acl) {
					$scope.scopeFill = response.scope.acl;
					$scope.oldACL = false;
					$scope.$evalAsync(function ($scope) {
						aclHelpers.fillPackageAcl($scope);
					});
				} else {
					$scope.oldACL = true;
					overlayLoading.hide();
				}
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
	
	//default operation
	$scope.getAllServicesList = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.allServiceApis = response.records;
				$scope.getEnvironments();
			}
		});
	};
	
	$scope.saveACL = function () {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		
		var result = aclHelpers.constructAclFromPost($scope.aclFill, true);
		postData.acl = result.data;
		if (!result.valid) {
			$scope.$parent.displayAlert('danger', translation.youNeedToChangeOneGroupAccessTypeGroups[LANG]);
			return;
		}
		let options = {
			"method": "put",
			"routeName": "/dashboard/product/packages/update",
			"data": postData,
			"params": {
				"id": productId,
				"code": postData.code.split("_")[1],
				'_TTL': postData._TTL
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
	
	$scope.applyRestriction = function (envCode, service) {
		aclHelpers.applyPermissionRestriction($scope, envCode, service);
	};
	$scope.viewGroupDetails = function (env, service, grp, version) {
		let data = {
			grp: grp
		};
		for (let i = 0; i < $scope.allServiceApis.length; i++) {
			if ($scope.allServiceApis[i].name === service) {
				data.name = service;
				data.methods = {};
				if ($scope.allServiceApis[i].versions && $scope.allServiceApis[i].versions[version] && $scope.allServiceApis[i].versions[version].apis) {
					for (let j = 0; j < $scope.allServiceApis[i].versions[version].apis.length; j++) {
						if ($scope.allServiceApis[i].versions[version].apis[j].group === grp) {
							let m = $scope.allServiceApis[i].versions[version].apis[j].m;
							let api = angular.copy($scope.allServiceApis[i].versions[version].apis[j]);
							if ($scope.scopeFill && $scope.scopeFill[env.toLowerCase()]
								&& $scope.scopeFill[env.toLowerCase()][service]
								&& $scope.scopeFill[env.toLowerCase()][service][version]) {
								data.access = $scope.scopeFill[env.toLowerCase()][service][version].access;
								data.apisPermission = $scope.scopeFill[env.toLowerCase()][service][version].apisPermission;
								if ($scope.scopeFill[env.toLowerCase()][service][version][$scope.allServiceApis[i].versions[version].apis[j].m]) {
									let acl = $scope.scopeFill[env.toLowerCase()][service][version][$scope.allServiceApis[i].versions[version].apis[j].m];
									for (let a = 0; a < acl.length; a++) {
										if (acl[a].apis && acl[a].apis[api.v]) {
											api.appeneded = true;
											api.access = acl[a].apis[api.v].access;
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
		$scope.getAllServicesList();
	});
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