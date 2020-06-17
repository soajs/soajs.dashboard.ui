"use strict";
var deployReposService = soajsApp.components;
deployReposService.service('deployRepos', ['ngDataApi', '$timeout', '$modal', '$cookies','deployServiceDep', function (ngDataApi, $timeout, $modal, $cookies,deployServiceDep) {
	if ($cookies.getObject('myEnv', {'domain': interfaceDomain})){
		var envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
		var envPlatform = envDeployer.selected.split('.')[1];
		var isKubernetes = (envPlatform && envPlatform.toLowerCase() === "kubernetes");
	}
	
	/**
	 * get soajs rms, get services, get awareness stat for this enviornment
	 * aggregate and build json list to show who is running and who is not
	 * @param currentScope
	 * @param cb
	 */
	function displaySOAJSRMS(currentScope, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/gitAccounts/accounts/list',
			"params": {
				"fullList": true,
				'rms': true
			}
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.accounts = angular.copy(response);
				
				if (!Array.isArray(currentScope.accounts)) {
					currentScope.accounts = [currentScope.accounts];
				}
				
				if (currentScope.accounts.length > 0) {
					if (cb && typeof cb === 'function') {
						return cb();
					}
				}
				
				if(currentScope.accounts.length === 1){
					currentScope.accounts[0].hide = false;
					currentScope.accounts[0].icon = 'minus';
				}
				
				getServices(currentScope, () => {
					
					//get controller awareness
					getSendDataFromServer(currentScope, ngDataApi, {
						'method': 'get',
						'routeName': '/dashboard/hosts/maintenance',
						"params": {
							"env": currentScope.envCode,
							"serviceName": "controller",
							'operation': "awarenessStat"
						}
					}, function (error, response) {
						overlayLoading.hide();
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						currentScope.accounts[0].repos.forEach((oneRepo) => {
							if (oneRepo.type === 'service') {
								let versions = [];
								currentScope.services.forEach((oneService) => {
									if(oneService.name === oneRepo.serviceName) {
										let myVersion = {};
										if(oneService.versions){
											Object.keys(oneService.versions).forEach(function (oneVersion) {
												oneService.versions[oneVersion].v = oneVersion;
												myVersion.version = 1;
												if(response){
													for(let oneService in response.data.services){
														if(oneRepo.serviceName === oneService && response.data.services[oneService].hosts){
															if(response.data.services[oneService].hosts[oneVersion.toString()] && response.data.services[oneService].version.toString() === oneVersion.toString()){
																myVersion = {
																	healthy : true,
																	version: oneVersion,
																	hosts : response.data.services[oneService].hosts,
																	port : response.data.services[oneService].port
																};
															}
														}
													}
												}
											});
										}
										else{
											let oneVersion = 1;
											myVersion.version = oneVersion;
											if(response){
												for(let oneService in response.data.services){
													if(oneRepo.serviceName === oneService && response.data.services[oneService].hosts){
														if(response.data.services[oneService].hosts[oneVersion.toString()]){
															myVersion = {
																healthy : true,
																version: oneVersion.toString(),
																hosts : response.data.services[oneService].hosts,
																port : response.data.services[oneService].port
															};
														}
													}
												}
											}
										}
										versions.push(myVersion);
									}
								});
								
								if(versions.length > 0){
									oneRepo.versions = versions;
								}
							}
						});
					});
				});
			}
		});
	}
	
	/**
	 * call api to start the service in this environment
	 * @param currentScope
	 * @param oneRepo
	 * @param version
	 */
	function startService(currentScope, oneRepo, version){
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'post',
			'routeName': '/dashboard/hosts/start',
			"params": {
				"env": currentScope.envCode
			},
			"data": {
				"serviceName": oneRepo.serviceName,
				"serviceVersion": version.version.toString()
			}
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				setTimeout(() => {
					displaySOAJSRMS(currentScope);
				}, 1000);
			}
		});
	}
	
	/**
	 * call api to stop the service in this environment
	 * @param currentScope
	 * @param oneRepo
	 * @param version
	 */
	function stopService(currentScope, oneRepo, version){
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'post',
			'routeName': '/dashboard/hosts/stop',
			"params": {
				"env": currentScope.envCode
			},
			"data": {
				"serviceName": oneRepo.serviceName,
				"serviceVersion": version.version.toString()
			}
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				setTimeout(() => {
					displaySOAJSRMS(currentScope);
				}, 1000);
			}
		});
	}
	
	function listEndpoints(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/gitAccounts/accounts/list',
			"params": {
				"fullList": true
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.accounts = angular.copy(response);
				
				if (!Array.isArray(currentScope.accounts)) {
					currentScope.accounts = [currentScope.accounts];
				}
				
				if (currentScope.accounts.length > 0) {
					getCatalogRecipes(currentScope, function () {
						getServices(currentScope, function () {
							getDaemons(currentScope, function () {
								processGitAccountsEndpoints(function() {
									
									if(cb && typeof cb === 'function'){
										return cb();
									}
									else{
										getCdData(currentScope, function () {
											getDeployedServices(currentScope);
										});
									}
								});
							});
						});
					});
				}
				currentScope.account = currentScope.accounts[0];
			}
		});
		
		function processGitAccountsEndpoints(cb){
			for (let account = currentScope.accounts.length -1; account >=0; account--){
				if( currentScope.accounts[account].owner !==  "soajs"){
					currentScope.accounts.splice(account, 1);
					continue;
				}
				let oneAccount = currentScope.accounts[account];
				oneAccount.hide = true;
				
				var repoComponents = [];
				var repoComponentsNames =[];
				
				if(!oneAccount.repos || oneAccount.repos.length === 0){
					currentScope.accounts.splice(account, 1);
					continue;
				}else{
					for(let i = oneAccount.repos.length -1; i >=0; i--){
						oneAccount.repos[i].full_name = oneAccount.repos[i].name;
						if(oneAccount.repos[i].name.indexOf("/") !== -1){
							oneAccount.repos[i].owner = oneAccount.repos[i].name.split("/")[0];
							oneAccount.repos[i].name = oneAccount.repos[i].name.split("/")[1];
						}
						if(!oneAccount.repos[i].owner){
							oneAccount.repos[i].owner = {
								login: oneAccount.owner
							};
						}
						if(oneAccount.repos[i].type !== "component"
							|| (oneAccount.repos[i].type !== "component" && oneAccount.repos[i].name === "soajs/soajs.epg")){
							oneAccount.repos.splice(i, 1);
						}
					}
				}
				
				if(!oneAccount.repos || oneAccount.repos.length === 0){
					currentScope.accounts.splice(account, 1);
				}
				else{
					for(var inverse = oneAccount.repos.length -1; inverse >=0; inverse --){
						var oneRepo = oneAccount.repos[inverse];
						var repoServices = [];
						if (oneRepo.type === 'component'){
							if(repoComponentsNames.indexOf(oneRepo.name) === -1){
								repoComponentsNames.push(oneRepo.name);
								repoComponents.push(oneRepo);
							}
							oneAccount.repos.splice(inverse, 1);
						}
						oneRepo.servicesList = repoServices;
					}
					
					repoComponents.forEach(function(oneRepoComponent){
						currentScope.originalServices.forEach(function (oneService) {
							if (oneService.src && oneService.src.repo === oneRepoComponent.name) {
								oneService.type = 'service';
								oneRepoComponent.servicesList.push(oneService);
							}
						});
						if (oneRepoComponent.servicesList.length > 0) {
							oneAccount.repos.push(oneRepoComponent);
						}
					});
					
					oneAccount.repos.forEach(function (oneRepo, index) {
						oneRepo.servicesList.forEach(function (oneRepoService) {
							var type = (oneRepoService.type === 'service') ? 'services': 'daemons';
							currentScope[type].forEach(function (oneService) {
								if (oneService.name === oneRepoService.name) {
									oneRepoService.versions = [];
									if (oneService.versions) {
										Object.keys(oneService.versions).forEach(function (oneVersion) {
											if(type === 'daemons' && oneService.grpConf){
												oneService.versions[oneVersion] = {};
												oneService.versions[oneVersion].grpConf = oneService.grpConf;
												oneService.grpConf.forEach(function(oneGroup){
													if(!oneService.versions[oneVersion][oneGroup.daemonConfigGroup]){
														oneService.versions[oneVersion][oneGroup.daemonConfigGroup] = {};
													}
												});
											}
											if(oneService.prerequisites){
												oneService.versions[oneVersion].prerequisites = oneService.prerequisites;
											}
											if(oneService.gcId){
												oneService.versions[oneVersion].gcId = oneService.gcId;
											}
											oneService.versions[oneVersion].v = oneVersion;
											oneRepoService.versions.push(oneService.versions[oneVersion]);
										});
									}
								}
							});
						});
					});
				}
			}
			
			return cb();
		}
	}
	
	function listGitAccounts(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/gitAccounts/accounts/list',
			"params": {
				"fullList": true
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.accounts = angular.copy(response);
				
				if (!Array.isArray(currentScope.accounts)) {
					currentScope.accounts = [currentScope.accounts];
				}
				
				if (currentScope.accounts.length > 0) {
					getCatalogRecipes(currentScope, function () {
						getServices(currentScope, function () {
							getDaemons(currentScope, function () {
								processGitAccountsRepos(function() {
									
									if(cb && typeof cb === 'function'){
										return cb();
									}
									else{
										getCdData(currentScope, function () {
											getDeployedServices(currentScope);
										});
									}
								});
							});
						});
					});
				}
				if(currentScope.accounts.length === 1){
					currentScope.accounts[0].hide = false;
					currentScope.accounts[0].icon = 'minus';
				}
			}
		});
		
		function processGitAccountsRepos(cb){
			for (let account = currentScope.accounts.length -1; account >=0; account--){
				let oneAccount = currentScope.accounts[account];
				oneAccount.hide = true;
				
				if (oneAccount.owner === 'soajs' && oneAccount.repos) {
					for (var i = oneAccount.repos.length - 1; i >= 0; i--) {
						if (['soajs/soajs.dashboard'].indexOf(oneAccount.repos[i].name) !== -1) {
							oneAccount.repos.splice(i, 1);
						}
					}
				}
				
				var repoComponents = [];
				var repoComponentsNames =[];
				
				if(!oneAccount.repos || oneAccount.repos.length === 0){
					currentScope.accounts.splice(account, 1);
					continue;
				}else{
					for(let i = oneAccount.repos.length -1; i >=0; i--){
						oneAccount.repos[i].full_name = oneAccount.repos[i].name;
						if(oneAccount.repos[i].name.indexOf("/") !== -1){
							oneAccount.repos[i].owner = oneAccount.repos[i].name.split("/")[0];
							oneAccount.repos[i].name = oneAccount.repos[i].name.split("/")[1];
						}
						if(!oneAccount.repos[i].owner){
							oneAccount.repos[i].owner = {
								login: oneAccount.owner
							};
						}
						if (oneAccount.repos[i].full_name === "soajs/soajs.epg"){
							oneAccount.repos.splice(i, 1);
						}
						
						if(oneAccount.repos[i] && oneAccount.repos[i].type === 'multi'){
							if(oneAccount.repos[i].configSHA.length === 0){
								oneAccount.repos.splice(i, 1);
							}
							else{
								for(let multiCount = oneAccount.repos[i].configSHA.length -1; multiCount >=0; multiCount--){
									if(['service','daemon', 'custom','component'].indexOf(oneAccount.repos[i].configSHA[multiCount].contentType) === -1){
										oneAccount.repos[i].configSHA.splice(multiCount, 1);
									}
								}
								if(oneAccount.repos[i].configSHA.length === 0){
									oneAccount.repos.splice(i, 1);
								}
							}
						}
						else if(oneAccount.repos[i] && ['service','daemon', 'custom','component'].indexOf(oneAccount.repos[i].type) === -1){
							oneAccount.repos.splice(i, 1);
						}
					}
				}
				
				if(!oneAccount.repos || oneAccount.repos.length === 0){
					currentScope.accounts.splice(account, 1);
				}
				else{
					for(var inverse = oneAccount.repos.length -1; inverse >=0; inverse --){
						var oneRepo = oneAccount.repos[inverse];
						var repoServices = [];
						if (oneRepo.type === 'service' || oneRepo.type === 'daemon') {
							repoServices.push({ name: oneRepo.serviceName, type: oneRepo.type });
						}
						else if (oneRepo.type === 'multi') {
							oneRepo.configSHA.forEach((oneSub) => {
								oneSub.type = oneSub.contentType;
								oneSub.name = oneSub.contentName;
								repoServices.push(oneSub);
							});
						}
						else if (oneRepo.type === 'component'){
							if(repoComponentsNames.indexOf(oneRepo.name) === -1){
								repoComponentsNames.push(oneRepo.name);
								repoComponents.push(oneRepo);
							}
							oneAccount.repos.splice(inverse, 1);
						}
						
						oneRepo.servicesList = repoServices;
					}
					
					repoComponents.forEach(function(oneRepoComponent){
						currentScope.originalServices.forEach(function (oneService) {
							if (oneService.src && oneService.src.repo === oneRepoComponent.name) {
								oneService.type = 'service';
								oneRepoComponent.servicesList.push(oneService);
							}
						});
						if (oneRepoComponent.servicesList.length > 0) {
							oneAccount.repos.push(oneRepoComponent);
						}
					});
					
					oneAccount.repos.forEach(function (oneRepo, index) {
						oneRepo.servicesList.forEach(function (oneRepoService) {
							var type = (oneRepoService.type === 'service') ? 'services': 'daemons';
							currentScope[type].forEach(function (oneService) {
								if (oneService.name === oneRepoService.name) {
									oneRepoService.versions = [];
									if (oneService.versions) {
										Object.keys(oneService.versions).forEach(function (oneVersion) {
											if(type === 'daemons' && oneService.grpConf){
												oneService.versions[oneVersion] = {};
												oneService.versions[oneVersion].grpConf = oneService.grpConf;
												oneService.grpConf.forEach(function(oneGroup){
													if(!oneService.versions[oneVersion][oneGroup.daemonConfigGroup]){
														oneService.versions[oneVersion][oneGroup.daemonConfigGroup] = {};
													}
												});
											}
											if(oneService.prerequisites){
												oneService.versions[oneVersion].prerequisites = oneService.prerequisites;
											}
											if(oneService.gcId){
												oneService.versions[oneVersion].gcId = oneService.gcId;
											}
											oneService.versions[oneVersion].v = oneVersion;
											oneRepoService.versions.push(oneService.versions[oneVersion]);
										});
									}
								}
							});
						});
					});
				}
			}
			
			return cb();
		}
	}
	
	function getCdData (currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cd"
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				if (!response[currentScope.envCode.toUpperCase()] || Object.keys(response[currentScope.envCode.toUpperCase()]).length === 0) {
					currentScope.cdSettings = {};
					return cb();
				}
				
				currentScope.cdSettings = response[currentScope.envCode.toUpperCase()];
				currentScope.accounts.forEach(function(oneAccount) {
					if (oneAccount.repos && oneAccount.repos.length > 0) {
						oneAccount.repos.forEach(function (oneRepo) {
							if (currentScope.cdSettings[oneRepo.name]) {
								oneRepo.deploySettings = currentScope.cdSettings[oneRepo.name];
							}
							
							oneRepo.servicesList.forEach(function (oneService) {
								if (currentScope.cdSettings[oneService.name]) {
									oneService.deploySettings = currentScope.cdSettings[oneService.name];
									
									if (oneService.versions && oneService.versions.length > 0) {
										oneService.versions.forEach(function (oneVersion) {
											if (currentScope.cdSettings[oneService.name]['v' + oneVersion.v]) {
												if (currentScope.daemonGrpConf) {
													if(currentScope.cdSettings[oneService.name]['v' + oneVersion.v][currentScope.daemonGrpConf]){
														if(!oneVersion.deploySettings){
															oneVersion.deploySettings = {};
														}
														oneVersion.deploySettings[currentScope.daemonGrpConf] = currentScope.cdSettings[oneService.name]['v' + oneVersion.v][currentScope.daemonGrpConf];
													}
												} else {
													oneVersion.deploySettings = currentScope.cdSettings[oneService.name]['v' + oneVersion.v];
												}
											}
										});
									}
								}
							});
						});
					}
				});
				
				return cb();
			}
		});
	}
	
	function getDeployedServices(currentScope) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cloud/services/list",
			"params": {
				"env": currentScope.envCode.toLowerCase()
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.accounts.forEach(function (oneAccount) {
					if (oneAccount.repos && oneAccount.repos.length > 0) {
						oneAccount.repos.forEach(function (oneRepo) {
							if (oneRepo.servicesList && oneRepo.servicesList.length > 0) {
								oneRepo.servicesList.forEach(function (oneService) {
									oneService.deployedVersionsCounter = 0;
									oneService.deployedConfigCounter = {};
									response.forEach(function (oneDeployedEntry) {
										if (oneDeployedEntry.labels && oneDeployedEntry.labels['soajs.service.name']) {
											if(
												(oneService.type === 'daemon' && oneDeployedEntry.labels['soajs.service.name'] === oneService.name + "-" + oneDeployedEntry.labels['soajs.daemon.group']) ||
												oneDeployedEntry.labels['soajs.service.name'] === oneService.name && oneDeployedEntry.labels['soajs.service.type'] === oneService.type
											){
												oneService.deployed = true;
												if (oneService.versions && oneService.versions.length > 0) {
													oneService.versions.forEach(function (oneVersion) {
														if (oneDeployedEntry.labels && oneDeployedEntry.labels['soajs.service.version'] && oneDeployedEntry.labels['soajs.service.version'] === oneVersion.v) {
															if(oneDeployedEntry.env && oneDeployedEntry.labels['soajs.service.type'] === 'daemon'){
																oneDeployedEntry.env.forEach(function (oneEnv) {
																	if(oneEnv.indexOf("SOAJS_DAEMON_GRP_CONF") !== -1){
																		oneVersion.deployed = true;
																		if(!oneService.deployedConfigCounter[oneVersion.v]){
																			oneService.deployedConfigCounter[oneVersion.v] = 0;
																		}
																		oneService.deployedConfigCounter[oneVersion.v]++;
																		// oneVersion[oneEnv.split("=")[1]].deployed = true;
																		// oneVersion[oneEnv.split("=")[1]].serviceId = oneDeployedEntry.id;
																		oneVersion.serviceId = oneDeployedEntry.id;
																		if(!oneVersion.deploySettings || !oneVersion.deploySettings[oneEnv.split("=")[1]]){
																			getDeploySettings(currentScope, oneDeployedEntry, function (deploySettings) {
																				if(Object.keys(deploySettings).length > 0){
																					if(!oneVersion.deploySettings){
																						oneVersion.deploySettings = {};
																					}
																					oneVersion.deploySettings[oneEnv.split("=")[1]] = deploySettings;
																				}
																			});
																		}
																	}
																});
															}
															else{
																oneVersion.deployed = true;
																oneVersion.serviceId = oneDeployedEntry.id;
																oneService.deployedVersionsCounter++;
																if(!oneVersion.deploySettings){
																	getDeploySettings(currentScope, oneDeployedEntry, function (deploySettings) {
																		if(Object.keys(deploySettings).length > 0){
																			oneVersion.deploySettings = deploySettings;
																		}
																	});
																}
															}
														}
													});
												}
												else {
													oneService.deployed = true;
													oneService.serviceId = oneDeployedEntry.id;
													if(!oneService.deploySettings){
														getDeploySettings(currentScope, oneDeployedEntry, function (deploySettings) {
															if(Object.keys(deploySettings).length > 0){
																oneService.deploySettings = deploySettings;
															}
														});
													}
												}
											}
										}
									});
								});
							}
							else {
								response.forEach(function (oneDeployedEntry) {
									if (oneDeployedEntry.labels && oneDeployedEntry.labels['service.repo'] && oneDeployedEntry.labels['service.repo'] === oneRepo.name) {
										oneRepo.deployed = true;
										oneRepo.serviceId = oneDeployedEntry.id;
										if(!oneRepo.deploySettings){
											getDeploySettings(currentScope, oneDeployedEntry, function (deploySettings) {
												if(Object.keys(deploySettings).length > 0){
													oneRepo.deploySettings = deploySettings;
												}
											});
										}
									}
								});
							}
						});
					}
				});
			}
		});
	}
	
	function checkHeapster(currentScope, cb) {
		let envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
		let envPlatform = envDeployer.selected.split('.')[1];
		if(envPlatform !== 'kubernetes') {
			if(cb) return cb();
		}
		else{
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/cloud/resource',
				params: {
					"env": currentScope.envCode,
					"resource": "heapster",
					"namespace": "kube-system"
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					currentScope.isHeapsterDeployed = response.deployed;
					currentScope.isAutoScalable = currentScope.isHeapsterDeployed;
					if(cb) return cb();
				}
			});
		}
	}
	
	function getServices(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/services/list"
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.services = angular.copy(response.records);
				currentScope.originalServices = angular.copy(response.records);
				return cb();
			}
		});
	}
	
	function getDaemons(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/daemons/list",
			"params": {
				"getGroupConfigs" : true
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.daemons = response;
				return cb();
			}
		});
	}
	
	function deployService(currentScope, oneRepo, service, version, gitAccount, daemonGrpConf) {
		if(currentScope.oldStyle){
			openUpgradeModal(currentScope);
		}
		else{
			if ($cookies.getObject('myEnv', {'domain': interfaceDomain})){
				var envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
				var envPlatform = envDeployer.selected.split('.')[1];
				var isKubernetes = (envPlatform && envPlatform.toLowerCase() === "kubernetes");
			}
			
			var deployService = $modal.open({
				templateUrl: 'deployService.tmpl',
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope, $modalInstance) {
					
					fixBackDrop();
					
					deployServiceDep.buildDeployForm($scope, currentScope, oneRepo, service, version, gitAccount, daemonGrpConf,isKubernetes, $modalInstance, function(err){
						if (err){
							currentScope.displayAlert('danger', err.message);
						}
					});
					
					$scope.cancel = function () {
						deployService.close();
					};
					
					$scope.saveRecipe = function (type) {
						saveRecipe($scope, type)
					};
				}
			});
		}
	}
	
	function getCatalogRecipes(currentScope, cb) {
		currentScope.loadingRecipes = true;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list'
		}, function (error, response) {
			currentScope.loadingRecipes = false;
			if (error) {
				currentScope.displayAlert('danger', 'Unable to retrieve catalog recipes');
				return cb(true);
			}
			else {
				currentScope.recipes = {};
				response.forEach(function (oneRecipe) {
					if(oneRecipe.type ==='soajs' || oneRecipe.recipe.deployOptions.specifyGitConfiguration || oneRecipe.recipe.deployOptions.voluming.volumes){
						currentScope.oldStyle = true;
					}
					else{
						if (!currentScope.recipes[oneRecipe.type]) {
							currentScope.recipes[oneRecipe.type] = [];
						}
						currentScope.recipes[oneRecipe.type].push(oneRecipe);
					}
				});
				return cb(null);
			}
		});
	}
	
	function saveRecipe(currentScope, type, cb) {
		var configuration = {};
		var modes = ['deployment', 'replicated'];
		var oneEnv = currentScope.oneEnv;
		var version = currentScope.version;
		var oneRepo = currentScope.oneSrv;
		configuration.serviceName = oneRepo;
		configuration.env = oneEnv;
		currentScope.updateGitBranch(oneRepo, oneEnv, version);
		
		function reformatSourceCodeForCicd(record) {
			if (record.configuration && record.configuration.repo) {
				let selectedRepo = record.configuration.repo;
				
				if (selectedRepo === '-- Leave Empty --') {
					record.configuration = {
						repo: "",
						branch: ""
					};
				} else {
					if(currentScope.configRepos && currentScope.configRepos.config){
						currentScope.configRepos.config.forEach(function (eachConf) {
							if (eachConf.name === selectedRepo) {
								record.configuration.commit = eachConf.configSHA;
								record.configuration.owner = eachConf.owner;
							}
						});
					}
				}
			}
			
			return record;
		}
		
		currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.custom.sourceCode = reformatSourceCodeForCicd(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.custom.sourceCode);
		
		if (version === 'Default') {
			configuration.default = {};
			if (currentScope.showCD) {
				configuration.default = {
					branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.gitSource.branch,
					strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy,
					deploy: false
				};
			}
			if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options) {
				if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.custom && currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.custom.version) {
					delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.custom.version;
				}
				if (modes.indexOf(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) === -1) {
					delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.replicas;
				}
				configuration.default.options = angular.copy(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options);
				if (configuration.default.options && configuration.default.options.deployConfig && Object.hasOwnProperty.call(configuration.default.options.deployConfig, 'memoryLimit')) {
					if(configuration.custom && configuration.custom.memory){
						configuration.custom.memory = configuration.default.options.deployConfig.memoryLimit;
					}
				}
				
				if((!currentScope.autoScale || !currentScope.isAutoScalable || configuration.default.options.deployConfig.replication.mode !== 'deployment') && configuration.default.options.autoScale){
					delete  configuration.default.options.autoScale;
				}
				else if(configuration.default.options.deployConfig.replication.mode === 'deployment' && currentScope.isAutoScalable && configuration.default.options.autoScale && configuration.default.options.autoScale.replicas && configuration.default.options.autoScale.replicas.min){
					configuration.default.options.deployConfig.replication.replicas = configuration.default.options.autoScale.replicas.min;
				}
				configuration.default.deploy = true;
				if (configuration.default.options.custom && configuration.default.options.custom && Object.hasOwnProperty.call(configuration.default.options.custom, 'loadBalancer')){
					delete configuration.default.options.custom.loadBalancer;
				}
			}
			
			if(!configuration.default.options.autoScale){
				delete configuration.default.options.autoScale;
			}
		}
		else {
			configuration.version = {
				v: 'v' + version,
				deploy: false
			};
			if (currentScope.showCD) {
				configuration.version = {
					v: 'v' + version,
					branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.gitSource.branch,
					strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy,
					deploy: false
				};
			}
			if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options) {
				if (modes.indexOf(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) === -1) {
					delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.replicas;
				}
				configuration.version.options = angular.copy(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options);
				
				if (configuration.version.options && configuration.version.options.deployConfig && Object.hasOwnProperty.call(configuration.version.options.deployConfig, 'memoryLimit')) {
					
					if(configuration.version.options.custom){
						configuration.version.options.custom.memory = configuration.version.options.deployConfig.memoryLimit;
					}
				}
				
				if (currentScope.services[currentScope.oneSrv] && currentScope.services[currentScope.oneSrv].gcId) {
					if (!configuration.version.options.custom) {
						configuration.version.options.custom = {};
					}
					configuration.version.options.custom.gc = {
						"gcName": currentScope.oneSrv,
						"gcVersion": currentScope.version.toString()
					}
				}
				if((!currentScope.autoScale || !currentScope.isAutoScalable || configuration.version.options.deployConfig.replication.mode !== 'deployment') && configuration.version.options.autoScale){
					delete  configuration.version.options.autoScale;
				}
				else if(configuration.version.options.deployConfig.replication.mode === 'deployment' && configuration.version.options.autoScale && configuration.version.options.autoScale.replicas && configuration.version.options.autoScale.replicas.min){
					configuration.version.options.deployConfig.replication.replicas = configuration.version.options.autoScale.replicas.min;
				}
				if (configuration.version.options.custom && configuration.version.options.custom && Object.hasOwnProperty.call(configuration.version.options.custom, 'loadBalancer')){
					delete configuration.version.options.custom.loadBalancer;
				}
				configuration.version.deploy = true;
			}
			
			if(!configuration.version.options.autoScale){
				delete configuration.version.options.autoScale;
			}
		}
		
		if(cb && typeof cb === 'function'){
			return cb(configuration);
		}
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cd',
			data: {
				"config": configuration
			}
		}, function (error) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var options = {};
				if (configuration.version && configuration.version.options) {
					options = configuration.version.options;
				}
				else if (configuration.default && configuration.default.options) {
					options = configuration.default.options;
				}
				switch (type) {
					case 'deploy':
						doDeploy(currentScope, options, false, currentScope.controllerScope);
						break;
					case 'rebuild':
						doRebuild(currentScope, options);
						break;
					default :
						if(currentScope.daemonGrpConf){
							currentScope.controllerScope.daemonGrpConf = currentScope.daemonGrpConf;
						}
						currentScope.controllerScope.getCdData(function () {
							currentScope.cancel();
							overlayLoading.hide();
							currentScope.controllerScope.displayAlert('success', 'Recipe Saved successfully');
						});
				}
			}
		});
	}
	
	function doDeploy(currentScope, params, external , controllerScope) {
		if (currentScope.oldStyle) {
			openUpgradeModal(currentScope);
		}
		else {
			overlayLoading.show();
			if(external || !controllerScope) {
				controllerScope = currentScope
			}
			if (params && params.custom && params.custom.version) {
				params.custom.version = params.custom.version.toString();
			}
			var config = {
				"method": "post",
				"routeName": "/dashboard/cloud/services/soajs/deploy",
				"data": params
			};
			getSendDataFromServer(currentScope, ngDataApi, config, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
					overlayLoading.hide();
				} else {
					if(!external){
						currentScope.cancel();
					}
					if(currentScope.daemonGrpConf){
						controllerScope.daemonGrpConf = currentScope.daemonGrpConf;
					}
					controllerScope.getCdData(function () {
						controllerScope.getDeployedServices();
						controllerScope.displayAlert('success', 'Service deployed successfully');
						overlayLoading.hide();
					});
				}
			});
		}
	}
	
	function doRebuild(currentScope, formData) {
		overlayLoading.show();
		var params = {
			env: currentScope.oneEnv,
			serviceId: currentScope.serviceId,
			mode: ((formData.deployConfig && formData.deployConfig.replication && formData.deployConfig.replication.mode) ? formData.deployConfig.replication.mode : ''),
			action: 'rebuild'
		};
		
		if(formData.deployConfig){
			params.deployConfig = formData.deployConfig;
		}
		if (formData.custom) {
			params.custom = formData.custom;
			params.recipe = formData.recipe;
			if(formData.gitSource && formData.gitSource.branch){
				params.custom.branch = formData.gitSource.branch;
			}
			if(formData.gitSource && formData.gitSource.commit){
				params.custom.commit = formData.gitSource.commit;
			}
			if(formData.deployConfig && Object.hasOwnProperty.call(formData.deployConfig, 'memoryLimit')){
				params.custom.memory = formData.deployConfig.memoryLimit;
			}
		}
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cloud/services/redeploy',
			data: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				if(currentScope.daemonGrpConf){
					currentScope.controllerScope.daemonGrpConf = currentScope.daemonGrpConf;
				}
				currentScope.controllerScope.getCdData(function () {
					currentScope.controllerScope.getDeployedServices();
					currentScope.cancel();
					currentScope.controllerScope.displayAlert('success', 'Service rebuilt successfully');
				});
			}
		});
	}
	
	function getDeploySettings (currentScope, oneDeployedEntry, cb) {
		var deploySettings = {};
		deploySettings.options = {};
		deploySettings.options.gitSource = {};
		deploySettings.options.deployConfig = {};
		deploySettings.options.deployConfig.replication = {};
		deploySettings.options.custom = {};
		deploySettings.options.custom.image = {};
		deploySettings.options.custom.env = {};
		
		if(oneDeployedEntry.labels){
			if(oneDeployedEntry.labels['service.branch']){
				deploySettings.options.gitSource.branch = oneDeployedEntry.labels['service.branch'];
				if(oneDeployedEntry.labels['service.commit']){
					deploySettings.options.gitSource.commit = oneDeployedEntry.labels['service.commit'];
				}
				if(oneDeployedEntry.labels['service.repo']){
					deploySettings.options.gitSource.repo = oneDeployedEntry.labels['service.repo'];
				}
				if(oneDeployedEntry.labels['service.owner']){
					deploySettings.options.gitSource.owner = oneDeployedEntry.labels['service.owner'];
				}
			}
			if(oneDeployedEntry.labels['soajs.catalog.id']){
				deploySettings.options.recipe = oneDeployedEntry.labels['soajs.catalog.id'];
			}
			if(oneDeployedEntry.labels['soajs.env.code']){
				deploySettings.options.env = oneDeployedEntry.labels['soajs.env.code'];
			}
			if(oneDeployedEntry.labels['memoryLimit']){
				deploySettings.options.deployConfig.memoryLimit = oneDeployedEntry.labels['soajs.service.memoryLimit'];
			}
			if (oneDeployedEntry.labels['soajs.service.mode']) {
				deploySettings.options.deployConfig.replication.mode = oneDeployedEntry.labels['soajs.service.mode'];
				if (oneDeployedEntry.labels['soajs.service.replicas']) {
					deploySettings.options.deployConfig.replication.replicas = parseInt(oneDeployedEntry.labels['soajs.service.replicas']);
				}
				else if(oneDeployedEntry.tasks && oneDeployedEntry.tasks.length > 0){
					var replicas = 0;
					oneDeployedEntry.tasks.forEach(function (oneTask) {
						if(oneTask.status && oneTask.status.state === "running"){
							replicas++ ;
						}
					});
					if(replicas){
						deploySettings.options.deployConfig.replication.replicas = replicas;
					}
				}
			}
			if(oneDeployedEntry.labels['soajs.service.name']){
				deploySettings.options.custom.name = oneDeployedEntry.labels['soajs.service.name'];
			}
			if(oneDeployedEntry.labels['soajs.service.type']){
				deploySettings.options.custom.type = oneDeployedEntry.labels['soajs.service.type'];
			}
			if(oneDeployedEntry.labels['soajs.service.version']){
				deploySettings.options.custom.version = oneDeployedEntry.labels['soajs.service.version'];
			}
			if(oneDeployedEntry.labels['service.image.prefix']) {
				deploySettings.options.custom.image.prefix = oneDeployedEntry.labels['service.image.prefix'];
			}
			if(oneDeployedEntry.labels['service.image.name']){
				deploySettings.options.custom.image.name = oneDeployedEntry.labels['service.image.name'];
			}
			if(oneDeployedEntry.labels['service.image.tag']){
				deploySettings.options.custom.image.tag = oneDeployedEntry.labels['service.image.tag'];
			}
		}
		
		if(oneDeployedEntry.autoscaler){
			deploySettings.options.autoScale = oneDeployedEntry.autoscaler;
		}
		if(oneDeployedEntry.resources && oneDeployedEntry.resources.limits && oneDeployedEntry.resources.limits.cpu){
			deploySettings.options.deployConfig.cpuLimit = oneDeployedEntry.resources.limits.cpu;
		}
		if(oneDeployedEntry.env) {
			oneDeployedEntry.env.forEach(function (oneEnv) {
				if(!deploySettings.options.deployConfig.memoryLimit){
					deploySettings.options.deployConfig.memoryLimit = oneEnv.split("=")[1];
				}
				if(oneEnv.indexOf("SOAJS_DAEMON_GRP_CONF") !== -1){
					deploySettings.options.custom.daemonGroup = oneEnv.split("=")[1];
				}
				if(!deploySettings.options.gitSource.branch && oneEnv.indexOf("SOAJS_GIT_BRANCH") !== -1 ){
					deploySettings.options.gitSource.branch = oneEnv.split("=")[1];
					if(!deploySettings.options.gitSource.commit && oneEnv.indexOf("SOAJS_GIT_COMMIT") !== -1){
						deploySettings.options.gitSource.commit = oneEnv.split("=")[1];
					}
					if(!deploySettings.options.gitSource.repo && oneEnv.indexOf("SOAJS_GIT_REPO") !== -1){
						deploySettings.options.gitSource.repo = oneEnv.split("=")[1];
					}
					if(!deploySettings.options.gitSource.owner && oneEnv.indexOf("SOAJS_GIT_OWNER") !== -1){
						deploySettings.options.gitSource.owner = oneEnv.split("=")[1];
					}
				}
				
				if(currentScope.recipes && oneDeployedEntry.labels['soajs.catalog.id']){
					for (var type in currentScope.recipes) {
						currentScope.recipes[type].forEach(function (catalogRecipe) {
							if (catalogRecipe._id === oneDeployedEntry.labels['soajs.catalog.id']) {
								if(catalogRecipe.recipe.buildOptions && catalogRecipe.recipe.buildOptions.env){
									for (var envVariable in catalogRecipe.recipe.buildOptions.env) {
										if (catalogRecipe.recipe.buildOptions.env[envVariable].type === 'userInput' && oneEnv.indexOf(envVariable) !== -1) {
											deploySettings.options.custom.env[envVariable] = oneEnv.split("=")[1];
											break;
										}
									}
								}
							}
						});
					}
				}
				return cb(deploySettings)
			});
		}
		else {
			return cb(deploySettings)
		}
		
	}
	
	function openUpgradeModal(currentScope){
		$modal.open({
			templateUrl: "oldCatalogRecipes.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				$scope.upgradeRecipes = function(){
					currentScope.$parent.go("#/catalog-recipes");
					$modalInstance.close();
				}
			}
		});
	}
	
	return {
		'listGitAccounts': listGitAccounts,
		'listEndpoints': listEndpoints,
		'displaySOAJSRMS': displaySOAJSRMS,
		'getCdData': getCdData,
		'getDeployedServices': getDeployedServices,
		'deployService': deployService,
		'doDeploy': doDeploy,
		'checkHeapster': checkHeapster,
		'saveRecipe': saveRecipe,
		'startService': startService,
		'stopService': stopService
	};
	
}]);
