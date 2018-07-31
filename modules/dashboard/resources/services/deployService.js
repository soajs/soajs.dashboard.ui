"use strict";
var resourceDeployService = soajsApp.components;
resourceDeployService.service('resourceDeploy', ['resourceConfiguration', '$modal', 'ngDataApi', '$cookies', '$localStorage', '$timeout', '$location', 'commonService', function (resourceConfiguration, $modal, ngDataApi, $cookies, $localStorage, $timeout, $location, commonService) {

	function confirmMainData(context, currentScope) {
		if(!context.mainData){
			context.mainData = {};
		}
		if(!context.mainData.deploymentData){
			context.mainData.deploymentData = {};
		}
		if(!context.mainData.catalogConflictingPorts){
			context.mainData.catalogConflictingPorts = '';
		}
		if(!context.mainData.envs){
			context.mainData.envs = [];
		}
		if(!context.mainData.message){
			context.mainData.message = {};
		}
		if(!context.mainData.recipeUserInput){
			context.mainData.recipeUserInput = {image: {}, envs: {}};
		}
		if(!context.mainData.configRepos){
			context.mainData.configRepos = [];
		}
		if(!context.mainData.configReposBranches){
			context.mainData.configReposBranches = {};
		}
		if(!context.mainData.configReposBranchesStatus){
			context.mainData.configReposBranchesStatus = {};
		}
		if(!context.mainData.secretsAllowed){
			context.mainData.secretsAllowed = 'none';
		}
		if(!context.mainData.resourceDeployed){
			context.mainData.resourceDeployed = false;
		}
		if(!context.mainData.envPlatform){
			context.mainData.envPlatform = currentScope.envPlatform;
		}
		if(!context.mainData.envDeployer){
			context.mainData.envDeployer = currentScope.envDeployer;
		}
		if(!context.mainData.recipes){
			context.mainData.recipes = [];
		}
	}

	/**
	 * update deployConfig.infra account using provider
	 */
	function updateFormDataBeforeSave(context, deployOptions) {
		let deployConfig;
		if(deployOptions){
			deployConfig = deployOptions.deployConfig;
		}

		// clean
		if (deployConfig && deployConfig.type === "vm") {
			if (deployConfig.memoryLimit) {
				delete deployConfig.memoryLimit
			}

			if (deployConfig.replication) {
				delete deployConfig.replication
			}

			if (deployConfig.replication) {
				delete deployConfig.replication
			}

			if (deployOptions.custom && deployOptions.custom.secrets) {
				delete deployOptions.custom.secrets
			}

			if (deployOptions.custom && deployOptions.custom.sourceCode) {
				delete deployOptions.custom.sourceCode
			}

			if (deployOptions.custom && (deployOptions.custom.loadBalancer || deployOptions.custom.loadBalancer === false)) {
				delete deployOptions.custom.loadBalancer
			}

			if (deployConfig.vmConfiguration && deployConfig.vmConfiguration.adminAccess && deployConfig.vmConfiguration.adminAccess.isPassword) {
				if (!context.isPasswordValid) {
					return false;
				}
			}
		}

		if (deployConfig && deployConfig.type === "container") {
			if (deployConfig.infra || deployConfig.infra === '') {
				delete deployConfig.infra
			}
			if (deployConfig.region || deployConfig.region === '') {
				delete deployConfig.region
			}
			if (deployConfig.vmConfiguration) {
				delete deployConfig.vmConfiguration
			}
		}

		return true;
	}

	// function fetchDefaultImagesOnOverride(context) {
	// 	let selectedRecipe = context.mainData.deploymentData.selectedRecipe;
	// 	let formData = context.formData;
	// 	if (!formData.custom) {
     //        formData.custom = {}
	// 	}
	// 	if (!formData.custom.image) {
     //        formData.custom.image = {}
	// 	}
	// 	if (selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.image.override) {
	// 		context.getProvidersList(() => {
     //            formData.custom.image.prefix = '';
     //            context.mainData.deploymentData.providers.forEach((provider) => {
	// 				if (provider.v === selectedRecipe.recipe.deployOptions.image.prefix) {
     //                    formData.custom.image.prefix = selectedRecipe.recipe.deployOptions.image.prefix;
	// 				}
	// 			});
	// 			context.getImagesList(selectedRecipe.recipe.deployOptions.image.prefix, () => {
     //                context.mainData.deploymentData.images.forEach((image) => {
	// 					if (image.v === selectedRecipe.recipe.deployOptions.image.name) {
     //                        formData.custom.image.name = image.v
	// 					}
	// 				});
	// 				if (context.mainData.deploymentData.images.length === 0) {
     //                    context.mainData.deploymentData.imageVersions = [];
	// 				} else {
	// 					context.getVersionsList(selectedRecipe.recipe.deployOptions.image.name, () => {
     //                        context.mainData.deploymentData.imageVersions.forEach((version) => {
	// 							if (version.v === selectedRecipe.recipe.deployOptions.image.tag) {
     //                                formData.custom.image.tag = version.v
	// 							}
	// 						});
	// 					});
	// 				}
	// 			})
	// 		});
	// 	} else {
     //        formData.custom.image.prefix = '';
     //        formData.custom.image.name = '';
     //        formData.custom.image.tag = '';
	// 	}
	// }

	function refreshDeployConfig(context) {

		let deployConfig = context.formData.deployOptions.deployConfig;
		if (!deployConfig) {
			context.formData.deployOptions.deployConfig = {};
			deployConfig = context.formData.deployOptions.deployConfig;
		}

		if (deployConfig.infra) {
			deployConfig.infra = '';
		}
		if (deployConfig.vmConfiguration) {
			deployConfig.vmConfiguration.flavor = '';
			deployConfig.vmConfiguration.dataDisk = '';

			if (deployConfig.vmConfiguration.adminAccess) {
				deployConfig.vmConfiguration.adminAccess.username = '';
				deployConfig.vmConfiguration.adminAccess.password = '';
				deployConfig.vmConfiguration.adminAccess.token = '';
			}
		}

		deployConfig.region = '';

		if (deployConfig && deployConfig.type === 'container') {
			if (deployConfig.memoryLimit) {
				deployConfig.memoryLimit = ''
			}

			if (deployConfig.replication) {
				deployConfig.replication = {}
			}
		}
	}

	function decodeRepoNameAndSubName(name) {
		let splits = name.split('__SOAJS_DELIMITER__');

		let output = {
			name: splits[0]
		};

		if (splits.length > 0) {
			let subName = splits[1];
			if (subName) {
				output.subName = splits[1];
			}
		}

		return output;
	}

	function buildDeployForm(currentScope, context, $modalInstance, resource, action, settings, cb) {

		context.gotorecipes = function(){
			if($modalInstance){
				$modalInstance.close();
			}
			$location.path("/catalog-recipes");
		};

		// adding the api call to commonService
		context.fetchBranches = function (confOrCustom) {

			let selectedRepo, subNameInCaseMulti;
			if (confOrCustom === 'conf') {
				selectedRepo = context.formData.deployOptions.sourceCode.configuration.repo;
			} else {
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
				context.mainData.configRepos.config.forEach(function (eachAcc) {
					if (eachAcc.name === selectedRepo) {
						accountData = eachAcc;
					}
				});
			}
			else {
				if (Object.keys(accountData).length === 0) {
					context.mainData.configRepos.customType.forEach(function (eachAcc) {
						if (eachAcc.name === selectedRepo) {
							accountData = eachAcc;
						}
					});
				}
			}
			if (accountData && Object.keys(accountData).length > 0) {
				context.mainData.configReposBranchesStatus[selectedRepo] = 'loading';

				let apiParams = {
					accountId:accountData.accountId,
                    name: selectedRepo,
					type:'repo',
					provider: accountData.provider
				};

                commonService.fetchBranches(context, apiParams, function (response) {
                    context.mainData.configReposBranchesStatus[selectedRepo] = 'loaded';
                    context.mainData.configReposBranches[selectedRepo] = response.branches;

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
				});
			}
		};

		context.displayAlert = function (type, message) {
			context.mainData.message[type] = message;
			setTimeout(function () {
				context.mainData.message = {};
			}, 5000);
		};

		// adding the api call to commonService
		context.listAccounts = function (customType, customRepoInfo, callback) {
			let apiParams = {
                fullList : true
			};
            commonService.listAccounts(currentScope, apiParams, function (response) {
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

                context.mainData.configRepos.customType = customRecords;
                context.mainData.configRepos.config = configRecords;

                callback();
            });
		};

		//adding the api call to commonService
		context.getEnvs = function () {
			if (context.mainData.envs && context.mainData.envs.list && context.mainData.envs.list.length > 0) {
				return;
			}
			let apiParams = {};
            commonService.getEnvs(currentScope, apiParams, function (envs) {
                context.mainData.envs.list = [];
                envs.forEach(function (oneEnv) {
                    //in case of update resource, check resource record to know what env it belongs to
                    if (resource && resource.created) {
                        if (resource.created.toUpperCase() === oneEnv.code.toUpperCase()) return;
                    }
                    //in case of add resource, check current environment
                    else if (currentScope.context.envCode.toUpperCase() === oneEnv.code.toUpperCase()) {
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
                            context.mainData.envs.sharedWithAll = true;
                        }
                    }
                    context.mainData.envs.list.push(envEntry);
                });
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

		function updateCustomRepoName() {
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

		// changes to deployoptions
		context.setSourceCodeData = function (selectedRecipe) {
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

			let customType;
			let configuration = context.sourceCodeConfig.configuration;
			let custom = context.sourceCodeConfig.custom;
			let deployOptions = context.formData.deployOptions;

			if (selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.sourceCode) {
				let sourceCode = selectedRecipe.recipe.deployOptions.sourceCode;

				let conf = sourceCode.configuration;
				let cust = sourceCode.custom;

				context.selectedSourceCode = selectedRecipe.recipe.deployOptions.sourceCode;

				if (!deployOptions.sourceCode) {
                    deployOptions.sourceCode = {};
				}

				if (conf) {
                    configuration.isEnabled = true;
                    configuration.repoAndBranch.disabled = (conf.repo && conf.repo !== '');
                    configuration.repoAndBranch.required = conf.required;

					if (conf.repo && conf.repo !== '') {
						if (!vv.sourceCode.configuration) {
                            deployOptions.sourceCode.configuration = {};
						}

                        deployOptions.sourceCode.configuration.repo = conf.repo;
                        deployOptions.sourceCode.configuration.branch = conf.branch;
					} else {
						if (!deployOptions.custom || !deployOptions.custom.sourceCode || !deployOptions.custom.sourceCode.configuration || !deployOptions.custom.sourceCode.configuration.repo) { // if not filled from cicd
							if (deployOptions.sourceCode && deployOptions.sourceCode.configuration) {
                                deployOptions.sourceCode.configuration.repo = '-- Leave Empty --';
							}
						}
					}
				}

				if (cust && context.formData.type === 'server') {
					customType = cust.type;

                    custom.isEnabled = true;
                    custom.repoAndBranch.disabled = (cust.repo && cust.repo !== '');
                    custom.repoAndBranch.required = cust.required;

					if (cust.repo && cust.repo !== '') {
						if (!deployOptions.sourceCode.custom) {
                            deployOptions.sourceCode.custom = {};
						}

                        deployOptions.sourceCode.custom.repo = cust.repo + "__SOAJS_DELIMITER__" + (cust.subName ? cust.subName : "");
                        deployOptions.sourceCode.custom.branch = cust.branch;
					} else {
						if (!deployOptions.custom || !deployOptions.custom.sourceCode || !deployOptions.custom.sourceCode.custom || !deployOptions.custom.sourceCode.custom.repo) { // if not filled from cicd
							if (deployOptions.sourceCode && deployOptions.sourceCode.custom) {
                                deployOptions.sourceCode.custom.repo = '-- Leave Empty --' + '__SOAJS_DELIMITER__';
							}
						}
					}
				}

				if (conf || ((cust && context.formData.type === 'server'))) {
					context.listAccounts(customType, cust, function () {
						// special case: if the form was overwritten from cicd we have to load the branch
						if (deployOptions.sourceCode) {
							if (deployOptions.sourceCode.configuration && deployOptions.sourceCode.configuration.repo) {
								if (!context.mainData.configReposBranches[deployOptions.sourceCode.configuration.repo]) {
									context.fetchBranches('conf');
								}
							}
							if (deployOptions.sourceCode.custom && deployOptions.sourceCode.custom.repo) {
								if (!context.mainData.configReposBranches[deployOptions.sourceCode.custom.repo]) {
									context.fetchBranches('cust');
								}
							}
						}
					});
				}
			} else {
				if (!deployOptions) {
                    context.formData.deployOptions = {};
                    deployOptions = context.formData.deployOptions;
				}
                deployOptions.sourceCode = {}; // clear
			}
		};

		//adding the api call to commonService
		context.getSecrets = function (cb) {
            if (context.kubeEnv && context.kubeEnv === 'invalid') {
                if (context.defaultWizardSecretValues) {
                    context.secrets = context.defaultWizardSecretValues;
                }
                return cb();
            }

            if (!context.options.envPlatform) {
                return cb();
            }

            let apiParams = {
                env: (context.kubeEnv) ? context.kubeEnv.toUpperCase() : currentScope.context.envCode.toUpperCase()
            };

            if (currentScope.envPlatform === 'kubernetes' && context.kubeNamespace) {
                apiParams.namespace = context.kubeNamespace;
            }

            commonService.getSecrets(currentScope, apiParams, function (secrets) {
                context.secrets = context.defaultWizardSecretValues || [];
                if (secrets && Array.isArray(secrets) && secrets.length > 0) {
                    secrets.forEach((oneSecret) => {
                        let found = false;
                        context.secrets.forEach((oneExistingSecret) => {
                            if (oneExistingSecret.name === oneSecret.name) {
                                found = true;
                            }
                        });

                        if (!found) {
                            context.secrets.push(oneSecret);
                        }
                    });
                }
                if (cb) return cb();
            });
        };

        //adding the api call to commonService
		context.getCatalogRecipes = function (cb) {

			// this function is the on-action when selecting a vm layer
			// get the public ips from the layer and update the resource configuration
			if(context.formData.deployOptions && context.formData.deployOptions.deployConfig && context.formData.deployOptions.deployConfig.type === 'vm') {
				context.buildComputedHostname();
			}

			context.mainData.recipes = [];

			//wizard mode only
			let alreadySelectedRecipe;
			if(context.formData && context.formData.deployOptions && context.formData.deployOptions.recipe && currentScope.environmentWizard){
				alreadySelectedRecipe = context.formData.deployOptions.recipe;
			}

			let apiParams = {};
			commonService.getCatalogRecipes(currentScope, apiParams, function (recipes)  {
				if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
                    context.myEnv = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
                }

                let deploymentType = context.options.envType;
				let selectedInfraProvider;
				try{
					if ((deploymentType === 'manual') || (context.displayPlatformPicker && context.formData.deployOptions.deployConfig.type === 'vm')){
						selectedInfraProvider = context.mainData.deploymentData.vmLayers[context.formData.deployOptions.deployConfig.vmConfiguration.vmLayer].infraProvider.name;
					}
					else{
						let envCode = (context.myEnv) ? context.myEnv : context.context.envCode;
						if(context.originalInfraProviders && envCode){
							context.originalInfraProviders.forEach((oneProvider) => {
								oneProvider.deployments.forEach((oneDeployment) => {
									if(oneDeployment.environments.indexOf(context.myEnv.toUpperCase()) !== -1){
										selectedInfraProvider = oneProvider.name;
									}
								});
							});
						}
					}
				}
				catch(e){
					// console.log(e);
				}

                if (recipes && Array.isArray(recipes)) {
	                recipes.forEach(function (oneRecipe) {
	                    if (oneRecipe.type === context.formData.type && oneRecipe.subtype === context.formData.category) {
		                    if (deploymentType === 'manual') {
			                    if(calculateRestriction(oneRecipe, 'vm', selectedInfraProvider)){
				                    context.mainData.recipes.push(oneRecipe);
			                    }
		                    }
		                    else {
		                    	if(context.formData.deployOptions){
			                         // check the platform deployment selected mode
				                    if (context.displayPlatformPicker) {
					                    let selectedDeploymentPlatform = context.formData.deployOptions.deployConfig.type;
					                    if(calculateRestriction(oneRecipe, selectedDeploymentPlatform, selectedInfraProvider)){
						                    context.mainData.recipes.push(oneRecipe);
					                    }
				                    }
				                    //match the deployment type
				                    else {
					                    if(calculateRestriction(oneRecipe, deploymentType, selectedInfraProvider)){
						                    context.mainData.recipes.push(oneRecipe);
					                    }
				                    }
			                    }
			                    else{
				                    if(calculateRestriction(oneRecipe, deploymentType, selectedInfraProvider)){
					                    context.mainData.recipes.push(oneRecipe);
				                    }
			                    }
		                    }
	                    }
                    });

	                if(recipes.length === 0){
	                	alreadySelectedRecipe = null;
		                context.formData.deployOptions.recipe = null;
	                }

	                //wizard mode only
	                if(alreadySelectedRecipe){
		                context.formData.deployOptions.recipe = alreadySelectedRecipe;
	                }

	                context.displayRecipeInputs(false, false, function (err) {
                        if (err) {
                            context.displayAlert('danger', err.message);
                        }
                    });
                }

                if (cb) return cb();
            });

			function calculateRestriction(oneRecipe, deploymentType, selectedInfraProvider){
				if (!oneRecipe.restriction  || Object.keys(oneRecipe.restriction).length === 0){
					return true;
				}
				else {
					if(oneRecipe.restriction.deployment) {
						if(oneRecipe.restriction.deployment.indexOf(deploymentType) !== -1){
							if(selectedInfraProvider && oneRecipe.restriction.infra && oneRecipe.restriction.infra.length > 0){
								if(oneRecipe.restriction.infra.indexOf(selectedInfraProvider) !== -1){
									return true
								}
							}
							else{
								context.mainData.recipes.push(oneRecipe);
							}
						}
					}
					else {
						if(selectedInfraProvider && oneRecipe.restriction.infra && oneRecipe.restriction.infra.length > 0){
							if(oneRecipe.restriction.infra.indexOf(selectedInfraProvider) !== -1){
								return true;
							}
						}
						else{
							context.mainData.recipes.push(oneRecipe);
						}
					}
				}

				return false;
			}
		};

		context.upgradeRecipes = function () {
			currentScope.$parent.go("#/catalog-recipes");
			if ($modalInstance) {
				$modalInstance.close();
			}
		};

		context.displayRecipeInputs = function (refresh, ui, cb) {
			function calculateRestrictions(currentScope) {
				let allRecipes = currentScope.mainData.recipes;
				let selectedRecipeId;
				let selectedRecipe;

				if (currentScope.formData.deployOptions && currentScope.formData.deployOptions.recipe) {
					selectedRecipeId = currentScope.formData.deployOptions.recipe;
				} else {
					return; // no selected recipe yet
				}

				allRecipes.forEach(function (eachRecipe) {
					if (eachRecipe._id === selectedRecipeId) {
						selectedRecipe = eachRecipe;
                        context.mainData.deploymentData.selectedRecipe = selectedRecipe;
					}
				});

				let allDeployments = [];
				if(context.formData.deployOptions.deployConfig.type && context.formData.deployOptions.deployConfig.type !== ''){
					allDeployments = [context.formData.deployOptions.deployConfig.type];
				}
				else {
					allDeployments = ["container", "vm"]; // enable all if no rest or empty rest & ! manual
				}
				let allInfra = currentScope.mainData.deploymentData.infraProviders; // [{_id,name}]

				if (!selectedRecipe) {
					currentScope.mainData.deploymentData.selectedRestrictionsDep = [];
				}
				else {
					let restriction = selectedRecipe.restriction;
					if (!restriction || Object.keys(restriction).length === 0) {
						currentScope.mainData.deploymentData.selectedRestrictionsDep = allDeployments;
						currentScope.mainData.deploymentData.selectedRestrictionsInfra = allInfra;
					} else {
						// convert ["aws"] => [{_id,name}] after matching data with infraProviders
						let reformattedRestrictionInfra = [];
						if (restriction.infra) {
							restriction.infra.forEach(function (eachInfra) {
								allInfra.forEach(function (originalInfra) {
									if (originalInfra.name === eachInfra) {
										reformattedRestrictionInfra.push(originalInfra);
									}
								});
							})
						}

						currentScope.mainData.deploymentData.selectedRestrictionsDep = restriction.deployment;
						currentScope.mainData.deploymentData.selectedRestrictionsInfra = reformattedRestrictionInfra;
					}
				}

				if (currentScope.mainData.deploymentData.selectedRestrictionsDep && currentScope.mainData.deploymentData.selectedRestrictionsDep.length === 1) { // force select deployment technology iff one is available
					currentScope.formData.deployOptions.deployConfig.type = currentScope.mainData.deploymentData.selectedRestrictionsDep[0];
				}

				// beyond loading data, validate password
				if (currentScope.formData.deployOptions.deployConfig.vmConfiguration && currentScope.formData.deployOptions.deployConfig.vmConfiguration.adminAccess && currentScope.formData.deployOptions.deployConfig.vmConfiguration.adminAccess.isPassword) {
					currentScope.validatePassword();
				}
			}

			let recipes = context.mainData.recipes;
			let selectedRecipe = context.mainData.recipes;
			context.mainData.recipeUserInput.envs = {};
			if (context.formData.deployOptions && context.formData.deployOptions.recipe) {
				for (var i = 0; i < recipes.length; i++) {
					if (recipes[i].recipe && recipes[i]._id === context.formData.deployOptions.recipe) {
						if (recipes[i].recipe.buildOptions && recipes[i].recipe.buildOptions.env && Object.keys(recipes[i].recipe.buildOptions.env).length > 0) {
							for (var env in recipes[i].recipe.buildOptions.env) {
								if (recipes[i].recipe.buildOptions.env[env].type === 'userInput') {
									context.mainData.recipeUserInput.envs[env] = recipes[i].recipe.buildOptions.env[env];

									if (context.formData.deployOptions.custom && context.formData.deployOptions.custom.env && context.formData.deployOptions.custom.env[env]) {
										context.mainData.recipeUserInput.envs[env].default = context.formData.deployOptions.custom.env[env]; //if user input already set, set it's value as default
									}
								}
							}
						}

						if (recipes[i].recipe.deployOptions && recipes[i].recipe.deployOptions.image && recipes[i].recipe.deployOptions.image.override) {
							context.mainData.recipeUserInput.image = {
								override: true,
								prefix: recipes[i].recipe.deployOptions.image.prefix || '',
								name: recipes[i].recipe.deployOptions.image.name || '',
								tag: recipes[i].recipe.deployOptions.image.tag || ''
							};

							if (context.formData.deployOptions.custom && context.formData.deployOptions.custom.image && Object.keys(context.formData.deployOptions.custom.image).length > 0) {
								context.mainData.recipeUserInput.image = {
									override: true,
									prefix: context.formData.deployOptions.custom.image.prefix || '',
									name: context.formData.deployOptions.custom.image.name || '',
									tag: context.formData.deployOptions.custom.image.tag || ''
								};
							}
						}

						//add check, if recipe does not support certificates, do not show the secrets input at all
						context.mainData.secretsAllowed = 'none';
						if (recipes[i].recipe.deployOptions.certificates && recipes[i].recipe.deployOptions.certificates !== 'none') {
							context.mainData.secretsAllowed = recipes[i].recipe.deployOptions.certificates;
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

			calculateRestrictions(context); //todo: restore
			context.setSourceCodeData(selectedRecipe);
			context.setExposedPorts(selectedRecipe, ui, cb);

			context.onDeploymentTechnologySelect(refresh);
		};

		context.updateDeploymentName = function (resourceName, forceValueFromSelect) {
			if (resourceName) {
				resourceName = resourceName.toLowerCase();
				resourceName = resourceName.replace(/\s+/g, '');
			}

			resourceName = (resourceName) ? resourceName.toLowerCase() : '';
			context.formData.name = resourceName;

			if (context.formData.canBeDeployed) {
				if (!context.formData.deployOptions) {
					context.formData.deployOptions = {};
				}
				if (!context.formData.deployOptions.custom) {
					context.formData.deployOptions.custom = {};
				}
				context.formData.deployOptions.custom.name = resourceName;
			}

			let deployConfig = context.formData.deployOptions;
			context.vmExposedPortsDisabled = (deployConfig && deployConfig.deployConfig && deployConfig.deployConfig.type === 'vm');

			if(context.formData.canBeDeployed){
				if(!context.formData.deployOptions.deployConfig){
					context.formData.deployOptions.deployConfig = {};
				}

				if(!forceValueFromSelect){
					context.formData.deployOptions.deployConfig.type = 'vm';
				}

				//get all infra accounts with vm technology
				//get all vms from accounts
				//show the list of vm layers to choose from
				context.loadVmData(function () {
					if(context.options.envPlatform && context.options.envPlatform !== ''){
						if(!forceValueFromSelect && (!context.mainData.deploymentData.vmLayers || Object.keys(context.mainData.deploymentData.vmLayers).length === 0)){
							context.formData.deployOptions.deployConfig.type = 'container';
						}
						else{
							//if wizard, and template container only, do not show the platform picker !
							if(currentScope.environmentWizard && currentScope.restrictions){
								if(currentScope.restrictions.vm && (currentScope.restrictions.docker || currentScope.restrictions.kubernetes) ){
									context.displayPlatformPicker = true;
								}
							}
							else{
								context.displayPlatformPicker = true;
							}
						}
					}

					//get the new catalog recipes
					context.getCatalogRecipes(() => {
						context.buildComputedHostname(resourceName);
					});
				});
			}
			// formData.deployOptions.deployConfig.type
			// context.buildComputedHostname(resourceName);
		};

		context.buildComputedHostname = function (resourceName) {
			let selectedVMLayer, serversArray;
			context.options.computedHostname = resourceName;
			if (context.formData && context.formData.deployOptions && context.formData.deployOptions.custom) {
				if (resourceName && resourceName !== '' && context.envPlatform === 'kubernetes') {
					context.options.computedHostname = resourceName + '-service';

					var selected = context.mainData.envDeployer.selected.split('.');
					if (context.mainData.envDeployer && context.mainData.envDeployer[selected[0]] && context.mainData.envDeployer[selected[0]][selected[1]] && context.mainData.envDeployer[selected[0]][selected[1]][selected[2]]) {
						var platformConfig = context.mainData.envDeployer[selected[0]][selected[1]][selected[2]];

						if (platformConfig && platformConfig.namespace && platformConfig.namespace.default) {
							context.options.computedHostname += '.' + platformConfig.namespace.default;

							if (platformConfig.namespace.perService) {
								context.options.computedHostname += '-' + resourceName;
							}
						}
					}
				}

				if(context.formData.deployOptions.deployConfig.type === 'vm' && context.formData.deployOptions.deployConfig.vmConfiguration){
					if(context.mainData.deploymentData && context.mainData.deploymentData.vmLayers) {
						selectedVMLayer = context.mainData.deploymentData.vmLayers[context.formData.deployOptions.deployConfig.vmConfiguration.vmLayer];
						//generate the new servers entries list
						serversArray = [];
						if (selectedVMLayer && selectedVMLayer.list){
							selectedVMLayer.list.forEach((onevminstance) => {
								let processed = false;
								onevminstance.ip.forEach((oneIP) =>{
									if(oneIP.type === 'public' && !processed){
										processed = true;
										serversArray.push({'host': oneIP.address, 'port': onevminstance.ports[0].published});
									}
								});
							});
							context.options.serversArray = serversArray;
						}
						else {

						}
					}
					else {
						setTimeout(function() {
							return context.buildComputedHostname(resourceName);
						}, 500);
					}
				}
			}

			if (context.form && context.form.entries && Array.isArray(context.form.entries) && context.form.entries.length > 0) {
				let serversEntry = context.form.entries.find((oneEntry) => { return oneEntry.name === 'servers0'; });
				if(serversEntry && serversEntry.entries && serversArray && serversArray.length > 0) {
					let newEntries = [];
					let oneEntryClone = angular.copy(serversEntry);
					serversArray.forEach((oneServer, index) => {
						oneEntryClone.name = `servers${index}`;

						let hostField = oneEntryClone.entries.find((oneField) => { return oneField.name.includes('host'); });
						let portField = oneEntryClone.entries.find((oneField) => { return oneField.name.includes('port'); });
						let removeServerField = oneEntryClone.entries.find((oneField) => { return oneField.name.includes('removeserver'); });

						if(hostField) {
							hostField.name = `host${index}`;
							hostField.value = oneServer.host;
							hostField.disabled = true;

							context.form.formData[hostField.name] = hostField.value;
						}
						if(portField) {
							portField.name = `port${index}`;
							portField.value = oneServer.port;
							portField.disabled = true;

							context.form.formData[portField.name] = portField.value;
						}
						if(removeServerField) {
							removeServerField.name = `removeserver${index}`;
						}

						newEntries = newEntries.concat(oneEntryClone);
					});

					for(let i = context.form.entries.length - 1; i >= 0; i--) {
						if(context.form.entries[i].name.match(/servers[0-9]+/g)) {
							context.form.entries.splice(i, 1);
						}
					}

					context.form.entries = newEntries.concat(context.form.entries);
				}

				for (let $index = context.form.entries.length - 1; $index >= 0; $index--) {
					let oneEntry = context.form.entries[$index];
					if (oneEntry.name && oneEntry.name.match(/servers[0-9]+/g)) {
						oneEntry.entries.forEach((oneSubEntry) => {
							oneSubEntry.disabled = false;
							delete oneSubEntry.disabled;
							context.form.formData[oneSubEntry.name] = '';

							if (context.formData.canBeDeployed && oneSubEntry.name.includes("host")) {
								oneSubEntry.disabled = true;

								if (context.vmExposedPortsDisabled && resource.status === 'ready' && context.options.serversArray && context.options.serversArray[$index]) {
									context.form.formData[oneSubEntry.name] = context.options.serversArray[$index].host;
								}
								else {
									context.form.formData[oneSubEntry.name] = context.options.computedHostname;
									if(context.options.serversArray && context.options.serversArray[$index]){
										context.form.formData[oneSubEntry.name] = context.options.serversArray[$index].host;
									}
								}
							}

							if (oneSubEntry.name.includes("port")) {
								oneSubEntry.disabled = context.vmExposedPortsDisabled;
								if (context.vmExposedPortsDisabled) {
									if (context.formData.deployOptions.custom && context.formData.deployOptions.custom.ports && context.formData.deployOptions.custom.ports.length > 0) {
										let firstPort = context.formData.deployOptions.custom.ports[0];
										oneSubEntry.value = firstPort.published || firstPort.target;
									}
									else {
										oneSubEntry.disabled = false;
									}
								}
								oneSubEntry.value = oneSubEntry.value.toString();
								context.form.formData[oneSubEntry.name] = oneSubEntry.value;
							}
							if (oneSubEntry.name.includes("removeserver")) {
								oneSubEntry.value = '<span class=\'icon icon-cross red\'></span>';
								if (context.formData.canBeDeployed && resourceName && resourceName !== '') {
									oneSubEntry.value = '';
								}
							}
						});
					}

					// if (context.formData.canBeDeployed && oneEntry.name && oneEntry.name.includes("servers") && oneEntry.name !== 'anotherservers' && oneEntry.name !== 'servers0') {
					// 	// context.form.entries.splice($index, 1);
					// }

					if (oneEntry.name && oneEntry.name === 'anotherservers') {
						if (context.formData.canBeDeployed) {
							jQuery('#anotherservers').hide();
						}
						else {
							jQuery('#anotherservers').show();
						}
					}
				}
			}
		};

		context.toggleShareWithAllEnvs = function () {
			if (context.mainData.envs.sharedWithAll) {
                context.mainData.envs.list.forEach(function (oneEnv) {
					oneEnv.selected = true;
				});
			}
		};

		context.reformatSourceCodeForCicd = function (record) {
			if (record.configuration && record.configuration.repo) {
				let selectedRepo = record.configuration.repo;
				if (selectedRepo === '-- Leave Empty --') {
					record.configuration.repo = "";
					record.configuration.branch = "";
				} else {
					context.mainData.configRepos.config.forEach(function (eachConf) {
						if (eachConf.name === selectedRepo) {
							record.configuration.commit = eachConf.configSHA;
							record.configuration.owner = eachConf.owner;
						}
					});
				}
			}

			if (record.custom && record.custom.repo) {
				let selectedRepoComposed = record.custom.repo;
				let decoded = decodeRepoNameAndSubName(selectedRepoComposed);

				let selectedRepo = decoded.name;
				let subName = decoded.subName;

				record.custom.repo = selectedRepo; // save clear value

				if (selectedRepo === '-- Leave Empty --') {
					record.custom.repo = "";
					record.custom.branch = "";
				} else {
					context.mainData.configRepos.customType.forEach(function (eachConf) {
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

		context.setExposedPorts = function (selectedRecipe, ui, cb) {
			let ports;
			if (context.formData.deployOptions && context.formData.deployOptions.custom && context.formData.deployOptions.custom.ports && !ui) {
				ports = context.formData.deployOptions.custom.ports;
			}
			let recipe = false;

			if (!ports && context.noCDoverride) {
				if (resource.deploy && resource.deploy.options && resource.deploy.options.custom && resource.deploy.options.custom.ports && !ui) {
					if (Array.isArray(resource.deploy.options.custom.ports) && resource.deploy.options.custom.ports.length > 0) {
						ports = resource.deploy.options.custom.ports;
					}
				}
			}

            context.mainData.catalogConflictingPorts = '';
			if (selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.ports
				&& Array.isArray(selectedRecipe.recipe.deployOptions.ports)
				&& selectedRecipe.recipe.deployOptions.ports.length > 0) {
				//use ports from recipe if no ports were coming from previuos save
				if (!ports) {
					recipe = true;
					ports = selectedRecipe.recipe.deployOptions.ports;
					if (context.form && context.form.formData && ports && ports[0]) { // applicable for resources with driver configuration only
						context.form.formData.port0 = ports[0].published; // set port in drivers's configuration as well
					}
				}
				if (!context.formData.deployOptions.custom) {
					context.formData.deployOptions.custom = {};
				}
				if (recipe) {
					context.formData.deployOptions.custom.ports = [];
				}
				//check if there port mismatch in type
				let nodePort = 0, loadBalancer = 0;
				selectedRecipe.recipe.deployOptions.ports.forEach(function (onePort) {
					if (recipe) {
						context.formData.deployOptions.custom.ports.push(onePort);
					}
					if (onePort.isPublished || onePort.published) {
						context.formData.deployOptions.custom.loadBalancer = true;
						if (onePort.published) {
							if (recipe) {
								context.formData.deployOptions.custom.loadBalancer = false;
							}
							nodePort++;
						}
						else {
							loadBalancer++;
						}
					}
				});
				if (loadBalancer === 0 && nodePort === 0) {
					context.publishPorts = false;
				}
				else {
					context.publishPorts = true;
				}
				if (loadBalancer !== 0 && nodePort !== 0) {
					if ($modalInstance) {
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
					else {
                        context.mainData.catalogConflictingPorts = selectedRecipe.name;
					}
				}
			}
			if (ports && !recipe) {
				//get the type of the ports
				context.formData.deployOptions.custom.ports = [];
				ports.forEach(function (onePort) {
					context.formData.deployOptions.custom.ports.push(onePort);
					if (onePort.isPublished || onePort.published) {
						context.formData.deployOptions.custom.loadBalancer = true;
						if (onePort.published) {
							context.formData.deployOptions.custom.loadBalancer = false;
						}
					}
				});
			}
			if ( context.formData.deployOptions.custom) {
				context.formData.deployOptions.custom.ports = ports;
			}

			if(context.formData && context.formData.deployOptions && context.formData.deployOptions.deployConfig && context.formData.deployOptions.deployConfig.vmConfiguration && context.formData.deployOptions.deployConfig.vmConfiguration.vmLayer) {
				context.vmExposedPortsDisabled = true;
				// console.log(currentScope);
				// console.log(context);
				// console.log(context.mainData.deploymentData);
				// console.log(context.formData.deployOptions)

				let vmNameCombo = context.formData.deployOptions.deployConfig.vmConfiguration.vmLayer.split("_");
				let oneVMDeploymentData;
				for(let vmIName in context.mainData.deploymentData.vmLayers){
					if(vmIName.includes(vmNameCombo[0]+"_") && vmIName.includes("_" + vmNameCombo[vmNameCombo.length -1]) ){
						oneVMDeploymentData = context.mainData.deploymentData.vmLayers[vmIName];
						context.formData.deployOptions.deployConfig.vmConfiguration.vmLayer = vmIName;
					}
				}
				// console.log("---")
				if(oneVMDeploymentData){
					context.validateVmLayerPorts(selectedRecipe, oneVMDeploymentData);
				}
			}

			if (cb) {
				return cb();
			}
		};

		context.validateVmLayerPorts = function(selectedRecipe, vmLayer) {
			if(selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.ports && Array.isArray(selectedRecipe.recipe.deployOptions.ports)) {
				let oneLayerInstance = {};
				if(vmLayer && vmLayer.list && Array.isArray(vmLayer.list) && vmLayer.list[0]) {
					oneLayerInstance = vmLayer.list[0]; // comparing with only one layer instance is enough, instances configurations in one layer are identical
				}
				context.formData.invalidVmLayerPortsData = {
					ports: [],
					securityGroupName: ''
				};
				for(let i = 0; i < selectedRecipe.recipe.deployOptions.ports.length; i++) {
					let onePort = selectedRecipe.recipe.deployOptions.ports[i];
					let foundPort = false;
					if(oneLayerInstance && oneLayerInstance.ports) {
						for(let j = 0; j < oneLayerInstance.ports.length; j++) {
							let oneLayerPort = oneLayerInstance.ports[j];
							if(oneLayerPort.access === 'allow' && oneLayerPort.direction === 'inbound') {
								if(oneLayerPort.isPublished === onePort.isPublished &&
									((oneLayerPort.published == onePort.published) || oneLayerPort.published === '*') &&
									((oneLayerPort.target == onePort.target) || oneLayerPort.target === '*')) {
									onePort.availableInVmLayer = true;
									foundPort = true;
									break;
								}
							}
						}
					}
					if(!foundPort) {
						context.formData.invalidVmLayerPortsData.ports.push(onePort);

						if(!context.formData.invalidVmLayerPortsData.securityGroup) {
							context.formData.invalidVmLayerPortsData.securityGroup = oneLayerInstance.securityGroup;
						}
					}
				}
			}
		};

		context.validatePassword = function () {
			let password = context.formData.deployOptions.deployConfig.vmConfiguration.adminAccess.password;
			if (!password) {
				context.isPasswordValid = false;
				return;
			}

			let upperCase, lowerCase, numeric, special; // must have at least one of each
			let control; // must not have any (control = i / c / tm ... (copy right))

			for (let i = 0; i < password.length; i++) {
				let currentChar = password.charAt(i);
				let currentCharIsNumeric = false;
				let currentCharIsSpecial = false;

				if ('0123456789'.indexOf(currentChar) !== -1) { // is a number
					numeric = true;
					currentCharIsNumeric = true;
				}
				if (!(/^[a-zA-Z0-9]*$/.test(currentChar))) { // is a special character
					special = true;
					currentCharIsSpecial = true;
				}
				if (!currentCharIsNumeric && !currentCharIsSpecial && currentChar === currentChar.toLowerCase()) { // is lower
					lowerCase = true;
				}
				if (!currentCharIsNumeric && !currentCharIsSpecial && currentChar === currentChar.toUpperCase()) { // is upper
					upperCase = true;
				}
			}

			// 3 out of 4 conditions will set it to true
			context.isPasswordValid = (((upperCase ? 1 : 0) + (lowerCase ? 1 : 0) + (numeric ? 1 : 0) + (special ? 1 : 0)) >= 3);
		};

		context.onExposedPortsUpdate = function () {
			if (context.form.formData.port0 && context.formData.deployOptions.custom && context.formData.deployOptions.custom.ports[0] && context.formData.deployOptions.custom.ports[0].published) {
				context.form.formData.port0 = context.formData.deployOptions.custom.ports[0].published;
			}
		};

		/*
		 VM specific
		 */
		//moved to commonService
		context.getInfraProviders = function (cb) {
			overlayLoading.show();
			let apiParams = {};
			commonService.getInfraProviders(currentScope, apiParams, function (providers) {
				delete providers.soajsauth;
				context.originalInfraProviders = angular.copy(providers);
				context.mainData.deploymentData.infraProviders = providers;
				overlayLoading.hide();

				if (cb) {
					cb();
				}
			});
		};

		context.listVmsApi = function (cb) {
			if (!vmDataLoaded) {
				vmDataLoaded = true;

				let envCode;

				if(context.myEnv){
					envCode = context.myEnv;
				}
				else if(context.options.envCode){
					envCode = context.options.envCode;
				}
				else if(context.context && context.context.envCode){
					envCode = context.context.envCode;
				}

				if(currentScope.environmentWizard){
					envCode = null;
				}
				if(envCode){
					getInfraProvidersAndVMLayers(currentScope, ngDataApi, envCode, context.mainData.deploymentData.infraProviders, (vms) => {
						// TODO
						if(!context.mainData.deploymentData.vmLayers){
							context.mainData.deploymentData.vmLayers={};
						}
						if(currentScope.environmentWizard){
							for(let i in vms){
								context.mainData.deploymentData.vmLayers[i] = vms[i];
							}
						}
						else{
							context.mainData.deploymentData.vmLayers = vms;
						}

						//todo: remove this validation in the next sprints
						for(let i in context.mainData.deploymentData.vmLayers){
							let compatibleVM = false;
							if(context.mainData.deploymentData.vmLayers[i].list){
								context.mainData.deploymentData.vmLayers[i].list.forEach((onevmInstance) =>{
									if(onevmInstance.labels && onevmInstance.labels['soajs.env.code'] && onevmInstance.labels['soajs.env.code'] === envCode){
										if (onevmInstance.tasks && Array.isArray(onevmInstance.tasks) &&  onevmInstance.tasks[0] && onevmInstance.tasks[0].status && onevmInstance.tasks[0].status.state === 'succeeded') {
											compatibleVM = true;
										}
									}
								});
							}
							else if (context.mainData.deploymentData.vmLayers[i].specs){
								compatibleVM = true;
							}

							if (currentScope.onboardNames && currentScope.onboardNames.length > 0 && currentScope.environmentWizard) {
								for (let j in currentScope.onboardNames) {
									if (currentScope.onboardNames[j] === (context.mainData.deploymentData.vmLayers[i].name + "__" + context.mainData.deploymentData.vmLayers[i].list[0].network)) {
										compatibleVM = true;
									}
								}
							}

							if(!compatibleVM){
								delete context.mainData.deploymentData.vmLayers[i];
							}
						}

						if(cb && typeof cb === 'function'){
							return cb();
						}
					});
				}
			}
			else{
				if(cb && typeof cb === 'function')
					return cb();
			}
		};

		// listeners
		context.onDeploymentTechnologySelect = function (refresh) {
			if (refresh) {
				refreshDeployConfig(context);
			}
		};

		context.loadVmData = function (cb) {
			overlayLoading.show();
			context.listVmsApi(function () {
				overlayLoading.hide();
				cb();
			});
		};

		context.onAuthTypeChange = function () {
			if (context.formData.deployOptions.deployConfig.vmConfiguration.adminAccess.isPassword) {
				context.formData.deployOptions.deployConfig.vmConfiguration.adminAccess.token = '';
			} else {
				context.formData.deployOptions.deployConfig.vmConfiguration.adminAccess.password = '';
			}
		};

		// on Init

		let vmDataLoaded = false;

		confirmMainData(context, currentScope);

		context.access = currentScope.access;
		context.formData = (cb && typeof cb === 'function') ? resource : {};

		let category = (resource && Object.keys(resource).length > 0) ? resource.category : settings.category;

		let allowEdit = ((action === 'add') || (action === 'update' && resource.permission && resource.created.toUpperCase() === currentScope.context.envCode.toUpperCase()));
		context.allowEdit = allowEdit;

		if (resource.name === 'dash_cluster') {
			context.mainData.sensitive = true;
		}

		resourceConfiguration.loadDriverSchema(context, resource, settings, allowEdit, function (error) {
			if (error) {
				context.mainData.mainDatanotsupported = true;
			}
		});

		if (!context.noCDoverride) {
			context.mainData.recipes = [];
		}
		if (resource && resource.instance && resource.instance.id) {
			context.mainData.resourceDeployed = true;
		}
		resourcesAppConfig.form.addResource.data.categories.forEach((oneCategory) => {
			if (oneCategory.v === category) {
				context.mainData.categoryLabel = oneCategory.l;
			}
		});

		context.options = {
			deploymentModes: [
				{
					label: 'replicated - deploy the specified number of replicas based on the availability of resources',
					value: 'replicated'
				},
				{
					label: 'global - automatically deploy one replica of the service on each node in the cluster',
					value: 'global'
				}
			],
			envCode: currentScope.context.envCode,
			envType: currentScope.context.envType,
			envPlatform: currentScope.context.envPlatform,
			enableAutoScale: currentScope.context.enableAutoScale || false,
			formAction: action,
			aceEditorConfig: {
				maxLines: Infinity,
				useWrapMode: true,
				mode: 'json',
				firstLineNumber: 1,
				height: '500px'
			},
			allowEdit: allowEdit,
			computedHostname: '',
			allowDeploy: (currentScope.context.envPlatform !== 'manual')
		};

		context.title = 'Add New Resource';
		if (action === 'update' && context.options.allowEdit) {
			context.title = 'Update ' + resource.name;
		}
		else if (!allowEdit) {
			context.title = 'View ' + resource.name;
		}

		if (currentScope.context.envPlatform === 'kubernetes') {
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
		else if (currentScope.context.envPlatform === 'docker') {
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

		if (!context.noCDoverride) {
			context.getInfraProviders(() => {
				context.getSecrets((cb) => {
					context.getCatalogRecipes(cb);
				});
				if (context.formData && context.formData.canBeDeployed && resource && resource.name) {
					if(context.formData.deployOptions && context.formData.deployOptions.deployConfig && context.formData.deployOptions.deployConfig.type === 'vm'){
						setTimeout(() => {
							context.updateDeploymentName(resource.name);
						}, 100);
					}
				}
			});
		}
		else {
			context.getInfraProviders(() => {
				//this is called by add env wizard.
				updateCustomRepoName();
				context.getSecrets(function () {
					context.displayRecipeInputs(true, false, (error, response) => {
						if (context.formData && context.formData.canBeDeployed && resource && resource.name) {
							setTimeout(() => {
								context.updateDeploymentName(resource.name);
							}, 200);
						}
					});
				});
			});
		}

		context.fillForm();

		if (cb && typeof cb === 'function'){
			return cb();
		}
	}

	return {
		'buildDeployForm': buildDeployForm,
		'updateFormDataBeforeSave': updateFormDataBeforeSave
	}
}]);
