"use strict";
var dynamicResourceServices = soajsApp.components;
dynamicResourceServices.service('dynamicResourceSrv', ['$timeout', '$compile', 'resourceDeploy', 'resourceConfiguration', function ($timeout, $compile, resourceDeploy, resourceConfiguration) {
	
	function go(currentScope, context, buildDynamicForm, defaultWizardSecretValues) {
		
		let isKubernetes = (currentScope.wizard.deployment.selectedDriver === 'kubernetes');
		
		function buildMyForms(counter, cb) {
			let key = entriesNames[counter];
			let resource = resourceEntries[key];
			let record = angular.copy(resource);
			currentScope.dynamictemplatestep = `Resource ${key}`;
			
			record.name = key;
			let settings = {"type": record.type, category: record.category};
			resource.scope = currentScope.$new(true); //true means detached from main currentScope
			resource.scope.environmentWizard = true;
			resource.scope.context = {};
			resource.scope.context.envCode = currentScope.envCode;
			resource.scope.mainData = {};
			resource.scope.mainData.recipes = [];
			resource.scope.restrictions = currentScope.restrictions;
			
			if (currentScope.wizard.onboardNames) {
				resource.scope.onboardNames = currentScope.wizard.onboardNames;
			}
			
			if (currentScope.wizard.vms || currentScope.wizard.vmOnBoard) {
				if (!resource.scope.mainData.deploymentData) {
					resource.scope.mainData.deploymentData = {}
				}
			}
			
			if (currentScope.wizard.vms && Array.isArray(currentScope.wizard.vms) && currentScope.wizard.vms.length > 0) {
				resource.scope.wizardVMs = currentScope.wizard.vms;
			}
			
			if (currentScope.vms && currentScope.vms.vmLayers) {
				resource.scope.mainData.deploymentData.vmLayers = currentScope.vms.vmLayers;
			}
			
			for (let type in currentScope.recipes) {
				currentScope.recipes[type].forEach((oneRecipe) => {
					if (oneRecipe.type === record.type && oneRecipe.subtype === record.category) {
						resource.scope.mainData.recipes.push(oneRecipe);
					}
				});
			}
			
			//if default values
			if (currentScope.wizard.template.content.deployments.resources[key].deploy) {
				
				//get the infra
				//currentScope.mainData.deploymentData.infraProviders
				if (!resource.scope.mainData.deploymentData) {
					resource.scope.mainData.deploymentData = {}
				}
				resource.scope.mainData.deploymentData.infraProviders = currentScope.infraProviders;
				
				//get the recipes
				resource.scope.mainData.recipes = [];
				for (let type in currentScope.recipes) {
					if (type === record.type) {
						currentScope.recipes[type].forEach((oneRecipe) => {
							if (oneRecipe.subtype === record.category) {
								resource.scope.mainData.recipes.push(oneRecipe);
							}
						});
					}
				}
				
				record.canBeDeployed = true;
				resource.scope.context.envType = 'container';
				resource.scope.context.envPlatform = currentScope.wizard.deployment.selectedDriver;
				if (!currentScope.wizard.deployment.selectedDriver) {
					resource.scope.context.envType = 'manual';
				}
				
				resource.scope.access = {deploy: true};
				resource.scope.noCDoverride = true;
				
				let deployFromTemplate = currentScope.wizard.template.content.deployments.resources[key].deploy;
				if (deployFromTemplate.recipes) {
					if (deployFromTemplate.recipes.available && Array.isArray(deployFromTemplate.recipes.available) && deployFromTemplate.recipes.available.length > 0) {
						resource.scope.mainData.recipes = [];
						let available = deployFromTemplate.recipes.available;
						for (let type in currentScope.recipes) {
							currentScope.recipes[type].forEach((oneRecipe) => {
								if (available.length > 0 && available.indexOf(oneRecipe.name) !== -1) {
									resource.scope.mainData.recipes.push(oneRecipe);
								}
							});
						}
					}
					
					if (deployFromTemplate.recipes.default) {
						let defaultFromTemplate = deployFromTemplate.recipes.default;
						if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
							for (let type in currentScope.recipes) {
								currentScope.recipes[type].forEach((oneRecipe) => {
									if (defaultFromTemplate === oneRecipe.name) {
										if (!record.deployOptions) {
											record.deployOptions = {};
										}
										record.deployOptions.recipe = oneRecipe._id;
									}
								});
							}
						}
					}
					
				}
				
				if (!record.deployOptions) {
					record.deployOptions = {};
				}
				
				if (!record.deployOptions.custom) {
					record.deployOptions.custom = {};
				}
				
				record.deployOptions.custom.name = key;
				
				if (!record.deployOptions.deployConfig) {
					record.deployOptions.deployConfig = {};
				}
				
				if (!record.deployOptions.deployConfig.replication) {
					record.deployOptions.deployConfig.replication = {};
				}
				
				if (Object.hasOwnProperty.call(deployFromTemplate, 'memoryLimit')) {
					record.deployOptions.deployConfig.memoryLimit = deployFromTemplate.memoryLimit;
				}
				
				if (deployFromTemplate.mode) {
					let mode = deployFromTemplate.mode;
					if (isKubernetes) {
						if (mode === 'global') {
							mode = 'daemonset';
						}
						if (mode === 'replicated') {
							mode = 'deployment';
						}
					}
					record.deployOptions.deployConfig.replication.mode = mode;
				}
				
				if (deployFromTemplate.replicas) {
					record.deployOptions.deployConfig.replication.replicas = deployFromTemplate.replicas;
				}
				
				if (deployFromTemplate.custom && deployFromTemplate.custom.sourceCode && Object.keys(deployFromTemplate.custom.sourceCode).length > 0) {
					record.deployOptions.sourceCode = {};
					if (deployFromTemplate.custom.sourceCode.custom) {
						record.deployOptions.sourceCode.custom = deployFromTemplate.custom.sourceCode.custom;
					}
					
					if (deployFromTemplate.custom.sourceCode.config) {
						record.deployOptions.sourceCode.configuration = deployFromTemplate.custom.sourceCode.config;
					}
					
					if (deployFromTemplate.custom.sourceCode.configuration) {
						record.deployOptions.sourceCode.configuration = deployFromTemplate.custom.sourceCode.configuration;
					}
				}
				
				if (record.config && record.config.servers) {
					record.config.servers.forEach((oneServer) => {
						oneServer.port = oneServer.port.toString();
					});
				}
				currentScope.dynamictemplatestep = "Deploy " + currentScope.dynamictemplatestep;
			}
			else {
				currentScope.dynamictemplatestep = "Connect to " + currentScope.dynamictemplatestep;
			}
			
			if (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
				// TODO: check
				if (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter]) {
					
					record = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter];
					record.label = resource.label;
					if (record.config && record.config.servers) {
						record.config.servers.forEach((oneServer) => {
							oneServer.port = oneServer.port.toString();
						});
					}
				}
			}
			
			if (isKubernetes) {
				resource.scope.enableAutoScale = (Object.hasOwnProperty.call(record, 'enableAutoScale')) ? record.enableAutoScale : true;
				//check if previous
				if (currentScope.wizard.deployment.previousEnvironment) {
					currentScope.availableEnvironments.forEach((onePreviousEnv) => {
						if (onePreviousEnv.code === currentScope.wizard.deployment.previousEnvironment) {
							resource.scope.kubeNamespace = onePreviousEnv.deployer.container.kubernetes.remote.namespace.default;
						}
					});
				}
				//check current provider
				else {
					if (currentScope.wizard.selectedInfraProvider.api.namespace) {
						resource.scope.kubeNamespace = currentScope.wizard.selectedInfraProvider.api.namespace.default;
					}
					else {
						resource.scope.kubeNamespace = 'soajs';
					}
				}
			}
			
			resource.scope.kubeEnv = 'invalid';
			if (currentScope.wizard.deployment.previousEnvironment) {
				resource.scope.kubeEnv = currentScope.wizard.deployment.previousEnvironment;
			}
			
			if (defaultWizardSecretValues && defaultWizardSecretValues.length > 0) {
				resource.scope.defaultWizardSecretValues = angular.copy(defaultWizardSecretValues);
				resource.scope.defaultWizardSecretValues.forEach((oneTemplateSecret) => {
					oneTemplateSecret.uid = "from-template-" + oneTemplateSecret.name.toLowerCase();
				});
			}
			
			let alreadyFilledFormData = record;
			
			resourceDeploy.buildDeployForm(resource.scope, resource.scope, null, angular.copy(record), 'add', settings, () => {
				if (currentScope.wizard.template.content.deployments.resources[key].deploy) {
					resource.scope.hideDeployButton = true;
					if (isKubernetes) {
						let remote = true;
						let deployment;
						//check if previous
						if (currentScope.wizard.deployment.previousEnvironment) {
							currentScope.availableEnvironments.forEach((onePreviousEnv) => {
								if (onePreviousEnv.code === currentScope.wizard.deployment.previousEnvironment) {
									deployment = {
										nodes: onePreviousEnv.deployer.container.kubernetes.remote.nodes,
										NS: onePreviousEnv.deployer.container.kubernetes.remote.namespace.default,
										perService: onePreviousEnv.deployer.container.kubernetes.remote.namespace.perService,
										token: onePreviousEnv.deployer.container.kubernetes.remote.auth.token
									};
								}
							});
						}
						//check current provider
						else {
							if (currentScope.wizard.selectedInfraProvider.api.namespace) {
								deployment = {
									nodes: currentScope.wizard.selectedInfraProvider.api.ipaddress,
									NS: currentScope.wizard.selectedInfraProvider.api.namespace,
									perService: currentScope.wizard.selectedInfraProvider.api.perService,
									token: currentScope.wizard.selectedInfraProvider.api.token
								};
							}
							else {
								deployment = {
									nodes: "",
									NS: "soajs",
									perService: false,
									token: ""
								};
							}
						}
						
						let driverConfiguration = {
							"nodes": deployment.nodes,
							"namespace": {
								"default": deployment.NS,
								"perService": deployment.perService
							},
							"auth": {
								"token": deployment.token
							}
						};
						let envDeployer = {
							"type": "container",
							"kubernetes": {}
						};
						if (remote) {
							envDeployer.selected = "container.kubernetes.remote";
							envDeployer.kubernetes.remote = driverConfiguration;
						}
						else {
							envDeployer.selected = "container.kubernetes.local";
							envDeployer.kubernetes.local = driverConfiguration;
						}
						resource.scope.context.envDeployer = envDeployer;
					}
				}
				let entries = [];
				buildDynamicForm(resource.scope, entries, () => {
					let element = angular.element(document.getElementById("resource_" + key));
					element.append("<form name=\"addEditResource\" id=\"addEditResource\"><div ng-include=\"'modules/dashboard/resources/directives/resource.tmpl'\"></div></form>");
					$compile(element.contents())(resource.scope);
					
					resource.scope.$watch("addEditResource.$invalid", function ($invalid) {
						resource.formIsInvalid = $invalid;
					});
					
					resource.scope.$watch('catalogConflictingPorts', (value) => {
						currentScope.loadingDynamicSection = value && value !== '';
					});
					
					if (currentScope.wizard.template.content.deployments.resources[key].deploy) {
						$timeout(() => {
							if (alreadyFilledFormData && alreadyFilledFormData.deployOptions && alreadyFilledFormData.deployOptions.deployConfig && alreadyFilledFormData.deployOptions.deployConfig.type) {
								resource.scope.formData = angular.copy(alreadyFilledFormData);
								
								if (resource.scope.formData.deployOptions) {
									resource.deployOptions = resource.scope.formData.deployOptions;
								}
								
								//if wizard, and template container only, do not show the platform picker !
								if (currentScope.cloud.selectedProvider.technologies.includes('vm') && (currentScope.cloud.selectedProvider.technologies.includes('docker')|| currentScope.cloud.selectedProvider.technologies.includes('kubernetes'))) {
									resource.scope.displayPlatformPicker = true;
								}
								else{
									resource.scope.displayPlatformPicker = false;
								}
								
								if (resource.deployOptions && resource.deployOptions.deployConfig && resource.deployOptions.deployConfig.type && resource.deployOptions.deployConfig.type === 'vm') {
									resource.scope.updateDeploymentName(record.name, true);
								}
								else {
									if (resource.scope.displayPlatformPicker) {
										resource.scope.updateDeploymentName(record.name, true);
									}
									resource.scope.updateCustomRepoName();
								}
							}
							
							counter++;
							if (counter < entriesNames.length) {
								buildMyForms(counter, cb);
							}
							else {
								return cb();
							}
						}, 1100);
					}
					//external resource
					else {
						resource.scope.formData = angular.copy(alreadyFilledFormData);
						
						if (resource.scope.formData.deployOptions) {
							resource.deployOptions = resource.scope.formData.deployOptions;
						}
						
						counter++;
						if (counter < entriesNames.length) {
							buildMyForms(counter, cb);
						}
						else {
							return cb();
						}
					}
				});
			});
		}
		
		currentScope.saveData = function () {
			
			if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
				currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
			}
			else {
				currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
			}
			
			let entriesCount = 0;
			for (let key in resourceEntries) {
				let resource = resourceEntries[key];
				resourceConfiguration.mapConfigurationFormDataToConfig(resource.scope);
				
				let validDeploy = resourceDeploy.updateFormDataBeforeSave(resource.scope, resource.scope.formData.deployOptions);
				if (!validDeploy) {
					return;
				}
				
				if (typeof(resource.formIsInvalid) === 'boolean' && !resource.formIsInvalid) {
					//map the values back to custom registry
					let imfv = angular.copy(resource.scope.formData);
					imfv.name = key; //force the name back as it was
					imfv.enableAutoScale = resource.scope.options.enableAutoScale;
					if (imfv.deployOptions && imfv.deployOptions.deployConfig) {
						imfv.deploy = {
							"options": {
								"deployConfig": {
									"replication": {
										"mode": imfv.deployOptions.deployConfig.replication ? imfv.deployOptions.deployConfig.replication.mode : ""
									},
									"memoryLimit": imfv.deployOptions.deployConfig.memoryLimit * 1048576
								},
								"custom": imfv.deployOptions.custom,
								"recipe": imfv.deployOptions.recipe,
								"env": resource.scope.envCode
							},
							"deploy": true,
							"type": "custom"
						};
						
						if (imfv.deployOptions.sourceCode) {
							imfv.deploy.options.custom.sourceCode = imfv.deployOptions.sourceCode;
						}
						
						if (imfv.deployOptions.deployConfig.replication && imfv.deployOptions.deployConfig.replication.replicas) {
							imfv.deploy.options.deployConfig.replication.replicas = imfv.deployOptions.deployConfig.replication.replicas;
						}
						
						imfv.deploy.options.custom.name = key;
						imfv.deployOptions.name = key;
						imfv.deployOptions.custom.type = 'resource';
						
						//clean up any attached ui
						if ((imfv.deploy.options.custom.sourceCode && imfv.deploy.options.custom.sourceCode.custom && imfv.deploy.options.custom.sourceCode.custom.repo) || (imfv.deploy.options.custom.sourceCode && imfv.deploy.options.custom.sourceCode.configuration && imfv.deploy.options.custom.sourceCode.configuration.repo)) {
							imfv.deploy.options.custom.sourceCode = resource.scope.reformatSourceCodeForCicd(imfv.deploy.options.custom.sourceCode);
						}
					}
					else {
						delete imfv.deployOptions;
					}
					
					resource = imfv;
					if (resource.deployOptions && resource.deployOptions.deployConfig
						&& resource.deployOptions.deployConfig.vmConfiguration
						&& resource.deployOptions.deployConfig.vmConfiguration.vmLayer) {
						resource.deployOptions.vms = [];
						let vmLayer = resource.deployOptions.deployConfig.vmConfiguration.vmLayer;
						
						if (vmLayer && currentScope.vms.vmLayers[vmLayer]) {
							resource.deployOptions.deployConfig.infra = currentScope.vms.vmLayers[vmLayer].infraProvider._id;
							if (currentScope.vms.vmLayers[vmLayer].list && currentScope.vms.vmLayers[vmLayer].list.length > 0) {
								currentScope.vms.vmLayers[vmLayer].list.forEach(function (oneVM) {
									resource.deployOptions.vms.push(oneVM.id);
									if (!resource.deployOptions.deployConfig.vmConfiguration.group) {
										resource.deployOptions.deployConfig.vmConfiguration.group = oneVM.labels['soajs.service.vm.group'];
									}
									if (!resource.deployOptions.deployConfig.region) {
										resource.deployOptions.deployConfig.region = oneVM.labels['soajs.service.vm.location'];
									}
								});
							}
							else {
								if (!resource.deployOptions.deployConfig.vmConfiguration.group) {
									resource.deployOptions.deployConfig.vmConfiguration.group = currentScope.wizard.deployment.selectedInfraProvider.extras.group;
								}
								if (!resource.deployOptions.deployConfig.region) {
									resource.deployOptions.deployConfig.region = currentScope.wizard.deployment.selectedInfraProvider.region;
								}
							}
						}
					}
					delete resource.scope;
					delete resource.formIsInvalid;
					currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(resource);
					entriesCount++;
					if (entriesCount === Object.keys(resourceEntries).length) {
						//trigger next here
						currentScope.next();
					}
				}
			}
		};
		
		currentScope.dynamicStep = context;
		let resourceEntries = angular.copy(context.inputs);
		let entriesNames = Object.keys(resourceEntries);
		
		overlayLoading.show();
		currentScope.loadingDynamicSection = true;
		buildMyForms(0, () => {
			currentScope.loadingDynamicSection = false;
			overlayLoading.hide();
		});
	}
	
	return {
		'go': go
	}
}]);