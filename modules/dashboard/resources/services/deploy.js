"use strict";
var resourceDeployService = soajsApp.components;
resourceDeployService.service('resourceDeploy', ['resourceConfiguration', '$modal', 'ngDataApi', function (resourceConfiguration, $modal, ngDataApi) {
	
	function decodeRepoNameAndSubName(name) {
		let splits = name.split('__SOAJS_DELIMITER__');
		
		let output = {
			name : splits[0]
		};
		
		if(splits.length > 0){
			let subName = splits[1];
			if(subName){
				output.subName = splits[1];
			}
		}
		
		return output;
	}
	
	function buildDeployForm(currentScope, context, $modalInstance, resource, action, settings, cb) {
		
		context.deploymentData = {};
		
		// todo: mocked data
		context.deploymentData.regions = [{v: 'us-east-1', 'l': 'US East (N. Virginia)'}, {
			v: 'us-east-2',
			'l': 'US East (Ohio)'
		}, {v: 'us-west-1', 'l': 'US West (N. California)'}, {
			v: 'us-west-2',
			'l': 'US West (Oregon)'
		}, {v: 'ca-central-1', 'l': 'Canada (Central)'}, {v: 'eu-west-1', 'l': 'EU (Ireland)'}, {
			v: 'eu-west-2',
			'l': 'EU (London)'
		}, {v: 'eu-central-1', 'l': 'EU (Frankfurt)'}, {
			v: 'ap-northeast-1',
			'l': 'Asia Pacific (Tokyo)'
		}, {v: 'ap-northeast-2', 'l': 'Asia Pacific (Seoul)'}, {
			v: 'ap-south-1',
			'l': 'Asia Pacific (Mumbai)'
		}, {v: 'ap-southeast-1', 'l': 'Asia Pacific (Singapore)'}, {
			v: 'ap-southeast-2',
			'l': 'Asia Pacific (Sydney)'
		}, {v: 'sa-east-1', 'l': 'South America (São Paulo)'}];
		
		context.deploymentData.vmSize = [
			{v : 'smallSize1', l:"Small Size 1"},
			{v : 'mediumSize2', l:"Medium Size 2"}
		];
		
		context.deploymentData.disk = [
			{v : 'none', l:"None"}
		];
		
		
		context.catalogConflictingPorts = '';
		context.formData = (cb && typeof cb === 'function') ? resource : {};
		context.envs = [];
		context.message = {};
		if(!context.noCDoverride){
			context.recipes = [];
		}
		context.recipeUserInput = {image: {}, envs: {}};
		
		context.configRepos = [];
		context.configReposBranches = {};
		context.configReposBranchesStatus = {};
		
		context.secretsAllowed = 'none';
		context.resourceDeployed = false;
		if (resource && resource.instance && resource.instance.id) {
			context.resourceDeployed = true;
		}
		context.access = currentScope.access;
		context.envPlatform = currentScope.envPlatform;
		context.envDeployer = currentScope.envDeployer;
		
		let category = (resource && Object.keys(resource).length > 0) ? resource.category : settings.category;
		resourcesAppConfig.form.addResource.data.categories.forEach((oneCategory) => {
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
		
		context.decodeRepoNameAndSubName = decodeRepoNameAndSubName;
		
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
			if (confOrCustom === 'conf') {
				context.configRepos.config.forEach(function (eachAcc) {
					if (eachAcc.name === selectedRepo) {
						accountData = eachAcc;
					}
				});
			}
			else {
				if (Object.keys(accountData).length === 0) {
					context.configRepos.customType.forEach(function (eachAcc) {
						if (eachAcc.name === selectedRepo) {
							accountData = eachAcc;
						}
					});
				}
			}
			if (accountData && Object.keys(accountData).length > 0) {
				context.configReposBranchesStatus[selectedRepo] = 'loading';
				getSendDataFromServer(context, ngDataApi, {
					'method': 'get',
					'routeName': '/dashboard/gitAccounts/getBranches',
					params: {
						id: accountData.accountId,
						name: selectedRepo,
						type: 'repo',
						provider: accountData.provider
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
							else {
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
			enableAutoScale: currentScope.enableAutoScale || false,
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
				params: {
					fullList: true
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
									
									if (['custom', 'service', 'daemon', 'static'].indexOf(eachRepo.type) !== -1) {
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
									else if (eachRepo.type === 'multi') {
										eachRepo.configSHA.forEach((subRepo) => {
											
											//if not locked or locked from catalog and the value is multi
											if (!customType || customType === 'multi') {
												if ((!customRepoInfo || !customRepoInfo.subName) || (customRepoInfo && customRepoInfo.subName === subRepo.contentName)) {
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
											if (!customType || customType !== 'multi') {
												
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
				updateCustomRepoName();
				
				context.buildComputedHostname();
				
			}
		};
		
		function updateCustomRepoName(){
			if (context.formData.deployOptions && context.formData.deployOptions.custom && context.formData.deployOptions.custom.sourceCode) {
				context.formData.deployOptions.sourceCode = context.formData.deployOptions.custom.sourceCode;
				
				// reconstruct complex repo on load
				if (context.formData.deployOptions.sourceCode.custom && context.formData.deployOptions.sourceCode.custom.repo) {
					let subName = "";
					if (context.formData.deployOptions.sourceCode.custom.subName) {
						subName = context.formData.deployOptions.sourceCode.custom.subName;
					}
					context.formData.deployOptions.sourceCode.custom.repo = context.formData.deployOptions.sourceCode.custom.repo + "__SOAJS_DELIMITER__" + subName;
				}
			}
		}
		
		context.setSourceCodeData = function (selectedRecipe) {
			let customType;
			
			context.sourceCodeConfig = {
				configuration: {
					isEnabled: false,
					repoAndBranch: {
						disabled: false,
						required: false
					}
				},
				custom: {
					isEnabled: false,
					repoAndBranch: {
						disabled: false,
						required: false
					},
					repoPath: {
						disabled: false
					}
				}
			};
			
			if (selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.sourceCode) {
				let sourceCode = selectedRecipe.recipe.deployOptions.sourceCode;
				
				let conf = sourceCode.configuration;
				let cust = sourceCode.custom;
				
				context.selectedSourceCode = selectedRecipe.recipe.deployOptions.sourceCode;
				
				if (!context.formData.deployOptions.sourceCode) {
					context.formData.deployOptions.sourceCode = {};
				}
				
				if (conf) {
					context.sourceCodeConfig.configuration.isEnabled = true;
					context.sourceCodeConfig.configuration.repoAndBranch.disabled = (conf.repo && conf.repo !== '');
					context.sourceCodeConfig.configuration.repoAndBranch.required = conf.required;
					
					if (conf.repo && conf.repo !== '') {
						if (!context.formData.deployOptions.sourceCode.configuration) {
							context.formData.deployOptions.sourceCode.configuration = {};
						}
						
						context.formData.deployOptions.sourceCode.configuration.repo = conf.repo;
						context.formData.deployOptions.sourceCode.configuration.branch = conf.branch;
					} else {
						if (!context.formData.deployOptions.custom || !context.formData.deployOptions.custom.sourceCode || !context.formData.deployOptions.custom.sourceCode.configuration || !context.formData.deployOptions.custom.sourceCode.configuration.repo) { // if not filled from cicd
							if (context.formData.deployOptions.sourceCode && context.formData.deployOptions.sourceCode.configuration) {
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
						if (!context.formData.deployOptions.custom || !context.formData.deployOptions.custom.sourceCode || !context.formData.deployOptions.custom.sourceCode.custom || !context.formData.deployOptions.custom.sourceCode.custom.repo) { // if not filled from cicd
							if (context.formData.deployOptions.sourceCode && context.formData.deployOptions.sourceCode.custom) {
								context.formData.deployOptions.sourceCode.custom.repo = '-- Leave Empty --' + '__SOAJS_DELIMITER__';
							}
						}
					}
				}
				
				if (conf || ((cust && context.formData.type === 'server'))) {
					context.listAccounts(customType, cust, function () {
						// special case: if the form was overwritten from cicd we have to load the branch
						if (context.formData.deployOptions.sourceCode) {
							if (context.formData.deployOptions.sourceCode.configuration && context.formData.deployOptions.sourceCode.configuration.repo) {
								if (!context.configReposBranches[context.formData.deployOptions.sourceCode.configuration.repo]) {
									context.fetchBranches('conf');
								}
							}
							if (context.formData.deployOptions.sourceCode.custom && context.formData.deployOptions.sourceCode.custom.repo) {
								if (!context.configReposBranches[context.formData.deployOptions.sourceCode.custom.repo]) {
									context.fetchBranches('cust');
								}
							}
						}
					});
				}
			} else {
				if (!context.formData.deployOptions) {
					context.formData.deployOptions = {};
				}
				context.formData.deployOptions.sourceCode = {}; // clear
			}
		};
		
		context.getSecrets = function(cb){
			overlayLoading.show();
			if(context.kubeEnv && context.kubeEnv === 'invalid'){
				if(context.defaultWizardSecretValues){
					context.secrets = context.defaultWizardSecretValues;
				}
				return cb();
			}
			
			if(!currentScope.envPlatform){
				return cb();
			}
			
			let params = {
				env: (context.kubeEnv)? context.kubeEnv.toUpperCase() : currentScope.envCode.toUpperCase()
			};
			
			if(currentScope.envPlatform === 'kubernetes' && context.kubeNamespace){
				params.namespace = context.kubeNamespace;
			}
			
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/secrets/list',
				params: params
			}, function (error, secrets) {
				if (error) {
					context.displayAlert('danger', error.message);
				}
				context.secrets = context.defaultWizardSecretValues || [];
				if (secrets && Array.isArray(secrets) && secrets.length > 0) {
					secrets.forEach((oneSecret) => {
						let found = false;
						context.secrets.forEach((oneExistingSecret) => {
							if(oneExistingSecret.name === oneSecret.name){
								found = true;
							}
						});
						
						if(!found){
							context.secrets.push(oneSecret);
						}
					});
				}
				if (cb) return cb();
			});
		};
		
		context.getCatalogRecipes = function (cb) {
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/catalog/recipes/list'
			}, function (error, recipes) {
				overlayLoading.hide();
				if (error) {
					context.displayAlert('danger', error.message);
				}
				else {
					
					context.recipes = [
						{
							"_id": "5ae07aa09fdc3e40b2ea61a1",
							"name": "Recipe 1",
							"type": "service",
							"subtype": "soajs",
							"description": "This recipe allows you to deploy a services built using the SOAJS framework",
							"locked": true,
							"restriction": {
								"deployment": ["vm", "container"],
								"driver": ["container.docker"],
								"infra": ["azure"]
							}
						},
						{
							"_id": "5ae07aa09fdc3e40b2ea61a2",
							"name": "Recipe 2",
							"type": "service",
							"subtype": "soajs",
							"description": "This recipe allows you to deploy the SOAJS API Gateway",
							"locked": true,
							"restriction": {
								"deployment": ["vm"],
								"driver": [],
								"infra": ["azure","aws"]
							}
						},
						{
							"_id": "5ae07aa09fdc3e40b2ea61a3",
							"name": "Recipe 3",
							"type": "service",
							"subtype": "soajs",
							"description": "This recipe allows you to deploy the SOAJS API Gateway",
							"locked": true,
							"restriction": {
								"deployment": ["container"],
								"driver": ["container.docker","container.kubernetes"],
								"infra": []
							}
						},
						{
							"_id": "5ae07aa09fdc3e40b2ea61a4",
							"name": "Recipe 4",
							"type": "service",
							"subtype": "soajs",
							"description": "This recipe allows you to deploy the SOAJS API Gateway",
							"locked": true,
							"restriction": {
								"deployment": [],
								"driver": [],
								"infra": []
							}
						},
						{
							"_id": "5ae07aa09fdc3e40b2ea61a5",
							"name": "Recipe 5",
							"type": "service",
							"subtype": "soajs",
							"description": "This recipe allows you to deploy the SOAJS API Gateway",
							"locked": true,
							"restriction": {}
						},
						{
							"_id": "5ae07aa09fdc3e40b2ea61a6",
							"name": "Recipe 6",
							"type": "service",
							"subtype": "soajs",
							"description": "This recipe allows you to deploy the SOAJS API Gateway",
							"locked": true
						}
					];
					
					// todo:
					// if manual deployment
					// loop and check if no restriction or vm included => show recipe
					//                if not hide recipe
					
					// todo: restore code
					// if (recipes && Array.isArray(recipes)) {
					// 	recipes.forEach(function (oneRecipe) {
					//
					// 		if (oneRecipe.type === 'soajs' || oneRecipe.recipe.deployOptions.specifyGitConfiguration || oneRecipe.recipe.deployOptions.voluming.volumes) {
					// 			context.oldStyle = true;
					// 		}
					// 		else {
					// 			if (oneRecipe.type === context.formData.type && oneRecipe.subtype === context.formData.category) {
					// 				context.recipes.push(oneRecipe);
					// 			}
					// 		}
					// 	});
					//
					// 	context.displayRecipeInputs(function(err){
					// 		if (err){
					// 			context.displayAlert('danger', err.message);
					// 		}
					// 	});
					// }
					
					if (cb) return cb();
				}
			});
		};
		
		context.upgradeRecipes = function () {
			currentScope.$parent.go("#/catalog-recipes");
			if ($modalInstance) {
				$modalInstance.close();
			}
		};
		
		context.displayRecipeInputs = function (cb) {
			
			function calculateRestrictions(currentScope) {
				
				let allRecipes = currentScope.recipes;
				let selectedRecipeId = currentScope.formData.deployOptions.recipe;
				let selectedRecipe;
				allRecipes.forEach(function (eachRecipe) {
					if (eachRecipe._id === selectedRecipeId) {
						selectedRecipe = eachRecipe;
					}
				});
				
				// refresh before starting
				currentScope.formData.deployOptions.deploymentTechnology = '';
				currentScope.formData.deployOptions.deploymentTechnologyInfra = '';
				
				let allDeployments = ["container", "vm"]; // enable all if no rest or empty rest & ! manual
				let allInfra = ["azure", "aws", "google"];
				if (!selectedRecipe) {
					currentScope.deploymentData.selectedRestrictionsDep = [];
				} else {
					let restriction = selectedRecipe.restriction;
					if (!restriction || Object.keys(restriction).length === 0) {
						currentScope.deploymentData.selectedRestrictionsDep = allDeployments;
						currentScope.deploymentData.selectedRestrictionsInfra = allInfra;
					} else {
						currentScope.deploymentData.selectedRestrictionsDep = restriction.deployment;
						currentScope.deploymentData.selectedRestrictionsInfra = restriction.infra;
					}
				}
				
				if (currentScope.deploymentData.selectedRestrictionsDep.length === 1) { // force select deployment technology iff one is available
					currentScope.formData.deployOptions.deploymentTechnology = currentScope.deploymentData.selectedRestrictionsDep[0];
				}
			}
			
			let recipes = context.recipes;
			let selectedRecipe = context.recipes;
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
						
						//add check, if recipe does not support certificates, do not show the secrets input at all
						context.secretsAllowed = 'none';
						if(context.recipes[i].recipe.deployOptions.certificates && context.recipes[i].recipe.deployOptions.certificates !== 'none'){
							context.secretsAllowed = context.recipes[i].recipe.deployOptions.certificates;
						}
					}
				}
			}
			if (context.formData.deployOptions && context.formData.deployOptions.recipe && recipes) {
				recipes.forEach(function (eachRecipe) {
					if (eachRecipe._id === context.formData.deployOptions.recipe) {
						selectedRecipe = eachRecipe;
					}
				});
			}
			
			calculateRestrictions(context);
			context.setSourceCodeData(selectedRecipe);
			context.setExposedPorts(selectedRecipe, cb);
		};
		
		context.updateDeploymentName = function (resourceName) {
			resourceName = (resourceName) ? resourceName.toLowerCase() : '';
			context.formData.name = resourceName;
			
			if (context.formData.canBeDeployed) {
				if (!context.formData.deployOptions) {
					context.formData.deployOptions = {};
				}
				if (!context.formData.deployOptions.custom) {
					context.formData.deployOptions.custom = {}
				}
				context.formData.deployOptions.custom.name = resourceName;
			}
			
			context.buildComputedHostname(resourceName);
		};
		
		context.buildComputedHostname = function (resourceName) {
			
			context.options.computedHostname = resourceName;
			
			if (context.formData && context.formData.deployOptions && context.formData.deployOptions.custom) {
				if (resourceName && resourceName !== '' && context.envPlatform === 'kubernetes') {
					context.options.computedHostname = resourceName + '-service';
					
					var selected = context.envDeployer.selected.split('.');
					if (context.envDeployer && context.envDeployer[selected[0]] && context.envDeployer[selected[0]][selected[1]] && context.envDeployer[selected[0]][selected[1]][selected[2]]) {
						var platformConfig = context.envDeployer[selected[0]][selected[1]][selected[2]];
						
						if (platformConfig && platformConfig.namespace && platformConfig.namespace.default) {
							context.options.computedHostname += '.' + platformConfig.namespace.default;
							
							if (platformConfig.namespace.perService) {
								context.options.computedHostname += '-' + resourceName;
							}
						}
					}
				}
			}
			
			
			if(context.form && context.form.entries && Array.isArray(context.form.entries) && context.form.entries.length > 0){
				for(let $index = context.form.entries.length -1; $index >=0; $index--){
					let oneEntry = context.form.entries[$index];
					if(oneEntry.name && oneEntry.name === 'servers0'){
						oneEntry.entries.forEach((oneSubEntry) => {
							oneSubEntry.disabled = false;
							delete oneSubEntry.disabled;
							context.form.formData[oneSubEntry.name] = '';
							
							if (context.formData.canBeDeployed && resourceName && resourceName !== '' && oneSubEntry.name.includes("host")) {
								oneSubEntry.disabled = true;
								context.form.formData[oneSubEntry.name] = context.options.computedHostname;
							}
							if(oneSubEntry.name.includes("port")){
								oneSubEntry.value = oneSubEntry.value.toString();
								context.form.formData[oneSubEntry.name] = oneSubEntry.value;
							}
							if(oneSubEntry.name.includes("removeserver")){
								oneSubEntry.value = '<span class=\'icon icon-cross red\'></span>';
								if(context.formData.canBeDeployed && resourceName && resourceName !== ''){
									oneSubEntry.value = '';
								}
							}
						});
					}
					
					if(context.formData.canBeDeployed && oneEntry.name && oneEntry.name.includes("servers") && oneEntry.name !== 'anotherservers' && oneEntry.name !== 'servers0'){
						context.form.entries.splice($index, 1);
					}
					
					if(oneEntry.name && oneEntry.name === 'anotherservers'){
						if(context.formData.canBeDeployed){
							jQuery('#anotherservers').hide();
						}
						else{
							jQuery('#anotherservers').show();
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
		};
		
		context.reformatSourceCodeForCicd = function(record) {
			if(record.configuration && record.configuration.repo){
				let selectedRepo = record.configuration.repo;
				if(selectedRepo === '-- Leave Empty --'){
					record.configuration.repo = "";
					record.configuration.branch = "";
				}else{
					context.configRepos.config.forEach(function (eachConf) {
						if(eachConf.name === selectedRepo){
							record.configuration.commit = eachConf.configSHA;
							record.configuration.owner = eachConf.owner;
						}
					});
				}
			}
			
			if(record.custom && record.custom.repo){
				let selectedRepoComposed = record.custom.repo;
				let decoded = decodeRepoNameAndSubName(selectedRepoComposed);
				
				let selectedRepo = decoded.name;
				let subName = decoded.subName;
				
				record.custom.repo = selectedRepo; // save clear value
				
				if(selectedRepo === '-- Leave Empty --'){
					record.custom.repo = "";
					record.custom.branch = "";
				}else {
					context.configRepos.customType.forEach(function (eachConf) {
						if (eachConf.name === selectedRepo) {
							record.custom.owner = eachConf.owner;
							record.custom.subName = subName; // for multi
							
							if (eachConf.configSHA && typeof eachConf.configSHA === 'object') { // for multi
								eachConf.configSHA.forEach(function (eachConfig) {
									if (eachConfig.contentName === subName) {
										record.custom.commit = eachConfig.sha;
									}
								});
							} else {
								record.custom.commit = eachConf.configSHA;
							}
						}
					});
				}
			}

			return record;
		};

		context.setExposedPorts = function (selectedRecipe) {
			let ports;
			if (context.formData.deployOptions && context.formData.deployOptions.custom && context.formData.deployOptions.custom.ports){
				ports = context.formData.deployOptions.custom.ports;
			}
			let recipe = false;

			if(!ports && context.noCDoverride){
				if(resource.deploy && resource.deploy.options && resource.deploy.options.custom && resource.deploy.options.custom.ports){
					if(Array.isArray(resource.deploy.options.custom.ports) && resource.deploy.options.custom.ports.length > 0){
						ports = resource.deploy.options.custom.ports;
					}
				}
			}
			context.catalogConflictingPorts = '';
			if(selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.ports
				&& Array.isArray(selectedRecipe.recipe.deployOptions.ports)
				&& selectedRecipe.recipe.deployOptions.ports.length > 0 ) {
				//use ports from recipe if no ports were coming from previuos save
				if (!ports){
					recipe = true;
					ports = selectedRecipe.recipe.deployOptions.ports;
				}
				if (!context.formData.deployOptions.custom){
					context.formData.deployOptions.custom = {};
				}
				if (recipe){
					context.formData.deployOptions.custom.ports = [];
				}
				//check if there port mismatch in type
				let nodePort =0, loadBalancer=0;
				selectedRecipe.recipe.deployOptions.ports.forEach(function (onePort) {
					if (recipe){
						context.formData.deployOptions.custom.ports.push(onePort);
					}
					if(onePort.isPublished || onePort.published){
						context.formData.deployOptions.custom.loadBalancer = true;
						if (onePort.published){
							if (recipe){
								context.formData.deployOptions.custom.loadBalancer = false;
							}
							nodePort++;
						}
						else {
							loadBalancer++;
						}
					}
				});
				if (loadBalancer !== 0 && nodePort !==0){
					if($modalInstance){
						$modalInstance.close();
						$modal.open({
							templateUrl: "portConfiguration.tmpl",
							size: 'm',
							backdrop: true,
							keyboard: true,
							controller: function ($scope, $modalInstance) {
								fixBackDrop();
								$scope.currentScope = currentScope;
								$scope.title = 'Port Configuration';
								$scope.message = 'Unable to proceed, Detected port conflict in Catalog recipe: ' + selectedRecipe.name;
								$scope.closeModal = function () {
									$modalInstance.close();
								};
							}
						});
					}
					else{
						context.catalogConflictingPorts = selectedRecipe.name;
					}
				}
			}
			if (ports && !recipe){
				//get the type of the ports
				context.formData.deployOptions.custom.ports = [];
				ports.forEach(function (onePort) {
					context.formData.deployOptions.custom.ports.push(onePort);
					if(onePort.isPublished || onePort.published){
						context.formData.deployOptions.custom.loadBalancer = true;
						if (onePort.published){
							context.formData.deployOptions.custom.loadBalancer = false;
						}
					}
				});
			}
		};
		
		context.useLoadBalancer = function (){
			context.formData.deployOptions.custom.ports.forEach(function (onePort) {
				delete onePort.published
			});
		};
		
		context.fillForm();
		
		if(!context.noCDoverride){
			context.getSecrets(function(cb){
				context.getCatalogRecipes(cb);
			});
			if(context.formData && context.formData.canBeDeployed && resource && resource.name){
				setTimeout(() => {
					context.updateDeploymentName(resource.name);
				}, 200);
			}
		}
		else{
			//this is called by add env wizard.
			updateCustomRepoName();
			context.getSecrets(function (cb) {
				context.displayRecipeInputs(cb);
			});
		}
		
		if (cb && typeof cb === 'function')
			return cb();
	}
	
	return {
		'buildDeployForm': buildDeployForm
	}
}]);