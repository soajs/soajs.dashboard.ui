
"use strict";
var resourceDeployService = soajsApp.components;
resourceDeployService.service('resourceDeploy', ['resourceConfiguration', 'ngDataApi', function (resourceConfiguration, ngDataApi) {
	
	function buildDeployForm(currentScope, context, $modalInstance, resource, action, settings, cb){
		context.formData = {};
		context.envs = [];
		context.message = {};
		context.recipes = [];
		context.recipeUserInput = { image: {}, envs: {} };
		
		context.configRepos = [];
		context.configReposBranches = {};
		context.configReposBranchesStatus = {};
		
		context.resourceDeployed = false;
		if (resource && resource.instance && resource.instance.id) {
			context.resourceDeployed = true;
		}
		context.access = currentScope.access;
		context.envPlatform = currentScope.envPlatform;
		context.envDeployer = currentScope.envDeployer;
		
		let category = (resource && Object.keys(resource).length > 0) ? resource.category : settings.category;
		resourcesAppConfig.form.addResource.data.categories.forEach((oneCategory)=> {
			if (oneCategory.v === category) {
				context.categoryLabel = oneCategory.l;
			}
		});
		
		let allowEdit = ((action === 'add') || (action === 'update' && resource.permission && resource.created.toUpperCase() === currentScope.envCode.toUpperCase()));
		context.allowEdit = allowEdit;
		
		if (resource.name === 'dash_cluster') {
			context.sensitive = true;
		}
		
		resourceConfiguration.loadDriverSchema(context, resource, settings, allowEdit, function (error) {
			if (error) {
				context.notsupported = true;
			}
		});
		
		context.fetchBranches = function (confOrCustom) {
			let selectedRepo, subNameInCaseMulti;
			if (confOrCustom === 'conf') {
				selectedRepo = context.formData.deployOptions.sourceCode.configuration.repo;
			} else { // cust
				let decoded = decodeRepoNameAndSubName(context.formData.deployOptions.sourceCode.custom.repo);
				selectedRepo = decoded.name;
				subNameInCaseMulti = decoded.subName;
				
				context.selectedCustomClear = selectedRepo;
			}
			
			if (!selectedRepo || selectedRepo === '' || selectedRepo === '-- Leave Empty --') {
				return;
			}
			
			let accountData = {};
			if(confOrCustom === 'conf'){
				context.configRepos.config.forEach(function (eachAcc) {
					if (eachAcc.name === selectedRepo) {
						accountData = eachAcc;
					}
				});
			}
			else{
				if(Object.keys(accountData).length === 0){
					context.configRepos.customType.forEach(function (eachAcc) {
						if (eachAcc.name === selectedRepo) {
							accountData = eachAcc;
						}
					});
				}
			}
			if(accountData && Object.keys(accountData).length > 0){
				context.configReposBranchesStatus[selectedRepo] = 'loading';
				getSendDataFromServer(context, ngDataApi, {
					'method': 'get',
					'routeName': '/dashboard/gitAccounts/getBranches',
					params: {
						id: accountData.accountId,
						name: selectedRepo,
						type: 'repo',
						provider : accountData.provider
					}
				}, function (error, response) {
					if (error) {
						context.configReposBranchesStatus[selectedRepo] = 'failed';
						context.displayAlert('danger', error.message);
					} else {
						context.configReposBranchesStatus[selectedRepo] = 'loaded';
						context.configReposBranches[selectedRepo] = response.branches;
						
						//if multi auto generate path
						if (confOrCustom === 'cust') {
							context.sourceCodeConfig.custom.repoPath.disabled = false;
							if (accountData.type === 'multi' && subNameInCaseMulti) {
								accountData.configSHA.forEach((oneSubRepo) => {
									if (oneSubRepo.contentName === subNameInCaseMulti) {
										context.formData.deployOptions.sourceCode.custom.path = oneSubRepo.path.replace("/config.js", "/");
										context.sourceCodeConfig.custom.repoPath.disabled = true;
									}
								});
							}
							else{
								context.formData.deployOptions.sourceCode.custom.path = "";
							}
						}
					}
				});
			}
		};
		
		context.options = {
			deploymentModes: [],
			envCode: currentScope.envCode,
			envType: currentScope.envType,
			envPlatform: currentScope.envPlatform,
			enableAutoScale: false,
			formAction: action,
			aceEditorConfig: {
				maxLines: Infinity,
				useWrapMode: true,
				mode: 'json',
				firstLineNumber: 1,
				height: '500px'
			},
			allowEdit: allowEdit,
			computedHostname: ''
		};
		
		context.title = 'Add New Resource';
		if (action === 'update' && context.options.allowEdit) {
			context.title = 'Update ' + resource.name;
		}
		else if (!allowEdit) {
			context.title = 'View ' + resource.name;
		}
		
		if (currentScope.envPlatform === 'kubernetes') {
			context.options.deploymentModes = [
				{
					label: 'deployment - deploy the specified number of replicas based on the availability of resources',
					value: 'deployment'
				},
				{
					label: 'daemonset - automatically deploy one replica of the service on each node in the cluster',
					value: 'daemonset'
				}
			];
		}
		else if (currentScope.envPlatform === 'docker') {
			context.options.deploymentModes = [
				{
					label: 'replicated - deploy the specified number of replicas based on the availability of resources',
					value: 'replicated'
				},
				{
					label: 'global - automatically deploy one replica of the service on each node in the cluster',
					value: 'global'
				}
			];
		}
		
		context.displayAlert = function (type, message) {
			context.message[type] = message;
			setTimeout(function () {
				context.message = {};
			}, 5000);
		};
		
		context.listAccounts = function (customType, customRepoInfo, callback) {
			getSendDataFromServer(context, ngDataApi, {
				'method': 'get',
				'routeName': '/dashboard/gitAccounts/accounts/list',
				params : {
					fullList : true
				}
			}, function (error, response) {
				if (error) {
					context.displayAlert('danger', error.message);
				} else {
					let configRecords = [];
					let customRecords = [];
					
					configRecords.push({name: "-- Leave Empty --"});
					customRecords.push({name: "-- Leave Empty --"});
					
					if (response) {
						response.forEach(function (eachAccount) {
							if (eachAccount.repos) {
								eachAccount.repos.forEach(function (eachRepo) {
									// eachRepo : name, serviceName, type
									if (eachRepo.type === 'config') {
										configRecords.push({
											owner: eachAccount.owner,
											provider: eachAccount.provider,
											accountId: eachAccount._id.toString(),
											name: eachRepo.name,
											type: eachRepo.type,
											configSHA: eachRepo.configSHA
										});
									}
									
									if(['custom','service','daemon','static'].indexOf(eachRepo.type) !== -1){
										if (!customType || eachRepo.type === customType) {
											customRecords.push({
												owner: eachAccount.owner,
												provider: eachAccount.provider,
												accountId: eachAccount._id.toString(),
												name: eachRepo.name,
												type: eachRepo.type,
												configSHA: eachRepo.configSHA
											});
										}
									}
									else if (eachRepo.type === 'multi'){
										eachRepo.configSHA.forEach((subRepo) => {
											
											//if not locked or locked from catalog and the value is multi
											if (!customType || customType === 'multi') {
												if((!customRepoInfo || !customRepoInfo.subName)|| (customRepoInfo && customRepoInfo.subName === subRepo.contentName)) {
													if (['custom', 'service', 'daemon', 'static'].indexOf(subRepo.contentType) !== -1) {
														customRecords.push({
															owner: eachAccount.owner,
															provider: eachAccount.provider,
															accountId: eachAccount._id.toString(),
															name: eachRepo.name,
															subName: subRepo.contentName,
															type: eachRepo.type,
															configSHA: eachRepo.configSHA
														});
													}
												}
											}
											
											//if not locked or locked from catalog and value not multi
											if(!customType || customType !== 'multi') {
												
												//one of the sub repo types should match locked type or no locked type and acceptable type
												if ((!customType && ['custom', 'service', 'daemon', 'static'].indexOf(subRepo.contentType) !== -1) || (customType === subRepo.contentType)) {
													customRecords.push({
														owner: eachAccount.owner,
														provider: eachAccount.provider,
														accountId: eachAccount._id.toString(),
														name: eachRepo.name,
														subName: subRepo.contentName,
														type: eachRepo.type,
														configSHA: eachRepo.configSHA
													});
												}
											}
											
										});
									}
								});
							}
						});
					}
					
					context.configRepos.customType = customRecords;
					context.configRepos.config = configRecords;
					
					callback();
				}
			});
		};
		
		context.getEnvs = function () {
			if (context.envs && context.envs.list && context.envs.list.length > 0) {
				return;
			}
			
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/environment/list'
			}, function (error, envs) {
				overlayLoading.hide();
				if (error) {
					context.displayAlert('danger', error.message);
				}
				else {
					context.envs.list = [];
					envs.forEach(function (oneEnv) {
						//in case of update resource, check resource record to know what env it belongs to
						if (resource && resource.created) {
							if (resource.created.toUpperCase() === oneEnv.code.toUpperCase()) return;
						}
						//in case of add resource, check current environment
						else if (currentScope.envCode.toUpperCase() === oneEnv.code.toUpperCase()) {
							return;
						}
						
						var envEntry = {
							code: oneEnv.code,
							description: oneEnv.description,
							selected: (resource && resource.sharedEnv && resource.sharedEnv[oneEnv.code.toUpperCase()])
						};
						
						if (resource && resource.shared && action === 'update') {
							if (resource.sharedEnv) {
								envEntry.selected = (resource.sharedEnv[oneEnv.code.toUpperCase()]);
							}
							else {
								//shared with all envs
								envEntry.selected = true;
								context.envs.sharedWithAll = true;
							}
						}
						
						context.envs.list.push(envEntry);
					});
				}
			});
		};
		
		context.fillForm = function () {
			if (action === 'add') {
				context.formData.type = settings.type;
				context.formData.category = settings.category;
			}
			else {
				context.formData = angular.copy(resource);
				context.getEnvs();
				
				//ace editor cannot take an object or array as model
				context.formData.config = JSON.stringify(context.formData.config, null, 2);
				
				if (context.formData && context.formData.deployOptions && context.formData.deployOptions.autoScale && context.formData.deployOptions.autoScale.replicas && context.formData.deployOptions.autoScale.metrics) {
					context.options.enableAutoScale = true;
				}
				
				if (context.formData && context.formData.deployOptions && context.formData.deployOptions.deployConfig && context.formData.deployOptions.deployConfig.memoryLimit) {
					context.formData.deployOptions.deployConfig.memoryLimit /= 1048576; //convert memory limit from bytes to megabytes
				}
				
				// take source code configuration from cicd on edit
				if(context.formData.deployOptions && context.formData.deployOptions.custom && context.formData.deployOptions.custom.sourceCode){
					context.formData.deployOptions.sourceCode = context.formData.deployOptions.custom.sourceCode;
					
					// reconstruct complex repo on load
					if(context.formData.deployOptions.sourceCode.custom && context.formData.deployOptions.sourceCode.custom.repo){
						let subName = "";
						if(context.formData.deployOptions.sourceCode.custom.subName){
							subName = context.formData.deployOptions.sourceCode.custom.subName;
						}
						context.formData.deployOptions.sourceCode.custom.repo = context.formData.deployOptions.sourceCode.custom.repo + "__SOAJS_DELIMITER__" + subName;
					}
				}
				
				context.buildComputedHostname();
				
			}
		};
		
		context.setSourceCodeData = function () {
			let recipes = context.recipes;
			let selectedRecipe;
			let customType;
			
			context.sourceCodeConfig = {
				configuration : {
					isEnabled : false,
					repoAndBranch : {
						disabled : false,
						required : false
					}
				},
				custom : {
					isEnabled : false,
					repoAndBranch : {
						disabled : false,
						required : false
					},
					repoPath: {
						disabled: false
					}
				}
			};
			
			if (context.formData.deployOptions && context.formData.deployOptions.recipe && recipes) {
				recipes.forEach(function (eachRecipe) {
					if (eachRecipe._id === context.formData.deployOptions.recipe) {
						selectedRecipe = eachRecipe;
					}
				});
			}
			
			if (selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.sourceCode) {
				let sourceCode = selectedRecipe.recipe.deployOptions.sourceCode;
				
				let conf = sourceCode.configuration;
				let cust = sourceCode.custom;
				
				context.selectedSourceCode = selectedRecipe.recipe.deployOptions.sourceCode;
				
				if(!context.formData.deployOptions.sourceCode){
					context.formData.deployOptions.sourceCode = {};
				}
				
				if (conf) {
					context.sourceCodeConfig.configuration.isEnabled = true;
					context.sourceCodeConfig.configuration.repoAndBranch.disabled = (conf.repo && conf.repo !== '');
					context.sourceCodeConfig.configuration.repoAndBranch.required = conf.required;
					
					if(conf.repo && conf.repo !== ''){
						if(!context.formData.deployOptions.sourceCode.configuration){
							context.formData.deployOptions.sourceCode.configuration = {};
						}
						
						context.formData.deployOptions.sourceCode.configuration.repo = conf.repo;
						context.formData.deployOptions.sourceCode.configuration.branch = conf.branch;
					} else {
						if(!context.formData.deployOptions.custom || !context.formData.deployOptions.custom.sourceCode ||
							!context.formData.deployOptions.custom.sourceCode.configuration  || !context.formData.deployOptions.custom.sourceCode.configuration.repo ){ // if not filled from cicd
							if(context.formData.deployOptions.sourceCode && context.formData.deployOptions.sourceCode.configuration){
								context.formData.deployOptions.sourceCode.configuration.repo = '-- Leave Empty --';
							}
						}
					}
				}
				
				if (cust && context.formData.type === 'server') {
					customType = cust.type;
					
					context.sourceCodeConfig.custom.isEnabled = true;
					context.sourceCodeConfig.custom.repoAndBranch.disabled = (cust.repo && cust.repo !== '');
					context.sourceCodeConfig.custom.repoAndBranch.required = cust.required;
					
					if (cust.repo && cust.repo !== '') {
						if (!context.formData.deployOptions.sourceCode.custom) {
							context.formData.deployOptions.sourceCode.custom = {};
						}
						
						context.formData.deployOptions.sourceCode.custom.repo = cust.repo + "__SOAJS_DELIMITER__" + (cust.subName ? cust.subName : "");
						context.formData.deployOptions.sourceCode.custom.branch = cust.branch;
					} else {
						if(!context.formData.deployOptions.custom || !context.formData.deployOptions.custom.sourceCode ||
							!context.formData.deployOptions.custom.sourceCode.custom  || !context.formData.deployOptions.custom.sourceCode.custom.repo ){ // if not filled from cicd
							if(context.formData.deployOptions.sourceCode && context.formData.deployOptions.sourceCode.custom){
								context.formData.deployOptions.sourceCode.custom.repo = '-- Leave Empty --' + '__SOAJS_DELIMITER__';
							}
						}
					}
				}
				
				if(conf || ((cust && context.formData.type === 'server'))){
					context.listAccounts(customType, cust, function () {
						// special case: if the form was overwritten from cicd we have to load the branch
						if(context.formData.deployOptions.sourceCode){
							if(context.formData.deployOptions.sourceCode.configuration && context.formData.deployOptions.sourceCode.configuration.repo){
								if(!context.configReposBranches[context.formData.deployOptions.sourceCode.configuration.repo]){
									context.fetchBranches('conf');
								}
							}
							if(context.formData.deployOptions.sourceCode.custom && context.formData.deployOptions.sourceCode.custom.repo){
								if(!context.configReposBranches[context.formData.deployOptions.sourceCode.custom.repo]){
									context.fetchBranches('cust');
								}
							}
						}
					});
				}
			}else{
				if(!context.formData.deployOptions){
					context.formData.deployOptions = {};
				}
				context.formData.deployOptions.sourceCode = {}; // clear
			}
		};
		
		context.getCatalogRecipes = function (cb) {
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/catalog/recipes/list'
			}, function (error, recipes) {
				overlayLoading.hide();
				if (error) {
					context.displayAlert('danger', error.message);
				}
				else {
					if (recipes && Array.isArray(recipes)) {
						recipes.forEach(function (oneRecipe) {
							
							if(oneRecipe.type ==='soajs' || oneRecipe.recipe.deployOptions.specifyGitConfiguration || oneRecipe.recipe.deployOptions.voluming.volumes){
								context.oldStyle = true;
							}
							else{
								if (oneRecipe.type === context.formData.type && oneRecipe.subtype === context.formData.category) {
									context.recipes.push(oneRecipe);
								}
							}
						});
						
						context.displayRecipeInputs();
					}
					
					if (cb) return cb();
				}
			});
		};
		
		context.upgradeRecipes = function(){
			currentScope.$parent.go("#/catalog-recipes");
			if($modalInstance){
				$modalInstance.close();
			}
		};
		
		context.displayRecipeInputs = function () {
			context.recipeUserInput.envs = {};
			if (context.formData.deployOptions && context.formData.deployOptions.recipe) {
				for (var i = 0; i < context.recipes.length; i++) {
					if (context.recipes[i].recipe && context.recipes[i]._id === context.formData.deployOptions.recipe) {
						if (context.recipes[i].recipe.buildOptions && context.recipes[i].recipe.buildOptions.env && Object.keys(context.recipes[i].recipe.buildOptions.env).length > 0) {
							for (var env in context.recipes[i].recipe.buildOptions.env) {
								if (context.recipes[i].recipe.buildOptions.env[env].type === 'userInput') {
									context.recipeUserInput.envs[env] = context.recipes[i].recipe.buildOptions.env[env];
									
									if (context.formData.deployOptions.custom && context.formData.deployOptions.custom.env && context.formData.deployOptions.custom.env[env]) {
										context.recipeUserInput.envs[env].default = context.formData.deployOptions.custom.env[env]; //if user input already set, set it's value as default
									}
								}
							}
						}
						
						if (context.recipes[i].recipe.deployOptions && context.recipes[i].recipe.deployOptions.image && context.recipes[i].recipe.deployOptions.image.override) {
							context.recipeUserInput.image = {
								override: true,
								prefix: context.recipes[i].recipe.deployOptions.image.prefix || '',
								name: context.recipes[i].recipe.deployOptions.image.name || '',
								tag: context.recipes[i].recipe.deployOptions.image.tag || ''
							};
							
							if (context.formData.deployOptions.custom && context.formData.deployOptions.custom.image && Object.keys(context.formData.deployOptions.custom.image).length > 0) {
								context.recipeUserInput.image = {
									override: true,
									prefix: context.formData.deployOptions.custom.image.prefix || '',
									name: context.formData.deployOptions.custom.image.name || '',
									tag: context.formData.deployOptions.custom.image.tag || ''
								};
							}
						}
					}
				}
			}
			
			context.setSourceCodeData();
		};
		
		context.updateDeploymentName = function () {
			if (context.formData.canBeDeployed) {
				if (!context.formData.deployOptions) {
					context.formData.deployOptions = {};
				}
				if (!context.formData.deployOptions.custom) {
					context.formData.deployOptions.custom = {}
				}
				
				context.formData.deployOptions.custom.name = context.formData.name;
				context.buildComputedHostname();
			}
		};
		
		context.buildComputedHostname = function () {
			if (context.formData && context.formData.deployOptions && context.formData.deployOptions.custom) {
				if (context.envPlatform === 'docker') {
					context.options.computedHostname = context.formData.deployOptions.custom.name;
				}
				else if (context.envPlatform === 'kubernetes') {
					context.options.computedHostname = context.formData.deployOptions.custom.name + '-service';
					
					var selected = context.envDeployer.selected.split('.');
					if (context.envDeployer && context.envDeployer[selected[0]] && context.envDeployer[selected[0]][selected[1]] && context.envDeployer[selected[0]][selected[1]][selected[2]]) {
						var platformConfig = context.envDeployer[selected[0]][selected[1]][selected[2]];
						
						if (platformConfig && platformConfig.namespace && platformConfig.namespace.default) {
							context.options.computedHostname += '.' + platformConfig.namespace.default;
							
							if (platformConfig.namespace.perService) {
								context.options.computedHostname += '-' + context.formData.deployOptions.custom.name;
							}
						}
					}
				}
			}
		};
		
		context.toggleShareWithAllEnvs = function () {
			if (context.envs.sharedWithAll) {
				context.envs.list.forEach(function (oneEnv) {
					oneEnv.selected = true;
				});
			}
			
			return;
		};
		
		context.fillForm();
		context.getCatalogRecipes();
		
		if(cb && typeof cb === 'function')
			return cb();
	}
	
	return {
		'buildDeployForm': buildDeployForm
	}
}]);