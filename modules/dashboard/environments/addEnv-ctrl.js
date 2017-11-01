"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('addEnvironmentCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', '$localStorage', '$window', 'Upload', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles, $localStorage, $window, Upload) {
	
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.wizard = {};
	
	$scope.Step1 = function () {
		overlayLoading.show();
		
		let entries = {
			code: {
				required: true
			},
			description: {
				required: false
			},
			domain: {
				required: true
			},
			apiPrefix: {
				required: false
			},
			sitePrefix: {
				required: false
			},
			tKeyPass: {
				required: true
			},
			soajsFrmwrk: {
				required: false,
				onAction: function () {
					
					if ($scope.form.formData.soajsFrmwrk) {
						entries.cookiesecret.required = true;
						entries.sessionName.required = true;
						entries.sessionSecret.required = true;
					}
					else {
						entries.cookiesecret.required = false;
						entries.sessionName.required = false;
						entries.sessionSecret.required = false;
					}
				}
			},
			cookiesecret: {
				required: false
			},
			sessionName: {
				required: false
			},
			sessionSecret: {
				required: false
			}
		};
		
		var configuration = angular.copy(environmentsConfig.form.add.step1.entries);
		$scope.tempFormEntries = entries;
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						
						//check mandatory fields
						for (let fieldName in $scope.tempFormEntries) {
							if ($scope.tempFormEntries[fieldName].required) {
								if (!formData[fieldName]) {
									$window.alert('Some of the fields under controller section are still missing.');
									return false;
								}
							}
						}
						
						if (formData.soajsFrmwrk) {
							if (!formData.cookiesecret || !formData.sessionName || !formData.sessionSecret) {
								$window.alert("If you want to use the SOAJS Framework, make sure you fill all of: cookie secret, session name & session secret");
								return false;
							}
						}
						
						if (!$localStorage.addEnv) {
							$localStorage.addEnv = {};
						}
						//todo: assert the inputs
						$localStorage.addEnv.step1 = angular.copy(formData);
						$scope.wizard.gi = angular.copy(formData);
						$scope.form.formData = {};
						$scope.lastStep = 1;
						
						$scope.Step2();
						
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/environments")
					}
				}
			]
		};
		
		buildForm($scope, $modal, options, function () {
			if ($localStorage.addEnv && $localStorage.addEnv.step1) {
				$scope.form.formData = angular.copy($localStorage.addEnv.step1);
				$scope.wizard.gi = angular.copy($scope.form.formData);
			}
			overlayLoading.hide();
		});
	};
	
	$scope.switchDriver = function (driver) {
		if (!$scope.platforms) {
			$scope.platforms = {
				manual: true,
				docker: false,
				kubernetes: false
			};
		}
		switch (driver) {
			case 'docker':
				$scope.platforms.docker = true;
				$scope.platforms.kubernetes = false;
				$scope.platforms.manual = false;
				break;
			case 'kubernetes':
				$scope.platforms.kubernetes = true;
				$scope.platforms.docker = false;
				$scope.platforms.manual = false;
				break;
			case 'manual':
			default:
				$scope.platforms.docker = false;
				$scope.platforms.kubernetes = false;
				$scope.platforms.manual = true;
				break;
		}
	};
	
	$scope.Step2 = function () {
		overlayLoading.show();
		var configuration = angular.copy(environmentsConfig.form.add.step2.entries);
		
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						$scope.form.formData = {};
						$scope.Step1();
					}
				},
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						if ($scope.platforms.manual) {
							formData.selectedDriver = 'manual';
							delete formData.kubernetes;
							delete formData.docker;
							$scope.lastStep = 2;
							$scope.overview();
						}
						else {
							if ($scope.platforms.docker) {
								delete formData.kubernetes;
								delete formData.deployment.kubernetes;
								formData.selectedDriver = 'docker';
								
								if (formData.deployment.docker.dockerremote) {
									if (!formData.deployment.docker.externalPort || !formData.deployment.docker.internalPort || !formData.deployment.docker.network) {
										$window.alert("Provide the information on how to connect to docker on your remote machine.");
										return false;
									}
									
									if (!formData.deployment.docker.ca || !formData.deployment.docker.cert || !formData.deployment.docker.key) {
										$window.alert("Docker requires you provide certificates so that the dashboard can connect to it securely. Please fill in the docker certificates.");
										return false;
									}
									
									if (formData.deployment.docker.ca && formData.deployment.docker.cert && formData.deployment.docker.key) {
										$scope.remoteCertificates = {
											ca: formData.deployment.docker.ca,
											cert: formData.deployment.docker.cert,
											key: formData.deployment.docker.key
										};
										
										delete formData.deployment.docker.ca;
										delete formData.deployment.docker.cert;
										delete formData.deployment.docker.key;
									}
								}
								else {
									formData.deployment.docker = {
										dockerremote: false
									};
								}
							}
							if ($scope.platforms.kubernetes) {
								delete formData.docker;
								delete formData.deployment.docker;
								formData.selectedDriver = 'kubernetes';
								
								if (formData.deployment.kubernetes.kubernetesremote) {
									if (!formData.deployment.kubernetes.nginxDeployType || !formData.deployment.kubernetes.port || !formData.deployment.kubernetes.token || !formData.deployment.kubernetes.NS || !Object.hasOwnProperty.call(formData.deployment.kubernetes, 'perService')) {
										$window.alert("Provide the information on how to connect to kubernetes on your remote machine.");
										return false;
									}
								}
								else {
									formData.deployment.kubernetes = {
										kubernetesremote: false
									};
								}
							}
							
							$localStorage.addEnv.step2 = angular.copy(formData);
							$scope.wizard.deploy = angular.copy(formData);
							$scope.lastStep = 2;
							$scope.Step3();
						}
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/environments")
					}
				}
			]
		};
		
		buildForm($scope, $modal, options, function () {
			if ($localStorage.addEnv && $localStorage.addEnv.step2) {
				$scope.form.formData = angular.copy($localStorage.addEnv.step2);
			}
			
			if (!$scope.form.formData.deployment) {
				$scope.form.formData.deployment = {};
			}
			
			if (!$scope.form.formData.deployment.docker) {
				$scope.form.formData.deployment.docker = {
					dockerremote: false
				};
			}
			
			if (!$scope.form.formData.deployment.kubernetes) {
				$scope.form.formData.deployment.kubernetes = {
					kubernetesremote: false
				};
			}
			
			$scope.platforms = {
				docker: $scope.form.formData.selectedDriver === 'docker' || false,
				kubernetes: $scope.form.formData.selectedDriver === 'kubernetes' || false,
				manual: $scope.form.formData.selectedDriver === 'manual' || false
			};
			
			if ($scope.remoteCertificates && Object.keys($scope.remoteCertificates).length > 0) {
				$scope.form.formData.deployment.docker.ca = $scope.remoteCertificates.ca;
				$scope.form.formData.deployment.docker.cert = $scope.remoteCertificates.cert;
				$scope.form.formData.deployment.docker.key = $scope.remoteCertificates.key;
			}
			overlayLoading.hide();
		});
	};
	
	$scope.Step3 = function () {
		overlayLoading.show();
		$scope.controllerRecipes = [];
		
		getCatalogRecipes((recipes) => {
			getControllerBranches((controllerBranches) => {
				recipes.forEach((oneRecipe) => {
					if (oneRecipe.type === 'service' && oneRecipe.subtype === 'soajs') {
						$scope.controllerRecipes.push(oneRecipe);
					}
				});
				
				let entries = {
					mode: {
						required: true,
						onAction: function () {
							$scope.tempFormEntries.number.required = ['deployment', 'replicated'].indexOf($scope.form.formData.mode) !== -1;
						}
					},
					number: {
						required: false
					},
					memory: {
						required: true
					},
					catalog: {
						required: true,
						onAction: function () {
							//reset form entries
							delete $scope.form.formData.branch;
							delete $scope.form.formData.imagePrefix;
							delete $scope.form.formData.imageName;
							delete $scope.form.formData.imageTag;
							delete $scope.form.formData.custom;
							
							injectCatalogInputs(recipes, controllerBranches);
						}
					},
					branch: {
						required: true
					}
				};
				
				doBuildForm(entries, controllerBranches);
			});
		});
		
		function doBuildForm(entries, controllerBranches) {
			var configuration = angular.copy(environmentsConfig.form.add.step3.entries);
			$scope.tempFormEntries = entries;
			var options = {
				timeout: $timeout,
				entries: configuration,
				name: 'addEnvironment',
				label: translation.addNewEnvironment[LANG],
				actions: [
					{
						'type': 'button',
						'label': "Back",
						'btn': 'success',
						'action': function () {
							$scope.form.formData = {};
							$scope.Step2();
						}
					},
					{
						'type': 'submit',
						'label': "Next",
						'btn': 'primary',
						'action': function (formData) {
							$scope.lastStep = 3;
							if (formData.deploy) {
								//check mandatory fields
								for (let fieldName in $scope.tempFormEntries) {
									if (fieldName === 'custom') {
										for (let env in $scope.tempFormEntries.custom) {
											if ($scope.tempFormEntries.custom[env].required) {
												if (!formData.custom[env].value) {
													$window.alert('Some of the fields under controller section are still missing.');
													return false;
												}
											}
										}
									}
									else if ($scope.tempFormEntries[fieldName].required) {
										if (!formData[fieldName]) {
											$window.alert('Some of the fields under controller section are still missing.');
											return false;
										}
									}
								}
								
								controllerBranches.branches.forEach((oneBranch) => {
									if (oneBranch.name === formData.branch && oneBranch.commit && oneBranch.commit.sha) {
										formData.commit = oneBranch.commit.sha;
									}
								});
								
								$localStorage.addEnv.step3 = angular.copy(formData);
								$scope.wizard.controller = angular.copy(formData);
								$scope.Step4();
							}
							else {
								$localStorage.addEnv.step3 = angular.copy(formData);
								$scope.wizard.controller = angular.copy(formData);
								$scope.overview();
							}
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							delete $localStorage.addEnv;
							$scope.form.formData = {};
							$scope.remoteCertificates = {};
							delete $scope.wizard;
							$scope.$parent.go("/environments")
						}
					}
				]
			};
			
			buildForm($scope, $modal, options, function () {
				if ($localStorage.addEnv && $localStorage.addEnv.step3) {
					$scope.wizard.controller = angular.copy($localStorage.addEnv.step3);
					$scope.form.formData = $scope.wizard.controller;
				}
				
				if ($scope.wizard.deploy.selectedDriver === 'docker') {
					$scope.allowedModes = [
						{
							v: 'global',
							l: 'Global'
						},
						{
							v: 'replicated',
							l: 'Replicated'
						}
					];
				}
				else {
					$scope.allowedModes = [
						{
							v: 'daemonset',
							l: 'Daemonset'
						},
						{
							v: 'deployment',
							l: 'Deployment'
						}
					];
				}
				
				//if catalog recipe selected, open it's sub items
				if ($scope.wizard.controller && $scope.wizard.controller.catalog) {
					injectCatalogInputs($scope.controllerRecipes, controllerBranches);
				}
				overlayLoading.hide();
			});
		}
	};
	
	$scope.Step4 = function () {
		overlayLoading.show();
		$scope.nginxRecipes = [];
		
		getCatalogRecipes((recipes) => {
			recipes.forEach((oneRecipe) => {
				if (oneRecipe.type === 'server' && oneRecipe.subtype === 'nginx') {
					$scope.nginxRecipes.push(oneRecipe);
				}
			});
			
			let entries = {
				memory: {
					required: true
				},
				norecipe: {
					onAction: function () {
						if ($scope.form.formData.norecipe) {
							entries.http.required = true;
							entries.catalog.required = false;
						}
						else {
							entries.catalog.required = true;
							
							entries.http.required = false;
							entries.https.required = false;
							entries.ssl.required = false;
							entries.certs.required = false;
						}
					}
				},
				http: {
					required: false
				},
				https: {
					required: false
				},
				ssl: {
					required: false,
					onAction: function () {
						if ($scope.form.formData.ssl) {
							entries.https.required = true;
						}
						else {
							entries.https.required = false;
							entries.certs.required = false;
						}
					}
				},
				certs: {
					required: false
				},
				catalog: {
					required: true,
					onAction: function () {
						//reset form entries
						delete $scope.form.formData.branch;
						delete $scope.form.formData.imagePrefix;
						delete $scope.form.formData.imageName;
						delete $scope.form.formData.imageTag;
						delete $scope.form.formData.custom;
						
						injectCatalogInputs(recipes);
					}
				}
			};
			
			doBuildForm(entries);
		});
		
		function doBuildForm(entries) {
			var configuration = angular.copy(environmentsConfig.form.add.step4.entries);
			$scope.tempFormEntries = entries;
			var options = {
				timeout: $timeout,
				entries: configuration,
				name: 'addEnvironment',
				label: translation.addNewEnvironment[LANG],
				actions: [
					{
						'type': 'button',
						'label': "Back",
						'btn': 'success',
						'action': function () {
							$scope.form.formData = {};
							$scope.Step3();
						}
					},
					{
						'type': 'submit',
						'label': "Next",
						'btn': 'primary',
						'action': function (formData) {
							$scope.lastStep = 4;
							if (formData.deploy) {
								//check mandatory fields
								for (let fieldName in $scope.tempFormEntries) {
									if (fieldName === 'custom') {
										for (let env in $scope.tempFormEntries.custom) {
											if ($scope.tempFormEntries.custom[env].required) {
												if (!formData.custom[env].value) {
													$window.alert('Some of the fields are still missing.');
													return false;
												}
											}
										}
									}
									else if (fieldName === 'certs') {
										if (formData.certs) {
											if (!formData.certsGit || !formData.certsGit.domain || !formData.certsGit.owner || !formData.certsGit.repo || !formData.certsGit.branch || !formData.certsGit.token) {
												$window.alert('Some of the fields are still missing.');
												return false;
											}
										}
									}
									else if ($scope.tempFormEntries[fieldName].required) {
										if (!formData[fieldName]) {
											$window.alert('Some of the fields are still missing.');
											return false;
										}
									}
								}
								
								if (formData.norecipe) {
									delete formData.imageName;
									delete formData.imagePrefix;
									delete formData.imageTag;
									delete formData.custom;
									delete formData.catalog;
								}
								else {
									delete formData.certs;
									delete formData.certsGit;
									delete formData.customUi;
									delete formData.http;
									delete formData.https;
									delete formData.ssl;
								}
								
								$localStorage.addEnv.step4 = angular.copy(formData);
								$scope.wizard.nginx = angular.copy(formData);
							}
							$scope.overview();
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							delete $localStorage.addEnv;
							$scope.form.formData = {};
							$scope.remoteCertificates = {};
							delete $scope.wizard;
							$scope.$parent.go("/environments")
						}
					}
				]
			};
			
			buildForm($scope, $modal, options, function () {
				if ($localStorage.addEnv && $localStorage.addEnv.step4) {
					$scope.wizard.nginx = angular.copy($localStorage.addEnv.step4);
					$scope.form.formData = $scope.wizard.nginx;
				}
				
				if ($scope.wizard.controller) {
					$scope.form.formData.deploy = $scope.wizard.controller.deploy;
				}
				
				if ($scope.wizard.deploy.selectedDriver === 'docker') {
					$scope.form.formData.mode = 'global';
				}
				else {
					$scope.form.formData.mode = 'daemonset';
				}
				
				if ($scope.form.formData.norecipe) {
					$scope.tempFormEntries.http.required = true;
					$scope.tempFormEntries.catalog.required = false;
				}
				else {
					$scope.tempFormEntries.catalog.required = true;
					
					$scope.tempFormEntries.http.required = false;
					$scope.tempFormEntries.https.required = false;
					$scope.tempFormEntries.ssl.required = false;
					$scope.tempFormEntries.certs.required = false;
				}
				
				//if catalog recipe selected, open it's sub items
				if ($scope.wizard.nginx && $scope.wizard.nginx.catalog) {
					injectCatalogInputs($scope.nginxRecipes);
				}
				overlayLoading.hide();
			});
		}
	};
	
	$scope.overview = function () {
		console.log($localStorage.addEnv);
		console.log($scope.wizard);
		console.log($scope.remoteCertificates);
		
		var configuration = angular.copy(environmentsConfig.form.add.overview.entries);
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						$scope.form.formData = {};
						//got back to last step !
						let stepNumber = "Step" + $scope.lastStep;
						$scope[stepNumber]();
					}
				},
				{
					'type': 'submit',
					'label': "Create Environment",
					'btn': 'primary',
					'action': function (formData) {
						/*
							1- create environment record in db
							2- if controller.deploy = true
								2.1- deploy controller
								2.2- wait for controllers to become available
								2.3- if recipe already exists --> deploy nginx
								2.4- if no recipe
									2.4.1- create recipe
									2.4.2- deploy nginx using recipe
						 */
						overlayLoading.show();
						createEnvironment(() => {
							uploadEnvCertificates(() => {
								if ($scope.wizard.controller.deploy) {
									deployController(() => {
										
										if ($scope.wizard.nginx.catalog) {
											deployNginx($scope.wizard.nginx.catalog, () => {
												delete $localStorage.addEnv;
												$scope.form.formData = {};
												$scope.remoteCertificates = {};
												delete $scope.wizard;
												overlayLoading.hide();
												$scope.displayAlert('success', "Environment Created");
												$scope.$parent.go("#/environments");
											});
										}
										else {
											createNginxRecipe((catalogId) => {
												deployNginx(catalogId, () => {
													delete $localStorage.addEnv;
													$scope.form.formData = {};
													$scope.remoteCertificates = {};
													delete $scope.wizard;
													overlayLoading.hide();
													$scope.displayAlert('success', "Environment Created");
													$scope.$parent.go("#/environments");
												});
											});
										}
									});
								}
								else {
									delete $localStorage.addEnv;
									$scope.form.formData = {};
									$scope.remoteCertificates = {};
									delete $scope.wizard;
									overlayLoading.hide();
									$scope.displayAlert('success', "Environment Created");
									$scope.$parent.go("#/environments");
								}
							});
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/environments")
					}
				}
			]
		};
		buildForm($scope, $modal, options, function () {
		
		});
		
		function createEnvironment(cb) {
			let data = $scope.wizard.gi;
			data.deploy = $scope.wizard.deploy;
			getSendDataFromServer($scope, ngDataApi, {
				method: 'post',
				routeName: '/dashboard/environment/add',
				data: {
					data: data
				}
			}, function (error, environmentId) {
				if (error) {
					overlayLoading.hide();
					$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					return cb();
				}
			});
		}
		
		function uploadEnvCertificates(cb) {
			if ($scope.wizard.deploy.selectedDriver === 'docker' && $scope.wizard.deploy.deployment.docker.dockerremote) {
				let certificatesNames = Object.keys($scope.remoteCertificates);
				console.log(certificatesNames);
				return cb();
				// uploadFiles(certificatesNames, 0, cb);
			}
			else {
				return cb();
			}
			
			function uploadFiles(certificatesNames, counter, uCb) {
				let oneCertificate = certificatesNames[counter];
				if (!$scope.remoteCertificates[oneCertificate] || !$scope.remoteCertificates[oneCertificate].name) {
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
						envCode: $scope.wizard.gi.code.toUpperCase(),
						filename: $scope.remoteCertificates[oneCertificate].name,
						certType: oneCertificate,
						platform: "docker",
						driver: "docker.remote",
						access_token: access_token
					},
					file: $scope.remoteCertificates[oneCertificate],
					headers: {
						'soajsauth': soajsauthCookie,
						'key': dashKeyCookie
					}
				};
				
				Upload.upload(options).progress(function (evt) {
					progress.value = parseInt(100.0 * evt.loaded / evt.total);
				}).success(function (response, status, headers, config) {
					if (!response.result) {
						overlayLoading.hide();
						$scope.displayAlert('danger', response.errors.details[0].message);
					}
					else {
						counter++;
						if (counter === certificatesNames.length) {
							return uCb();
						} else {
							uploadFiles(certificatesNames, counter, uCb);
						}
					}
				}).error(function (data, status, header, config) {
					overlayLoading.hide();
					$scope.displayAlert('danger', translation.errorOccurredWhileUploadingFile[LANG] + " " + options.params.filename);
				});
			}
		}
		
		function createNginxRecipe(cb) {
			let recipe = buildRecipe();
			getSendDataFromServer($scope, ngDataApi, {
				method: "post",
				routeName: '/dashboard/catalog/recipes/add',
				data: {
					catalog: {
						description: "Nginx Recipe for " + $scope.wizard.gi.code.toUpperCase() + " Environment",
						name: $scope.wizard.gi.code.toLowerCase() + "_nginx",
						recipe: recipe,
						type: "server",
						subtype: "nginx"
					}
				}
			}, function (error, response) {
				if (error) {
					overlayLoading.hide();
					$scope.displayAlert('danger', error.message);
				}
				else {
					return cb(response.data);
				}
			});
			
			function buildRecipe(){
				let recipe = {
					"deployOptions": {
						"image": {
							"prefix": $scope.wizard.nginx.imagePrefix || "soajs",
							"name": $scope.wizard.nginx.imageName || "nginx",
							"tag": $scope.wizard.nginx.imageTag || "latest",
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
								"published": $scope.wizard.nginx.http,
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
				
				if($scope.wizard.nginx.imageName){
					recipe.deployOptions.image.override = true;
				}
				
				if($scope.wizard.deploy.selectedDriver === 'docker'){
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
				else if($scope.wizard.deploy.selectedDriver === 'kubernetes'){
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
				
				if ($scope.wizard.nginx.ssl) {
					if($scope.wizard.deploy.selectedDriver === 'docker') {
						recipe.deployOptions.ports.push({
							"name": "https",
							"target": 443,
							"isPublished": true,
							"published": $scope.wizard.nginx.https,
							"preserveClientIP": true
						});
					}
					else if($scope.wizard.deploy.selectedDriver === 'kubernetes'){
						recipe.deployOptions.ports.push({
							"name": "https",
							"target": 443,
							"isPublished": true,
							"published": $scope.wizard.nginx.https,
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
					
					if ($scope.wizard.nginx.certs && Object.keys($scope.wizard.nginx.certsGit).length > 0) {
						recipe.buildOptions.env["SOAJS_NX_CUSTOM_SSL"] = {
							"type": "static",
							"value": 'true'
						};
						
						recipe.buildOptions.env["SOAJS_CONFIG_REPO_BRANCH"] = {
							"type": "static",
							"value": $scope.wizard.nginx.certsGit.branch
						};
						recipe.buildOptions.env["SOAJS_CONFIG_REPO_OWNER"] = {
							"type": "static",
							"value": $scope.wizard.nginx.certsGit.owner
						};
						recipe.buildOptions.env["SOAJS_CONFIG_REPO_NAME"] = {
							"type": "static",
							"value": $scope.wizard.nginx.certsGit.repo
						};
						recipe.buildOptions.env["SOAJS_CONFIG_REPO_TOKEN"] = {
							"type": "static",
							"value": $scope.wizard.nginx.certsGit.token
						};
						recipe.buildOptions.env["SOAJS_CONFIG_REPO_PROVIDER"] = {
							"type": "static",
							"value": $scope.wizard.nginx.certsGit.provider
						};
						recipe.buildOptions.env["SOAJS_CONFIG_REPO_DOMAIN"] = {
							"type": "static",
							"value": $scope.wizard.nginx.certsGit.domain
						};
					}
					
					if ($scope.wizard.nginx.customUi) {
						recipe.buildOptions.env["SOAJS_GIT_BRANCH"] = {
							"type": "static",
							"value": $scope.wizard.nginx.customUi.branch
						};
						recipe.buildOptions.env["SOAJS_GIT_OWNER"] = {
							"type": "static",
							"value": $scope.wizard.nginx.customUi.owner
						};
						recipe.buildOptions.env["SOAJS_GIT_REPO"] = {
							"type": "static",
							"value": $scope.wizard.nginx.customUi.repo
						};
						recipe.buildOptions.env["SOAJS_GIT_TOKEN"] = {
							"type": "static",
							"value": $scope.wizard.nginx.customUi.token
						};
						recipe.buildOptions.env["SOAJS_GIT_PROVIDER"] = {
							"type": "static",
							"value": $scope.wizard.nginx.customUi.source
						};
						recipe.buildOptions.env["SOAJS_GIT_DOMAIN"] = {
							"type": "static",
							"value": $scope.wizard.nginx.customUi.provider
						};
						recipe.buildOptions.env["SOAJS_GIT_PATH"] = {
							"type": "static",
							"value": $scope.wizard.nginx.customUi.path || "/"
						};
					}
				}
				
				return recipe;
			}
		}
		
		function deployNginx(catalogId, cb) {
			
			let data = {
				"deployConfig": {
					"replication": {
						"mode": $scope.wizard.nginx.mode
					},
					"memoryLimit": $scope.wizard.nginx.memory * 1048576
				},
				"custom": {
					type: 'nginx',
					name: 'nginx'
				},
				"recipe": catalogId,
				"env": $scope.wizard.gi.code.toUpperCase()
			};
			
			//if custom image info
			if ($scope.wizard.nginx.imageName) {
				data.custom.image = {
					name: $scope.wizard.nginx.imageName,
					prefix: $scope.wizard.nginx.imagePrefix,
					tag: $scope.wizard.nginx.imageTag
				}
			}
			
			//if user input env variables
			if ($scope.wizard.nginx.custom) {
				data.custom.env = {};
				for (let env in $scope.wizard.nginx.custom) {
					data.custom.env[env] = $scope.wizard.nginx.custom[env].value;
				}
			}
			
			getSendDataFromServer($scope, ngDataApi, {
				method: 'post',
				routeName: '/dashboard/cloud/services/soajs/deploy',
				data: data
			}, function (error) {
				if (error) {
					overlayLoading.hide();
					$scope.displayAlert('danger', error.message);
				}
				else {
					return cb();
				}
			});
		}
		
		function deployController(cb) {
			let data = {
				"deployConfig": {
					"replication": {
						"mode": $scope.wizard.controller.mode
					},
					"memoryLimit": $scope.wizard.controller.memory * 1048576
				},
				"gitSource": {
					"owner": "soajs",
					"repo": "soajs.controller",
					"branch": $scope.wizard.controller.branch
				},
				"custom": {
					"name": "controller",
					"type": "service"
				},
				"recipe": $scope.wizard.controller.catalog,
				"env": $scope.wizard.gi.code.toUpperCase()
			};
			
			//get the commit
			if ($scope.wizard.controller.commit) {
				data.gitSource.commit = $scope.wizard.controller.commit;
			}
			
			//check the replicas
			if (['replicated', 'deployment'].indexOf($scope.wizard.controller.mode) !== -1) {
				data.deployConfig.replication.replicas = $scope.wizard.controller.number;
			}
			
			//if custom image info
			if ($scope.wizard.controller.imageName) {
				data.custom.image = {
					name: $scope.wizard.controller.imageName,
					prefix: $scope.wizard.controller.imagePrefix,
					tag: $scope.wizard.controller.imageTag
				}
			}
			
			//if user input env variables
			if ($scope.wizard.controller.custom) {
				data.custom.env = {};
				for (let env in $scope.wizard.controller.custom) {
					data.custom.env[env] = $scope.wizard.controller.custom[env].value;
				}
			}
			
			//register Controller in CD as deployed
			getSendDataFromServer($scope, ngDataApi, {
				"method": "post",
				"routeName": "/dashboard/cd",
				"data": {
					config: {
						serviceName: "controller",
						env: $scope.wizard.gi.code.toUpperCase(),
						default: {
							deploy: true,
							options: data
						}
					}
				}
			}, function (error) {
				if (error) {
					overlayLoading.hide();
					$scope.displayAlert('danger', error.message);
				} else {
					
					//deploy Controller
					getSendDataFromServer($scope, ngDataApi, {
						"method": "post",
						"routeName": "/dashboard/cloud/services/soajs/deploy",
						"data": data
					}, function (error) {
						if (error) {
							overlayLoading.hide();
							$scope.displayAlert('danger', error.message);
						} else {
							$timeout(function () {
								return cb();
							}, 2000);
						}
					});
				}
			});
		}
		
	};
	
	function getCatalogRecipes(cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list'
		}, function (error, recipes) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				return cb(recipes);
			}
		});
	}
	
	function getControllerBranches(cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/gitAccounts/getBranches',
			params: {
				name: 'controller',
				type: 'service'
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				return cb(response);
			}
		});
	}
	
	function injectCatalogInputs(recipes, controllerBranches) {
		let entries = $scope.tempFormEntries;
		let chosenRecipe = $scope.form.formData.catalog;
		
		//append the custom catalog inputs
		recipes.forEach(function (oneRecipe) {
			if (oneRecipe._id === chosenRecipe) {
				
				delete entries.branches;
				if (oneRecipe.recipe.deployOptions.specifyGitConfiguration) {
					entries.branches = controllerBranches.branches;
				}
				
				delete entries.imagePrefix;
				delete entries.imageName;
				delete entries.imageTag;
				if (oneRecipe.recipe.deployOptions.image.override) {
					//append images
					if (!$scope.form.formData.imagePrefix) {
						$scope.form.formData.imagePrefix = oneRecipe.recipe.deployOptions.image.prefix;
					}
					entries.imagePrefix = {
						required: true
					};
					if (!$scope.form.formData.imageName) {
						$scope.form.formData.imageName = oneRecipe.recipe.deployOptions.image.name;
					}
					entries.imageName = {
						required: true
					};
					if (!$scope.form.formData.imageTag) {
						$scope.form.formData.imageTag = oneRecipe.recipe.deployOptions.image.tag;
					}
					entries.imageTag = {
						required: false
					};
				}
				
				delete entries.custom;
				//append inputs whose type is userInput
				for (var envVariable in oneRecipe.recipe.buildOptions.env) {
					if (oneRecipe.recipe.buildOptions.env[envVariable].type === 'userInput') {
						
						//push a new input for this variable
						var newInput = {
							'name': envVariable,
							'label': oneRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
							'type': 'text',
							'value': oneRecipe.recipe.buildOptions.env[envVariable].default || '',
							'fieldMsg': oneRecipe.recipe.buildOptions.env[envVariable].fieldMsg
						};
						
						if (!oneRecipe.recipe.buildOptions.env[envVariable].default || oneRecipe.recipe.buildOptions.env[envVariable].default === '') {
							newInput.required = true;
						}
						
						if (!$scope.form.formData.custom) {
							$scope.form.formData.custom = {};
						}
						
						if (!$scope.form.formData.custom[envVariable]) {
							$scope.form.formData.custom[envVariable] = newInput;
						}
						
						if (!entries.custom) {
							entries.custom = {};
						}
						
						entries.custom[envVariable] = {
							required: true
						};
					}
				}
			}
		});
	}
	
	if ($scope.access.addEnvironment) {
		$scope.Step1();
	}
	
	injectFiles.injectCss('modules/dashboard/environments/environments.css');
}]);