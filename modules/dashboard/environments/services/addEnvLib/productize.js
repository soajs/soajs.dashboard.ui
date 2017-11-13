"use strict";
var dbServices = soajsApp.components;
dbServices.service('productize', ['ngDataApi', 'addEnv', function (ngDataApi, addEnv) {
	
	let productizeFunction = function (currentScope, cb) {
		/*
		 1- create product portal
		 1.1- create main package -> access to login only
		 1.2- create user package -> access to manage urac users and regenerate oauth tokens
		 2- create portal tenant
		 2.1- create main application that uses main package
		 2.1.1- create key & extKey -> dashboard Access : false
		 2.2- create user application that uses user package
		 2.2.1- create key & extKey -> dashboard Access : true
		 */
		
		// variables updated in checkIfProductAndPacksExists
		let productFound = false; // will also hold the product id if found
		let mainPackFound = false;
		let userPackFound = false;
		
		// variables updated in checkIfTenantAppsAndKeysExist
		let tenantFound = false;
		let mainApplicationFound = false;
		let userApplicationFound = false;
		let mainApplicationKeyFound = false;
		let userApplicationKeyFound = false;
		
		checkIfProductAndPacksExists(function () {
			checkIfTenantAppsAndKeysExist(function () {
				// now that the above variables are defined
				productizeApiCall((error) => {
					if (error) {
						return cb(error);
					}
					else {
						multitenancyApiCall(cb);
					}
				});
			});
		});
		
		/**
		 *  check if products and packages exist and update the following 3 variables: productFound, mainPackFound, userPackFound
		 * will also fill variables with id if found
		 *
		 * @param productCheckCb
		 */
		function checkIfProductAndPacksExists(productCheckCb) {
			var params = {
				'productCode': 'PRTAL'
			};
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/product/get",
				params
			}, function (error, product) {
				if (error) {
					return cb(error);
				}
				else {
					if (!product || !product.code) {
						productFound = false;
						productCheckCb();
					} else {
						productFound = product['_id'];
						
						let packs = product.packages;
						
						if (packs) {
							packs.forEach(function (eachPack) {
								if (eachPack.code === 'PRTAL_MAIN') {
									mainPackFound = true;
								}
								if (eachPack.code === 'PRTAL_USER') {
									userPackFound = true;
								}
							});
						}
						productCheckCb();
					}
				}
			});
		}
		
		/**
		 * check if the tenant found and update the following variables: tenantFound,mainApplicationFound,userApplicationFound,mainApplicationKeyFound,userApplicationKeyFound
		 * will also fill variables with id if found
		 * @param tenantCheckCb
		 */
		function checkIfTenantAppsAndKeysExist(tenantCheckCb) {
			var params = {
				'code': 'PRTL'
			};
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/tenant/get",
				params
			}, function (error, tenant) {
				if (error) {
					if (error.code === 452) { // its not an error, the tenant is simply not found
						tenantFound = false;
						tenantCheckCb();
					} else {
						return cb(error);
					}
				}
				else {
					tenantFound = tenant['_id'];
					
					let applications = tenant.applications;
					
					if (applications) {
						applications.forEach(function (eachApp) {
							if (eachApp.package === 'PRTAL_MAIN' && eachApp.product === 'PRTAL') {
								mainApplicationFound = eachApp.appId;
								if (eachApp.keys && eachApp.keys.length > 0 && eachApp.keys[0].config && eachApp.keys[0].config.portal
									&& eachApp.keys[0].extKeys && eachApp.keys[0].extKeys.length > 0 && eachApp.keys[0].extKeys[0].env === 'PORTAL') {
									mainApplicationKeyFound = true;
								}
							}
							if (eachApp.package === 'PRTAL_USER' && eachApp.product === 'PRTAL') {
								userApplicationFound = eachApp.appId;
								if (eachApp.keys && eachApp.keys.length > 0 && eachApp.keys[0].config && eachApp.keys[0].config.portal
									&& eachApp.keys[0].extKeys && eachApp.keys[0].extKeys.length > 0 && eachApp.keys[0].extKeys[0].env === 'PORTAL') {
									currentScope.tenantExtKey = eachApp.keys[0].extKeys[0].extKey;
									userApplicationKeyFound = true;
								}
							}
						});
					}
					
					tenantCheckCb();
				}
			});
		}
		
		function productizeApiCall(mCb) {
			var postData = {
				'code': "PRTAL",
				'name': "Portal Product",
				'description': "This product contains packages that offer access to the portal interface of SOAJS to manage your products."
			};
			
			if (!productFound) {
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/product/add",
					"data": postData
				}, function (error, productId) {
					if (error) {
						return mCb(error);
					}
					else {
						addBasicPackage(productId.data, (error) => {
							if (error) {
								return mCb(error);
							}
							else {
								currentScope.envProductId = productId.data;
								addUserPackage(productId.data, mCb);
							}
						});
					}
				});
			} else {
				currentScope.envProductId = productFound;
				if (!mainPackFound) {
					addBasicPackage(productFound, (error) => {
						if (error) {
							mCb(error);
						}
						else {
							if (!userPackFound) {
								addUserPackage(productFound, mCb);
							} else {
								mCb();
							}
						}
					});
				} else {
					if (!userPackFound) {
						addUserPackage(productFound, mCb);
					} else {
						mCb();
					}
				}
			}
			
			function addBasicPackage(productId, mCb) {
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/product/packages/add",
					"data": environmentsConfig.portal.mainPackage,
					"params": {"id": productId}
				}, mCb);
			}
			
			function addUserPackage(productId, mCb) {
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/product/packages/add",
					"data": environmentsConfig.portal.userPackage,
					"params": {"id": productId}
				}, mCb);
			}
		}
		
		function multitenancyApiCall(mCb) {
			if (!tenantFound) {
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/tenant/add",
					"data": environmentsConfig.portal.tenant
				}, function (error, response) {
					if (error) {
						mCb(error);
					}
					else {
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/tenant/oauth/add",
							"params": {
								"id": response.id
							},
							"data": {
								"secret": "soajs beaver",
								"oauthType": "urac",
								"availableEnv": ["PORTAL"]
							}
						}, function (oauthUpdateError, oauthUpdateResponse) { // oauthUpdateResponse unused, resuming the main flow
							if (oauthUpdateError) {
								mCb(oauthUpdateError);
							}
							else {
								var tId = response.id;
								currentScope.envTenantId = response.id;
								
								addApplication(tId, 'main', (error) => {
									if (error) {
										mCb(error);
									}
									else {
										addApplication(tId, 'user', mCb);
									}
								});
							}
						});
					}
				});
			} else {
				currentScope.envTenantId = tenantFound;
				addApplication(tenantFound, 'main', (error) => {
					if (error) {
						mCb(error);
					}
					else {
						addApplication(tenantFound, 'user', mCb);
					}
				});
			}
			
			
			function addApplication(tenantId, packageName, mCb) {
				var ttl = 7 * 24;
				var postData = {
					'description': 'Portal ' + packageName + ' application',
					'_TTL': ttl.toString(),
					'productCode': "PRTAL",
					'packageCode': packageName.toUpperCase()
				};
				
				if ((!mainApplicationFound && packageName === 'main') || (!userApplicationFound && packageName === 'user')) {
					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "post",
						"routeName": "/dashboard/tenant/application/add",
						"data": postData,
						"params": {"id": tenantId}
					}, function (error, response) {
						if (error) {
							return mCb(error);
						}
						else {
							var appId = response.appId;
							addApplicationKey(appId, tenantId, packageName, mCb);
						}
					});
				} else {
					if (packageName === 'main') {
						if (!mainApplicationKeyFound) {
							addApplicationKey(mainApplicationFound, tenantId, packageName, mCb);
						} else {
							mCb();
						}
					} else { // user
						if (!userApplicationKeyFound) {
							addApplicationKey(userApplicationFound, tenantId, packageName, mCb);
						} else {
							mCb();
						}
					}
				}
			}
			
			function addApplicationKey(appId, tenantId, packageName, addKeyCb) {
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/tenant/application/key/add",
					"params": {"id": tenantId, "appId": appId}
				}, function (error, response) {
					if (error) {
						return addKeyCb(error);
					}
					else {
						var key = response.key;
						var postData = {
							'expDate': null,
							'device': null,
							'geo': null,
							'env': 'PORTAL',
							"dashboardAccess": (packageName === 'user')
						};
						
						let params = {
							"id": tenantId,
							"appId": appId,
							"key": key
						};
						
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/tenant/application/key/ext/add",
							"data": postData,
							params
						}, function (error, response) {
							if (error) {
								return cb(error);
							}
							else {
								if (packageName === 'main') {
									currentScope.tenantExtKey = response.extKey;
								}
								
								let domain = addEnv.getAPIInfo(currentScope, currentScope.wizard.nginx, 'sitePrefix');
								
								var postData = angular.copy(environmentsConfig.portal.tenantApplicationKeyConfig);
								
								postData.envCode = currentScope.wizard.gi.code.toLowerCase();
								postData.config.urac.link.addUser = domain + "/#/setNewPassword";
								postData.config.urac.link.changeEmail = domain + "/#/changeEmail/validate";
								postData.config.urac.link.forgotPassword = domain + "/#/resetPassword";
								postData.config.urac.link.join = domain + "/#/join/validate";
								
								getSendDataFromServer(currentScope, ngDataApi, {
									"method": "put",
									"routeName": "/dashboard/tenant/application/key/config/update",
									"data": postData,
									"params": {"id": tenantId, "appId": appId, "key": key}
								}, addKeyCb);
							}
						});
						
					}
				});
			}
		}
	};
	
	return productizeFunction;
	
}]);