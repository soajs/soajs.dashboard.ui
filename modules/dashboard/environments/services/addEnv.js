"use strict";
var dbServices = soajsApp.components;
dbServices.service('addEnv', ['ngDataApi', '$timeout', '$cookies', '$localStorage', 'Upload', function (ngDataApi, $timeout, $cookies, $localStorage, Upload) {
	
	function createEnvironment(currentScope, cb) {
		let data = currentScope.wizard.gi;
		data.deploy = currentScope.wizard.deploy;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/environment/add',
			data: {
				data: data
			}
		}, function (error) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				return cb();
			}
		});
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
					overlayLoading.hide();
					currentScope.displayAlert('danger', response.errors.details[0].message);
				}
				else {
					counter++;
					if (counter === certificatesNames.length) {
						return uCb();
					} else {
						uploadFiles(certificatesNames, counter, uCb);
					}
				}
			}).error(function () {
				overlayLoading.hide();
				currentScope.displayAlert('danger', translation.errorOccurredWhileUploadingFile[LANG] + " " + options.params.filename);
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
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			}
			else {
				return cb(response.data);
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
						"SOAJS_EXTKEY": {
							"type": "computed",
							"value": "$SOAJS_EXTKEY"
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
				name: 'nginx'
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
		}, function (error) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			}
			else {
				return cb();
			}
		});
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
		}, function (error) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			} else {
				
				//deploy Controller
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/cloud/services/soajs/deploy",
					"data": data
				}, function (error) {
					if (error) {
						overlayLoading.hide();
						currentScope.displayAlert('danger', error.message);
					} else {
						$timeout(function () {
							return cb();
						}, 2000);
					}
				});
			}
		});
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
	
	return {
		'createEnvironment': createEnvironment,
		'uploadEnvCertificates': uploadEnvCertificates,
		'createNginxRecipe': createNginxRecipe,
		'deployNginx': deployNginx,
		'deployController': deployController,
		'getPermissions': getPermissions
	};
	
}]);