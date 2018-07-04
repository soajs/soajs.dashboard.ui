"use strict";
var dynamicServices = soajsApp.components;
dynamicServices.service('dynamicSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$compile', 'customRegistrySrv', 'resourceDeploy', 'resourceConfiguration', 'secretsService', 'deployRepos', 'deployServiceDep', function (ngDataApi, $timeout, $modal, $localStorage, $window, $compile, customRegistrySrv, resourceDeploy, resourceConfiguration, secretsService, deployRepos, deployServiceDep) {
	let defaultWizardSecretValues = [];

	let predefinedSchemaSteps = {
		custom_registry: {
			deploy: function (currentScope, context) {
				currentScope.dynamictemplatestep = "Custom Registries";
				function buildMyForms(counter, cb) {

					let ci = entriesNames[counter];
					let customRegistry = ciEntries[ci];

					let record = angular.copy(customRegistry);
					if(currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
						record = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter];
					}

					customRegistry.scope = currentScope.$new(true); //true means detached from main currentScope
					customRegistrySrv.internalCustomRegistryFormManagement(customRegistry.scope, currentScope.envCode, null, record, 'add');
					let entries = [
						{
							"directive": "modules/dashboard/environments/directives/customRegistry.tmpl"
						}
					];
					buildDynamicForm(customRegistry.scope, entries, () => {
						let element = angular.element(document.getElementById("ci_" + ci));
						element.html("<ngform></ngform>");
						$compile(element.contents())(customRegistry.scope);

						counter++;
						if (counter < entriesNames.length) {
							buildMyForms(counter, cb);
						}
						else {
							return cb();
						}
					});
				}

				//create a copy just in case
				let ciEntries = angular.copy(context.inputs);
				currentScope.dynamicStep = context;

				currentScope.saveData = function () {
					if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
					}
					else {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
					}

					let entriesCount = 0;
					for (let ci in ciEntries) {
						let customRegistry = ciEntries[ci];
						customRegistry.scope.save();

						if(customRegistry.scope.$valid){
							//map the values back to custom registry
							let imfv = angular.copy(customRegistry.scope.formData);
							imfv.name = ci; //force the name back as it was
							if (!imfv.textMode) {
								try {
									imfv.value = JSON.parse(imfv.value);
								}
								catch (e) {
									$window.alert("The content of the custom registry provided is invalid!");
									return false;
								}
							}
							customRegistry = imfv;
							delete customRegistry.scope;
							currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(customRegistry);
							entriesCount++;

							//trigger next here
							if(entriesCount === Object.keys(ciEntries).length){
								currentScope.next();
							}
						}
					}
				};

				overlayLoading.show();
				let entriesNames = Object.keys(ciEntries);
				currentScope.loadingDynamicSection = true;
				buildMyForms(0, () => {
					currentScope.loadingDynamicSection = false;
					overlayLoading.hide();
				});
			}
		},
		secrets: {
			deploy: function (currentScope, context, fCb) {
				currentScope.dynamictemplatestep = "Container Secrets";
				function buildMyForms(counter, cb) {
					let secretKey = entriesNames[counter];
					let oneSecret = secretEntries[secretKey];

					currentScope.namespaceConfig = namespaceConfig;

					let extraInputs = [];
					if(namespaces && namespaces.length > 0){
						extraInputs = [
							{
								"type": "select",
								"label": "Select Namespace",
								"name": "namespace",
								"value": namespaces,
								"onAction": function(id, value, form){
									currentScope.namespaceConfig.namespace = value;
								}
							}
						];
					}

					let record = {
						secretName: oneSecret.name,
						secretData: oneSecret.data
					};
					if(currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
						record = {
							secretName: currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].name,
							textMode: (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].datatype === 'text'),
						};

						if(currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].datatype === 'file'){
							record['secretFile']= currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].data;
						}
						else{
							record['secretData']= currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].data;
							if(!record.textMode){
								record['secretData'] = JSON.parse(record['secretData']);
							}
						}

						if(currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].namespace){
							record.namespace = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].namespace;
						}

						if(!record.namespace && oneSecret.namespace){
							record.namespace = oneSecret.namespace;
						}
					}

					oneSecret.scope = currentScope.$new(true); //true means detached from main currentScope
					oneSecret.scope.selectedEnvironment = {code: currentScope.envCode};
					currentScope.selectedEnvironment = {code: currentScope.envCode};

					secretsService.addSecret(oneSecret.scope, null, currentScope, [], extraInputs, record, () => {
						let element = angular.element(document.getElementById("secret_" + secretKey));
						element.html("<ngform></ngform>");
						$compile(element.contents())(oneSecret.scope);

						counter++;
						if (counter < entriesNames.length) {
							buildMyForms(counter, cb);
						}
						else {
							return cb();
						}
					});
				}

				function listNamespaces (kubernetes, cb) {
					if (!kubernetes) {
						//in case of swarm deployment, set namespace value to All Namespaces and set filter value to null in order to always display all fields
						namespaces = [];
						namespaceConfig.namespace = namespaceConfig.defaultValue.id;
						return cb();
					}

					//find if there is an environment that uses kubernetes
					//if found, then make the api call else use the default namespace
					let kubeEnv;
					if(currentScope.wizard.deployment.previousEnvironment){
						kubeEnv = currentScope.wizard.deployment.previousEnvironment;
					}

					if(!kubeEnv){
						namespaces = [];
						namespaceConfig.namespace = namespaceConfig.defaultValue.id;

						if(currentScope.wizard.deployment.selectedDriver === 'kubernetes'){
							//check if previous
							if(currentScope.wizard.deployment.previousEnvironment){
								currentScope.availableEnvironments.forEach((onePreviousEnv) =>{
									if(onePreviousEnv.code === currentScope.wizard.deployment.previousEnvironment){
										namespaces = [ {"v": onePreviousEnv.deployer.container.kubernetes.remote.namespace.default, "l": onePreviousEnv.deployer.container.kubernetes.remote.namespace.default}];
									}
								});
							}
							//check current provider
							else{
								if(currentScope.wizard.selectedInfraProvider.api.namespace){
									namespaces = [ {"v": currentScope.wizard.selectedInfraProvider.api.namespace.default, "l": currentScope.wizard.selectedInfraProvider.api.namespace.default}];
								}
								else {
									namespaces = [ {"v": 'soajs', "l": 'soajs'}];
								}
							}
						}

						return cb();
					}

					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/cloud/namespaces/list',
						params: {
							env: kubeEnv.toUpperCase()
						}
					}, function (error, response) {
						if (error) {
							overlayLoading.hide();
							currentScope.displayAlert('danger', error.message);
						}
						else {
							namespaces = [ {"v": "", "l": namespaceConfig.defaultValue.name}];
							response.forEach((oneNS) => {
								namespaces.push({"v": oneNS.name, "l": oneNS.name});
							});
							namespaceConfig.namespace = namespaceConfig.defaultValue.id; //setting current selected to 'All Namespaces'
							return cb();
						}
					});
				}

				let namespaces = [];
				let namespaceConfig = {
					defaultValue: {
						id: undefined, //setting id to undefined in order to force angular to display all fields, => All Namespaces
						name: '--- All Namespaces ---'
					}
				};

				//create a copy just in case
				let secretEntries = angular.copy(context.inputs);
				currentScope.dynamicStep = context;

				currentScope.saveData = function () {
					if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
					}
					else {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
					}

					defaultWizardSecretValues = [];
					let entriesCount = 0;
					for (let secretName in secretEntries) {
						let oneSecret = secretEntries[secretName];
						oneSecret.scope.form.do({
							'type': 'submit',
							'action': (formData) => {
								oneSecret.scope.save(formData, (imfv) => {
									if(oneSecret.scope.$valid){
										imfv.name = secretName; //force the name back as it was
										oneSecret = imfv;

										if (typeof oneSecret.data === "object") {
											oneSecret.data = JSON.stringify(oneSecret.data);
										}

										delete oneSecret.scope;
										currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(oneSecret);
										defaultWizardSecretValues.push(oneSecret);
										entriesCount++;
										if(entriesCount === Object.keys(secretEntries).length){
											//trigger next here
											currentScope.next();
										}
									}
								});
							}
						});
					}
				};

				overlayLoading.show();
				currentScope.loadingDynamicSection = true;
				let entriesNames = Object.keys(secretEntries);
				listNamespaces ((currentScope.wizard.deployment.selectedDriver === 'kubernetes'), () => {
					buildMyForms(0, () => {
						currentScope.loadingDynamicSection = false;
						overlayLoading.hide();
					});
				});
			}
		},
		repo: {
			deploy: function (currentScope, context, fCb) {
				function buildMyForms(counter, cb) {
					let repoName = entriesNames[counter];
					let oneRepo = repoEntries[repoName];

					oneRepo.type = templateDefaults.type; //enforce
					oneRepo.category = templateDefaults.category; //enforce

					currentScope.dynamictemplatestep = `Deploy Source Code From Repository`;

					let service = {};
					let record = {};
					let version = {};
					let gitAccount = {};
					let daemonGrpConf = (oneRepo.type === 'daemon' && oneRepo.group) ? oneRepo.group : "";
					let isKubernetes = (currentScope.wizard.deployment.selectedDriver === 'kubernetes');

					oneRepo.name = repoName;
					oneRepo.scope = currentScope.$new(true); //true means detached from main currentScope
					oneRepo.scope.oneEnv = currentScope.envCode;

					if(oneRepo.name === 'controller'){
						version = 'Default';
					}
					else{
						//todo: try a daemon to finalize this part before confirming it works in full
						currentScope.services.forEach((oneService) => {
							if (oneService.name === oneRepo.name && oneService.name !== 'controller') {
								let tempV = 0;
								for(let v in oneService.versions){
									if (parseInt(v) > tempV) {
										version = v;
										tempV = parseInt(v);
									}
								}
							}
						})
					}

					oneRepo.scope.cdData = {};
					oneRepo.scope.cdData[oneRepo.scope.oneEnv.toUpperCase()] = {};

					oneRepo.scope.noCDoverride = true;

					oneRepo.scope.cdConfiguration = {};
					oneRepo.scope.cdConfiguration[oneRepo.name] = {};
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv] = {};

					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj = { ha: {} };
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version] = {};

					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData = {};
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions = {};
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version] = { deploy: true };
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options = {};

					oneRepo.scope.myRecipes = [];
					for(let type in currentScope.recipes){
						currentScope.recipes[type].forEach((oneRecipe) =>{

							if(oneRecipe.type === oneRepo.type && oneRecipe.subtype === oneRepo.category){
								oneRepo.scope.myRecipes.push(oneRecipe);
							}
						});
					}

					//if default values
					if(currentScope.wizard.template.content.deployments.repo[repoName].deploy){
						let deployFromTemplate = currentScope.wizard.template.content.deployments.repo[repoName].deploy;

						if(deployFromTemplate.recipes){
							if(deployFromTemplate.recipes.available && Array.isArray(deployFromTemplate.recipes.available) && deployFromTemplate.recipes.available.length > 0){
								oneRepo.scope.myRecipes = [];
								let available = deployFromTemplate.recipes.available;
								for(let type in currentScope.recipes){
									currentScope.recipes[type].forEach((oneRecipe) =>{
										if(available.length > 0 && available.indexOf(oneRecipe.name) !== -1){
											oneRepo.scope.myRecipes.push(oneRecipe);
										}
									});
								}
							}

							if(deployFromTemplate.recipes.default){
								let defaultFromTemplate = deployFromTemplate.recipes.default;
								if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
									for(let type in currentScope.recipes){
										currentScope.recipes[type].forEach((oneRecipe) =>{
											if(defaultFromTemplate === oneRecipe.name){
												oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.recipe = oneRecipe._id;
											}
										});
									}
								}
							}

						}

						if(!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig){
							oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig = {};
						}

						if(!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings){
							oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings = {};
						}
						if(!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig){
							oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig = {};
						}
						if(!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.replication){
							oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.replication = {};
						}

						if(!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig.replication){
							oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig.replication = {};
						}

						if(deployFromTemplate.memoryLimit){
							oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = deployFromTemplate.memoryLimit;
						}

						if(deployFromTemplate.mode){
							if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
								let mode = deployFromTemplate.mode;
								if(isKubernetes){
									if(mode === 'global'){ mode = 'daemonset'; }
									if(mode === 'replicated'){ mode = 'deployment'; }
								}
								oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.replication.mode = mode;
								oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig.replication.mode = mode;
							}
						}

						if(deployFromTemplate.replicas){
							if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
								oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.replication.replicas = deployFromTemplate.replicas;
								oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig.replication.replicas = deployFromTemplate.replicas;
							}
						}
					}

					//on update
					if(currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv && currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[0]){
						let previousImfv = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[0];
						let controller;
						if(previousImfv.default){
							controller = true;
							previousImfv = previousImfv.default;
						}
						else{
							controller = false;
							previousImfv = previousImfv.version;
						}
						oneRepo.gitSource = previousImfv.options.gitSource;

						if(oneRepo.name === 'controller'){
							oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.type = "custom";
						}
						else{
							oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.type = oneRepo.type;
						}

						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options = previousImfv.options;
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version] = {
							name: oneRepo.name,
							type: oneRepo.type,
							deploySettings: previousImfv.options
						};

						if(!controller){
							if((oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.memoryLimit / 1048576) < 1){
								oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.memoryLimit *= 1048576;
							}
						}
					}

					//prepare to print the form
					currentScope.accounts.forEach((oneGitAccount) => {
						if (oneGitAccount.owner === oneRepo.gitSource.owner) {
							gitAccount = oneGitAccount;
							oneGitAccount.repos.forEach((oneGitRepo) => {
								if (oneGitRepo.name === oneRepo.gitSource.repo) {
									record = oneGitRepo;
									oneGitRepo.servicesList.forEach((oneService) => {
										if (oneService.name === oneRepo.name) {
											service = oneService;

											if(service.name === 'controller'){
												version = 'Default';
											}
											else{
												let tempV = 0;
												service.versions.forEach((oneVersion) => {
													if (parseInt(oneVersion.v) > tempV) {
														version = oneVersion;
														tempV = parseInt(oneVersion.v);
													}
												});
											}
										}
									});
								}
							});
						}
					});

					if(isKubernetes){
						currentScope.isAutoScalable = true;

						//check if previous
						if(currentScope.wizard.deployment.previousEnvironment){
							currentScope.availableEnvironments.forEach((onePreviousEnv) =>{
								if(onePreviousEnv.code === currentScope.wizard.deployment.previousEnvironment){
									oneRepo.scope.kubeNamespace = onePreviousEnv.deployer.container.kubernetes.remote.namespace.default;
								}
							});
						}
						//check current provider
						else{
							if(currentScope.wizard.selectedInfraProvider.api.namespace){
								oneRepo.scope.kubeNamespace = currentScope.wizard.selectedInfraProvider.api.namespace.default;
							}
							else {
								oneRepo.scope.kubeNamespace = 'soajs';
							}
						}
					}

					oneRepo.scope.kubeEnv = 'invalid';
					if(currentScope.wizard.deployment.previousEnvironment){
						oneRepo.scope.kubeEnv = currentScope.wizard.deployment.previousEnvironment;
					}

					if(defaultWizardSecretValues && defaultWizardSecretValues.length > 0){
						oneRepo.scope.defaultWizardSecretValues = angular.copy(defaultWizardSecretValues);
						oneRepo.scope.defaultWizardSecretValues.forEach((oneTemplateSecret) =>{
							oneTemplateSecret.uid = "from-template-" + oneTemplateSecret.name.toLowerCase();
						});
					}

					deployServiceDep.buildDeployForm(oneRepo.scope, currentScope, record, service, version, gitAccount, daemonGrpConf, isKubernetes);
					let entries = [];
					buildDynamicForm(oneRepo.scope, entries, () => {
						let element = angular.element(document.getElementById("repo_" + repoName));
						element.append("<form name=\"deployRepo\" id=\"deployRepo\"><div ng-include=\"'modules/dashboard/environments/directives/cd.tmpl'\"></div></form>");
						$compile(element.contents())(oneRepo.scope);

						oneRepo.scope.$watch("deployRepo.$invalid", function($invalid){
							oneRepo.formIsInvalid = $invalid;
						});

						oneRepo.scope.$watch('catalogConflictingPorts', (value) => {
							currentScope.loadingDynamicSection = false;
							if(value && value !==''){
								currentScope.loadingDynamicSection = true;

							}
						});

						counter++;
						if (counter < entriesNames.length) {
							buildMyForms(counter, cb);
						}
						else {
							return cb();
						}
					});
				}
				let templateDefaults = currentScope.wizard.template.content.deployments.repo[context.section[context.section.length -1]];
				//create a copy just in case
				let repoEntries = angular.copy(context.inputs);
				currentScope.dynamicStep = context;
				currentScope.saveData = function () {
					if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
					}
					else {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
					}

					let entriesCount = 0;
					for (let repoName in repoEntries) {
						let oneRepo = repoEntries[repoName];

						deployRepos.saveRecipe(oneRepo.scope, 'deploy', (imfv) => {
							if(typeof(oneRepo.formIsInvalid) ==='boolean' && !oneRepo.formIsInvalid){
								delete oneRepo.scope;
								delete oneRepo.formIsInvalid;
								imfv.name = repoName;
								imfv.type = templateDefaults.type;

								currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(imfv);
								entriesCount++;
								if(entriesCount === Object.keys(repoEntries).length){
									//trigger next here
									currentScope.next();
								}
							}
						});
					}
				};

				overlayLoading.show();
				currentScope.loadingDynamicSection = true;
				let entriesNames = Object.keys(repoEntries);
				buildMyForms(0, () => {
					currentScope.loadingDynamicSection = false;
					overlayLoading.hide();
				});
			}
		},
		resources: {
			deploy: function (currentScope, context, fCb) {
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
					resource.scope.context= {};
					resource.scope.context.envCode = currentScope.envCode;
					resource.scope.mainData = {};
					resource.scope.mainData.recipes = [];
					resource.scope.restrictions = currentScope.restrictions;
					
					if(currentScope.wizard.vms && Array.isArray(currentScope.wizard.vms) && currentScope.wizard.vms.length > 0){
						resource.scope.wizardVMs = currentScope.wizard.vms;
						
						if(!resource.scope.mainData.deploymentData){
							resource.scope.mainData.deploymentData = {}
						}
						
						resource.scope.mainData.deploymentData.vmLayers = currentScope.vmLayers;
					}

					for(let type in currentScope.recipes){
						currentScope.recipes[type].forEach((oneRecipe) =>{
							if(oneRecipe.type === record.type && oneRecipe.subtype === record.category){
								resource.scope.mainData.recipes.push(oneRecipe);

							}
						});
					}

					//if default values
					if(currentScope.wizard.template.content.deployments.resources[key].deploy){
						
						//get the infra
						//currentScope.mainData.deploymentData.infraProviders
						if(!resource.scope.mainData.deploymentData){
							resource.scope.mainData.deploymentData = {}
						}
						resource.scope.mainData.deploymentData.infraProviders = currentScope.infraProviders
						
						//get the recipes
						resource.scope.mainData.recipes = [];
						for(let type in currentScope.recipes){
							if(type === record.type){
								currentScope.recipes[type].forEach((oneRecipe) => {
									if(oneRecipe.subtype === record.category){
										resource.scope.mainData.recipes.push(oneRecipe);
									}
								});
							}
						}

						record.canBeDeployed = true;
						resource.scope.context.envType = 'container';
						resource.scope.context.envPlatform = currentScope.wizard.deployment.selectedDriver;
						if(resource.scope.context.envPlatform === 'ondemand'){
							resource.scope.context.envType = 'manual';
						}
						
						resource.scope.access = {deploy: true};
						resource.scope.noCDoverride = true;

						let deployFromTemplate = currentScope.wizard.template.content.deployments.resources[key].deploy;
						if(deployFromTemplate.recipes){
							if(deployFromTemplate.recipes.available && Array.isArray(deployFromTemplate.recipes.available) && deployFromTemplate.recipes.available.length > 0){
								resource.scope.mainData.recipes = [];
								let available = deployFromTemplate.recipes.available;
								for(let type in currentScope.recipes){
									currentScope.recipes[type].forEach((oneRecipe) =>{
										if(available.length > 0 && available.indexOf(oneRecipe.name) !== -1){
											resource.scope.mainData.recipes.push(oneRecipe);
										}
									});
								}
							}

							if(deployFromTemplate.recipes.default){
								let defaultFromTemplate = deployFromTemplate.recipes.default;
								if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
									for(let type in currentScope.recipes){
										currentScope.recipes[type].forEach((oneRecipe) =>{
											if(defaultFromTemplate === oneRecipe.name){
												if(!record.deployOptions){
													record.deployOptions = {};
												}
												record.deployOptions.recipe = oneRecipe._id;
											}
										});
									}
								}
							}

						}

						if(!record.deployOptions){
							record.deployOptions = {};
						}

						if(!record.deployOptions.custom){
							record.deployOptions.custom = {};
						}

						record.deployOptions.custom.name = key;

						if(!record.deployOptions.deployConfig){
							record.deployOptions.deployConfig = {};
						}

						if(!record.deployOptions.deployConfig.replication){
							record.deployOptions.deployConfig.replication = {};
						}

						if(deployFromTemplate.memoryLimit){
							if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
								record.deployOptions.deployConfig.memoryLimit = deployFromTemplate.memoryLimit;
							}
						}

						if(deployFromTemplate.mode){
							let mode = deployFromTemplate.mode;
							if(isKubernetes){
								if(mode === 'global'){ mode = 'daemonset'; }
								if(mode === 'replicated'){ mode = 'deployment'; }
							}
							if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
								record.deployOptions.deployConfig.replication.mode = mode;
							}
						}

						if(deployFromTemplate.replicas){
							if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
								record.deployOptions.deployConfig.replication.replicas = deployFromTemplate.replicas;
							}
						}

						currentScope.dynamictemplatestep = "Deploy " + currentScope.dynamictemplatestep;
					}
					else{
						currentScope.dynamictemplatestep = "Connect to " + currentScope.dynamictemplatestep;
					}

					if(currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
						record = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter];
						record.label = resource.label;

						if(record.config && record.config.servers){
							record.config.servers.forEach((oneServer) =>{
								oneServer.port = oneServer.port.toString();
							});
						}
					}

					if(isKubernetes){
						resource.scope.enableAutoScale = (Object.hasOwnProperty.call(record, 'enableAutoScale')) ? record.enableAutoScale : true;
						//check if previous
						if(currentScope.wizard.deployment.previousEnvironment){
							currentScope.availableEnvironments.forEach((onePreviousEnv) =>{
								if(onePreviousEnv.code === currentScope.wizard.deployment.previousEnvironment){
									resource.scope.kubeNamespace = onePreviousEnv.deployer.container.kubernetes.remote.namespace.default;
								}
							});
						}
						//check current provider
						else{
							if(currentScope.wizard.selectedInfraProvider.api.namespace){
								resource.scope.kubeNamespace = currentScope.wizard.selectedInfraProvider.api.namespace.default;
							}
							else {
								resource.scope.kubeNamespace = 'soajs';
							}
						}
					}

					resource.scope.kubeEnv = 'invalid';
					if(currentScope.wizard.deployment.previousEnvironment){
						resource.scope.kubeEnv = currentScope.wizard.deployment.previousEnvironment;
					}

					if(defaultWizardSecretValues && defaultWizardSecretValues.length > 0){
						resource.scope.defaultWizardSecretValues = angular.copy(defaultWizardSecretValues);
						resource.scope.defaultWizardSecretValues.forEach((oneTemplateSecret) =>{
							oneTemplateSecret.uid = "from-template-" + oneTemplateSecret.name.toLowerCase();
						});
					}

					resourceDeploy.buildDeployForm(resource.scope, resource.scope, null, record, 'add', settings, () => {
						if(currentScope.wizard.template.content.deployments.resources[key].deploy){
							resource.scope.hideDeployButton = true;
							if(isKubernetes){
								let remote = true;
								let deployment;
								//check if previous
								if(currentScope.wizard.deployment.previousEnvironment){
									currentScope.availableEnvironments.forEach((onePreviousEnv) =>{
										if(onePreviousEnv.code === currentScope.wizard.deployment.previousEnvironment){
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
								else{
									if(currentScope.wizard.selectedInfraProvider.api.namespace){
										deployment = {
											nodes: currentScope.wizard.selectedInfraProvider.api.ipaddress,
											NS: currentScope.wizard.selectedInfraProvider.api.namespace,
											perService: currentScope.wizard.selectedInfraProvider.api.perService,
											token: currentScope.wizard.selectedInfraProvider.api.token
										};
									}
									else{
										deployment = {
											nodes: "",
											NS: "soajs",
											perService: false,
											token: ""
										};
									}
								}

								let driverConfiguration = {
									"nodes" : deployment.nodes,
									"namespace" : {
										"default": deployment.NS,
										"perService": deployment.perService
									},
									"auth" : {
										"token" : deployment.token
									}
								};
								let envDeployer = {
									"type": "container",
									"kubernetes" : {}
								};
								if(remote){
									envDeployer.selected = "container.kubernetes.remote";
									envDeployer.kubernetes.remote = driverConfiguration;
								}
								else{
									envDeployer.selected = "container.kubernetes.local";
									envDeployer.kubernetes.local = driverConfiguration;
								}
								resource.scope.context.envDeployer = envDeployer;
							}
						}
						let entries = [];
						buildDynamicForm(resource.scope, entries, () => {

							if(resource.scope.formData.deployOptions && resource.deployOptions){
								resource.scope.formData.deployOptions.deployConfig = resource.deployOptions.deployConfig;
								let deployConfig = resource.scope.formData.deployOptions.deployConfig;
								if(deployConfig && deployConfig.type ==='vm'){
									resource.scope.onDeploymentTechnologySelect();
								}
							}

							let element = angular.element(document.getElementById("resource_" + key));
							element.append("<form name=\"addEditResource\" id=\"addEditResource\"><div ng-include=\"'modules/dashboard/resources/directives/resource.tmpl'\"></div></form>");
							$compile(element.contents())(resource.scope);

							if(currentScope.wizard.template.content.deployments.resources[key].deploy){
								setTimeout(() => {
									resource.scope.updateDeploymentName(record.name);
								}, 200);
							}

							resource.scope.$watch("addEditResource.$invalid", function($invalid){
								resource.formIsInvalid = $invalid;
							});

							resource.scope.$watch('catalogConflictingPorts', (value) => {
								currentScope.loadingDynamicSection = value && value !== '';
							});

							counter++;
							if (counter < entriesNames.length) {
								buildMyForms(counter, cb);
							}
							else {
								return cb();
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
								&& resource.deployOptions.deployConfig.vmConfiguration.vmLayer){
								resource.deployOptions.vms = [];
								let vmLayer = resource.deployOptions.deployConfig.vmConfiguration.vmLayer;
								
								if (vmLayer){
									vmLayer = vmLayer  + "_" + resource.deployOptions.deployConfig.vmConfiguration.vmLayer;
								}
								if (vmLayer && currentScope.vmLayers[vmLayer]){
									if(currentScope.vmLayers[vmLayer].list && currentScope.vmLayers[vmLayer].list.length > 0){
										currentScope.vmLayers[vmLayer].list.forEach(function (oneVM) {
											resource.deployOptions.vms.push(oneVM.name);
											if (!resource.deployOptions.deployConfig.vmConfiguration.group){
												resource.deployOptions.deployConfig.vmConfiguration.group = oneVM.labels['soajs.service.vm.group'];
											}
										});
									}
									else {
										if (!resource.deployOptions.deployConfig.vmConfiguration.group){
											resource.deployOptions.deployConfig.vmConfiguration.group = currentScope.vmLayers[vmLayer].group;
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
		}
	};

	function buildDynamicForm(currentScope, entries, postFormExecute) {
		let options = {
			timeout: $timeout,
			entries: entries,
			name: 'addEnvironment'
		};

		buildForm(currentScope, $modal, options, function () {
			if (postFormExecute && typeof postFormExecute === 'function') {
				postFormExecute();
			}
		});
	}

	function go(currentScope) {
		currentScope.loadingDynamicSection = true;
		currentScope.mapStorageToWizard($localStorage.addEnv);

		let stack = [];
		if (currentScope.wizard) {
			deployRepos.listGitAccounts(currentScope, () => {
				getDeploymentWorkflow(currentScope, stack, currentScope.wizard.template);

				currentScope.envCode = currentScope.wizard.gi.code.toUpperCase();

				//this template has no deployment workflow go to overview
				if (stack.length === 0) {
					if(['overview'].indexOf(currentScope.referringStep) !== -1){
						currentScope.referringStep = "dynamicSrv";
						currentScope.deploymentStackStep = 0;
						if (currentScope.form && currentScope.form.formData) {
							currentScope.form.formData = {};
						}
						currentScope.previousStep();
					}
					else{
						currentScope.nextStep();
					}
				}
				else {
					currentScope.deploymentStackStep = 0;
					if(['registry', 'deploy'].indexOf(currentScope.referringStep) === -1){
						currentScope.deploymentStackStep = stack.length -1;
					}
					processStack(currentScope, stack);
				}
			});
		}

		currentScope.reset = function () {
			delete $localStorage.addEnv;
			delete currentScope.wizard;
			currentScope.form.formData = {};
			currentScope.$parent.go("/environments")
		};

		currentScope.back = function () {
			jQuery("html, body").animate({scrollTop: 0 });

			currentScope.referringStep = "dynamicSrv";
			currentScope.deploymentStackStep--;
			if (currentScope.deploymentStackStep < 0) {
				if (currentScope.form && currentScope.form.formData) {
					currentScope.form.formData = {};
				}
				currentScope.previousStep();
			}
			else {
				processStack(currentScope, stack);
			}
		};

		currentScope.next = function () {
			jQuery("html, body").animate({scrollTop: 0 });

			//update template in local storage
			$localStorage.addEnv = angular.copy(currentScope.wizard);
			delete $localStorage.addEnv.template.content;

			currentScope.deploymentStackStep++;
			if (currentScope.deploymentStackStep >= stack.length) {
				if (currentScope.form && currentScope.form.formData) {
					currentScope.form.formData = {};
				}
				currentScope.referringStep = 'dynamic';
				currentScope.nextStep();
			}
			else {
				processStack(currentScope, stack);
			}
		};
	}

	function returnObjectPathFromString(stringPath, mainObj) {
		function index(obj, i) {
			return obj[i]
		}

		return stringPath.split('.').reduce(index, mainObj);
	}

	function getDeploymentWorkflow(currentScope, stack, template) {
		if (template.deploy && Object.keys(template.deploy).length > 0) {
			let schemaOptions = Object.keys(template.deploy);
			schemaOptions.forEach((stage) => {
				let groups = ['pre', 'steps', 'post'];
				groups.forEach((oneGroup) => {
					if (template.deploy[stage][oneGroup]) {
						for (let stepPath in template.deploy[stage][oneGroup]) {
							let opts = {
								'stage': stage,
								'group': oneGroup,
								'stepPath': stepPath,
								'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
							};

							//if manual deployment, then process database entries only
							if(currentScope.wizard.deployment.selectedDriver === 'manual' && stage === 'database'){
								prepareInputs(stage, oneGroup, stepPath, opts);
							}
							else if(currentScope.wizard.deployment.selectedDriver !== 'manual'){
								prepareInputs(stage, oneGroup, stepPath, opts);
							}
						}
					}
				});
			});
		}

		function prepareInputs(stage, oneGroup, stepPath, opts){
			//case of ui read only, loop in array and generate an inputs object then call utils
			if (template.deploy[stage][oneGroup][stepPath].ui && template.deploy[stage][oneGroup][stepPath].ui.readOnly) {

			}
			else {
				let inputs = {};
				if(template.deploy[stage][oneGroup][stepPath].imfv && template.deploy[stage][oneGroup][stepPath].imfv.length > 0){
					template.deploy[stage][oneGroup][stepPath].imfv.forEach((oneimfv) =>{
						let tName = oneimfv.name || oneimfv.serviceName;
						inputs[tName] = oneimfv;
					})
				}
				if(Object.keys(inputs).length === 0){
					let dataArray = returnObjectPathFromString("content." + stepPath, template);
					if(!dataArray){
						let section = stepPath;
						if (stepPath.indexOf(".") !== -1) {
							stepPath = stepPath.split(".");
							section = stepPath[0];
						}
						let dataArray = returnObjectPathFromString("content." + section, template);
						doDataArray(dataArray, inputs);
					}
					else{
						doDataArray(dataArray, inputs);
					}
				}


				opts['inputs'] = inputs;
				stack.push(opts);
			}

			function doDataArray(dataArray, inputs){
				if (dataArray.data && Array.isArray(dataArray.data)) {
					dataArray.data.forEach((oneDataEntry) => {
						let tName = oneDataEntry.name || oneDataEntry.serviceName;
						inputs[tName] = oneDataEntry;
					});
				}
				else {
					let section = stepPath;
					if (stepPath.indexOf(".") !== -1) {
						stepPath = stepPath.split(".");
						section = stepPath[stepPath.length - 1];
					}

					if (dataArray.limit) {
						if (dataArray.limit > 1) {
							for (let i = 0; i < dataArray.limit; i++) {
								inputs[section + i] = angular.copy(dataArray);
								delete inputs[section + i].limit;
							}
						}
						else {
							delete dataArray.limit;
							inputs[section] = dataArray;
						}
					}
					else {
						inputs[section] = dataArray;
					}
				}
			}
		}
	}

	function processStack(currentScope, stack) {
		let stackStep = stack[currentScope.deploymentStackStep];
		if (stackStep && stackStep.inputs) {
			let contentSection = stackStep.section;
			let subSection;
			if (Array.isArray(contentSection)) {
				subSection = contentSection[1];
				contentSection = contentSection[0];
			}

			let predefinedStepFunction;
			//check if template has a content entry for level 0 of this section
			if (currentScope.wizard.template.content[contentSection]) {
				//works for both sections with sub or sections with main only
				if(currentScope.wizard.template.content[contentSection][subSection]){
					predefinedStepFunction = subSection;
				}
				else{
					predefinedStepFunction = contentSection;
				}
			}

			stackStep.predefinedStepFunction = predefinedStepFunction;
			if (predefinedStepFunction) {
				predefinedSchemaSteps[predefinedStepFunction].deploy(currentScope, stackStep);
			}
			else {
				nextStep();
			}
		}
		else {
			nextStep();
		}

		function nextStep() {
			//jump to next step or leave
			if (currentScope.deploymentStackStep === stack.length - 1) {
				//stack has been processed in full, go to overview
				currentScope.nextStep();
			}
			else {
				currentScope.deploymentStackStep++;
				processStack(currentScope, stack);
			}
		}
	}

	return {
		"go": go
	}
}]);
