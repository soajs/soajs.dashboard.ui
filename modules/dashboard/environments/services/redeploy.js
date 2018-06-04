"use strict";
var hacloudServicesRedeploy = soajsApp.components;
hacloudServicesRedeploy.service('hacloudSrvRedeploy', [ 'ngDataApi', '$timeout', '$modal', '$sce', function (ngDataApi, $timeout, $modal, $sce) {
	
	function redeployService(currentScope, service) {
		var params = {
			env: currentScope.envCode,
			serviceId: service.id,
			mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : ''),
			action: 'redeploy',
			custom: {
				name: service.name
			},
			recipe: service.labels["soajs.catalog.id"]
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cloud/services/redeploy',
			params: {
				namespace: service.namespace || ''
			},
			data: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Service redeployed successfully');
				$timeout(() => {
					currentScope.listServices();
				}, 1500);
			}
		});
	}
	
	function rebuildService(currentScope, OriginalService) {
		let service = angular.copy(OriginalService);
		let sourceCode = {};
		let serviceEnvs = {};
		//get already selected values if any
		service.env.forEach((oneEnv) => {
			let t = oneEnv.split("=");
			serviceEnvs[t[0]] = t[1];
		});
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/get',
			params: {
				'id': service.labels['soajs.catalog.id']
			}
		}, function (error, catalogRecipe) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var formConfig = {
					entries: [
						{
							"type": "group",
							"label": "Deployment Options",
							"entries": []
						}
					]
				};
				
				if (catalogRecipe.recipe.deployOptions.image.override) {
					//append images
					formConfig.entries[0].entries.push({
						'name': "ImagePrefix",
						'label': "Image Prefix",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.prefix,
						'fieldMsg': "Override the image prefix if you want"
					});
					
					formConfig.entries[0].entries.push({
						'name': "ImageName",
						'label': "Image Name",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.name,
						'fieldMsg': "Override the image name if you want"
					});
					
					formConfig.entries[0].entries.push({
						'name': "ImageTag",
						'label': "Image Tag",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.tag,
						'fieldMsg': "Override the image tag if you want"
					});
				}
				
				let nodePort =0, LoadBalancer=0;
				if(service.catalogUpdate){
					service.ports = catalogRecipe.recipe.deployOptions.ports;
				}
				
				if (service.ports && Array.isArray(service.ports) && service.ports.length > 0){
					//let ports = [];
					
					catalogRecipe.recipe.deployOptions.ports.forEach((oneCatalogPort) =>{
						if (oneCatalogPort.isPublished || oneCatalogPort.published){
							if (oneCatalogPort.published){
								nodePort++;
							}
							else {
								LoadBalancer++;
							}
						}
						service.ports.forEach(function (oneServicePort) {
							if (oneServicePort.published && oneServicePort.published > 30000){
								oneServicePort.published -= 30000;
							}
							if (oneCatalogPort.target === oneServicePort.target){
								oneServicePort.name = oneCatalogPort.name;
							}
						});
					});
					
					let publishedPortEntry = {
						"type": "group",
						"label": "Published Ports",
						"entries": []
					};
					
					if (LoadBalancer > 0){
						publishedPortEntry.entries.push({
							'type': 'html',
							'value': '<label>Load Balancer</label> <label class="toggleSwitch f-right"><input type="checkbox"  disabled=true checked=true><span class="buttonSlider round"></span></label> <label class="fieldMsg">This recipe allows LoadBalancer port configuration only.</label>'
						});
					}
					if(nodePort > 0) {
						if (!formConfig.data) {
							formConfig.data = {};
						}
						formConfig.data.ports = [];
						service.ports.forEach(function (onePort, key) {
							formConfig.data.ports.push({
								"name": onePort.name,
								"target": parseInt(onePort.target),
								"preserveClientIP": onePort.preserveClientIP
							});
							
							if(onePort.published) {
								formConfig.data.ports[key].isPublished = true;
								formConfig.data.ports[key].published = parseInt(onePort.published);
								publishedPortEntry.entries.push({
									"name": "group-" + onePort.protocol,
									"label": onePort.name + ":" + onePort.target,
									"type": "group",
									"entries": [{
										'name': onePort.name+onePort.published,
										'type': 'number',
										'label': 'Published Port',
										'value': parseInt(onePort.published),
										'fieldMsg': "Detected Published Port: " + onePort.name + " with internal value " + onePort.target + ". Enter a value if you want to expose this resource to a specific port; Port values are limited to a range between 0 and 2767.",
										"min": 1,
										"max": 2767
									}]
								});
								formConfig.data[onePort.name+onePort.published] = parseInt(onePort.published);
							}
							
						});
					}
					if(nodePort > 0 || LoadBalancer > 0){
						formConfig.entries[0].entries.push(publishedPortEntry);
					}
				}
				
				if (LoadBalancer !== 0 && nodePort !== 0){
					$modal.open({
						templateUrl: "portConfigurationReDepoly.tmpl",
						size: 'm',
						backdrop: true,
						keyboard: true,
						controller: function ($scope, $modalInstance) {
							fixBackDrop();
							$scope.currentScope = currentScope;
							$scope.title = 'Port Configuration';
							$scope.message = 'Unable to proceed, Detected port conflict in Catalog recipe: ' + catalogRecipe.name;
							$scope.closeModal = function () {
								$modalInstance.close();
							};
						}
					});
				}
				else {
					for (var envVariable in catalogRecipe.recipe.buildOptions.env) {
						if (catalogRecipe.recipe.buildOptions.env[envVariable].type === 'userInput') {
							
							var defaultValue = catalogRecipe.recipe.buildOptions.env[envVariable].default || '';
							//todo: get value from service.env
							service.env.forEach(function (oneEnv) {
								if (oneEnv.indexOf(envVariable) !== -1) {
									defaultValue = oneEnv.split("=")[1];
								}
							});
							//push a new input for this variable
							var newInput = {
								'name': '_ci_' + envVariable,
								'label': catalogRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
								'type': 'text',
								'value': defaultValue,
								'fieldMsg': catalogRecipe.recipe.buildOptions.env[envVariable].fieldMsg,
								'required': false
							};
							
							//if the default value is ***, clear the value and set the field as required
							//this is applicable for tokens whose values are masked by *
							if (newInput.value.match(/^\*+$/g)) {
								newInput.value = '';
								newInput.required = true;
							}
							
							formConfig.entries[0].entries.push(newInput);
						}
					}
					
					checkForSourceCode(formConfig, catalogRecipe, (accounts) => {
						for (let i = formConfig.entries.length - 1; i >= 0; i--) {
							if (formConfig.entries[i].entries.length === 0) {
								formConfig.entries.splice(i, 1);
							}
						}
						checkifRepoBranch(accounts, catalogRecipe, formConfig);
					});
				}
			}
		});
		
		function checkifRepoBranch(accounts, catalogRecipe, formConfig){
			if (['service', 'daemon', 'other'].indexOf(catalogRecipe.type) !== -1) {
				var newInput = {
					'name': 'branch',
					'label': 'Branch',
					'type': 'select',
					'value': [],
					'fieldMsg': 'Select a branch to deploy from',
					'required': true
				};
				
				if (service.labels['service.owner']) {
					getServiceBranches(accounts, {
						repo_owner: service.labels['service.owner'],
						repo_name: service.labels['service.repo']
					}, function (response) {
						
						response.branches.forEach(function (oneBranch) {
							delete oneBranch.commit.url;
							newInput.value.push({'v': oneBranch, 'l': oneBranch.name, selected: (service.labels['service.branch'] === oneBranch.name) });
						});
						formConfig.entries.unshift({
							"type": "group",
							"label" : "Repository Options",
							"entries": [newInput]
						});
						
						if (formConfig.entries.length === 0) {
							doRebuild(null, accounts);
						}
						else {
							var options = {
								timeout: $timeout,
								form: formConfig,
								name: 'rebuildService',
								label: 'Rebuild Service',
								actions: [
									{
										'type': 'submit',
										'label': translation.submit[LANG],
										'btn': 'primary',
										'action': function (formData) {
											doRebuild(formData, accounts);
										}
									},
									{
										'type': 'reset',
										'label': translation.cancel[LANG],
										'btn': 'danger',
										'action': function () {
											currentScope.modalInstance.dismiss('cancel');
											currentScope.form.formData = {};
										}
									}
								]
							};
							buildFormWithModal(currentScope, $modal, options, () => {
								for(let i in formConfig.data){
									if(!currentScope.form.formData[i]){
										currentScope.form.formData[i] = formConfig.data[i];
									}
								}
							});
						}
					});
				}
				else {
					doRebuild(null, accounts);
				}
			}
			else {
				if (formConfig.entries.length === 0) {
					doRebuild(null, accounts);
				}
				else {
					var options = {
						timeout: $timeout,
						form: formConfig,
						name: 'rebuildService',
						label: 'Rebuild Service',
						actions: [
							{
								'type': 'submit',
								'label': translation.submit[LANG],
								'btn': 'primary',
								'action': function (formData) {
									doRebuild(formData, accounts);
								}
							},
							{
								'type': 'reset',
								'label': translation.cancel[LANG],
								'btn': 'danger',
								'action': function () {
									currentScope.modalInstance.dismiss('cancel');
									currentScope.form.formData = {};
								}
							}
						]
					};
					buildFormWithModal(currentScope, $modal, options, () => {
						for(let i in formConfig.data){
							if(!currentScope.form.formData[i]){
								currentScope.form.formData[i] = formConfig.data[i];
							}
						}
					});
				}
			}
		}
		
		function checkForSourceCode(formConfig, catalogRecipe, cb){
			//get git accounts
			listAccounts((accounts) => {
				//check for additional sourceCode to attach
				if (catalogRecipe.recipe.deployOptions.sourceCode) {
					//check if config and the type of config
					checkSourcodeConfig(accounts, formConfig, catalogRecipe, () => {
						//check if custom and the type of custom
						checkSourcodeCustom(accounts, formConfig, catalogRecipe, () => {
							return cb(accounts);
						});
					});
				}
				else{
					return cb(accounts);
				}
			});
		}
		
		function checkSourcodeConfig(accounts, formConfig, catalogRecipe, cb){
			if (catalogRecipe.recipe.deployOptions.sourceCode.configuration) {
				if(catalogRecipe.recipe.deployOptions.sourceCode.configuration.repo && catalogRecipe.recipe.deployOptions.sourceCode.configuration.repo !== ''){
					//imposed --> readonly
					sourceCode.configuration = catalogRecipe.recipe.deployOptions.sourceCode.configuration;
					let sourceCodeConfig = {
						"type": "group",
						"label": catalogRecipe.recipe.deployOptions.sourceCode.configuration.label,
						"entries": [
							{
								'name': 'config_repository',
								'label': 'Repository',
								'type': 'readonly',
								'value': catalogRecipe.recipe.deployOptions.sourceCode.configuration.repo,
								'fieldMsg': 'Choose your repository',
								'required': true
							},
							{
								'name': 'config_branch',
								'label': 'Branch',
								'type': 'readonly',
								'value': catalogRecipe.recipe.deployOptions.sourceCode.configuration.branch,
								'fieldMsg': 'Choose your branch',
								'required': true
							},
							{
								'name': 'config_path',
								'label': 'Path',
								'type': 'text',
								'value': "",
								'fieldMsg': 'Unless specified, the root will be used',
								'required': false
							}
						]
					};
					formConfig.entries.push(sourceCodeConfig);
					return cb();
				}
				else{
					sourceCode.configuration = {
						repo: "",
						branch: ""
					};
					
					if(serviceEnvs['SOAJS_CONFIG_REPO_OWNER']) {
						sourceCode.configuration["repo"] = serviceEnvs['SOAJS_CONFIG_REPO_OWNER'] + "/" + serviceEnvs['SOAJS_CONFIG_REPO_NAME'];
					}
					if(serviceEnvs['SOAJS_CONFIG_REPO_BRANCH']) {
						sourceCode.configuration["branch"] = serviceEnvs['SOAJS_CONFIG_REPO_BRANCH'];
					}
					if(serviceEnvs['SOAJS_CONFIG_REPO_PATH']) {
						sourceCode.configuration["path"] = serviceEnvs['SOAJS_CONFIG_REPO_PATH'];
					}
					
					let extraRepo = [
						{
							'name': 'config_branch',
							'label': 'Branch',
							'type': 'select',
							'value': [],
							'fieldMsg': 'Choose your branch',
							'required': catalogRecipe.recipe.deployOptions.sourceCode.configuration.required
						},
						{
							'name': 'config_path',
							'label': 'Path',
							'type': 'text',
							'value': "",
							'fieldMsg': 'Unless specified, the root will be used',
							'required': false
						}
					];
					
					let sourceCodeConfig = {
						"type": "group",
						"label": catalogRecipe.recipe.deployOptions.sourceCode.configuration.label,
						"entries": [
							{
								'name': 'config_repository',
								'label': 'Repository',
								'type': 'select',
								'value': [{"v": "", "l": "-- No Repo --"}],
								'fieldMsg': 'Choose your repository',
								'required': catalogRecipe.recipe.deployOptions.sourceCode.configuration.required,
								'onAction': function(id, data, form) {
									form.entries.forEach((oneEntry) => {
										if(oneEntry.label === catalogRecipe.recipe.deployOptions.sourceCode.configuration.label){
											oneEntry.entries.length = 1;
											let opts = {
												id: data.id,
												name: data.repo,
												provider: data.provider,
												type: "config"
											};
											if(data){
												injectBrancheAndPath(opts, extraRepo, oneEntry, 'configuration');
											}
										}
									});
								}
							}
						]
					};
					
					if(sourceCode.configuration.repo !== ''){
						accounts.forEach((oneAccount) => {
							oneAccount.repos.forEach((oneRepo) => {
								if(oneRepo.name === sourceCode.configuration.repo){
									let opts = {
										id: oneAccount._id,
										name: sourceCode.configuration.repo,
										provider: oneAccount.provider,
										type: "config"
									};
									injectBrancheAndPath(opts, extraRepo, sourceCodeConfig, 'configuration', () => {
										prefillForm(sourceCodeConfig);
									});
								}
							});
						});
					}
					else{
						prefillForm(sourceCodeConfig);
					}
				}
			}
			else{
				return cb();
			}
			
			function prefillForm(sourceCodeConfig){
				//fill the first element repositories with allowed values and highlight the one that has an env variable if any
				if (accounts) {
					accounts.forEach(function (eachAccount) {
						if (eachAccount.repos) {
							eachAccount.repos.forEach(function (eachRepo) {
								if (eachRepo.type === 'config') {
									sourceCodeConfig.entries[0].value.push({
										l: eachRepo.name,
										v: {
											id: eachAccount._id,
											owner: eachAccount.owner,
											repo: eachRepo.name,
											provider: eachAccount.provider,
											type: "config"
										},
										selected: (sourceCode.configuration && sourceCode.configuration['repo'] === eachRepo.name)
									});
								}
							});
						}
					});
				}
				
				formConfig.entries.push(sourceCodeConfig);
				return cb();
			}
		}
		
		function checkSourcodeCustom(accounts, formConfig, catalogRecipe, cb){
			if (catalogRecipe.recipe.deployOptions.sourceCode.custom && catalogRecipe.type === 'server') {
				if(catalogRecipe.recipe.deployOptions.sourceCode.custom.repo && catalogRecipe.recipe.deployOptions.sourceCode.custom.repo !== ''){
					//imposed --> readonly
					sourceCode.custom = catalogRecipe.recipe.deployOptions.sourceCode.custom;
					let sourceCodeCustom = {
						"type": "group",
						"label": catalogRecipe.recipe.deployOptions.sourceCode.custom.label,
						"entries": [
							{
								'name': 'custom_repository',
								'label': 'Repository',
								'type': 'readonly',
								'value': catalogRecipe.recipe.deployOptions.sourceCode.custom.repo,
								'fieldMsg': 'Choose your repository',
								'required': true
							},
							{
								'name': 'custom_branch',
								'label': 'Branch',
								'type': 'readonly',
								'value': catalogRecipe.recipe.deployOptions.sourceCode.custom.branch,
								'fieldMsg': 'Choose your branch',
								'required': true
							},
							{
								'name': 'custom_path',
								'label': 'Path',
								'type': 'text',
								'value': "",
								'fieldMsg': 'Unless specified, the root will be used',
								'required': false
							}
						]
					};
					//in case of multi
					accounts.forEach(function (eachAccount) {
						eachAccount.repos.forEach(function (eachRepo) {
							if(eachRepo.name === catalogRecipe.recipe.deployOptions.sourceCode.custom.repo && eachRepo.type === 'multi'){
								eachRepo.configSHA.forEach((oneSubRepo) => {
									if(oneSubRepo.contentName === catalogRecipe.recipe.deployOptions.sourceCode.custom.subName){
										sourceCodeCustom.entries[2].value = oneSubRepo.path.replace("/config.js", "/");
										sourceCodeCustom.entries[2].type = 'readonly';
										sourceCode.custom.subName = oneSubRepo.contentName;
									}
								});
							}
						});
					});
					formConfig.entries.push(sourceCodeCustom);
					return cb();
				}
				else{
					sourceCode.custom = {
						repo: "",
						branch: ""
					};
					
					if(serviceEnvs['SOAJS_GIT_OWNER']) {
						sourceCode.custom["repo"] = serviceEnvs['SOAJS_GIT_OWNER'] + "/" + serviceEnvs['SOAJS_GIT_REPO'];
					}
					if(serviceEnvs['SOAJS_GIT_BRANCH']) {
						sourceCode.custom["branch"] = serviceEnvs['SOAJS_GIT_BRANCH'];
					}
					if(serviceEnvs['SOAJS_GIT_PATH']) {
						sourceCode.custom["path"] = serviceEnvs['SOAJS_GIT_PATH'];
					}
					
					let extraRepo = [
						{
							'name': 'custom_branch',
							'label': 'Branch',
							'type': 'select',
							'value': [],
							'fieldMsg': 'Choose your branch',
							'required': catalogRecipe.recipe.deployOptions.sourceCode.custom.required
						},
						{
							'name': 'custom_path',
							'label': 'Path',
							'type': 'text',
							'value': "",
							'fieldMsg': 'Unless specified, the root will be used',
							'required': false
						}
					];
					
					let sourceCodeConfig = {
						"type": "group",
						"label": catalogRecipe.recipe.deployOptions.sourceCode.custom.label,
						"entries": [
							{
								'name': 'custom_repository',
								'label': 'Repository',
								'type': 'select',
								'value': [{"v": "", "l": "-- No Repo --"}],
								'fieldMsg': 'Choose your repository',
								'required': catalogRecipe.recipe.deployOptions.sourceCode.custom.required,
								'onAction': function(id, data, form) {
									form.entries.forEach((oneEntry) => {
										if(oneEntry.label === catalogRecipe.recipe.deployOptions.sourceCode.custom.label){
											oneEntry.entries.length = 1;
											let opts = {
												id: data.id,
												name: data.repo,
												provider: data.provider,
												type: data.type,
												subRepo: data.subRepo,
												subName: data.subName
											};
											if(data){
												form.formData.custom_path = sourceCode.custom["path"] = '';
												injectBrancheAndPath(opts, extraRepo, oneEntry, 'custom');
											}
										}
									});
								}
							}
						]
					};
					
					if(sourceCode.custom.repo !== ''){
						accounts.forEach((oneAccount) => {
							oneAccount.repos.forEach((oneRepo) => {
								if(oneRepo.name === sourceCode.custom.repo){
									let opts = {
										id: oneAccount._id,
										name: sourceCode.custom.repo,
										provider: oneAccount.provider,
										type: oneRepo.type
									};
									if(oneRepo.type === 'multi'){
										opts.subRepo = sourceCode.custom.path;
									}
									
									injectBrancheAndPath(opts, extraRepo, sourceCodeConfig, 'custom', () => {
										prefilForm(sourceCodeConfig);
									});
								}
							});
						});
					}
					else{
						prefilForm(sourceCodeConfig);
					}
				}
			}
			else{
				return cb();
			}
			
			function prefilForm(sourceCodeConfig){
				//fill the first element repositories with allowed values and highlight the one that has an env variable if any
				if (accounts) {
					let lockedType;
					if(catalogRecipe.recipe.deployOptions.sourceCode && catalogRecipe.recipe.deployOptions.sourceCode.custom && catalogRecipe.recipe.deployOptions.sourceCode.custom.type){
						lockedType = catalogRecipe.recipe.deployOptions.sourceCode.custom.type;
					}
					accounts.forEach(function (eachAccount) {
						if (eachAccount.repos) {
							eachAccount.repos.forEach(function (eachRepo) {
								if (['custom','service','daemon','static'].indexOf(eachRepo.type) !== -1) {
									if(!lockedType || lockedType === eachRepo.type) {
										sourceCodeConfig.entries[0].value.push({
											l: eachRepo.name,
											v: {
												id: eachAccount._id,
												owner: eachAccount.owner,
												repo: eachRepo.name,
												provider: eachAccount.provider,
												type: eachRepo.type
											},
											selected: (sourceCode.custom['repo'] === eachRepo.name)
										});
									}
								}
								else if (eachRepo.type === 'multi'){
									eachRepo.configSHA.forEach((subRepo) => {
										
										//if not locked or locked from catalog and the value is multi
										if(!lockedType || lockedType === 'multi'){
											
											//check for sub name and acceptable type
											if(!catalogRecipe.recipe.deployOptions.sourceCode.custom.subName || catalogRecipe.recipe.deployOptions.sourceCode.custom.subName === subRepo.contentName) {
												if (['custom', 'service', 'daemon', 'static'].indexOf(subRepo.contentType) !== -1) {
													sourceCodeConfig.entries[0].value.push({
														l: eachRepo.name + "/" + subRepo.contentName,
														v: {
															id: eachAccount._id,
															owner: eachAccount.owner,
															repo: eachRepo.name,
															provider: eachAccount.provider,
															subRepo: subRepo.path,
															subName: subRepo.contentName,
															type: eachRepo.type
														},
														selected: (sourceCode.custom['repo'] === eachRepo.name)
													});
												}
											}
										}
										
										//if not locked or locked from catalog and value not multi
										if(!lockedType || lockedType !== 'multi'){
											//one of the sub repo types should match locked type or no locked type and acceptable type
											if ((!lockedType && ['custom', 'service', 'daemon', 'static'].indexOf(subRepo.contentType) !== -1) || (lockedType === subRepo.contentType)) {
												sourceCodeConfig.entries[0].value.push({
													l: eachRepo.name + "/" + subRepo.contentName,
													v: {
														id: eachAccount._id,
														owner: eachAccount.owner,
														repo: eachRepo.name,
														provider: eachAccount.provider,
														subRepo: subRepo.path,
														subName: subRepo.contentName,
														type: eachRepo.type
													},
													selected: (sourceCode.custom['repo'] === eachRepo.name)
												});
											}
										}
									});
								}
							});
						}
					});
				}
				
				formConfig.entries.push(sourceCodeConfig);
				return cb();
			}
		}
		
		function injectBrancheAndPath(opts, extraRepo, oneEntry, type, callback){
			getBranches(opts, (error, branches) => {
				if(error){
					currentScope.displayAlert('danger', error.message);
				}
				else{
					let temp = angular.copy(extraRepo);
					branches.branches.forEach((oneGitBranch) => {
						temp[0].value.push({
							v: oneGitBranch,
							l: oneGitBranch.name,
							selected: (sourceCode[type].branch === oneGitBranch.name)
						});
					});
					temp[1].value = '';
					if(opts.type === 'multi' && opts.subRepo){
						// temp[1].type = 'hidden';
						temp[1].type = 'readonly';
						temp[1].value = opts.subRepo.replace("/config.js", "/");
					}
					else{
						temp[1].value = sourceCode[type].path;
					}
					oneEntry.entries = oneEntry.entries.concat(temp);
					if(callback){
						return callback();
					}
				}
			});
		}
		
		function listAccounts(callback) {
			getSendDataFromServer(currentScope, ngDataApi, {
				'method': 'get',
				'routeName': '/dashboard/gitAccounts/accounts/list',
				params: {
					fullList: true
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				} else {
					return callback(response);
				}
			});
		}
		
		function getBranches(opts, callback) {
			getSendDataFromServer(currentScope, ngDataApi, {
				'method': 'get',
				'routeName': '/dashboard/gitAccounts/getBranches',
				params: {
					id: opts.id,
					name: opts.name,
					type: 'repo',
					provider: opts.provider
				}
			}, callback);
		}
		
		function getServiceBranches(gitAccounts, opts, cb) {
			let nextOpts = {};
			gitAccounts.forEach((oneGitAccount) => {
				
				for (let i = 0; i < oneGitAccount.repos.length; i++) {
					let oneRepo = oneGitAccount.repos[i];
					if (oneRepo.name === opts.repo_owner + "/" + opts.repo_name) {
						nextOpts._id = oneGitAccount._id;
						nextOpts.provider = oneGitAccount.provider;
						break;
					}
				}
			});
			getBranches({
				'id': nextOpts._id,
				'provider': nextOpts.provider,
				'name': opts.repo_owner + "/" + opts.repo_name,
				'type': 'repo'
			}, (error, response) => {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				} else {
					return cb(response);
				}
			});
		}
		
		function doRebuild(formData, accounts) {
			var params = {
				env: currentScope.envCode,
				serviceId: service.id,
				mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : ''),
				action: 'rebuild'
			};
			
			if (formData && Object.keys(formData).length > 0) {
				//inject user input catalog entry and image override
				if (!params.custom) {
					params.custom = {};
				}
				
				params.custom = {
					image: {
						name: formData['ImageName'],
						prefix: formData['ImagePrefix'],
						tag: formData['ImageTag']
					}
				};
				
				if (formData.branch) {
					var t = formData.branch;
					if (typeof t === 'string') {
						t = JSON.parse(angular.copy(formData.branch));
					}
					
					params.custom.branch = t.name;
					if (t.commit && t.commit.sha) {
						params.custom.commit = t.commit.sha;
					}
				}
				
				for (var input in formData) {
					if (input.indexOf('_ci_') !== -1) {
						if (!params.custom.env) {
							params.custom.env = {};
						}
						params.custom.env[input.replace('_ci_', '')] = formData[input];
					}
				}
				
				if(sourceCode && Object.keys(sourceCode).length > 0){
					params.custom.sourceCode = {};
					
					if(sourceCode.configuration && formData.config_repository){
						params.custom.sourceCode.configuration = {};
						if(typeof(formData.config_repository) === 'string'){
							if(formData.config_repository !== ''){
								params.custom.sourceCode.configuration = {
									"repo" : sourceCode.configuration.repo,
									"branch" : sourceCode.configuration.branch,
									"owner" : sourceCode.configuration.repo.split("/")[0],
									"path": formData.config_path
								};
							}
							else{
								delete params.custom.sourceCode.configuration;
							}
						}
						else if(formData.config_repository){
							params.custom.sourceCode.configuration = {
								"repo" : formData.config_repository.repo,
								"branch" : formData.config_branch.name,
								"commit" : formData.config_branch.commit.sha,
								"owner" : formData.config_repository.owner,
								"path": formData.config_path
							};
						}
					}
					
					if(sourceCode.custom && formData.custom_repository){
						params.custom.sourceCode.custom = {};
						if(typeof(formData.custom_repository) === 'string'){
							if(formData.custom_repository !== ''){
								params.custom.sourceCode.custom = {
									"repo" : sourceCode.custom.repo,
									"branch" : sourceCode.custom.branch,
									"owner" : sourceCode.custom.repo.split("/")[0],
									"path": formData.custom_path,
									"subName": (sourceCode.custom.subName) ? sourceCode.custom.subName : null
								};
							}
							else{
								delete params.custom.sourceCode.custom;
							}
						}
						else if(formData.custom_repository){
							params.custom.sourceCode.custom = {
								"repo" : formData.custom_repository.repo,
								"branch" : formData.custom_branch.name,
								"commit" : formData.custom_branch.commit.sha,
								"owner" : formData.custom_repository.owner,
								"path": (formData.custom_repository.subRepo) ? formData.custom_repository.subRepo.replace("/config.js", "/") : formData.custom_path,
								"subName": (formData.custom_repository.subName) ? formData.custom_repository.subName : null
							};
						}
					}
				}
				
				if (formData.ports){
					params.custom.ports = formData.ports;
				}
			}
			
			if (!params.custom){
				params.custom = {
					name: service.name
				}
			}
			else {
				params.custom.name = service.name;
			}
			
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'put',
				routeName: '/dashboard/cloud/services/redeploy',
				params: {
					namespace: service.namespace || ''
				},
				data: params
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					currentScope.displayAlert('success', 'Service rebuilt successfully');
					if (currentScope.modalInstance) {
						currentScope.modalInstance.dismiss();
					}
					$timeout(() => {
						overlayLoading.hide();
						currentScope.listServices();
					}, 1500);
				}
			});
		}
	}
	
	return {
		'redeployService': redeployService,
		'rebuildService': rebuildService
	};
}]);