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
				
				if (currentScope.wizard.nginx.customUi) {
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
	
	function deployController(currentScope, cb) {
		let data = {
			"deployConfig": {
				"replication": {
					"mode": currentScope.wizard.controller.mode
				},
				"memoryLimit": currentScope.wizard.controller.memory * 1048576
			},
			"gitSource": {
				"owner": "soajs",
				"repo": "soajs.controller",
				"branch": currentScope.wizard.controller.branch
			},
			"custom": {
				"name": "controller",
				"type": "service"
			},
			"recipe": currentScope.wizard.controller.catalog,
			"env": currentScope.wizard.gi.code.toUpperCase()
		};
		
		//get the commit
		if (currentScope.wizard.controller.commit) {
			data.gitSource.commit = currentScope.wizard.controller.commit;
		}
		
		//check the replicas
		if (['replicated', 'deployment'].indexOf(currentScope.wizard.controller.mode) !== -1) {
			data.deployConfig.replication.replicas = currentScope.wizard.controller.number;
		}
		
		//if custom image info
		if (currentScope.wizard.controller.imageName) {
			data.custom.image = {
				name: currentScope.wizard.controller.imageName,
				prefix: currentScope.wizard.controller.imagePrefix,
				tag: currentScope.wizard.controller.imageTag
			}
		}
		
		//if user input env variables
		if (currentScope.wizard.controller.custom) {
			data.custom.env = {};
			for (let env in currentScope.wizard.controller.custom) {
				data.custom.env[env] = currentScope.wizard.controller.custom[env].value;
			}
		}
		
		//register Controller in CD as deployed
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cd",
			"data": {
				config: {
					serviceName: "controller",
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
				
				//deploy Controller
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
		productizeApiCall( (error) => {
			if(error){
				return cb(error);
			}
			else{
				multitenancyApiCall(cb);
			}
		});
		
		function productizeApiCall(mCb){
			var postData = {
				'code': wizard.gi.code,
				'name': "Portal Product",
				'description': "This product contains packages that offer access to the portal interface of SOAJS to manage your products."
			};
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
						if(error){
							return mCb(error);
						}
						else{
							currentScope.envProductId = productId.data;
							addUserPackage(productId.data, mCb);
						}
					});
				}
			});
			
			function addBasicPackage(productId, mCb){
				var postData = {
					'code': "MAIN",
					'name': "Main Package",
					'description': "This is a public package for the portal product that allows users to login to the portal interface.",
					'_TTL': (7 * 24).toString(),
					"acl": {
						"dashboard": {
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
					"params": { "id": productId }
				}, mCb);
			}
			
			function addUserPackage(productId, mCb){
				var postData = {
					'code': "USER",
					'name': "User Package",
					'description': "This package offers the minimum ACL needed to execute management operation in the portal interface.",
					'_TTL': (7 * 24).toString(),
					"acl": {
						"dashboard": {
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
					"params": { "id": productId }
				}, mCb);
			}
		}
		
		function multitenancyApiCall(mCb){
			var postData = {
				'type': "client",
				'code': "PRTL",
				'name': "Portal Product",
				'email': "me@localhost.com",
				'description': "Portal Tenant that uses the portal product and its packages",
				'tag': "portal"
			};
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "post",
				"routeName": "/dashboard/tenant/add",
				"data": postData
			}, function (error, response) {
				if (error) {
					return mCb(error);
				}
				else {
					var tId = response.id;
					currentScope.envTenantId = response.id;
					addApplication(tId, 'main', (error)=>{
						if(error){
							return mCb(error);
						}
						else{
							addApplication(tId, 'user', mCb);
						}
					});
				}
			});
			
			function addApplication(tenantId, packageName, mCb){
				var ttl = 7 * 24;
				var postData = {
					'description': 'Portal ' + packageName + ' application',
					'_TTL': ttl.toString(),
					'productCode': "PORTAL",
					'packageCode': packageName.toUpperCase()
				};
				
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/tenant/application/add",
					"data": postData,
					"params": { "id": tenantId }
				}, function (error, response) {
					if (error) {
						return mCb(error);
					}
					else {
						var appId = response.appId;
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/tenant/application/key/add",
							"params": { "id": tenantId, "appId": appId }
						}, function (error, response) {
							if (error) {
								return mCb(error);
							}
							else {
								var key = response.key;
								var postData = {
									'expDate': null,
									'device': null,
									'geo': null,
									'env': 'PORTAL'
								};
								getSendDataFromServer(currentScope, ngDataApi, {
									"method": "post",
									"routeName": "/dashboard/tenant/application/key/ext/add",
									"data": postData,
									"params": { "id": tenantId, "appId": appId, "key": key }
								}, function (error) {
									if (error) {
										return cb(error);
									}
									else {
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
														"addUser": "http://dashboard.soajs.org/#/setNewPassword",
														"changeEmail": "http://dashboard.soajs.org/#/changeEmail/validate",
														"forgotPassword": "http://dashboard.soajs.org/#/resetPassword",
														"join": "http://dashboard.soajs.org/#/join/validate"
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
											"params": { "id": tenantId, "appId": appId, "key": key }
										},  mCb);}
								});
								
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
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/product/delete",
			"params": { "id": currentScope.envProductId }
		}, function (error) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
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
		});
	}
	
	function removeController(currentScope, id){
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/cloud/services/delete',
			params: {
				env: currentScope.wizard.gi.code,
				serviceId: id,
				mode: currentScope.wizard.controller.mode
			}
		}, function (error) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
		});
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
	
	return {
		'createEnvironment': createEnvironment,
		'uploadEnvCertificates': uploadEnvCertificates,
		'createNginxRecipe': createNginxRecipe,
		'deployNginx': deployNginx,
		'deployController': deployController,
		'getPermissions': getPermissions,
		'productize': productize,
		
		'removeEnvironment': removeEnvironment,
		'removeProduct': removeProduct,
		'removeController': removeController,
		'removeCatalog': removeCatalog
	};
	
}]);