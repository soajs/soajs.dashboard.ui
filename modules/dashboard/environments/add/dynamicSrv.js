"use strict";
var dynamicServices = soajsApp.components;
dynamicServices.service('dynamicSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$compile', 'customRegistrySrv', 'resourceDeploy', 'resourceConfiguration', 'secretsService', 'deployRepos', 'deployServiceDep', function (ngDataApi, $timeout, $modal, $localStorage, $window, $compile, customRegistrySrv, resourceDeploy, resourceConfiguration, secretsService, deployRepos, deployServiceDep) {
	
	let predefinedSchemaSteps = {
		custom_registry: {
			deploy: function (currentScope, context) {
				function buildMyForms(counter, cb) {
					let ci = entriesNames[counter];
					let customRegistry = ciEntries[ci];
					let record = angular.copy(customRegistry);
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
					
					for (let ci in ciEntries) {
						let customRegistry = ciEntries[ci];
						customRegistry.scope.save();
						
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
					}
					
					//trigger next here
					currentScope.next();
				};
				
				overlayLoading.show();
				let entriesNames = Object.keys(ciEntries);
				buildMyForms(0, () => {
					overlayLoading.hide();
				});
			}
		},
		secrets: {
			deploy: function (currentScope, context, fCb) {
				function buildMyForms(counter, cb) {
					let secretKey = entriesNames[counter];
					let oneSecret = secretEntries[secretKey];
					oneSecret.scope = currentScope.$new(true); //true means detached from main currentScope
					oneSecret.scope.selectedEnvironment = {code: currentScope.envCode};
					currentScope.selectedEnvironment = {code: currentScope.envCode};
					currentScope.namespaceConfig = {namespace: 'default'};
					
					secretsService.addSecret(oneSecret.scope, null, currentScope, [], () => {
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
					
					for (let secretName in secretEntries) {
						let oneSecret = secretEntries[secretName];
						oneSecret.scope.form.do({
							'type': 'submit',
							'action': (formData) => {
								oneSecret.scope.save(formData, (imfv) => {
									imfv.name = secretName; //force the name back as it was
									oneSecret = imfv;
									delete oneSecret.scope;
									currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(oneSecret);
								});
							}
						});
					}
					
					//trigger next here
					currentScope.next();
				};
				
				overlayLoading.show();
				let entriesNames = Object.keys(secretEntries);
				buildMyForms(0, () => {
					overlayLoading.hide();
				});
			}
		},
		repo: {
			deploy: function (currentScope, context, fCb) {
				function buildMyForms(counter, cb) {
					let repoName = entriesNames[counter];
					let oneRepo = repoEntries[repoName];
					
					let service = {};
					let record = {};
					let version = {};
					let gitAccount = {};
					let daemonGrpConf = (oneRepo.type === 'daemon' && oneRepo.group) ? oneRepo.group : "";
					let isKubernetes = (currentScope.wizard.deployment.selectedDriver === 'kubernetes');
					
					currentScope.accounts.forEach((oneGitAccount) => {
						if (oneGitAccount.owner === oneRepo.gitSource.owner) {
							gitAccount = oneGitAccount;
							oneGitAccount.repos.forEach((oneGitRepo) => {
								if (oneGitRepo.name === oneRepo.gitSource.repo) {
									record = oneGitRepo;
									oneGitRepo.servicesList.forEach((oneService) => {
										if (oneService.name === oneRepo.name) {
											service = oneService;
											
											let tempV = 0;
											service.versions.forEach((oneVersion) => {
												if (parseInt(oneVersion.v) > tempV) {
													version = oneVersion;
													tempV = parseInt(oneVersion.v);
												}
											});
										}
									})
								}
							});
						}
					});
					
					oneRepo.scope = currentScope.$new(true); //true means detached from main currentScope
					deployServiceDep.buildDeployForm(oneRepo.scope, currentScope, record, service, version, gitAccount, daemonGrpConf, isKubernetes);
					let entries = [];
					buildDynamicForm(oneRepo.scope, entries, () => {
						let element = angular.element(document.getElementById("repo_" + repoName));
						element.append("<div ng-include=\"'modules/dashboard/environments/directives/cd.tmpl'\">");
						$compile(element.contents())(oneRepo.scope);
						
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
				let repoEntries = angular.copy(context.inputs);
				currentScope.dynamicStep = context;
				
				currentScope.saveData = function () {
					if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
					}
					else {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
					}
					
					for (let repoName in repoEntries) {
						let oneRepo = repoEntries[repoName];
						
						deployRepos.saveRecipe(oneRepo.scope, 'deploy', (imfv) => {
							delete oneRepo.scope;
							currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(imfv);
						});
					}
					
					//trigger next here
					currentScope.next();
				};
				
				overlayLoading.show();
				let entriesNames = Object.keys(repoEntries);
				buildMyForms(0, () => {
					overlayLoading.hide();
				});
			}
		},
		resources: {
			deploy: function (currentScope, context, fCb) {
				function buildMyForms(counter, cb) {
					let key = entriesNames[counter];
					let resource = resourceEntries[key];
					
					let record = angular.copy(resource);
					let settings = {"type": record.type, category: record.category};
					resource.scope = currentScope.$new(true); //true means detached from main currentScope
					resource.scope.envCode = currentScope.envCode;
					if(record.deploy && Object.keys(record.deploy).length > 0){
						record.canBeDeployed = true;
					}
					
					resource.scope.envType = 'container';
					resource.scope.envPlatform = currentScope.wizard.deployment.selectedDriver;
					resource.scope.access = {deploy: true};
					resourceDeploy.buildDeployForm(resource.scope, resource.scope, null, record, 'add', settings, () => {
						let entries = [];
						buildDynamicForm(resource.scope, entries, () => {
							let element = angular.element(document.getElementById("resource_" + key));
							element.append("<div ng-include=\"'modules/dashboard/resources/directives/resource.tmpl'\">");
							$compile(element.contents())(resource.scope);
							
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
					
					for (let key in resourceEntries) {
						let resource = resourceEntries[key];
						resourceConfiguration.mapConfigurationFormDataToConfig(resource.scope, function () {
							//map the values back to custom registry
							let imfv = angular.copy(resource.scope.formData);
							imfv.name = key; //force the name back as it was
							
							//todo: deployment
							//console.log(resource.scope);
							if (imfv.deployOptions) {
								imfv.deploy = {
									"options": {
										"deployConfig": {
											"replication": {
												"mode": resource.scope.formData.deployOptions.deployConfig.replication.mode
											},
											"memoryLimit": resource.scope.formData.deployOptions.deployConfig.memoryLimit * 1048576
										},
										"custom": resource.scope.formData.deployOptions,
										"recipe": resource.scope.formData.deployOptions.recipe,
										"env": resource.scope.envCode
									},
									"deploy": true,
									"type": "custom"
								};
								
								if(resource.scope.formData.deployOptions.deployConfig.replication.replicas){
									imfv.deploy.options.deployConfig.replication.replicas = resource.scope.formData.deployOptions.deployConfig.replication.replicas;
								}
							}
							else {
								delete imfv.deployOptions;
							}
							
							resource = imfv;
							delete resource.scope;
							currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(resource);
						});
					}
					
					//trigger next here
					currentScope.next();
				};
				
				currentScope.dynamicStep = context;
				let resourceEntries = angular.copy(context.inputs);
				let entriesNames = Object.keys(resourceEntries);
				
				overlayLoading.show();
				buildMyForms(0, () => {
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
		
		currentScope.mapStorageToWizard($localStorage.addEnv);
		
		let stack = [];
		if (currentScope.wizard) {
			deployRepos.listGitAccounts(currentScope, () => {
				getDeploymentWorkflow(stack, currentScope.wizard.template);
				
				currentScope.envCode = currentScope.wizard.gi.code.toUpperCase();
				
				console.log(stack);
				
				//this template has no deployment workflow go to overview
				if (stack.length === 0) {
					currentScope.nextStep();
				}
				else {
					currentScope.deploymentStackStep = 0;
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
			currentScope.deploymentStackStep++;
			if (currentScope.deploymentStackStep >= stack.length) {
				if (currentScope.form && currentScope.form.formData) {
					currentScope.form.formData = {};
				}
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
	
	function getDeploymentWorkflow(stack, template) {
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
							
							//case of ui read only, loop in array and generate an inputs object then call utils
							if (template.deploy[stage][oneGroup][stepPath].ui && template.deploy[stage][oneGroup][stepPath].ui.readOnly) {
							
							}
							else {
								let dataArray = returnObjectPathFromString("content." + stepPath, template);
								let inputs = {};
								if (dataArray.data && Array.isArray(dataArray.data)) {
									dataArray.data.forEach((oneDataEntry) => {
										inputs[oneDataEntry.name] = oneDataEntry;
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
								
								
								opts['inputs'] = inputs;
								stack.push(opts);
							}
						}
					}
				});
			});
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
				predefinedStepFunction = subSection || contentSection;
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