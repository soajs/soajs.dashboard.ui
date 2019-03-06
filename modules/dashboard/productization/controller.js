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
			}
			else {
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
			"params": { "id": row._id }
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
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
							}
							else {
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
						"params": { "id": row['_id'] }
					}, function (error) {
						if (error) {
							$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
						}
						else {
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
			"params": { "id": productId }
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
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
							"params": { "id": productId }
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
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
							"params": { "id": productId, "code": data.code.split("_")[1] }
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
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
			"params": { "id": productId, "code": packageCode }
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
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
			}
			else {
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
			"params": { "id": row._id }
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
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
							}
							else {
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
		if(row.locked){
			formConfig.form.entries.forEach((oneEntry)=>{
				oneEntry.type = 'readonly';
			});
		}
		else {
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
		if (!row.locked){
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
						"params": { "id": row['_id'] }
					}, function (error) {
						if (error) {
							$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
						}
						else {
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
			"params": { "id": productId }
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
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
							"params": { "id": productId }
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
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
		$scope.$parent.go("/productization/" + productId + "/editConsolePackageAcl/" + code);
	};
	
	$scope.editPackage = function (productId, data) {
		var formConfig = angular.copy(productizationConfig.form.package);
		var recordData = angular.copy(data);
		delete recordData.acl;
		recordData._TTL = recordData._TTL / 3600000;
		if (data.locked){
			formConfig.entries.forEach((oneEntry)=>{
				if (oneEntry.type === 'select'){
					oneEntry.value = '';
				}
				oneEntry.type = 'readonly';
			});
		}
		else {
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
		if (!data.locked){
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
						"params": { "id": productId, "code": data.code.split("_")[1] }
					}, function (error) {
						if (error) {
							$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
						}
						else {
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
			"params": { "id": productId, "code": packageCode }
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
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
	$scope.allServiceApis = [];
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	
	$scope.normalizeMethod = function (method) {
		let newMethod;
		switch(method.toLowerCase()) {
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
			default:
				newMethod = 'Read';
		}
		return newMethod
	};
	
	$scope.minimize = function (envCode, service) {
		if(!$scope.aclFill[envCode][service.name]){
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = false;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.expand = function (envCode, service) {
		if(!$scope.aclFill[envCode][service.name]){
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
			}
			else {
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
				$scope.aclFill = response.scope && response.scope.acl  ? response.scope.acl : {};
				$scope.$evalAsync(function ($scope) {
					aclHelpers.fillAcl($scope);
				});
			}
		});
	};
	
	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": { "short": true }
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				for (let x = response.length -1 ; x >= 0; x--) {
					if(response && response[x] && response[x].code && response[x].code.toUpperCase() === "DASHBOARD"){
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
			}
			else {
				response.records.forEach(function (serv) {
					if (serv.apis) {
						if($scope.serviceGroup.indexOf(serv.group) !== -1){
							$scope.serviceGroup.push(serv.group);
						}
						let aclVersion = aclHelpers.groupApisForDisplay(serv.versions.apis, 'group');
						aclVersion["%v%"] = 1;
						serv.fixList = aclVersion;
						delete serv.apis;
					}
					else {
						let acl = [];
						if (serv.versions) {
							for (let version in serv.versions) {
								if (serv.versions.hasOwnProperty(version) && serv.versions[version]) {
									if($scope.serviceGroup.indexOf(serv.group) === -1){
										$scope.serviceGroup.push(serv.group);
									}
									let aclVersion = aclHelpers.groupApisForDisplay(serv.versions[version].apis, 'group');
									aclVersion["%v%"] = version;
									acl.push(aclVersion);
								}
							}
							serv.fixList = acl;
						}
					}
				});
				$scope.allServiceApis = response.records;
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
			}
			else {
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
			$scope.aclFill[envCode][service.name][version].accessType= "public";
			
			if (service.versions[version] && service.versions[version].apis && service.versions[version].apis.length > 0){
				service.versions[version].apis.forEach((oneApi)=>{
					if(!$scope.aclFill[envCode][service.name][version][oneApi.m]){
						$scope.aclFill[envCode][service.name][version][oneApi.m] = {
							apis: {}
						};
					}
					$scope.aclFill[envCode][service.name][version][oneApi.m].apis[oneApi.v] = {accessType: "public"};
				});
			}
		}
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
	$scope.allServiceApis = [];
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	
	$scope.normalizeMethod = function (method) {
		let newMethod;
		switch(method.toLowerCase()) {
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
			default:
				newMethod = 'Read';
		}
		return newMethod
	};
	$scope.minimize = function (envCode, service) {
		if(!$scope.aclFill[envCode][service.name]){
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = false;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.expand = function (envCode, service) {
		if(!$scope.aclFill[envCode][service.name]){
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = true;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.getConsoleScope = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/get",
			"params": {
				"id": $routeParams.pid
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				//var code = $routeParams.code;
				if (!response.locked) {
					for (var i = $scope.environments_codes.length - 1; i >= 0; i--) {
						if ($scope.environments_codes[i].code === 'DASHBOARD') {
							$scope.environments_codes.splice(i, 1);
							break;
						}
					}
				}
			
				if ($scope.environments_codes.length === 0) {
					overlayLoading.hide();
					return;
				}
				$scope.product = response;
				$scope.aclFill = response.scope && response.scope.acl  ? response.scope.acl : {};
				$scope.$evalAsync(function ($scope) {
					aclHelpers.fillAcl($scope);
				});
			}
		});
	};
	
	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": { "short": true }
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
				$scope.getConsoleScope();
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
			}
			else {
				response.records.forEach(function (serv) {
					if (serv.apis) {
						if($scope.serviceGroup.indexOf(serv.group) === -1){
							$scope.serviceGroup.push(serv.group);
						}
						let aclVersion = aclHelpers.groupApisForDisplay(serv.versions[version].apis, 'group');
						aclVersion["%v%"] = 1;
						serv.fixList = aclVersion;
						delete serv.apis;
					}
					else {
						let acl = [];
						if (serv.versions) {
							if($scope.serviceGroup.indexOf(serv.group) === -1){
								$scope.serviceGroup.push(serv.group);
							}
							for (let version in serv.versions) {
								if (serv.versions.hasOwnProperty(version) && serv.versions[version]) {
									let aclVersion = aclHelpers.groupApisForDisplay(serv.versions[version].apis, 'group');
									aclVersion["%v%"] = version;
									acl.push(aclVersion);
								}
							}
							serv.fixList = acl;
						}
					}
				});
				$scope.allServiceApis = response.records;
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
			}
			else {
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
			$scope.aclFill[envCode][service.name][version].accessType= "public";

			if (service.versions[version] && service.versions[version].apis && service.versions[version].apis.length > 0){
				service.versions[version].apis.forEach((oneApi)=>{
					if(!$scope.aclFill[envCode][service.name][version][oneApi.m]){
						$scope.aclFill[envCode][service.name][version][oneApi.m] = {
							apis: {}
						};
					}
					$scope.aclFill[envCode][service.name][version][oneApi.m].apis[oneApi.v] = {accessType: "public"};
				});
			}
		}
	};
	
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
	// default operation
	overlayLoading.show(function () {
		$scope.getAllServicesList();
	});
}]);

productizationApp.controller('aclPackageCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', 'injectFiles', function ($scope, $routeParams, ngDataApi, aclHelpers, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.environments_codes = [];
	$scope.allServiceApis = [];
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	$scope.serviceGroup = [];
	
	$scope.normalizeMethod = function (method) {
		let newMethod;
		switch(method.toLowerCase()) {
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
			default:
				newMethod = 'Read';
		}
		return newMethod
	};
	
	$scope.minimize = function (envCode, service) {
		if(!$scope.aclFill[envCode][service.name]){
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = false;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.expand = function (envCode, service) {
		if(!$scope.aclFill[envCode][service.name]){
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
			}
			else {
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
				$scope.aclFill = response.scope && response.scope.acl  ? response.scope.acl : {};
				$scope.$evalAsync(function ($scope) {
					aclHelpers.fillAcl($scope);
				});
			}
		});
	};
	
	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": { "short": true }
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				for (let x = response.length -1 ; x >= 0; x--) {
					if(response && response[x] && response[x].code && response[x].code.toUpperCase() === "DASHBOARD"){
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
			}
			else {
				response.records.forEach(function (serv) {
					if (serv.apis) {
						if($scope.serviceGroup.indexOf(serv.group) === -1){
							$scope.serviceGroup.push(serv.group);
						}
						let aclVersion = aclHelpers.groupApisForPackageDisplay(serv.versions[version].apis, 'group');
						aclVersion["%v%"] = 1;
						serv.fixList = aclVersion;
						delete serv.apis;
					}
					else {
						let acl = [];
						if (serv.versions) {
							for (let version in serv.versions) {
								if (serv.versions.hasOwnProperty(version) && serv.versions[version]) {
									if($scope.serviceGroup.indexOf(serv.group) === -1){
										$scope.serviceGroup.push(serv.group);
									}
									let aclVersion = aclHelpers.groupApisForPackageDisplay(serv.versions[version].apis, 'group');
									aclVersion["%v%"] = version;
									acl.push(aclVersion);
								}
							}
							serv.fixList = acl;
						}
					}
				});
				$scope.allServiceApis = response.records;
				$scope.getEnvironments();
			}
		});
	};
	
	$scope.saveACL = function () {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		console.log($scope)
		console.log(angular.copy($scope.aclFill))
		var result = aclHelpers.constructAclFromPost($scope.aclFill, true);
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
		overlayLoading.hide();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
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
	
	injectFiles.injectCss("modules/dashboard/productization/productization.css");
	// default operation
	overlayLoading.show(function () {
		$scope.getAllServicesList();
	});
}]);

productizationApp.controller('aclConsolePackageCtrl', ['$scope', '$routeParams', 'ngDataApi', 'aclHelpers', 'injectFiles', function ($scope, $routeParams, ngDataApi, aclHelpers, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	$scope.environments_codes = [];
	$scope.allServiceApis = [];
	$scope.aclFill = {};
	$scope.currentPackage = {};
	$scope.msg = {};
	$scope.serviceGroup = [];
	
	$scope.normalizeMethod = function (method) {
		let newMethod;
		switch(method.toLowerCase()) {
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
			default:
				newMethod = 'Read';
		}
		return newMethod
	};
	
	$scope.minimize = function (envCode, service) {
		if(!$scope.aclFill[envCode][service.name]){
			$scope.aclFill[envCode][service.name] = {};
		}
		$scope.aclFill[envCode][service.name].collapse = false;
		$scope.aclFill[envCode][service.name].include = true;
	};
	
	$scope.expand = function (envCode, service) {
		if(!$scope.aclFill[envCode][service.name]){
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
			}
			else {
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
				$scope.aclFill = angular.copy($scope.currentPackage.acl);
				$scope.aclScopeFill = response.scope ? angular.copy(response.scope.acl) : {};
				$scope.$evalAsync(function ($scope) {
					aclHelpers.fillPackageAcl($scope);
				});
			}
		});
	};
	
	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": { "short": true }
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
			}
			else {
				response.records.forEach(function (serv) {
					if (serv.apis) {
						if($scope.serviceGroup.indexOf(serv.group) === -1){
							$scope.serviceGroup.push(serv.group);
						}
						let aclVersion = aclHelpers.groupApisForDisplay(serv.versions.apis, 'group');
						aclVersion["%v%"] = 1;
						serv.fixList = aclVersion;
						delete serv.apis;
					}
					else {
						let acl = [];
						if (serv.versions) {
							for (let version in serv.versions) {
								if (serv.versions.hasOwnProperty(version) && serv.versions[version]) {
									if($scope.serviceGroup.indexOf(serv.group) === -1){
										$scope.serviceGroup.push(serv.group);
									}
									let aclVersion = aclHelpers.groupApisForDisplay(serv.versions[version].apis, 'group');
									aclVersion["%v%"] = version;
									acl.push(aclVersion);
								}
							}
							serv.fixList = acl;
						}
					}
				});
				$scope.allServiceApis = response.records;
				$scope.getEnvironments();
			}
		});
	};
	
	$scope.saveACL = function () {
		var productId = $routeParams.pid;
		var postData = $scope.currentPackage;
		
		var result = aclHelpers.constructAclFromPost($scope.aclFill);
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
		}
		console.log(angular.copy(options));
		overlayLoading.show();
		overlayLoading.hide();
		// getSendDataFromServer($scope, ngDataApi, options, function (error) {
		// 	overlayLoading.hide();
		// 	if (error) {
		// 		$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
		// 	}
		// 	else {
		// 		$scope.msg.type = '';
		// 		$scope.msg.msg = '';
		// 		$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
		// 	}
		// });
	};
	
	$scope.checkForGroupDefault = function (envCode, service, grp, val, myApi, v) {
		aclHelpers.checkForGroupDefault($scope, envCode, service, grp, val, myApi, v);
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