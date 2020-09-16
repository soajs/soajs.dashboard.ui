"use strict";

let multiTenantApp = soajsApp.components;
multiTenantApp.controller('tenantCtrl', ['$scope', '$compile', '$timeout', '$modal', '$routeParams', 'ngDataApi', '$cookies', 'injectFiles', 'mtsc', '$localStorage', function ($scope, $compile, $timeout, $modal, $routeParams, ngDataApi, $cookies, injectFiles, mtsc, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, tenantConfig.permissions);
	
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
			'label': translation.mainTenant[LANG],
			'type': 'product',
			'tenants': []
		},
		{
			'label': translation.subTenant[LANG],
			'type': 'client',
			'tenants': []
		}
	];
	
	$scope.currentEnv = '';
	if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
		$scope.currentEnv = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code.toLowerCase();
	}
	
	$scope.mt = {};
	$scope.mt.displayAlert = function (type, msg, id, isCode, service, orgMesg) {
		$scope.mt[id] = {};
		$scope.mt[id].alerts = [];
		if (isCode) {
			let msgT = getCodeMessage(msg, service);
			if (msgT) {
				msg = msgT;
			} else if (orgMesg) {
				msg = orgMesg;
			}
		}
		$scope.mt[id].alerts.push({'type': type, 'msg': msg});
		$scope.mt.closeAllAlerts(id);
	};
	
	$scope.mt.closeAlert = function (index, id) {
		$scope.mt[id].alerts.splice(index, 1);
	};
	
	$scope.mt.closeAllAlerts = function (id) {
		$timeout(function () {
			$scope.mt[id].alerts = [];
		}, 7000);
	};
	
	$scope.openKeys = function (id, app) {
		app.showKeys = true;
	};
	
	$scope.closeKeys = function (id, app) {
		app.showKeys = false;
	};
	
	$scope.openSubKeys = function (id, app) {
		app.showSubKeys = true;
	};
	
	$scope.closeSubKeys = function (id, app) {
		app.showSubKeys = false;
	};
	
	$scope.removeAppKey = function (id, app, key, event) {
		//check if key has dashboard access, if yes: set dashboardAccess of tenant to false
		$scope.tenantsList.rows.forEach(function (oneTenant) {
			if (oneTenant._id === id && oneTenant.dashboardAccess) {
				oneTenant.applications.forEach(function (oneApp) {
					if (oneApp.appId === app.appId && oneApp.dashboardAccess) {
						oneApp.keys.forEach(function (oneKey) {
							if (oneKey.key === key && oneKey.dashboardAccess) {
								oneTenant.dashboardAccess = false;
								oneApp.dashboardAccess = false;
							}
						});
					}
				});
			}
		});
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/multitenant/tenant/application/key",
			"params": {"id": id, "appId": app.appId, "key": key}
		}, function (error) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, id, true, 'multitenant', error.message);
			} else {
				$scope.mt.displayAlert('success', translation.applicationKeyRemovedSuccessfully[LANG], id);
				$scope.listKeys(id, app.appId);
			}
		});
		if (event && event.stopPropagation) {
			event.stopPropagation();
		}
	};
	
	$scope.getProds = function (cb) {
		$scope.availablePackages = [];
		$scope.availableProducts = [];
		$scope.availableLockedPackages = [];
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/products/"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				let prods = [];
				let len = response.length;
				let v, i;
				let p = {};
				for (v = 0; v < len; v++) {
					p = response[v];
					$scope.availableProducts.push({
						'v': p.code,
						'l': p.code,
					});
					if (p && p.packages) {
						let ll = p.packages.length;
						for (i = 0; i < ll; i++) {
							prods.push({
								'pckCode': p.packages[i].code,
								'prodCode': p.code,
								'locked': p.locked || false,
								'v': p.packages[i].code,
								'l': p.packages[i].code,
								'acl': p.packages[i].acl
							});
						}
					}
				}
				$scope.availablePackages = prods;
				cb();
			}
		});
	};
	
	$scope.getEnvironments = function (cb) {
		$scope.availableEnv = [];
		$scope.availableEnvThrottling = {};
		$scope.environments_codes = angular.copy($localStorage.environments);
		for (let x = $scope.environments_codes.length - 1; x >= 0; x--) {
			if ($scope.environments_codes && $scope.environments_codes[x] && $scope.environments_codes[x].code) {
				if ($scope.environments_codes[x].code.toUpperCase() === "DASHBOARD") {
					$scope.environments_codes.splice(x, 1);
				} else {
					if ($scope.environments_codes[x].code.toUpperCase() !== "DASHBOARD" && $scope.availableEnv.indexOf($scope.environments_codes[x].code.toLowerCase() === -1)) {
						$scope.availableEnv.push($scope.environments_codes[x].code.toLowerCase());
					}
				}
			}
		}
		if (cb && typeof cb === 'function') {
			return cb();
		}
	};
	
	$scope.listTenants = function (cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/tenants"
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
			} else {
				$scope.splitTenantsByType(response, function () {
					
					if ($scope.tenantsList && $scope.tenantsList.rows) {
						response.forEach((tenantFromAPI) => {
							$scope.tenantsList.rows.forEach((tenantInUI) => {
								if (tenantInUI.code === tenantFromAPI.code) {
									tenantFromAPI.showKeys = tenantInUI.showKeys;
									tenantFromAPI.showSubKeys = tenantInUI.showSubKeys;
									
									tenantInUI.applications.forEach((oneAppInUI) => {
										tenantFromAPI.applications.forEach((oneAppFromAPI) => {
											if (oneAppInUI.appId === oneAppFromAPI.appId) {
												oneAppFromAPI.showKeys = oneAppInUI.showKeys;
											}
										});
									});
								}
							});
						});
					}
					
					
					$scope.tenantsList = {
						rows: response
					};
					
					$scope.tenantsList.actions = {
						'editTenant': {
							'label': translation.editTenant[LANG],
							'command': function (row) {
								$scope.edit_Tenant(row);
							}
						},
						'updateOAuth': {
							'label': translation.updateOAuth[LANG],
							'command': function (row) {
								$scope.update_oAuth(row);
							}
						},
						'turnOffOAuth': {
							'label': translation.turnOffOAuth[LANG],
							'command': function (row) {
								$scope.turnOffOAuth(row);
							}
						},
						'turnOnOAuth': {
							'label': translation.turnOnOAuth[LANG],
							'command': function (row) {
								$scope.turnOnOAuth(row);
							}
						},
						'delete': {
							'label': 'Remove',
							'commandMsg': translation.areYouSureWantRemoveTenant[LANG],
							'command': function (row) {
								$scope.removeTenant(row);
							}
						}
					};
					
					if (cb && typeof cb === 'function') {
						return cb();
					}
				});
			}
		});
	};
	
	$scope.getTenantLoginMode = function (tenant) {
		// set loginMode to urac or mini urac from the first env available
		// if the tenant have at least one application and one key and one environment,
		// it will have a login mode either set to urac or defaulted to miniurac
		let loginMode;
		let found = false;
		let atLeastOneKey = false;
		for (let i = 0; !found && tenant.applications && i < tenant.applications.length; i++) {
			let keys = tenant.applications[i].keys;
			for (let j = 0; !found && keys && j < keys.length; j++) {
				atLeastOneKey = true;
				if (keys[j] && keys[j].config) {
					let envs = Object.keys(keys[j].config);
					for (let k = 0; !found && envs && k < envs.length; k++) {
						let oauth = keys[j].config[envs[k]].oauth;
						if (oauth && oauth.loginMode === 'urac') {
							loginMode = 'urac';
						} else {
							loginMode = 'miniurac';
						}
						found = true;
					}
				}
			}
		}
		
		return {
			atLeastOneKey,
			loginMode
		};
	};
	
	$scope.splitTenantsByType = function (tenants, callback) {
		//Clearing previously filled tenants arrays
		for (let i = 0; i < $scope.tenantTabs.length; i++) {
			$scope.tenantTabs[i].tenants = [];
		}
		tenants.forEach(function (oneTenant) {
			if (!oneTenant.type) {
				oneTenant.type = "client";
			}
			for (let i = 0; i < $scope.tenantTabs.length; i++) {
				if (oneTenant.type === $scope.tenantTabs[i].type) {
					
					let tenantInfo = $scope.getTenantLoginMode(oneTenant);
					oneTenant.loginMode = tenantInfo.loginMode;
					oneTenant.atLeastOneKey = tenantInfo.atLeastOneKey;
					$scope.tenantTabs[i].tenants.push(oneTenant);
				}
			}
			
			//re-render allowed environments
			oneTenant.applications.forEach((oneApplication) => {
				oneApplication.availableEnvs = $scope.availableEnv;
			});
		});
		
		$scope.originalTenants = angular.copy($scope.tenantTabs);
		callback();
	};
	
	$scope.listOauthUsers = function (row) {
		let tId = row['_id'];
		if (!row.alreadyGotAuthUsers) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/tenant/oauth/users",
				"params": {"id": tId}
			}, function (error, response) {
				if (error) {
					$scope.mt.displayAlert('danger', error.code, tId, true, 'dashboard', error.message);
				} else {
					row.alreadyGotAuthUsers = true;
					if (response.length > 0) {
						for (let i = 0; i < $scope.tenantsList.rows.length; i++) {
							if ($scope.tenantsList.rows[i]['_id'] === tId) {
								$scope.tenantsList.rows[i].oAuthUsers = response;
								break;
							}
						}
					}
				}
			});
		}
	};
	
	$scope.edit_Tenant = function (data) {
		let formConfig = angular.copy(tenantConfig.form.tenantEdit);
		//formConfig.entries[0].type = 'readonly';
		//formConfig.label = 'Edit Basic Tenant Information';
		formConfig.timeout = $timeout;
		let keys = Object.keys(data);
		
		for (let i = formConfig.entries.length - 1; i >= 0; i--) {
			keys.forEach(function (inputName) {
				if (formConfig.entries[i].name === inputName) {
					formConfig.entries[i].value = data[inputName];
				}
			});
		}
		
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editTenant',
			label: data.type === 'product' ? translation.editBasicTenantApplication[LANG] : translation.editBasicTenantApplication[LANG],
			data: {},
			actions: [
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				},
				{
					'type': 'submit',
					'label': translation.updateTenant[LANG],
					'btn': 'primary',
					'action': function (formData) {
						
						let postData = {
							'type': data.type,
							'name': formData.name,
							'description': formData.description,
							'tag': formData.tag,
							'profile': formData.profile
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/multitenant/admin/tenant",
							"data": postData,
							"params": {"id": data['_id']}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
							} else {
								if (formData.secret && $scope.access.tenant.oauth.update) {
									let oAuthData = {
										'secret': formData.secret,
										'availableEnv': $scope.availableEnv
										//'redirectURI': formData.redirectURI
									};
									
									getSendDataFromServer($scope, ngDataApi, {
										"method": "put",
										"routeName": "/multitenant/admin/tenant/oauth",
										"data": oAuthData,
										"params": {"id": data['_id']}
									}, function (error) {
										if (error) {
											$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
										} else {
											$scope.$parent.displayAlert('success', translation.TenantInfoUpdatedSuccessfully[LANG]);
											$scope.modalInstance.close();
											$scope.form.formData = {};
											$scope.listTenants();
										}
									});
								} else {
									$scope.$parent.displayAlert('success', translation.TenantUpdatedSuccessfully[LANG]);
									$scope.modalInstance.close();
									$scope.form.formData = {};
									$scope.listTenants();
								}
							}
						});
					}
				}
			]
		};
		
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.turnOffOAuth = function (data) {
		let postData = {
			'secret': data.oauth.secret,
			'availableEnv': $scope.availableEnv,
			'oauthType': 'off'
		};
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/multitenant/admin/tenant/oauth",
			"data": postData,
			"params": {"id": data['_id']}
		}, function (error) {
			if (error) {
				$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
			} else {
				$scope.$parent.displayAlert('success', translation.TenantInfoUpdatedSuccessfully[LANG]);
				if ($scope.form && $scope.form.formData) {
					$scope.form.formData = {};
				}
				$scope.listTenants();
			}
		});
	};
	
	$scope.turnOnOAuth = function (data) {
		let postData = {
			'availableEnv': $scope.availableEnv,
			'secret': data.oauth.secret,
			'oauthType': (data.oauth.loginMode === 'oauth') ? 'miniurac' : data.oauth.loginMode
		};
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/multitenant/admin/tenant/oauth",
			"data": postData,
			"params": {"id": data['_id']}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
			} else {
				$scope.$parent.displayAlert('success', translation.TenantInfoUpdatedSuccessfully[LANG]);
				$scope.listTenants();
			}
		});
	};
	
	$scope.update_oAuth = function (data) {
		// Check if pinLogin is turned ON, by default is OFF
		let pinLogin = false;
		if ($localStorage.ui_setting) {
			if ($localStorage.ui_setting.pinLogin) {
				pinLogin = $localStorage.ui_setting.pinLogin;
			}
		}
		
		let products = [];
		if (data.applications && data.applications.length > 0) {
			data.applications.forEach((oneApp) => {
				if (oneApp.product) {
					products.push({l: oneApp.product, v: oneApp.product});
				}
			});
		}
		if (data.type === 'client') {
			products = $scope.availableProducts;
		}
		let formConfig = angular.copy(tenantConfig.form.updateOauth);
		formConfig.timeout = $timeout;
		
		// on edit start
		let oAuth = data.oauth;
		if (oAuth.secret) {
			data.secret = oAuth.secret;
		}
		if (data.secret) {
			data.oauthType = data.loginMode;
		}
		
		function loginMode(id, selected, form) {
			if (pinLogin && selected === "urac" && !form.entries[4]) {
				form.entries.splice(4, 0, {
					'name': 'pin',
					'label': translation.pin[LANG],
					'type': 'checkbox',
					'value': products,
					'required': false,
					'labelMsg': 'Pin login is available when oAuth User Authentication Type is "client to server". Kindly select what product from the list below to turn on pin login for:',
				});
			} else if (selected === "miniurac" && form.entries[4] && form.entries[4].name === 'pin') {
				form.entries.splice(4, 1);
			}
		}
		
		formConfig.entries[1].onAction = function (id, selected, form) {
			if (selected === "2" && !form.entries[3]) {
				form.entries.splice(3, 0, {
					'name': 'loginMode',
					'label': translation.oAuthUserType[LANG],
					'type': 'radio',
					'value': [
						{
							'v': 'urac',
							'l': 'Client to server authentication (URAC)'
						},
						{
							'v': 'miniurac',
							'l': 'Server to server authentication (miniURAC)'
						}
					],
					'required': true,
					'onAction': function (id, selected, form) {
						loginMode(id, selected, form);
					},
				});
			} else if (selected === "0" && form.entries[3].name === 'loginMode') {
				if (form.entries[4]) {
					form.entries.splice(4, 1);
				}
				form.entries.splice(3, 1);
			}
		};
		
		formConfig.entries[2].onAction = function (id, selected, form) {
			loginMode(id, selected, form);
		};
		
		if (formConfig.entries[1].value[1].selected && formConfig.entries[2].name === 'loginMode') {
			formConfig.entries.splice(2, 1);
		}
		
		let keys = Object.keys(data.oauth);
		
		//add value of products on edit
		for (let i = 0; i < formConfig.entries.length; i++) {
			keys.forEach(function (inputName) {
				if (formConfig.entries[i].name === inputName) {
					if (inputName === 'loginMode' || inputName === 'type') {
						for (let j = 0; j < formConfig.entries[i].value.length; j++) {
							if ((data.oauth[inputName] === 'oauth' && formConfig.entries[i].value[j].v === "miniurac") || (formConfig.entries[i].value[j].v === data.oauth[inputName])) {
								formConfig.entries[i].value[j].selected = true;
							}
						}
					} else {
						formConfig.entries[i].value = data[inputName];
					}
				}
			});
		}
		if (pinLogin && formConfig.entries[2] && formConfig.entries[2].value[0].selected) {
			formConfig.entries.splice(4, 0, {
				'name': 'pin',
				'label': translation.pin[LANG],
				'type': 'checkbox',
				'value': products,
				'required': false,
				'labelMsg': 'Pin login is available when oAuth User Authentication Type is "client to server". Kindly select what product from the list below to turn on pin login for:',
			});
		}
		if (data.oauth['pin'] && formConfig.entries[3] && formConfig.entries[3].name === "pin") {
			if (formConfig.entries[3].value.length > 0) {
				for (let l = 0; l < formConfig.entries[3].value.length; l++) {
					if (data.oauth['pin'].hasOwnProperty(formConfig.entries[3].value[l].v)
						&& data.oauth['pin'][formConfig.entries[3].value[l].v]
						&& data.oauth['pin'][formConfig.entries[3].value[l].v].enabled) {
						formConfig.entries[3].value[l].selected = true;
					}
				}
			}
		}
		// on edit end
		formConfig.entries.unshift({
			type: "html",
			value: "<div class='alert alert-warning'>" +
				"<h4><span class='icon icon-info'></span>&nbsp;Warning</h4><hr />" +
				"<p>Be advised that when turning ON and OFF or modifying the oAuth Security of a tenant, all the keys configuration for all the applications belonging to this tenant will be modified based on the option you select. <a href='https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/61979922/Multitenancy#Multitenancy-oauth' target='_blank'>Learn More</a></p>" +
				"</div>"
		});
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'updateOAuth',
			label: translation.editTenantOauth[LANG],
			data: {},
			actions: [
				{
					'type': 'submit',
					'label': data.secret ? translation.updateOAuth[LANG] : translation.turnOnOAuth[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let postData = {
							'secret': formData.secret,
							'availableEnv': $scope.availableEnv,
							'type': parseInt(formData.type)
						};
						if (formData.loginMode && typeof formData.loginMode === "string") {
							postData.oauthType = formData.loginMode;
						}
						if (formData.loginMode === "urac") {
							let products = angular.copy($scope.availableProducts);
							let pin = {};
							products.forEach((oneProduct) => {
								if (oneProduct.v) {
									pin[oneProduct.v] = {
										enabled: false
									};
									if (formData.pin && Array.isArray(formData.pin) && formData.pin.indexOf(oneProduct.v) !== -1) {
										pin[oneProduct.v] = {
											enabled: true
										};
									}
								}
							});
							if (Object.keys(pin).length > 0) {
								postData.pin = pin;
							}
						}
						let opts = {
							"method": "put",
							"routeName": "/multitenant/admin/tenant/oauth",
							"data": postData,
							"params": {"id": data['_id']}
						};
						getSendDataFromServer($scope, ngDataApi, opts, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
							} else {
								$scope.$parent.displayAlert('success', translation.TenantInfoUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listTenants();
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
	
	$scope.removeTenant = function (row) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/multitenant/tenant",
			"params": {"id": row._id}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
			} else {
				$scope.$parent.displayAlert('success', translation.TenantRemovedSuccessfully[LANG]);
				$scope.listTenants();
			}
		});
	};
	
	$scope.addTenant = function () {
		let formConfig = angular.copy(tenantConfig.form.tenantAdd);
		for (let x = formConfig.entries.length - 1; x >= 0; x--) {
			
			if (formConfig.entries[x].name === 'product') {
				formConfig.entries[x].value = $scope.availableProducts;
				formConfig.entries[x].onAction = function (id, selected, form) {
					let packages = [];
					$scope.availablePackages.forEach((pack) => {
						if (pack.prodCode === selected) {
							packages.push(pack);
						}
					});
					let pack = {
						'name': 'package',
						'label': translation.package[LANG],
						'type': 'select',
						'tooltip': translation.formPackagePlaceHolder[LANG],
						'required': true,
						'fieldMsg': translation.formPackageToolTip[LANG],
						'value': packages
					};
					//insert at a the package after the product
					form.entries.splice(3, 0, pack);
					if (form.entries[4].name !== "profile") {
						form.entries.splice(4, 1);
					}
					
				}
			}
		}
		let options = {
			timeout: $timeout,
			form: formConfig,
			type: 'tenant',
			name: 'addTenant',
			label: translation.addNewTenant[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.addTenant[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let tCode = $scope.generateTenantCode(formData.name);
						
						let postData = {
							'type': 'product',
							'code': tCode,
							'name': formData.name,
							'description': formData.description,
							'tag': formData.tag,
							'console': false,
							'profile': formData.profile
						};
						
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/multitenant/tenant",
							"data": postData
						}, function (error, response) {
							
							if (error) {
								$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listTenants();
							} else {
								let tId = response._id;
								if (formData.package && (typeof (formData.package) === 'string')) {
									let ttl = 7 * 24;
									let postData = {
										'description': 'Dashboard application for ' + formData.package + ' package',
										'_TTL': ttl.toString(),
										'productCode': formData.package.split("_")[0],
										'packageCode': formData.package.split("_")[1]
									};
									
									getSendDataFromServer($scope, ngDataApi, {
										"method": "post",
										"routeName": "/multitenant/admin/tenant/application",
										"data": postData,
										"params": {"id": tId}
									}, function (error, response) {
										if (error) {
											$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
											$scope.modalInstance.close();
											$scope.form.formData = {};
											$scope.listTenants();
										} else {
											let appId = response.appId;
											getSendDataFromServer($scope, ngDataApi, {
												"method": "post",
												"routeName": "/multitenant/admin/tenant/application/key",
												"params": {"id": tId},
												"data": {
													"appId": appId
												}
											}, function (error) {
												if (error) {
													$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
													$scope.modalInstance.close();
													$scope.form.formData = {};
													$scope.listTenants();
												} else {
													$scope.modalInstance.close();
													$scope.form.formData = {};
													$scope.listTenants();
												}
											});
											
										}
									});
								} else {
									$scope.$parent.displayAlert('success', translation.TenantAddedSuccessfully[LANG]);
									$scope.modalInstance.close();
									$scope.form.formData = {};
									$scope.listTenants();
								}
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
	
	$scope.addSubTenant = function (tenant) {
		let formConfig = angular.copy(tenantConfig.form.tenantAdd);
		formConfig.entries.unshift({
			'name': 'mainTenant',
			'label': 'Main Tenant',
			'type': 'text',
			'value': tenant.code,
			'required': false,
			'disabled': true
		});
		
		let availableProducts = [];
		if (tenant && tenant.applications) {
			tenant.applications.forEach((oneApp) => {
				if (availableProducts.length === 0) {
					availableProducts.push({l: oneApp.product, v: oneApp.product});
				} else {
					let found = availableProducts.find(product => product && (product.v === oneApp.product));
					if (!found) {
						availableProducts.push({l: oneApp.product, v: oneApp.product});
					}
				}
				
			});
		}
		
		for (let x = formConfig.entries.length - 1; x >= 0; x--) {
			if (formConfig.entries[x].name === 'product') {
				formConfig.entries[x].value = availableProducts;
				formConfig.entries[x].onAction = function (id, selected, form) {
					let packages = [];
					$scope.availablePackages.forEach((pack) => {
						if (pack.prodCode === selected) {
							packages.push(pack);
						}
					});
					let pack = {
						'name': 'package',
						'label': translation.package[LANG],
						'type': 'select',
						'tooltip': translation.formPackagePlaceHolder[LANG],
						'required': true,
						'fieldMsg': translation.formPackageToolTip[LANG],
						'value': packages
					};
					//insert at a the package after the product
					form.entries.splice(4, 0, pack);
					if (form.entries[5].name !== "profile") {
						form.entries.splice(5, 1);
					}
					
				}
			}
		}
		let options = {
			timeout: $timeout,
			form: formConfig,
			type: 'tenant',
			name: 'addTenant',
			label: translation.addNewSubTenant[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.addTenant[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let tCode = $scope.generateTenantCode(formData.name);
						
						let postData = {
							'type': 'client',
							'code': tCode,
							'name': formData.name,
							'description': formData.description,
							'tag': formData.tag,
							'mainTenant': tenant._id,
							'profile': formData.profile
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/multitenant/tenant",
							"data": postData
						}, function (error, response) {
							
							if (error) {
								$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listTenants();
							} else {
								let tId = response._id;
								if (formData.package && (typeof (formData.package) === 'string')) {
									let ttl = 7 * 24;
									let postData = {
										'description': 'Dashboard application for ' + formData.package + ' package',
										'_TTL': ttl.toString(),
										'productCode': formData.package.split("_")[0],
										'packageCode': formData.package.split("_")[1]
									};
									
									getSendDataFromServer($scope, ngDataApi, {
										"method": "post",
										"routeName": "/multitenant/admin/tenant/application",
										"data": postData,
										"params": {"id": tId}
									}, function (error, response) {
										if (error) {
											$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
											$scope.modalInstance.close();
											$scope.form.formData = {};
											$scope.listTenants();
										} else {
											let appId = response.appId;
											getSendDataFromServer($scope, ngDataApi, {
												"method": "post",
												"routeName": "/multitenant/admin/tenant/application/key",
												"params": {"id": tId},
												"data": {
													"appId": appId
												}
											}, function (error, response) {
												if (error) {
													$scope.$parent.displayAlert('danger', error.code, true, 'multitenant', error.message);
													$scope.modalInstance.close();
													$scope.form.formData = {};
													$scope.listTenants();
												} else {
													$scope.modalInstance.close();
													$scope.form.formData = {};
													$scope.listTenants();
												}
											});
											
										}
									});
								} else {
									$scope.$parent.displayAlert('success', translation.TenantAddedSuccessfully[LANG]);
									$scope.modalInstance.close();
									$scope.form.formData = {};
									$scope.listTenants();
								}
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
	
	$scope.generateTenantCode = function (tName) {
		let tCode = "";
		let nameArray = tName.split(" ");
		let index = Math.ceil(4 / nameArray.length);
		
		for (let i = 0; i < nameArray.length && tCode.length < 4; i++) {
			nameArray[i] = nameArray[i].replace(/[!@#$%^&*()_+,.<>;'?]/, "");
			if (tCode.length === 3) {
				tCode += nameArray[i].slice(0, 1);
				break;
			}
			if (nameArray[i].length > 1) {
				tCode += nameArray[i].slice(0, index);
			} else {
				tCode += nameArray[i].slice(0, index);
				index++;
			}
		}
		
		if (tCode.length < 4) {
			tCode += "tenant".slice(0, 4 - tCode.length);
		} else if (tCode.length > 4) {
			tCode = tCode.slice(0, 4);
		}
		tCode = tCode.toUpperCase();
		
		let counter = 1;
		return $scope.checkTenantCodeAvailability(tName, tCode, counter);
	};
	
	$scope.checkTenantCodeAvailability = function (tName, tCode, counter) {
		$scope.tenantsList.rows.forEach(function (oneTenant) {
			if (oneTenant.code === tCode && oneTenant.name !== tName) {
				tCode = tCode.slice(0, 3) + counter++;
				return $scope.checkTenantCodeAvailability(tName, tCode, counter);
			}
		});
		return tCode;
	};
	
	$scope.reloadOauthUsers = function (tId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/tenant/oauth/users",
			"params": {"id": tId}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				for (let i = 0; i < $scope.tenantsList.rows.length; i++) {
					if ($scope.tenantsList.rows[i]['_id'] === tId) {
						$scope.tenantsList.rows[i].oAuthUsers = response;
						break;
					}
				}
			}
		});
	};
	
	$scope.removeTenantOauthUser = function (tId, user) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/console/tenant/oauth/user",
			"params": {"id": tId, 'uId': user['_id']}
		}, function (error) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				$scope.mt.displayAlert('success', translation.userDeletedSuccessfully[LANG], tId);
				$scope.reloadOauthUsers(tId);
			}
		});
	};
	
	$scope.editTenantOauthUser = function (tId, user) {
		user.password = null;
		user.confirmPassword = null;
		let options = {
			timeout: $timeout,
			form: angular.copy(tenantConfig.form.oauthUserUpdate),
			name: 'updateUser',
			label: translation.updateUser[LANG],
			data: user,
			actions: [
				{
					'type': 'submit',
					'label': translation.updateoAuthUser[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let postData = {
							'userId': formData.userId
						};
						if (formData.password && formData.password !== '') {
							if (formData.password !== formData.confirmPassword) {
								$scope.form.displayAlert('danger', translation.passwordConfirmFieldsNotMatch[LANG]);
								return;
							} else {
								postData.password = formData.password;
							}
						}
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/console/tenant/oauth/user",
							"data": postData,
							"params": {"id": tId, 'uId': user['_id']}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.userUpdatedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadOauthUsers(tId);
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
	
	$scope.addOauthUser = function (tId) {
		let options = {
			timeout: $timeout,
			form: angular.copy(tenantConfig.form.oauthUser),
			name: 'add_oauthUser',
			label: translation.addNewoAuthUser[LANG],
			data: {
				'userId': null,
				'user_password': null
			},
			actions: [
				{
					'type': 'submit',
					'label': translation.addoAuthUser[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let postData = {
							'userId': formData.userId,
							'password': formData.user_password
						};
						if (formData.user_password !== formData.confirmPassword) {
							$scope.form.displayAlert('danger', translation.passwordConfirmFieldsNotMatch[LANG]);
							return;
						}
						
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/console/tenant/oauth/users",
							"data": postData,
							"params": {"id": tId}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.userAddedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadOauthUsers(tId);
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
	
	$scope.addTenantApplication = function (tId) {
		let formConfig = angular.copy(tenantConfig.form.application);
		formConfig.entries.forEach(function (oneEn) {
			if (oneEn.type === 'select') {
				oneEn.value[0].selected = true;
			}
			if (oneEn.name === 'product') {
				oneEn.type = 'select';
				oneEn.value = $scope.availableProducts;
				oneEn.onAction = function (id, selected, form) {
					let packages = [];
					$scope.availablePackages.forEach((pack) => {
						if (pack.prodCode === selected) {
							packages.push(pack);
						}
					});
					let pack = {
						'name': 'package',
						'label': translation.package[LANG],
						'type': 'select',
						'tooltip': translation.formPackagePlaceHolder[LANG],
						'required': false,
						'fieldMsg': translation.formPackageToolTip[LANG],
						'value': packages
					};
					//insert at a the package after the product
					form.entries.splice(1, 0, pack);
					if (form.entries[2].name !== "description") {
						form.entries.splice(2, 1);
					}
				}
			}
		});
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addApplication',
			label: translation.addNewApplication[LANG],
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': translation.addApplication[LANG],
					'btn': 'primary',
					'action': function (formData) {
						
						let postData = {
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL.toString()
						};
						if (formData.package && (typeof (formData.package) === 'string')) {
							overlayLoading.show();
							let productCode = formData.package.split("_")[0];
							let packageCode = formData.package.split("_")[1];
							postData.productCode = productCode;
							postData.packageCode = packageCode;
							overlayLoading.hide();
							let opts = {
								"method": "post",
								"routeName": "/multitenant/admin/tenant/application",
								"data": postData,
								"params": {"id": tId}
							};
							getSendDataFromServer($scope, ngDataApi, opts, function (error) {
								overlayLoading.hide();
								if (error) {
									$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
								} else {
									$scope.mt.displayAlert('success', translation.applicationAddedSuccessfully[LANG], tId);
									$scope.modalInstance.close();
									$scope.form.formData = {};
									$scope.reloadApplications(tId);
								}
							});
						} else {
							$scope.form.displayAlert('danger', translation.choosePackage[LANG]);
						}
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
	
	$scope.editTenantApplication = function (tId, data) {
		let formConfig = angular.copy(tenantConfig.form.application);
		let recordData = angular.copy(data);
		recordData._TTL = recordData._TTL / 3600000;
		let pack = {
			'name': 'package',
			'label': translation.productPackage[LANG],
			'type': 'text',
			'placeholder': translation.formProductPackagePlaceHolder[LANG],
			'value': '',
			'tooltip': translation.formProductPackageToolTip[LANG],
			'required': true
		};
		formConfig.entries.splice(1, 0, pack);
		formConfig.entries[0].disabled = true;
		formConfig.entries[1].disabled = true;
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editApplication',
			label: translation.editApplication[LANG],
			data: recordData,
			actions: [
				{
					'type': 'submit',
					'label': translation.editApplication[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let packageCode = formData.package.split("_")[1];
						let postData = {
							'productCode': formData.product,
							'packageCode': formData.package,
							'description': formData.description
						};
						
						if (formData._TTL) {
							postData._TTL = Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL.toString();
						}
						
						postData.packageCode = packageCode;
						postData.acl = recordData.acl;
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/multitenant/admin/tenant/application",
							"data": postData,
							"params": {"id": tId, "appId": data.appId}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.applicationUpdatedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadApplications(tId);
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
	
	$scope.reloadApplications = function (tId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/admin/tenant/applications",
			"params": {"id": tId}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				for (let i = 0; i < $scope.tenantsList.rows.length; i++) {
					if ($scope.tenantsList.rows[i]['_id'] === tId) {
						let currentApps = $scope.tenantsList.rows[i].applications;
						response.forEach(function (app) {
							for (let i = 0; i < currentApps.length; i++) {
								if (app.appId === currentApps[i].appId && currentApps[i].dashboardAccess) {
									app.dashboardAccess = true;
									break;
								}
							}
							app.availableEnvs = $scope.availableEnv
						});
						
						
						$scope.tenantsList.rows[i].applications = response;
						break;
					}
				}
			}
		});
	};
	
	$scope.removeTenantApplication = function (tId, appId) {
		//check if application has dashboard access, if yes: set dashboardAccess of tenant to false
		$scope.tenantsList.rows.forEach(function (oneTenant) {
			if (oneTenant._id === tId && oneTenant.dashboardAccess) {
				oneTenant.applications.forEach(function (oneApp) {
					if (oneApp.appId === appId && oneApp.dashboardAccess) {
						oneTenant.dashboardAccess = false;
					}
				});
			}
		});
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/multitenant/tenant/application",
			"params": {"id": tId, "appId": appId}
		}, function (error) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				$scope.mt.displayAlert('success', translation.selectedAppRemoved[LANG], tId);
				$scope.reloadApplications(tId);
			}
		});
	};
	
	$scope.addNewKey = function (tId, appId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "post",
			"routeName": "/multitenant/admin/tenant/application/key",
			"params": {"id": tId},
			"data": {
				"appId": appId
			}
		}, function (error) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				$scope.mt.displayAlert('success', translation.applicationKeyAddedSuccessfully[LANG], tId);
				$scope.listKeys(tId, appId, true);
			}
		});
	};
	
	$scope.emptyConfiguration = function (tId, appId, key, env) {
		let configObj = {};
		let postData = {
			'envCode': env,
			'config': configObj,
			"appId": appId,
			"key": key
		};
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/multitenant/admin/tenant/application/key/config",
			"data": postData,
			"params": {"id": tId},
		}, function (error) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				$scope.mt.displayAlert('success', translation.keyConfigurationUpdatedSuccessfully[LANG], tId);
				$scope.reloadConfiguration(tId, appId, key);
			}
		});
		
	};
	
	$scope.updateConfiguration = function (tId, appId, appPackage, key, env, value) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/registry/throttling",
			"params": {
				"env": env
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			} else {
				if (response && Object.keys(response).length > 0) {
					$scope.availableEnvThrottling[env.toLowerCase()] = response;
				} else {
					$scope.availableEnvThrottling[env.toLowerCase()] = null;
				}
				mtsc.updateConfiguration($scope, tId, appId, appPackage, key, env, value);
			}
		});
		
	};
	
	$scope.addNewExtKey = function (tId, appId, key, productCode) {
		let formConfig = tenantConfig.form.extKey;
		formConfig.entries.forEach(function (oneFormField) {
			if (oneFormField.name === 'environment') {
				let list = [];
				let availableEnvs = $scope.availableEnv;
				availableEnvs.forEach(function (envCode) {
					list.push({
						"v": envCode,
						"l": envCode,
						"selected": (envCode === $scope.currentEnv)
					});
				});
				oneFormField.value = list;
			}
		});
		
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addExtKey',
			label: translation.addNewExternalKey[LANG],
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let deviceObj = (formData.device) ? formData.device : {};
						let geoObj = (formData.geo) ? formData.geo : {};
						let postData = {
							'label': formData.label,
							'expDate': formData.expDate,
							'device': deviceObj,
							'geo': geoObj,
							'dashboardAccess': !!formData.dashboardAccess,
							'env': formData.environment.toUpperCase()
						};
						
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/multitenant/admin/tenant/application/key/ext",
							"data": postData,
							"params": {"id": tId, "appId": appId, "key": key}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.externalKeyAddedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys(tId, appId, key);
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
	
	$scope.editExtKey = function (tId, appId, data, key) {
		let dataForm = angular.copy(data);
		if (data.geo) {
			dataForm.geo = angular.copy(data.geo);
		}
		if (data.device) {
			dataForm.device = angular.copy(data.device);
		}
		if (data.label) {
			dataForm.label = angular.copy(data.label);
		}
		let formConfig = angular.copy(tenantConfig.form.extKey);
		for (let i = 0; i < formConfig.entries.length; i++) {
			if (formConfig.entries[i].name === 'environment') {
				formConfig.entries.splice(i, 1);
			}
		}
		for (let i = 0; i < formConfig.entries.length; i++) {
			if (formConfig.entries[i].name === 'dashboardAccess') {
				formConfig.entries.splice(i, 1);
			}
		}
		formConfig.entries.splice(1, 0, {
			'name': 'extKey',
			'label': translation.externalKeyValue[LANG],
			'type': 'textarea',
			'rows': 3,
			'required': false
		});
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editExtKey',
			label: translation.editExternalKey[LANG],
			sub: true,
			data: dataForm,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let deviceObj = (formData.device) ? formData.device : {};
						let geoObj = (formData.geo) ? formData.geo : {};
						let postData = {
							'device': deviceObj,
							'geo': geoObj,
							'extKey': data.extKey,
							'label': formData.label,
						};
						if (formData.expDate) {
							postData.expDate = new Date(formData.expDate).toISOString();
						}
						
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/multitenant/admin/tenant/application/key/ext",
							"data": postData,
							"params": {"id": tId, "appId": appId, "key": key, 'extKeyEnv': data.env}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'multitenant', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.externalKeyUpdatedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys(tId, appId, key);
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
	
	$scope.removeExtKey = function (tId, appId, data, key) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/multitenant/tenant/application/key/ext",
			"params": {
				'extKey': data.extKey,
				'extKeyEnv': data.env,
				"id": tId,
				"appId": appId,
				"key": key
			},
		}, function (error) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				$scope.mt.displayAlert('success', translation.externalKeyRemovedSuccessfully[LANG], tId);
				//$scope.modalInstance.close();
				//$scope.form.formData = {};
				$scope.listExtKeys(tId, appId, key);
			}
		});
	};
	
	$scope.listExtKeys = function (tId, appId, key) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/admin/tenant/application/key/ext",
			"params": {"id": tId, "appId": appId, "key": key}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				for (let i = 0; i < $scope.tenantsList.rows.length; i++) {
					if ($scope.tenantsList.rows[i]['_id'] === tId) {
						let apps = $scope.tenantsList.rows[i].applications;
						for (let j = 0; j < apps.length; j++) {
							
							if (apps[j].appId === appId) {
								let app = apps[j];
								let keys = app.keys;
								for (let v = 0; v < keys.length; v++) {
									
									if (keys[v].key === key) {
										delete response['soajsauth'];
										//$scope.tenantsList.rows[i].applications[j].keys[v]=
										let dashboardAccess = false;
										response.forEach(function (extKeyObj) {
											if (extKeyObj.dashboardAccess) {
												$scope.tenantsList.rows[i].dashboardAccess = true;
												$scope.tenantsList.rows[i].applications[j].dashboardAccess = true;
												$scope.tenantsList.rows[i].applications[j].keys[v].dashboardAccess = true;
												dashboardAccess = true;
											}
										});
										
										//in case tenant previously had an external key with dashboard access but now is deleted
										if (!dashboardAccess && $scope.tenantsList.rows[i].dashboardAccess) {
											$scope.tenantsList.rows[i].dashboardAccess = false;
											$scope.tenantsList.rows[i].applications[j].dashboardAccess = false;
											$scope.tenantsList.rows[i].applications[j].keys[v].dashboardAccess = false;
										}
										
										$scope.tenantsList.rows[i].applications[j].keys[v].extKeys = response;
									}
								}
								break;
							}
						}
					}
				}
			}
		});
	};
	
	$scope.listKeys = function (tId, appId, atLeastOneKey) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/admin/tenant/application/key",
			"params": {"id": tId, "appId": appId}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				for (let i = 0; i < $scope.tenantsList.rows.length; i++) {
					if ($scope.tenantsList.rows[i]['_id'] === tId) {
						delete response['soajsauth'];
						let apps = $scope.tenantsList.rows[i].applications;
						for (let j = 0; j < apps.length; j++) {
							
							if (apps[j].appId === appId) {
								let currentKeys = $scope.tenantsList.rows[i].applications[j].keys;
								$scope.tenantsList.rows[i].atLeastOneKey = atLeastOneKey || false;
								response.forEach(function (keyObj) {
									for (let i = 0; i < currentKeys.length; i++) {
										if (keyObj.key === currentKeys[i].key && currentKeys[i].dashboardAccess) {
											keyObj.dashboardAccess = true;
											$scope.reloadConfiguration(tId, appId, keyObj.key, i);
											break;
										}
									}
								});
								$scope.tenantsList.rows[i].applications[j].keys = response;
								break;
							}
						}
					}
				}
			}
		});
	};
	
	$scope.reloadConfiguration = function (tId, appId, key, index) {
		$scope.currentApplicationKey = key;
		$scope.currentApplicationKeyIndex = index;
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/admin/tenant/application/key/config",
			"params": {"id": tId, "appId": appId, "key": key}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				if (JSON.stringify(response) !== '{}') {
					delete response['soajsauth'];
				}
				if (typeof response === "object" && $scope.tenantsList && $scope.tenantsList.rows) {
					for (let i = 0; i < $scope.tenantsList.rows.length; i++) {
						if ($scope.tenantsList.rows[i]['_id'] === tId) {
							let apps = $scope.tenantsList.rows[i].applications;
							for (let j = 0; j < apps.length; j++) {
								if (apps[j].appId === appId) {
									let app = apps[j];
									let keys = app.keys;
									for (let v = 0; v < keys.length; v++) {
										if (keys[v].key === key) {
											$scope.tenantsList.rows[i].applications[j].keys[v].config = response;
										}
									}
									break;
								}
							}
						}
					}
				}
			}
		});
	};
	
	$scope.filterData = function (query, tabIndex) {
		if (query && query !== "") {
			query = query.toLowerCase();
			let filtered = [];
			let tenants = $scope.originalTenants[tabIndex].tenants;
			for (let i = 0; i < tenants.length; i++) {
				if (tenants[i].name.toLowerCase().indexOf(query) !== -1 || tenants[i].code.toLowerCase().indexOf(query) !== -1 || tenants[i].tag && tenants[i].tag.toLowerCase().indexOf(query) !== -1) {
					filtered.push(tenants[i]);
				}
			}
			$scope.tenantTabs[tabIndex].tenants = filtered;
		} else {
			if ($scope.tenantTabs && $scope.originalTenants) {
				$scope.tenantTabs[tabIndex].tenants = $scope.originalTenants[tabIndex].tenants;
				
			}
		}
	};
	
	//default operation
	if ($scope.access.tenant.list && $scope.access.product.list && $scope.access.environment.list) {
		$scope.getProds(() => {
			$scope.getEnvironments(() => {
				$scope.listTenants();
			});
		});
	}
	
	injectFiles.injectCss("modules/dashboard/multitenancy/multitenancy.css");
}]);

multiTenantApp.controller('tenantConsoleCtrl', ['$scope', '$compile', '$timeout', '$modal', '$routeParams', 'ngDataApi', '$cookies', 'injectFiles', 'mtsc', '$localStorage', function ($scope, $compile, $timeout, $modal, $routeParams, ngDataApi, $cookies, injectFiles, mtsc, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, tenantConfig.permissions);
	
	$scope.currentEnv = '';
	if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
		$scope.currentEnv = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code.toLowerCase();
	}
	
	$scope.mt = {};
	$scope.mt.displayAlert = function (type, msg, id, isCode, service, orgMesg) {
		$scope.mt[id] = {};
		$scope.mt[id].alerts = [];
		if (isCode) {
			let msgT = getCodeMessage(msg, service);
			if (msgT) {
				msg = msgT;
			} else if (orgMesg) {
				msg = orgMesg;
			}
		}
		$scope.mt[id].alerts.push({'type': type, 'msg': msg});
		$scope.mt.closeAllAlerts(id);
	};
	
	$scope.mt.closeAlert = function (index, id) {
		$scope.mt[id].alerts.splice(index, 1);
	};
	
	$scope.mt.closeAllAlerts = function (id) {
		$timeout(function () {
			$scope.mt[id].alerts = [];
		}, 7000);
	};
	
	$scope.openKeys = function (id, app) {
		app.showKeys = true;
	};
	
	$scope.closeKeys = function (id, app) {
		app.showKeys = false;
	};
	
	$scope.getConsoleProds = function (cb) {
		$scope.availablePackages = [];
		$scope.availableProducts = [];
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/products/console"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				let prods = [];
				let len = response.length;
				let v, i;
				let p = {};
				for (v = 0; v < len; v++) {
					p = response[v];
					$scope.availableProducts.push({
						'v': p.code,
						'l': p.code,
					});
					if (p && p.packages) {
						let ll = p.packages.length;
						for (i = 0; i < ll; i++) {
							prods.push({
								'pckCode': p.packages[i].code,
								'prodCode': p.code,
								'locked': p.locked || false,
								'v': p.packages[i].code,
								'l': p.packages[i].code,
								'acl': p.packages[i].acl
							});
						}
					}
				}
				$scope.availablePackages = prods;
				cb();
			}
		});
	};
	
	$scope.getEnvironments = function (cb) {
		$scope.availableEnv = [];
		$scope.availableEnvThrottling = {};
		$scope.environments_codes = angular.copy($localStorage.environments);
		for (let x = $scope.environments_codes.length - 1; x >= 0; x--) {
			if ($scope.environments_codes && $scope.environments_codes[x] && $scope.environments_codes[x].code) {
				if ($scope.environments_codes[x].code.toUpperCase() !== "DASHBOARD") {
					$scope.environments_codes.splice(x, 1);
				} else {
					$scope.availableEnv.push($scope.environments_codes[x].code.toLowerCase());
				}
			}
		}
		if (cb && typeof cb === 'function') {
			return cb();
		}
	};
	$scope.listConsoleTenants = function (cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/console/tenant/list"
		}, function (error, tenantFromAPI) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.splitTenantsByType(tenantFromAPI, function () {
					
					if (cb && typeof cb === 'function') {
						return cb();
					}
				});
			}
		});
	};
	
	$scope.getTenantLoginMode = function (tenant) {
		// set loginMode to urac or mini urac from the first env available
		// if the tenant have at least one application and one key and one environment,
		// it will have a login mode either set to urac or defaulted to miniurac
		let loginMode;
		let found = false;
		let atLeastOneKey = false;
		for (let i = 0; !found && tenant.applications && i < tenant.applications.length; i++) {
			let keys = tenant.applications[i].keys;
			for (let j = 0; !found && keys && j < keys.length; j++) {
				atLeastOneKey = true;
				let envs = Object.keys(keys[j].config);
				for (let k = 0; !found && envs && k < envs.length; k++) {
					let oauth = keys[j].config[envs[k]].oauth;
					if (oauth && oauth.loginMode === 'urac') {
						loginMode = 'urac';
					} else {
						loginMode = 'miniurac';
					}
					found = true;
				}
			}
		}
		
		let output = {
			atLeastOneKey,
			loginMode
		};
		return output;
	};
	
	$scope.splitTenantsByType = function (tenants, callback) {
		tenants.forEach(function (oneTenant) {
			let tenantInfo = $scope.getTenantLoginMode(oneTenant);
			oneTenant.loginMode = tenantInfo.loginMode;
			oneTenant.atLeastOneKey = tenantInfo.atLeastOneKey;
			//re-render allowed environments
			oneTenant.applications.forEach((oneApplication) => {
				$scope.availablePackages.forEach((onePackage) => {
					if (onePackage.pckCode === oneApplication.package) {
						if (!oneApplication.availableEnvs) {
							oneApplication.availableEnvs = [];
						}
						
						let packAclEnv = Object.keys(onePackage.acl);
						packAclEnv.forEach((onePackAclEnv) => {
							if ($scope.availableEnv.indexOf(onePackAclEnv) !== -1) {
								oneApplication.availableEnvs.push(onePackAclEnv);
							}
						});
					}
				});
			});
		});
		$scope.consoleTenants = tenants;
		callback();
	};
	
	$scope.view_Tenant = function (data) {
		let formConfig = angular.copy(tenantConfig.form.tenantEdit);
		formConfig.timeout = $timeout;
		
		let keys = Object.keys(data);
		
		for (let i = 0; i < formConfig.entries.length; i++) {
			formConfig.entries[i].type = 'readonly';
			keys.forEach(function (inputName) {
				if (formConfig.entries[i].name === inputName) {
					if (inputName === 'type') {
						for (let j = 0; j < formConfig.entries[i].value.length; j++) {
							if (formConfig.entries[i].value[j].v === data[inputName]) {
								formConfig.entries[i].value[j].selected = true;
								formConfig.entries[i].value = formConfig.entries[i].value[j].l;
								break;
							}
						}
					} else {
						formConfig.entries[i].value = data[inputName];
					}
				}
			});
		}
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editTenant',
			label: translation.editBasicTenantApplication[LANG],
			data: {},
			actions: [
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
	
	$scope.generateTenantCode = function (tName) {
		let tCode = "";
		let nameArray = tName.split(" ");
		let index = Math.ceil(4 / nameArray.length);
		
		for (let i = 0; i < nameArray.length && tCode.length < 4; i++) {
			nameArray[i] = nameArray[i].replace(/[!@#$%^&*()_+,.<>;'?]/, "");
			if (tCode.length === 3) {
				tCode += nameArray[i].slice(0, 1);
				break;
			}
			if (nameArray[i].length > 1) {
				tCode += nameArray[i].slice(0, index);
			} else {
				tCode += nameArray[i].slice(0, index);
				index++;
			}
		}
		
		if (tCode.length < 4) {
			tCode += "tenant".slice(0, 4 - tCode.length);
		} else if (tCode.length > 4) {
			tCode = tCode.slice(0, 4);
		}
		tCode = tCode.toUpperCase();
		
		let counter = 1;
		return $scope.checkTenantCodeAvailability(tName, tCode, counter);
	};
	
	$scope.checkTenantCodeAvailability = function (tName, tCode, counter) {
		$scope.tenantsList.rows.forEach(function (oneTenant) {
			if (oneTenant.code === tCode && oneTenant.name !== tName) {
				tCode = tCode.slice(0, 3) + counter++;
				return $scope.checkTenantCodeAvailability(tName, tCode, counter);
			}
		});
		return tCode;
	};
	
	$scope.editTenantApplication = function (tId, data) {
		let formConfig = angular.copy(tenantConfig.form.application);
		let recordData = angular.copy(data);
		recordData._TTL = recordData._TTL / 3600000;
		
		let pack = {
			'name': 'package',
			'label': translation.productPackage[LANG],
			'type': 'text',
			'placeholder': translation.formProductPackagePlaceHolder[LANG],
			'value': '',
			'tooltip': translation.formProductPackageToolTip[LANG],
			'required': true
		};
		formConfig.entries.splice(1, 0, pack);
		formConfig.entries[0].disabled = true;
		formConfig.entries[1].disabled = true;
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editApplication',
			label: translation.editApplication[LANG],
			data: recordData,
			actions: [
				{
					'type': 'submit',
					'label': translation.editApplication[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let packageCode = formData.package.split("_")[1];
						let postData = {
							'productCode': formData.product,
							'packageCode': formData.package,
							'description': formData.description
						};
						
						if (formData._TTL) {
							postData._TTL = Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL.toString();
						}
						
						postData.packageCode = packageCode;
						postData.acl = recordData.acl;
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/tenant/application/update",
							"data": postData,
							"params": {"id": tId, "appId": data.appId}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.applicationUpdatedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadApplications(tId);
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
	
	$scope.reloadApplications = function (tId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/tenant/console/applications",
			"params": {"id": tId}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'dashboard', error.message);
			} else {
				for (let i = 0; i < $scope.tenantsList.rows.length; i++) {
					if ($scope.tenantsList.rows[i]['_id'] === tId) {
						let currentApps = $scope.tenantsList.rows[i].applications;
						response.forEach(function (app) {
							for (let i = 0; i < currentApps.length; i++) {
								if (app.appId === currentApps[i].appId && currentApps[i].dashboardAccess) {
									app.dashboardAccess = true;
									break;
								}
							}
							app.availableEnvs = $scope.availableEnv;
						});
						$scope.tenantsList.rows[i].applications = response;
						break;
					}
				}
			}
		});
	};
	
	$scope.emptyConfiguration = function (tId, appId, key, env) {
		let configObj = {};
		let postData = {
			'envCode': env,
			'config': configObj,
			"appId": appId,
			"key": key
		};
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/multitenant/tenant/console/application/key/config",
			"data": postData,
			"params": {"id": tId},
		}, function (error) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'multitenant', error.message);
			} else {
				$scope.mt.displayAlert('success', translation.keyConfigurationUpdatedSuccessfully[LANG], tId);
				$scope.reloadConfiguration(tId, appId, key);
			}
		});
		
	};
	$scope.updateConfiguration = function (tId, appId, appPackage, key, env, value) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/registry/throttling",
			"params": {
				"env": env
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			} else {
				if (response && Object.keys(response).length > 0) {
					$scope.availableEnvThrottling[env.toLowerCase()] = response;
				} else {
					$scope.availableEnvThrottling[env.toLowerCase()] = null;
				}
				mtsc.updateConfiguration($scope, tId, appId, appPackage, key, env, value);
			}
		});
	};
	
	$scope.addNewExtKey = function (tId, appId, key) {
		let formConfig = tenantConfig.form.extKey;
		// if ($scope.consoleProductScope
		// 	&& $scope.consoleProductScope.acl
		// 	&& typeof ($scope.consoleProductScope.acl) === 'object') {
		
		//new acl
		formConfig.entries.forEach(function (oneFormField) {
			if (oneFormField.name === 'environment') {
				let list = [];
				let availableEnvs = $scope.availableEnv;
				availableEnvs.forEach(function (envCode) {
					list.push({
						"v": envCode,
						"l": envCode,
						"selected": (envCode === $scope.currentEnv)
					});
				});
				oneFormField.value = list;
			}
		});
		// }
		
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addExtKey',
			label: translation.addNewExternalKey[LANG],
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let deviceObj = (formData.device) ? formData.device : {};
						let geoObj = (formData.geo) ? formData.geo : {};
						let postData = {
							'label': formData.label,
							'expDate': formData.expDate,
							'device': deviceObj,
							'geo': geoObj,
							'dashboardAccess': formData.dashboardAccess ? true : false,
							'env': formData.environment.toUpperCase()
						};
						
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/multitenant/tenant/console/application/key/ext",
							"data": postData,
							"params": {"id": tId, "appId": appId, "key": key}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.externalKeyAddedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys(tId, appId, key);
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
	
	$scope.editExtKey = function (tId, appId, data, key) {
		let dataForm = angular.copy(data);
		if (data.geo) {
			dataForm.geo = angular.copy(data.geo);
		}
		if (data.device) {
			dataForm.device = angular.copy(data.device);
		}
		if (data.label) {
			dataForm.label = angular.copy(data.label);
		}
		
		let formConfig = angular.copy(tenantConfig.form.extKey);
		for (let i = 0; i < formConfig.entries.length; i++) {
			if (formConfig.entries[i].name === 'environment') {
				formConfig.entries.splice(i, 1);
			}
		}
		
		formConfig.entries.splice(1, 0, {
			'name': 'extKey',
			'label': translation.externalKeyValue[LANG],
			'type': 'textarea',
			'rows': 3,
			'required': false
		});
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editExtKey',
			label: translation.editExternalKey[LANG],
			sub: true,
			data: dataForm,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let deviceObj = (formData.device) ? formData.device : {};
						let geoObj = (formData.geo) ? formData.geo : {};
						
						let postData = {
							'device': deviceObj,
							'geo': geoObj,
							'extKey': data.extKey,
							'label': formData.label
						};
						if (formData.expDate) {
							postData.expDate = new Date(formData.expDate).toISOString();
						}
						
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/multitenant/tenant/console/application/key/ext",
							"data": postData,
							"params": {"id": tId, "appId": appId, "key": key, 'extKeyEnv': data.env}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.externalKeyUpdatedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys(tId, appId, key);
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
	
	$scope.removeExtKey = function (tId, appId, data, key) {
		let opts = {
			"method": "delete",
			"routeName": "/multitenant/tenant/console/application/key/ext",
			"params": {
				'extKey': data.extKey,
				'extKeyEnv': data.env,
				"id": tId,
				"appId": appId,
				"key": key
			},
		};
		if (customSettings.key === data.extKey) {
			$scope.mt.displayAlert('danger', '0', tId, true, 'dashboard', 'Unable to Delete the tenant application ext Key.' +
				' This key is being used to access console. Add a new ext Key and link it to the console UI to be able to delete this one.');
		} else {
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				if (error) {
					$scope.mt.displayAlert('danger', error.code, tId, true, 'dashboard', error.message);
				} else {
					$scope.mt.displayAlert('success', translation.externalKeyRemovedSuccessfully[LANG], tId);
					//$scope.modalInstance.close();
					//$scope.form.formData = {};
					$scope.listExtKeys(tId, appId, key);
				}
			});
		}
	};
	
	$scope.listExtKeys = function (tId, appId, key) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/tenant/console/application/key/ext",
			"params": {"id": tId, "appId": appId, "key": key}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'dashboard', error.message);
			} else {
				for (let i = 0; i < $scope.consoleTenants.length; i++) {
					if ($scope.consoleTenants[i]['_id'] === tId) {
						let apps = $scope.consoleTenants[i].applications;
						for (let j = 0; j < apps.length; j++) {
							if (apps[j].appId === appId) {
								let app = apps[j];
								let keys = app.keys;
								for (let v = 0; v < keys.length; v++) {
									if (keys[v].key === key) {
										delete response['soajsauth'];
										let dashboardAccess = false;
										response.forEach(function (extKeyObj) {
											if (extKeyObj.dashboardAccess) {
												$scope.consoleTenants[i].dashboardAccess = true;
												$scope.consoleTenants[i].applications[j].dashboardAccess = true;
												$scope.consoleTenants[i].applications[j].keys[v].dashboardAccess = true;
												dashboardAccess = true;
											}
										});
										//in case tenant previously had an external key with dashboard access but now is deleted
										if (!dashboardAccess && $scope.consoleTenants[i].dashboardAccess) {
											$scope.consoleTenants[i].dashboardAccess = false;
											$scope.consoleTenants[i].applications[j].dashboardAccess = false;
											$scope.consoleTenants[i].applications[j].keys[v].dashboardAccess = false;
										}
										$scope.consoleTenants[i].applications[j].keys[v].extKeys = response;
									}
								}
								break;
							}
						}
					}
				}
				
			}
		});
	};
	
	$scope.reloadConfiguration = function (tId, appId, key, index) {
		$scope.currentApplicationKey = key;
		$scope.currentApplicationKeyIndex = index;
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/multitenant/tenant/console/application/key/config",
			"params": {"id": tId, "appId": appId, "key": key}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'dashboard', error.message);
			} else {
				if (JSON.stringify(response) !== '{}') {
					delete response['soajsauth'];
				}
				if (typeof response === "object" && $scope.consoleTenants && $scope.consoleTenants) {
					for (let i = 0; i < $scope.consoleTenants.length; i++) {
						if ($scope.consoleTenants[i]['_id'] === tId) {
							let apps = $scope.consoleTenants[i].applications;
							for (let j = 0; j < apps.length; j++) {
								if (apps[j].appId === appId) {
									let app = apps[j];
									let keys = app.keys;
									for (let v = 0; v < keys.length; v++) {
										if (keys[v].key === key) {
											$scope.consoleTenants[i].applications[j].keys[v].config = response;
										}
									}
									break;
								}
							}
						}
					}
				}
			}
		});
	};
	
	$scope.reloadOauthUsers = function (tId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/tenant/oauth/users",
			"params": {"id": tId}
		}, function (error, response) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'dashboard', error.message);
			} else {
				for (let i = 0; i < $scope.consoleTenants.length; i++) {
					if ($scope.consoleTenants[i]['_id'] === tId) {
						$scope.consoleTenants[i].oAuthUsers = response;
						break;
					}
				}
			}
		});
	};
	
	$scope.removeTenantOauthUser = function (tId, user) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/console/tenant/oauth/user",
			"params": {"id": tId, 'uId': user['_id']}
		}, function (error) {
			if (error) {
				$scope.mt.displayAlert('danger', error.code, tId, true, 'dashboard', error.message);
			} else {
				$scope.mt.displayAlert('success', translation.userDeletedSuccessfully[LANG], tId);
				$scope.reloadOauthUsers(tId);
			}
		});
	};
	
	$scope.editTenantOauthUser = function (tId, user) {
		user.password = null;
		user.confirmPassword = null;
		let options = {
			timeout: $timeout,
			form: angular.copy(tenantConfig.form.oauthUserUpdate),
			name: 'updateUser',
			label: translation.updateUser[LANG],
			data: user,
			actions: [
				{
					'type': 'submit',
					'label': translation.updateoAuthUser[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let postData = {
							'userId': formData.userId
						};
						if (formData.password && formData.password !== '') {
							if (formData.password !== formData.confirmPassword) {
								$scope.form.displayAlert('danger', translation.passwordConfirmFieldsNotMatch[LANG]);
								return;
							} else {
								postData.password = formData.password;
							}
						}
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/console/tenant/oauth/user",
							"data": postData,
							"params": {"id": tId, 'uId': user['_id']}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.userUpdatedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadOauthUsers(tId);
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
	
	$scope.addOauthUser = function (tId) {
		let options = {
			timeout: $timeout,
			form: angular.copy(tenantConfig.form.oauthUser),
			name: 'add_oauthUser',
			label: translation.addNewoAuthUser[LANG],
			data: {
				'userId': null,
				'user_password': null
			},
			actions: [
				{
					'type': 'submit',
					'label': translation.addoAuthUser[LANG],
					'btn': 'primary',
					'action': function (formData) {
						let postData = {
							'userId': formData.userId,
							'password': formData.user_password
						};
						if (formData.user_password !== formData.confirmPassword) {
							$scope.form.displayAlert('danger', translation.passwordConfirmFieldsNotMatch[LANG]);
							return;
						}
						
						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/console/tenant/oauth/user",
							"data": postData,
							"params": {"id": tId}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.mt.displayAlert('success', translation.userAddedSuccessfully[LANG], tId);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadOauthUsers(tId);
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
	
	$scope.listOauthUsers = function (row) {
		let tId = row['_id'];
		if (!row.alreadyGotAuthUsers) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/tenant/oauth/users",
				"params": {"id": tId}
			}, function (error, response) {
				if (error) {
					$scope.mt.displayAlert('danger', error.code, tId, true, 'dashboard', error.message);
				} else {
					row.alreadyGotAuthUsers = true;
					if (response.length > 0) {
						for (let i = 0; i < $scope.consoleTenants.length; i++) {
							if ($scope.consoleTenants[i]['_id'] === tId) {
								$scope.consoleTenants[i].oAuthUsers = response;
								break;
							}
						}
					}
				}
			});
		}
	};
	
	//default operation
	if ($scope.access.tenant.list && $scope.access.product.listConsoleProducts && $scope.access.environment.list) {
		$scope.getConsoleProds(() => {
			$scope.getEnvironments(() => {
				$scope.listConsoleTenants();
			});
		});
	}
	
	injectFiles.injectCss("modules/dashboard/multitenancy/multitenancy.css");
}]);
