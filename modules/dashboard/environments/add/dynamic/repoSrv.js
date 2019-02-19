"use strict";
var dynamicReposServices = soajsApp.components;
dynamicReposServices.service('dynamicReposSrv', ['$compile', 'deployRepos', 'deployServiceDep', function ($compile, deployRepos, deployServiceDep) {
	
	function go(currentScope, context, buildDynamicForm, defaultWizardSecretValues) {
		
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
			
			//the below happens on refresh
			if (oneRepo.type === 'daemon' && (!daemonGrpConf || daemonGrpConf === '')) {
				if (oneRepo.version && oneRepo.version.options && oneRepo.version.options.custom && oneRepo.version.options.custom.daemonGroup) {
					oneRepo.group = oneRepo.version.options.custom.daemonGroup;
					daemonGrpConf = oneRepo.version.options.custom.daemonGroup;
				}
			}
			
			oneRepo.name = repoName;
			oneRepo.scope = currentScope.$new(true); //true means detached from main currentScope
			oneRepo.scope.oneEnv = currentScope.envCode;
			
			if (oneRepo.name === 'controller') {
				version = 'Default';
			}
			else {
				currentScope.services.forEach((oneService) => {
					if (oneService.name === oneRepo.name && oneService.name !== 'controller') {
						let tempV = 0;
						for (let v in oneService.versions) {
							if (parseFloat(v) > tempV) {
								version = v;
								tempV = parseFloat(v);
							}
						}
					}
				});
				currentScope.daemons.forEach((oneDaemon) => {
					if (oneDaemon.name === oneRepo.name) {
						let tempV = 0;
						for (let v in oneDaemon.versions) {
							oneDaemon.versions[v].grpConf.forEach((oneGrpConf) => {
								
								if (oneRepo.group === oneGrpConf.daemonConfigGroup) {
									if (parseFloat(v) > tempV) {
										version = v;
										tempV = parseFloat(v);
									}
								}
							});
						}
					}
				});
			}
			
			oneRepo.scope.cdData = {};
			oneRepo.scope.cdData[oneRepo.scope.oneEnv.toUpperCase()] = {};
			
			oneRepo.scope.noCDoverride = true;
			
			oneRepo.scope.cdConfiguration = {};
			oneRepo.scope.cdConfiguration[oneRepo.name] = {};
			oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv] = {};
			
			oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj = {ha: {}};
			oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version] = {};
			
			oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData = {};
			oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions = {};
			oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version] = {deploy: true};
			oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options = {};
			
			oneRepo.scope.myRecipes = [];
			for (let type in currentScope.recipes) {
				currentScope.recipes[type].forEach((oneRecipe) => {
					
					if (oneRecipe.type === oneRepo.type && oneRecipe.subtype === oneRepo.category) {
						oneRepo.scope.myRecipes.push(oneRecipe);
					}
				});
			}
			
			//if default values
			if (currentScope.wizard.template.content.deployments.repo[repoName].deploy) {
				let deployFromTemplate = currentScope.wizard.template.content.deployments.repo[repoName].deploy;
				
				if (deployFromTemplate.recipes) {
					if (deployFromTemplate.recipes.available && Array.isArray(deployFromTemplate.recipes.available) && deployFromTemplate.recipes.available.length > 0) {
						oneRepo.scope.myRecipes = [];
						let available = deployFromTemplate.recipes.available;
						for (let type in currentScope.recipes) {
							currentScope.recipes[type].forEach((oneRecipe) => {
								if (available.length > 0 && available.indexOf(oneRecipe.name) !== -1) {
									oneRepo.scope.myRecipes.push(oneRecipe);
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
										oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.recipe = oneRecipe._id;
									}
								});
							}
						}
					}
					
				}
				
				if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig) {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig = {};
				}
				
				if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings) {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings = {};
				}
				if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig) {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig = {};
				}
				if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.replication) {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.replication = {};
				}
				
				if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig.replication) {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig.replication = {};
				}
				
				if (Object.hasOwnProperty.call(deployFromTemplate, 'memoryLimit')) {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = deployFromTemplate.memoryLimit;
				}
				
				if (deployFromTemplate.mode) {
					if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
						let mode = deployFromTemplate.mode;
						if (isKubernetes) {
							if (mode === 'global') {
								mode = 'daemonset';
							}
							if (mode === 'replicated') {
								mode = 'deployment';
							}
						}
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.replication.mode = mode;
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig.replication.mode = mode;
					}
				}
				
				if (deployFromTemplate.replicas) {
					if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.deployConfig.replication.replicas = deployFromTemplate.replicas;
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].deploySettings.deployConfig.replication.replicas = deployFromTemplate.replicas;
					}
				}
				
				if (deployFromTemplate.strategy) {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].strategy = deployFromTemplate.strategy;
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].strategy = deployFromTemplate.strategy;
				}
				
				if (deployFromTemplate.branch) {
					if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.gitSource) {
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.gitSource = {};
					}
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.gitSource.branch = deployFromTemplate.branch;
					
					if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].options) {
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].options = {};
					}
					if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].options.gitSource) {
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].options.gitSource = {};
					}
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].options.gitSource.branch = deployFromTemplate.branch;
				}
				
				//cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.sourceCode.configuration.repo
				if (deployFromTemplate.sourceCode && deployFromTemplate.sourceCode.config) {
					if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.custom) {
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.custom = {};
					}
					if (!oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.custom.sourceCode) {
						oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.custom.sourceCode = {};
					}
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options.custom.sourceCode.configuration = deployFromTemplate.sourceCode.config;
				}
			}
			
			//on update
			if (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv && currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[0]) {
				let previousImfv = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[0];
				let controller;
				if (previousImfv.default) {
					controller = true;
					previousImfv = previousImfv.default;
				}
				else {
					controller = false;
					previousImfv = previousImfv.version;
				}
				oneRepo.gitSource = previousImfv.options.gitSource;
				
				if (oneRepo.name === 'controller') {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.type = "custom";
				}
				else {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.type = oneRepo.type;
				}
				
				oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].options = previousImfv.options;
				oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].options = previousImfv.options;
				
				if (previousImfv.strategy) {
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].cdData.versions[version].strategy = previousImfv.strategy;
					oneRepo.scope.cdConfiguration[oneRepo.name][oneRepo.scope.oneEnv].obj.ha[version].strategy = previousImfv.strategy;
				}
			}
			
			//prepare to print the form
			currentScope.accounts.forEach((oneGitAccount) => {
				oneGitAccount.repos.forEach((oneGitRepo) => {
					
					if (oneGitRepo.owner === oneRepo.gitSource.owner) {
						gitAccount = oneGitAccount;
						
						if (oneGitRepo.name === oneRepo.gitSource.repo) {
							record = oneGitRepo;
							oneGitRepo.servicesList.forEach((oneService) => {
								if (oneService.name === oneRepo.name) {
									service = oneService;
									
									if (service.name === 'controller') {
										version = 'Default';
									}
									else {
										let tempV = 0;
										service.versions.forEach((oneVersion) => {
											if (parseFloat(oneVersion.v) > tempV) {
												version = oneVersion;
												tempV = parseFloat(oneVersion.v);
											}
										});
									}
								}
							});
						}
					}
				});
			});
			
			if (isKubernetes) {
				currentScope.isAutoScalable = true;
				
				//check if previous
				if (currentScope.wizard.deployment.previousEnvironment) {
					currentScope.availableEnvironments.forEach((onePreviousEnv) => {
						if (onePreviousEnv.code === currentScope.wizard.deployment.previousEnvironment) {
							oneRepo.scope.kubeNamespace = onePreviousEnv.deployer.container.kubernetes.remote.namespace.default;
						}
					});
				}
				//check current provider
				else {
					if (currentScope.wizard.selectedInfraProvider.api.namespace) {
						oneRepo.scope.kubeNamespace = currentScope.wizard.selectedInfraProvider.api.namespace.default;
					}
					else {
						oneRepo.scope.kubeNamespace = 'soajs';
					}
				}
			}
			
			oneRepo.scope.kubeEnv = 'invalid';
			if (currentScope.wizard.deployment.previousEnvironment) {
				oneRepo.scope.kubeEnv = currentScope.wizard.deployment.previousEnvironment;
			}
			
			if (defaultWizardSecretValues && defaultWizardSecretValues.length > 0) {
				oneRepo.scope.defaultWizardSecretValues = angular.copy(defaultWizardSecretValues);
				oneRepo.scope.defaultWizardSecretValues.forEach((oneTemplateSecret) => {
					oneTemplateSecret.uid = "from-template-" + oneTemplateSecret.name.toLowerCase();
				});
			}
			
			deployServiceDep.buildDeployForm(oneRepo.scope, currentScope, record, service, version, gitAccount, daemonGrpConf, isKubernetes);
			let entries = [];
			buildDynamicForm(oneRepo.scope, entries, () => {
				let element = angular.element(document.getElementById("repo_" + repoName));
				element.append("<form name=\"deployRepo\" id=\"deployRepo\"><div ng-include=\"'modules/dashboard/environments/directives/cd.tmpl'\"></div></form>");
				$compile(element.contents())(oneRepo.scope);
				
				oneRepo.scope.$watch("deployRepo.$invalid", function ($invalid) {
					oneRepo.formIsInvalid = $invalid;
				});
				
				oneRepo.scope.$watch('catalogConflictingPorts', (value) => {
					currentScope.loadingDynamicSection = false;
					if (value && value !== '') {
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
		
		let templateDefaults = currentScope.wizard.template.content.deployments.repo[context.section[context.section.length - 1]];
		
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
					if (typeof(oneRepo.formIsInvalid) === 'boolean' && !oneRepo.formIsInvalid) {
						delete oneRepo.scope;
						delete oneRepo.formIsInvalid;
						imfv.name = repoName;
						imfv.type = templateDefaults.type;
						
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(imfv);
						entriesCount++;
						if (entriesCount === Object.keys(repoEntries).length) {
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
	
	return {
		'go': go
	}
}]);