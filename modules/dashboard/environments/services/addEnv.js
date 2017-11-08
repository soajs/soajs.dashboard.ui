"use strict";
var dbServices = soajsApp.components;
dbServices.service('addEnv', ['ngDataApi', '$timeout', '$cookies', '$localStorage', 'Upload', function (ngDataApi, $timeout, $cookies, $localStorage, Upload) {
	
	function createEnvironment(currentScope, cb) {
		let data = currentScope.wizard.gi;
		data.deploy = currentScope.wizard.deploy;
		
		if(currentScope.portalDeployment){
			data.deployPortal = true;
		}
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/environment/add',
			data: {
				data: data
			}
		}, cb);
	}
	
	function uploadEnvCertificates(currentScope, cb) {
		if (currentScope.wizard.deploy.selectedDriver === 'docker' && currentScope.wizard.deploy.deployment.docker.dockerremote) {
			let certificatesNames = Object.keys(currentScope.remoteCertificates);
			uploadFiles(certificatesNames, 0, cb);
		}
		else {
			return cb();
		}
		
		function uploadFiles(certificatesNames, counter, uCb) {
			let oneCertificate = certificatesNames[counter];
			if (!currentScope.remoteCertificates[oneCertificate]) {
				//to avoid incompatibility issues when using safari browsers
				return uCb();
			}
			
			var soajsauthCookie = $cookies.get('soajs_auth', {'domain': interfaceDomain});
			var dashKeyCookie = $cookies.get('soajs_dashboard_key', {'domain': interfaceDomain});
			var access_token = $cookies.get('access_token', {'domain': interfaceDomain});
			var progress = {value: 0};
			
			var options = {
				url: apiConfiguration.domain + "/dashboard/environment/platforms/cert/upload",
				params: {
					envCode: currentScope.wizard.gi.code.toUpperCase(),
					filename: currentScope.remoteCertificates[oneCertificate].name,
					certType: oneCertificate,
					platform: "docker",
					driver: "remote",
					access_token: access_token
				},
				file: currentScope.remoteCertificates[oneCertificate],
				headers: {
					'soajsauth': soajsauthCookie,
					'key': dashKeyCookie
				}
			};
			
			Upload.upload(options).progress(function (evt) {
				progress.value = parseInt(100.0 * evt.loaded / evt.total);
			}).success(function (response) {
				if (!response.result) {
					return uCb(new Error(response.errors.details[0].message));
				}
				else {
					counter++;
					if (counter === certificatesNames.length) {
						return uCb();
					} else {
						uploadFiles(certificatesNames, counter, uCb);
					}
				}
			}).error(function (error) {
				return uCb(error);
			});
		}
	}
	
	function createNginxRecipe(currentScope, cb) {
		let recipe = buildRecipe();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: "post",
			routeName: '/dashboard/catalog/recipes/add',
			data: {
				catalog: {
					description: "Nginx Recipe for " + currentScope.wizard.gi.code.toUpperCase() + " Environment",
					name: "Deployer Recipe for " + currentScope.wizard.gi.code.toUpperCase() + " Nginx",
					recipe: recipe,
					type: "server",
					subtype: "nginx"
				}
			}
		}, function (error, response) {
			if (error) {
				return cb(error);
			}
			else {
				return cb(null, response.data);
			}
		});
		
		function buildRecipe(){
			let recipe = {
				"deployOptions": {
					"image": {
						"prefix": currentScope.wizard.nginx.imagePrefix || "soajsorg",
						"name": currentScope.wizard.nginx.imageName || "nginx",
						"tag": currentScope.wizard.nginx.imageTag || "latest",
						"pullPolicy": "IfNotPresent"
					},
					"readinessProbe": {
						"httpGet": {
							"path": "/",
							"port": "http"
						},
						"initialDelaySeconds": 5,
						"timeoutSeconds": 2,
						"periodSeconds": 5,
						"successThreshold": 1,
						"failureThreshold": 3
					},
					"restartPolicy": {
						"condition": "any",
						"maxAttempts": 5
					},
					"container": {
						"network": "soajsnet",
						"workingDir": "/opt/soajs/deployer/"
					},
					"voluming": {
						"volumes": []
					},
					"ports": [
						{
							"name": "http",
							"target": 80,
							"isPublished": true,
							"published": currentScope.wizard.nginx.http,
							"preserveClientIP": true
						}
					]
				},
				"buildOptions": {
					"env": {
						"SOAJS_ENV": {
							"type": "computed",
							"value": "$SOAJS_ENV"
						},
						"SOAJS_NX_DOMAIN": {
							"type": "computed",
							"value": "$SOAJS_NX_DOMAIN"
						},
						"SOAJS_NX_API_DOMAIN": {
							"type": "computed",
							"value": "$SOAJS_NX_API_DOMAIN"
						},
						"SOAJS_NX_SITE_DOMAIN": {
							"type": "computed",
							"value": "$SOAJS_NX_SITE_DOMAIN"
						},
						"SOAJS_NX_CONTROLLER_NB": {
							"type": "computed",
							"value": "$SOAJS_NX_CONTROLLER_NB"
						},
						"SOAJS_NX_CONTROLLER_IP": {
							"type": "computed",
							"value": "$SOAJS_NX_CONTROLLER_IP_N"
						},
						"SOAJS_NX_CONTROLLER_PORT": {
							"type": "computed",
							"value": "$SOAJS_NX_CONTROLLER_PORT"
						},
						"SOAJS_DEPLOY_HA": {
							"type": "computed",
							"value": "$SOAJS_DEPLOY_HA"
						},
						"SOAJS_HA_NAME": {
							"type": "computed",
							"value": "$SOAJS_HA_NAME"
						}
					},
					"cmd": {
						"deploy": {
							"command": [
								"bash"
							],
							"args": [
								"-c",
								"node index.js -T nginx"
							]
						}
					}
				}
			};
			
			//only for case of portal
			if(currentScope.portalDeployment){
				recipe.buildOptions.env["SOAJS_EXTKEY"] = {
					"type": "computed",
						"value": "$SOAJS_EXTKEY"
				};
				recipe.buildOptions.env["SOAJS_GIT_PORTAL_BRANCH"] = {
					"type": "static",
					"value": "master"
				};
			}
			
			if(currentScope.wizard.nginx.imageName){
				recipe.deployOptions.image.override = true;
			}
			
			if(currentScope.wizard.deploy.selectedDriver === 'docker'){
				recipe.deployOptions.voluming.volumes = [
					{
						"Type": "volume",
						"Source": "soajs_log_volume",
						"Target": "/var/log/soajs/"
					},
					{
						"Type": "bind",
						"ReadOnly": true,
						"Source": "/var/run/docker.sock",
						"Target": "/var/run/docker.sock"
					}
				];
			}
			else if(currentScope.wizard.deploy.selectedDriver === 'kubernetes'){
				recipe.deployOptions.voluming.volumes = [
					{
						"name": "soajs-log-volume",
						"hostPath": {
							"path": "/var/log/soajs/"
						}
					}
				];
				recipe.deployOptions.voluming.volumeMounts = [
					{
						"mountPath": "/var/log/soajs/",
						"name": "soajs-log-volume"
					}
				];
			}
			
			if (currentScope.wizard.nginx.ssl) {
				if(currentScope.wizard.deploy.selectedDriver === 'docker') {
					recipe.deployOptions.ports.push({
						"name": "https",
						"target": 443,
						"isPublished": true,
						"published": currentScope.wizard.nginx.https,
						"preserveClientIP": true
					});
				}
				else if(currentScope.wizard.deploy.selectedDriver === 'kubernetes'){
					recipe.deployOptions.ports.push({
						"name": "https",
						"target": 443,
						"isPublished": true,
						"published": currentScope.wizard.nginx.https,
						"preserveClientIP": true
					});
				}
				
				var https = ["SOAJS_NX_API_HTTPS", "SOAJS_NX_API_HTTP_REDIRECT", "SOAJS_NX_SITE_HTTPS", "SOAJS_NX_SITE_HTTP_REDIRECT"];
				https.forEach((oneEnv) => {
					recipe.buildOptions.env[oneEnv] = {
						"type": "static",
						"value": "true"
					};
				});
				
				if (currentScope.wizard.nginx.certs && Object.keys(currentScope.wizard.nginx.certsGit).length > 0) {
					recipe.buildOptions.env["SOAJS_NX_CUSTOM_SSL"] = {
						"type": "static",
						"value": 'true'
					};
					
					recipe.buildOptions.env["SOAJS_CONFIG_REPO_BRANCH"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.certsGit.branch
					};
					recipe.buildOptions.env["SOAJS_CONFIG_REPO_OWNER"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.certsGit.owner
					};
					recipe.buildOptions.env["SOAJS_CONFIG_REPO_NAME"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.certsGit.repo
					};
					recipe.buildOptions.env["SOAJS_CONFIG_REPO_TOKEN"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.certsGit.token
					};
					recipe.buildOptions.env["SOAJS_CONFIG_REPO_PROVIDER"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.certsGit.provider
					};
					recipe.buildOptions.env["SOAJS_CONFIG_REPO_DOMAIN"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.certsGit.domain
					};
				}
				
				if (currentScope.wizard.nginx.customUi && currentScope.wizard.nginx.customUi.source && currentScope.wizard.nginx.customUi.provider && currentScope.wizard.nginx.customUi.repo && currentScope.wizard.nginx.customUi.owner && currentScope.wizard.nginx.customUi.branch && currentScope.wizard.nginx.customUi.token){
					recipe.buildOptions.env["SOAJS_GIT_BRANCH"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.customUi.branch
					};
					
					recipe.buildOptions.env["SOAJS_GIT_OWNER"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.customUi.owner
					};
					recipe.buildOptions.env["SOAJS_GIT_REPO"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.customUi.repo
					};
					
					recipe.buildOptions.env["SOAJS_GIT_TOKEN"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.customUi.token
					};
					recipe.buildOptions.env["SOAJS_GIT_PROVIDER"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.customUi.source
					};
					recipe.buildOptions.env["SOAJS_GIT_DOMAIN"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.customUi.provider
					};
					recipe.buildOptions.env["SOAJS_GIT_PATH"] = {
						"type": "static",
						"value": currentScope.wizard.nginx.customUi.path || "/"
					};
				}
			}
			
			return recipe;
		}
	}
	
	function deployNginx(currentScope, catalogId, cb) {
		let data = {
			"deployConfig": {
				"replication": {
					"mode": currentScope.wizard.nginx.mode
				},
				"memoryLimit": currentScope.wizard.nginx.memory * 1048576
			},
			"custom": {
				type: 'nginx',
				name: currentScope.wizard.gi.code.toLowerCase() + '_nginx'
			},
			"recipe": catalogId,
			"env": currentScope.wizard.gi.code.toUpperCase()
		};
		
		//if custom image info
		if (currentScope.wizard.nginx.imageName) {
			data.custom.image = {
				name: currentScope.wizard.nginx.imageName,
				prefix: currentScope.wizard.nginx.imagePrefix,
				tag: currentScope.wizard.nginx.imageTag
			}
		}
		
		//if user input env variables
		if (currentScope.wizard.nginx.custom) {
			data.custom.env = {};
			for (let env in currentScope.wizard.nginx.custom) {
				data.custom.env[env] = currentScope.wizard.nginx.custom[env].value;
			}
		}
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cloud/services/soajs/deploy',
			data: data
		}, cb);
	}
	
	function deployservice(currentScope, serviceName, cb) {
		let data = {
			"deployConfig": {
				"replication": {
					"mode": currentScope.wizard[serviceName].mode
				},
				"memoryLimit": currentScope.wizard[serviceName].memory * 1048576
			},
			"gitSource": {
				"owner": "soajs",
				"repo": "soajs." + serviceName,
				"branch": currentScope.wizard[serviceName].branch
			},
			"custom": {
				"name": serviceName,
				"type": "service"
			},
			"recipe": currentScope.wizard[serviceName].catalog,
			"env": currentScope.wizard.gi.code.toUpperCase()
		};
		
		//get the commit
		if (currentScope.wizard[serviceName].commit) {
			data.gitSource.commit = currentScope.wizard[serviceName].commit;
		}
		
		//check the replicas
		if (['replicated', 'deployment'].indexOf(currentScope.wizard[serviceName].mode) !== -1) {
			data.deployConfig.replication.replicas = currentScope.wizard[serviceName].number;
		}
		
		//if custom image info
		if (currentScope.wizard[serviceName].imageName) {
			data.custom.image = {
				name: currentScope.wizard[serviceName].imageName,
				prefix: currentScope.wizard[serviceName].imagePrefix,
				tag: currentScope.wizard[serviceName].imageTag
			}
		}
		
		//if user input env variables
		if (currentScope.wizard[serviceName].custom) {
			data.custom.env = {};
			for (let env in currentScope.wizard[serviceName].custom) {
				data.custom.env[env] = currentScope.wizard[serviceName].custom[env].value;
			}
		}
		
		//register Controller in CD as deployed
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cd",
			"data": {
				config: {
					serviceName: serviceName,
					env: currentScope.wizard.gi.code.toUpperCase(),
					default: {
						deploy: true,
						options: data
					}
				}
			}
		}, function (error, serviceId) {
			if (error) {
				return cb(error);
			} else {
				
				//deploy Service
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/cloud/services/soajs/deploy",
					"data": data
				}, function (error) {
					if (error) {
						return cb(error);
					} else {
						$timeout(function () {
							return cb(null, serviceId.data);
						}, 2000);
					}
				});
			}
		});
	}
	
	function deployController(currentScope, cb) {
		deployservice(currentScope, 'controller', cb)
	}
	
	function deployUrac(currentScope, cb) {
		deployservice(currentScope, 'urac', cb)
	}
	
	function deployOauth(currentScope, cb) {
		deployservice(currentScope, 'oauth', cb)
	}
	
	function productize(currentScope, wizard, cb){
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
				'productCode': 'PORTAL'
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
								if (eachPack.code === 'PORTAL_MAIN') {
									mainPackFound = true;
								}
								if (eachPack.code === 'PORTAL_USER') {
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
							if (eachApp.package === 'PORTAL_MAIN' && eachApp.product === 'PORTAL') {
								mainApplicationFound = eachApp.appId;
								if (eachApp.keys && eachApp.keys.length > 0 && eachApp.keys[0].config && eachApp.keys[0].config.portal
									&& eachApp.keys[0].extKeys && eachApp.keys[0].extKeys.length > 0 && eachApp.keys[0].extKeys[0].env === 'PORTAL') {
									mainApplicationKeyFound = true;
								}
							}
							if (eachApp.package === 'PORTAL_USER' && eachApp.product === 'PORTAL') {
								userApplicationFound = eachApp.appId;
								if (eachApp.keys && eachApp.keys.length > 0 && eachApp.keys[0].config && eachApp.keys[0].config.portal
									&& eachApp.keys[0].extKeys && eachApp.keys[0].extKeys.length > 0 && eachApp.keys[0].extKeys[0].env === 'PORTAL') {
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
				'code': wizard.gi.code,
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
				var postData = {
					'code': "MAIN",
					'name': "Main Package",
					'description': "This is a public package for the portal product that allows users to login to the portal interface.",
					'_TTL': (7 * 24).toString(),
					"acl": {
						"portal": {
							"oauth": {
								"access": false,
								"apisPermission": "restricted",
								"get": {
									"apis": {
										"/authorization": {}
									}
								},
								"post": {
									"apis": {
										"/token": {}
									}
								},
								"delete": {
									"apis": {
										"/accessToken/:token": {
											"access": true
										},
										"/refreshToken/:token": {
											"access": true
										}
									}
								}
							},
							"urac": {
								"access": false,
								"apisPermission": "restricted",
								"get": {
									"apis": {
										"/forgotPassword": {},
										"/changeEmail/validate": {},
										"/checkUsername": {},
										"/account/getUser": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {},
										"/account/changePassword": {
											"access": true
										},
										"/account/changeEmail": {
											"access": true
										},
										"/account/editProfile": {
											"access": true
										}
									}
								}
							}
						}
					}
				};
				
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/product/packages/add",
					"data": postData,
					"params": {"id": productId}
				}, mCb);
				
			}
			
			function addUserPackage(productId, mCb) {
				var postData = {
					'code': "USER",
					'name': "User Package",
					'description': "This package offers the minimum ACL needed to execute management operation in the portal interface.",
					'_TTL': (7 * 24).toString(),
					"acl": {
						"portal": {
							"oauth": {
								"access": true
							},
							"urac": {
								"access": true,
								"apisPermission": "restricted",
								"get": {
									"apis": {
										"/account/getUser": {},
										"/changeEmail/validate": {},
										"/checkUsername": {},
										"/forgotPassword": {},
										"/owner/admin/users/count": {},
										"/owner/admin/listUsers": {},
										"/owner/admin/changeUserStatus": {},
										"/owner/admin/getUser": {},
										"/owner/admin/group/list": {},
										"/owner/admin/tokens/list": {},
										"/tenant/getUserAclInfo": {},
										"/tenant/list": {}
									}
								},
								"post": {
									"apis": {
										"/account/changePassword": {},
										"/account/changeEmail": {},
										"/account/editProfile": {},
										"/resetPassword": {},
										"/owner/admin/addUser": {},
										"/owner/admin/editUser": {},
										"/owner/admin/editUserConfig": {},
										"/owner/admin/group/add": {},
										"/owner/admin/group/edit": {},
										"/owner/admin/group/addUsers": {}
									}
								},
								"delete": {
									"apis": {
										"/owner/admin/group/delete": {},
										"/owner/admin/tokens/delete": {}
									}
								}
							}
						}
					}
				};
				
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/product/packages/add",
					"data": postData,
					"params": {"id": productId}
				}, mCb);
				
			}
		}
		
		function multitenancyApiCall(mCb) {
			var postData = {
				'type': "client",
				'code': "PRTL",
				'name': "Portal Product",
				'email': "me@localhost.com",
				'description': "Portal Tenant that uses the portal product and its packages",
				'tag': "portal"
			};
			
			if (!tenantFound) {
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/tenant/add",
					"data": postData
				}, function (error, response) {
					if (error) {
						mCb(error);
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
					'productCode': "PORTAL",
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
							'env': 'PORTAL'
						};
						
						let params = {
							"id": tenantId,
							"appId": appId,
							"key": key,
							"dashboardAccess": (packageName === 'user')
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
								// if(packageName === 'main'){
								// 	currentScope.tenantExtKey = response.extKey;
								// }
								
								// TODO: check how the nginx was deployed to determine the protocol and the port
								let protocol = "http";
								let port = 80;
								let domain = protocol + "://" + currentScope.wizard.gi.sitePrefix + "." + currentScope.wizard.gi.domain + ":" + port;
								
								var postData = {
									'envCode': currentScope.wizard.gi.code.toLowerCase(),
									'config': {
										"oauth": {
											"loginMode": "urac"
										},
										"commonFields": {
											"mail": {
												"from": "me@localhost.com",
												"transport": {
													"type": "sendmail",
													"options": {}
												}
											}
										},
										"urac": {
											"hashIterations": 1024,
											"seedLength": 32,
											"link": {
												"addUser": domain + "/#/setNewPassword",
												"changeEmail": domain + "/#/changeEmail/validate",
												"forgotPassword": domain + "/#/resetPassword",
												"join": domain + "/#/join/validate"
											},
											"tokenExpiryTTL": 172800000,
											"validateJoin": true,
											"mail": {
												"join": {
													"subject": "Welcome to SOAJS",
													"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/join.tmpl"
												},
												"forgotPassword": {
													"subject": "Reset Your Password at SOAJS",
													"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/forgotPassword.tmpl"
												},
												"addUser": {
													"subject": "Account Created at SOAJS",
													"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/addUser.tmpl"
												},
												"changeUserStatus": {
													"subject": "Account Status changed at SOAJS",
													"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/changeUserStatus.tmpl"
												},
												"changeEmail": {
													"subject": "Change Account Email at SOAJS",
													"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/changeEmail.tmpl"
												}
											}
										}
									}
								};
								
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
	}
	
	function getPermissions(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/key/permission/get"
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$localStorage.soajs_user = null;
				$cookies.remove('access_token', {'domain': interfaceDomain});
				$cookies.remove('refresh_token', {'domain': interfaceDomain});
				$cookies.remove('soajs_dashboard_key', {'domain': interfaceDomain});
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$localStorage.acl_access = response.acl;
				$localStorage.environments = response.environments;
				response.environments.forEach(function (oneEnv) {
					if (oneEnv.code.toLowerCase() === 'dashboard') {
						// todo
						// $cookies.putObject('myEnv', oneEnv, {'domain': interfaceDomain});
						// $scope.$parent.currentDeployer.type = oneEnv.deployer.type;
					}
				});
				return cb();
			}
		});
	}
	
	function removeEnvironment(currentScope){
		getSendDataFromServer(currentScope, ngDataApi, {
				"method": "delete",
				"routeName": "/dashboard/environment/delete",
				"params": { "id": currentScope.envId }
			}, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else{
					if(currentScope.wizard.deploy.selectedDriver ==='docker' &&
						currentScope.wizard.deploy.deployment.docker.dockerremote){
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "get",
							"routeName": "/dashboard/environment/platforms/list",
							"params": {
								env: currentScope.wizard.gi.code
							}
						}, function (error, response) {
							if (error) {
								currentScope.displayAlert("danger", error.code, true, 'dashboard', error.message);
							} else {
								response.data.forEach((oneCert) =>{
									getSendDataFromServer(currentScope, ngDataApi, {
										"method": "delete",
										"routeName": "/dashboard/environment/platforms/cert/delete",
										"params": {
											"id": oneCert._id,
											"env": currentScope.wizard.gi.code,
											"driverName": 'docker.remove'
										}
									}, function (error, response) {
										if (error) {
											currentScope.displayAlert("danger", error.code, true, 'dashboard', error.message);
										}
									});
								});
							}
						});
					}
					// else some error appeared
				}
			});
	}
	
	function removeProduct(currentScope){
		
		if(currentScope.envProductId){
			productRemove();
		}
		else if(currentScope.envTenantId){
			
			tenantRemove();
		}
		
		function productRemove(){
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "delete",
				"routeName": "/dashboard/product/delete",
				"params": { "id": currentScope.envProductId }
			}, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					if(currentScope.envTenantId){
						tenantRemove();
					}
				}
			});
		}
		
		function tenantRemove(){
			//remove the tenant as well
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "delete",
				"routeName": "/dashboard/tenant/delete",
				"params": { "id": currentScope.envTenantId }
			}, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
			});
		}
	}
	
	function removeService(currentScope, serviceName, id){
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/cloud/services/delete',
			params: {
				env: currentScope.wizard.gi.code,
				serviceId: id,
				mode: currentScope.wizard[serviceName].mode
			}
		}, function (error) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
		});
	}
	
	function removeController(currentScope, id){
		removeService(currentScope, 'controller', id);
	}
	
	function removeUrac(currentScope, id){
		removeService(currentScope, 'controller', id);
	}
	
	function removeOauth(currentScope, id){
		removeService(currentScope, 'controller', id);
	}
	
	function removeCatalog(currentScope, id){
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/catalog/recipes/delete',
			params: {
				id: id
			}
		}, function (error) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
		});
	}
	
	function listServers(currentScope, cb){
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources/list',
			params: {
				env: currentScope.wizard.gi.code.toUpperCase()
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				let servers = [];
				response.forEach( (oneResource) => {
					if(oneResource.type === 'cluster' && oneResource.category === 'mongo' && oneResource.plugged && oneResource.shared && (!oneResource.sharedEnvs || oneResource.sharedEnvs[currentScope.wizard.gi.code.toUpperCase()])){
						servers.push(oneResource);
					}
				});
				
				return cb(servers);
			}
		});
	}
	
	function handleClusters(currentScope, cb){
		//todo: finish the data before proceeding
		
		if(currentScope.wizard.cluster.local){
			//call get catalog recipes and find the mongo recipe id and use it
			//need to deploy the resource using mongo recipe, replica 1 and the name specified
			//need to add the resource in the database
		}
		else if (currentScope.wizard.cluster.share){
		
		}
		else if(currentScope.wizard.cluster.external){
			//need to add the resource in the database
		}
		
		//regardless of the above, need to add a new urac database with the cluster chosen
		//regardless of the above, need to add update the session databse with the cluster chosen
		
		let data = {
			"deployConfig": {
				"replication": {
					"mode": (currentScope.wizard.deploy.deployment.docker) ? "replicated": "deployment",
					"replicas": 1
				}
			},
			"custom": {
				"name": currentScope.wizard.cluster.local.name,
				"type": ""
			},
			"recipe": 123,
			"env": currentScope.wizard.gi.code.toUpperCase()
		};

		//deploy Service
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/soajs/deploy",
			"data": data
		}, function (error, serviceId) {
			if (error) {
				return cb(error);
			} else {
				currentScope.clusterId = serviceId;
				return cb(null, true);
			}
		});
	}
	
	function removeCluster(currentScope){
		if(currentScope.wizard.cluster.local){
			//need to remove the deployed service of the server
			removeService(currentScope, 'mongo_cluster', currentScope.clusterId);
		}
		
		if(!currentScope.wizard.cluster.share){
			//need to remove the resource created in the database
			
		}
	}
	
	return {
		'createEnvironment': createEnvironment,
		'uploadEnvCertificates': uploadEnvCertificates,
		'createNginxRecipe': createNginxRecipe,
		'deployNginx': deployNginx,
		
		'deployController': deployController,
		'deployUrac': deployUrac,
		'deployOauth': deployOauth,
		
		'getPermissions': getPermissions,
		'productize': productize,
		
		'removeEnvironment': removeEnvironment,
		'removeProduct': removeProduct,
		
		'removeController': removeController,
		'removeUrac': removeUrac,
		'removeOauth': removeOauth,
		
		'removeCatalog': removeCatalog,
		
		'listServers': listServers,
		'handleClusters': handleClusters,
		'removeCluster': removeCluster
	};
	
}]);