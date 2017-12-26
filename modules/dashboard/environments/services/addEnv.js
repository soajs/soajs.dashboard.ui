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
		if (currentScope.wizard.deploy.selectedDriver === 'docker') {
			let certificatesNames = Object.keys(currentScope.remoteCertificates);
			if(currentScope.wizard.deploy.previousEnvironment){
				return cb();
			}
			else{
				uploadFiles(certificatesNames, 0, cb);
			}
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
			let recipe = angular.copy(environmentsConfig.portal.nginxRecipe);
			
			recipe.deployOptions.image.prefix = currentScope.wizard.nginx.imagePrefix || "soajsorg";
			recipe.deployOptions.image.name = currentScope.wizard.nginx.imageName || "nginx";
			recipe.deployOptions.image.tag = currentScope.wizard.nginx.imageTag || "latest";
			recipe.deployOptions.ports[0].published = currentScope.wizard.nginx.http || 80;
			
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
				
				//supporting HT only
				if(currentScope.wizard.deploy.selectedDriver === 'kubernetes' && currentScope.wizard.nginx.customSSL && currentScope.wizard.nginx.customSSL.secret && currentScope.wizard.nginx.customSSL.secret.volume){
					recipe.deployOptions.voluming.volumes.push(currentScope.wizard.nginx.customSSL.secret.volume);
				}
				
				//supporting HT only
				if(currentScope.wizard.deploy.selectedDriver === 'kubernetes' && currentScope.wizard.nginx.customSSL && currentScope.wizard.nginx.customSSL.secret && currentScope.wizard.nginx.customSSL.secret.volumeMounts){
					recipe.deployOptions.voluming.volumeMounts.push(currentScope.wizard.nginx.customSSL.secret.volumeMounts);
				}
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
				
				//supporting HT only
				if(currentScope.wizard.deploy.selectedDriver === 'kubernetes' && currentScope.wizard.nginx.customSSL && currentScope.wizard.nginx.customSSL.secret && currentScope.wizard.nginx.customSSL.secret.env){
					for(let envVar in currentScope.wizard.nginx.customSSL.secret.env){
						recipe.buildOptions.env[envVar] = currentScope.wizard.nginx.customSSL.secret.env[envVar];
					}
				}
			}
			
			if (currentScope.wizard.nginx.customUi && currentScope.wizard.nginx.customUi.source && currentScope.wizard.nginx.customUi.provider && currentScope.wizard.nginx.customUi.repo && currentScope.wizard.nginx.customUi.owner && currentScope.wizard.nginx.customUi.branch){
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
				name: currentScope.wizard.gi.code.toLowerCase() + '-nginx'
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
		}, function(error, response){
			if(error){
				return cb(error);
			}
			else {
				return cb(null, response.id);
			}
		});
	}

	function deployservice(currentScope, serviceName, version, cb) {
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
				"type": "service",
				"version": version.toString()
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

		let cdPost = {
			serviceName: serviceName,
			env: currentScope.wizard.gi.code.toUpperCase()
		};
		
		if(serviceName === 'controller'){
			cdPost.default = {
				deploy: true,
				options: data
			};
		}
		else{
			cdPost.version = {
				deploy: true,
				options: data,
				v: 'v' + version
			};
		}
		
		//register Controller in CD as deployed
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cd",
			"data": {
				config: cdPost
			}
		}, function (error, cdResponse) {
			if (error) {
				return cb(error);
			} else {
				data.custom.version = parseInt(data.custom.version);
				//deploy Service
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/cloud/services/soajs/deploy",
					"data": data
				}, function (error, serviceId) {
					if (error) {
						return cb(error);
					} else {
						$timeout(function () {
							return cb(null, serviceId.id);
						}, 2000);
					}
				});
			}
		});
	}

	function deployController(currentScope, cb) {
		deployservice(currentScope, 'controller', 1, cb)
	}

	function deployUrac(currentScope, cb) {
		deployservice(currentScope, 'urac', 2, cb)
	}

	function deployOauth(currentScope, cb) {
		deployservice(currentScope, 'oauth', 1, cb)
	}

	function getPermissions(currentScope, cb) {
		var options = {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": {}
		};
		getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$localStorage.environments = response;
				response.forEach(function (oneEnv) {
					if (oneEnv.code.toLowerCase() === currentScope.wizard.gi.code.toLowerCase()) {
						currentScope.$parent.currentDeployer.type = oneEnv.deployer.type;
						
						var data = {
							"_id": oneEnv._id,
							"code": oneEnv.code,
							"sensitive": oneEnv.sensitive,
							"domain": oneEnv.domain,
							"profile": oneEnv.profile,
							"sitePrefix": oneEnv.sitePrefix,
							"apiPrefix": oneEnv.apiPrefix,
							"description": oneEnv.description,
							"deployer": oneEnv.deployer
						};
						$cookies.putObject('myEnv', data, { 'domain': interfaceDomain });
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
				"params": { "id": currentScope.envId, "force": true }
			}, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else{
					if(currentScope.wizard.deploy.selectedDriver ==='docker'){
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
	
	function removeNginx(currentScope, id){
		removeService(currentScope, 'nginx', id);
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
	
	function deployCluster(currentScope, cb) {
		if (currentScope.wizard.cluster.local) {
			//list all recipes to find mongo recipe
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/catalog/recipes/list',
			}, function (error, recipes) {
				if (error) {
					return cb(error);
				}
				else {
					var mongoRecipeId;
					if (recipes && recipes.length > 0) {
						recipes.forEach(function (oneRecipe) {
							if (oneRecipe.name === 'Mongo Recipe') {
								mongoRecipeId = oneRecipe._id.toString();
							}
						});
					}
					//create resource object
					var resourceObj = {
						env: currentScope.wizard.gi.code.toUpperCase(),
						resource: {
							"name": currentScope.wizard.cluster.local.name,
							"type": "cluster",
							"category": "mongo",
							"plugged": true,
							"shared": false,
							"config": {
								"servers": currentScope.wizard.cluster.local.servers,
								"URLParam": currentScope.wizard.cluster.local.URLParam || {},
								"streaming": currentScope.wizard.cluster.local.streaming || {}
							}
						}
					};
					if (currentScope.wizard.cluster.local.credentials
						&& Object.hasOwnProperty.call(currentScope.wizard.cluster.local.credentials, "username")
						&& Object.hasOwnProperty.call(currentScope.wizard.cluster.local.credentials, "password")
						&& currentScope.wizard.cluster.local.credentials.username !== ""
						&& currentScope.wizard.cluster.local.credentials.password !== "") {
						resourceObj.resource.config.credentials = currentScope.wizard.cluster.local.credentials;
					}
					if (currentScope.wizard.cluster.local.prefix) {
						resourceObj.resource.config.prefix = currentScope.wizard.cluster.local.prefix;
					}
					//add mongo cluster
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'post',
						routeName: '/dashboard/resources/add',
						data: resourceObj
					}, function (error, resources) {
						if (error) {
							return cb(error);
						}
						else {
							if (resources && resources._id){
								currentScope.wizard.cluster.clusterId = resources._id;
							}
							var deployObject = {
								env: currentScope.wizard.gi.code.toUpperCase(),
								recipe: mongoRecipeId,
								deployConfig: {
									"replication": {
										"replicas": 1,
										"mode": (currentScope.wizard.deploy.selectedDriver === "kubernetes")
											? "deployment" : "replicated"
									}
								},
								custom: {
									"resourceId": resources._id.toString(),
									"name": currentScope.wizard.cluster.local.name,
									"type": "cluster",
								}
							};
							//deploy mongo cluster
							getSendDataFromServer(currentScope, ngDataApi, {
								method: 'post',
								routeName: '/dashboard/cloud/services/soajs/deploy',
								"data": deployObject
							}, function (error, service) {
								currentScope.wizard.cluster.serviceId = service;
								return cb(error, {
									name: currentScope.wizard.cluster.local.name,
									prefix: currentScope.wizard.cluster.local.prefix || null
								});
							});
						}
					});
				}
			});
		}
		else if (currentScope.wizard.cluster.share) {
			//return shared cluster
			return cb (null, {
				name: currentScope.wizard.cluster.share.name,
				prefix: currentScope.wizard.cluster.share.prefix || null
			});
		}
		else if (currentScope.wizard.cluster.external) {
			//only add the resource
			var resourceObj = {
				env: currentScope.wizard.gi.code.toUpperCase(),
				resource: {
					"name": currentScope.wizard.cluster.external.name,
					"type": "cluster",
					"category": "mongo",
					"plugged": true,
					"shared": false,
					"config": {
						"servers": currentScope.wizard.cluster.external.servers,
						"URLParam": currentScope.wizard.cluster.external.URLParam || {},
						"streaming": currentScope.wizard.cluster.external.streaming || {}
					}
				}
			};
			if (currentScope.wizard.cluster.external.credentials
				&& Object.hasOwnProperty.call(currentScope.wizard.cluster.external.credentials, "username")
				&& Object.hasOwnProperty.call(currentScope.wizard.cluster.external.credentials, "password")
				&& currentScope.wizard.cluster.external.credentials.username !== ""
				&& currentScope.wizard.cluster.external.credentials.password !== "") {
				resourceObj.resource.config.credentials = currentScope.wizard.cluster.external.credentials;
			}
			
			if (currentScope.wizard.cluster.external.prefix) {
				resourceObj.resource.config.prefix = currentScope.wizard.cluster.external.prefix;
			}
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'post',
				routeName: '/dashboard/resources/add',
				data: resourceObj
			}, function (error, cluster) {
				if (cluster && cluster._id){
						currentScope.wizard.cluster.clusterId = cluster._id;
				}
				return cb(error, {
					name: currentScope.wizard.cluster.external.name,
					prefix: currentScope.wizard.cluster.external.prefix || null
				});
			});
		}
	}
	
	function handleClusters(currentScope, cb) {
		deployCluster(currentScope, function (error, cluster) {
			if (error) {
				return cb(error);
			}
			let uracData = {
				"name": "urac",
				"cluster": cluster.name,
				"tenantSpecific": true
			};
			if (cluster.prefix){
				uracData.prefix = cluster.prefix;
			}
			//add urac db using cluster
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "post",
				"routeName": "/dashboard/environment/dbs/add",
				"params": {
					"env": currentScope.wizard.gi.code.toUpperCase()
				},
				"data": uracData
			}, function (error) {
				if (error) {
					return cb(error);
				}
				else {
					var sessionData = {
						"name": "session",
						"cluster": cluster.name,
						"tenantSpecific": false,
						"sessionInfo": {
							dbName: "core_session",
							store: {},
							collection: "sessions",
							stringify: false,
							expireAfter: 1209600000
						}
					};
					if (cluster.prefix){
						sessionData.prefix = cluster.prefix;
					}
					//update session db
					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "post",
						"routeName": "/dashboard/environment/dbs/add",
						"params": {
							"env": currentScope.wizard.gi.code.toUpperCase()
						},
						"data": sessionData
					}, function (error) {
						return cb(error, true);
					});
				}
			});
		});
	}

	function removeCluster(currentScope, cb){
		if (currentScope.wizard.cluster.local) {
			if (currentScope.wizard.cluster.serviceId && currentScope.wizard.cluster.serviceId.id){
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'delete',
					routeName: '/dashboard/cloud/services/delete',
					params: {
						env: currentScope.wizard.gi.code.toUpperCase(),
						serviceId: currentScope.wizard.cluster.serviceId.id,
						"mode": (currentScope.wizard.deploy.selectedDriver === "kubernetes")
							? "deployment" : "replicated"
					}
				}, function () {
					deleteResource(currentScope);
				});
			}
			else {
				deleteResource(currentScope);
			}
			
		}
		if(currentScope.wizard.cluster.external){
			deleteResource (currentScope, cb);
		}
	}
	
	function deleteResource (currentScope){
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/resources/delete",
			"params": {
				"env" : currentScope.wizard.gi.code.toUpperCase(),
				"id" : currentScope.wizard.cluster.clusterId
			}
		}, function () {
			return true;
		});
		
	}
	
	function addUserAndGroup(currentScope, cb){
		
		let max = 10;
		let counter = 0;
		let portalAPI = getAPIInfo(currentScope, currentScope.wizard.nginx, 'apiPrefix');
		
		checkIfUracRunning((error, response) => {
			if(error){
				return cb(error);
			}
			else{
				doAdd(cb);
			}
		});
		
		function checkIfUracRunning(cb){
			let opts = {
				url: portalAPI,
				routeName: '/urac/checkUsername',
				method: 'get',
				token: false,
				headers: {
					key: currentScope.tenantExtKey
				},
				params:{
					username: currentScope.wizard.gi.username
				}
			};
			getSendDataFromServer(currentScope, ngDataApi, opts, function(error, response){
				if(error){
					counter++;
					if(counter === max){
						return cb(null, response);
					}
					else{
						$timeout(function(){
							checkIfUracRunning(cb);
						}, 10000);
					}
				}
				else {
					return cb(null, response);
				}
			});
		}
		
		function doAdd(cb) {
			//add the user
			let opts = {
				url: portalAPI,
				method: 'post',
				routeName: '/urac/join',
				headers: {
					key: currentScope.tenantExtKey
				},
				token: false,
				data: {
					"username": currentScope.wizard.gi.username,
					"firstName": "PORTAL",
					"lastName": "OWNER",
					"email": currentScope.wizard.gi.email,
					"password": currentScope.wizard.gi.password
				}
			};
			getSendDataFromServer(currentScope, ngDataApi, opts, function(error, response){
				if(error){
					if(error.code === 402){
						return cb(null, error.message);
					}
					else return cb(error);
				}
				else{
					return cb(null, true);
				}
			});
		}
	}
	
	function getAPIInfo(currentScope, nginx, type){
		let protocol = "http";
		let port = 80;
		
		if(nginx){
			if(nginx.recipe && nginx.recipe.recipe && nginx.recipe.recipe.deployOptions && nginx.recipe.recipe.deployOptions.ports){
				for(var i = 0; i < nginx.recipe.recipe.deployOptions.ports.length; i++) {
					var onePort = nginx.recipe.recipe.deployOptions.ports[i];
					//check for http port first, if found set it as env port
					if(onePort.name === 'http' && onePort.isPublished && onePort.published) {
						port = onePort.published;
						protocol = 'http';
					}
					
					//then check if https port is found and published, if yes check if ssl is on and set the port and protocol accordingly
					if(onePort.name === 'https' && onePort.isPublished && onePort.published) {
						for (var oneEnv in nginx.recipe.recipe.buildOptions.env) {
							if(oneEnv === 'SOAJS_NX_API_HTTPS' && ['true', '1'].indexOf(nginx.recipe.recipe.buildOptions.env[oneEnv].value) !== -1) {
								protocol = 'https';
								port = onePort.published;
							}
						}
					}
				}
			}
			else{
				if(nginx.http){
					port = nginx.http;
				}
				if(nginx.ssl){
					port = nginx.https;
					protocol = "https";
				}
			}
		}
		
		return protocol + "://" + currentScope.wizard.gi[type] + "." + currentScope.wizard.gi.domain + ":" + port;
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
		
		'removeEnvironment': removeEnvironment,
		'removeProduct': removeProduct,

		'removeController': removeController,
		'removeUrac': removeUrac,
		'removeOauth': removeOauth,
		'removeNginx': removeNginx,

		'removeCatalog': removeCatalog,

		'listServers': listServers,
		'handleClusters': handleClusters,
		'removeCluster': removeCluster,
		
		"addUserAndGroup": addUserAndGroup,
		
		getAPIInfo
	};

}]);
