"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('addEnvironmentCtrl', ['$scope', 'overview', '$timeout', '$modal', '$cookies', 'ngDataApi', 'addEnv', 'injectFiles', '$localStorage', '$window', '$routeParams', function ($scope,overview, $timeout, $modal, $cookies, ngDataApi, addEnv, injectFiles, $localStorage, $window, $routeParams) {
	
	$scope.showIntro = true;
	
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.cloudProviders = environmentsConfig.providers;
	$scope.cloudProviderHelpLink = {};
	
	$scope.portalDeployment = false;
	$scope.emptyEnvironment = false;
	$scope.nonginxEnvironment = false;
	
	$scope.wizard = {};
	$scope.removeCert = function(certName){
		delete $scope.form.formData.remoteCertificates[certName];
		document.getElementById('docker' + certName + 'cert').value = '';
	};
	
	//Check whether each part of the domain is not longer than 63 characters,
	//Allow internationalized domain names
	$scope.domainRegex= '^((?=[a-zA-Z0-9-]{1,63}\\.)(xn--)?[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*\\.)+[a-zA-Z]{2,63}$';
	
	$scope.availableEnvironments = angular.copy($localStorage.environments);
	if($scope.availableEnvironments.length > 0){
		for(let i = $scope.availableEnvironments.length -1; i >=0; i--){
			if($scope.availableEnvironments[i].deployer.type === 'manual'){
				$scope.availableEnvironments.splice(i, 1);
			}
		}
	}
	$scope.previousPlatformDeployment = false;
	$scope.previousEnvironment = "";
	
	$scope.previousPlatformDeployment = false;
	$scope.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
	$scope.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";
	
	// source code updates starts
	$scope.configRepos = [];
	$scope.configReposBranches = {};
	
	$scope.setSourceCodeData = function() {
		
		let recipes = $scope.serviceRecipes;
		let formData = $scope.form.formData;
		let customType;
		
		let selectedRecipe;
		
		let steps = ['controller','urac','oauth','nginx'];
		$scope.sourceCodeConfig = {};
		steps.forEach(function (eachStep) {
			if(!$scope.sourceCodeConfig[eachStep]){
				$scope.sourceCodeConfig[eachStep] = {
					configuration : {
						isEnabled : false,
						repoAndBranch : {
							disabled : false,
							required : false
						}
					}
				};
				
				if(eachStep ==='nginx'){
					$scope.sourceCodeConfig['nginx'].custom = {
						isEnabled: false,
						repoAndBranch: {
							disabled: false,
							required: false
						}
					};
				}
			}
		});
		
		recipes.forEach(function (catalogRecipe) {
			if (catalogRecipe._id === formData.catalog) {
				selectedRecipe = catalogRecipe;
			}
		});
		
		if(!selectedRecipe){ // it will be certainly from the 4th call : nginx
			recipes = $scope.nginxRecipes;
			recipes.forEach(function (catalogRecipe) {
				if (catalogRecipe._id === formData.catalog) {
					selectedRecipe = catalogRecipe;
				}
			});
		}
		
		if (selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.sourceCode) {
			let sourceCode = selectedRecipe.recipe.deployOptions.sourceCode;
			
			let conf = sourceCode.configuration;
			let cust = sourceCode.custom; // applicable for nginx only
			
			$scope.selectedSourceCode = selectedRecipe.recipe.deployOptions.sourceCode;
			
			if(!formData.custom){
				formData.custom = {};
			}
			
			if(!formData.custom.sourceCode){
				formData.custom.sourceCode = {};
			}
			
			if (conf) {
				$scope.sourceCodeConfig[$scope.currentServiceName].configuration.isEnabled = true;
				$scope.sourceCodeConfig[$scope.currentServiceName].configuration.repoAndBranch.disabled = (conf.repo && conf.repo !== '');
				$scope.sourceCodeConfig[$scope.currentServiceName].configuration.repoAndBranch.required = conf.required;
				
				if(conf.repo && conf.repo !== ''){
					if(!formData.custom.sourceCode.configuration){
						formData.custom.sourceCode.configuration = {};
					}
					
					formData.custom.sourceCode.configuration.repo = conf.repo;
					formData.custom.sourceCode.configuration.branch = conf.branch;
				}
			}
			
			if (cust && $scope.currentServiceName ==='nginx') {
				customType = cust.type;
				
				$scope.sourceCodeConfig[$scope.currentServiceName].custom.isEnabled = true;
				$scope.sourceCodeConfig[$scope.currentServiceName].custom.repoAndBranch.disabled = (cust.repo && cust.repo !== '');
				$scope.sourceCodeConfig[$scope.currentServiceName].custom.repoAndBranch.required = cust.required;
				
				if(cust.repo && cust.repo !== ''){
					if(!formData.custom.sourceCode.custom){
						formData.custom.sourceCode.custom = {};
					}
					
					formData.custom.sourceCode.custom.repo = cust.repo;
					formData.custom.sourceCode.custom.branch = cust.branch;
				}
			}
			
			if(conf || (cust && $scope.currentServiceName ==='nginx')){
				$scope.listAccounts(customType, function () {
					// special case: if the form was overwritten from cicd we have to load the branch
					if(formData.custom && formData.custom.sourceCode){
						if(formData.custom.sourceCode.configuration && formData.custom.sourceCode.configuration.repo){
							if(!$scope.configReposBranches[formData.custom.sourceCode.configuration.repo]){
								$scope.fetchBranches('conf');
							}
						}
						
						if(formData.custom.sourceCode.custom && formData.custom.sourceCode.custom.repo){
							if(!$scope.configReposBranches[formData.custom.sourceCode.custom.repo]){
								$scope.fetchBranches('cust');
							}
						}
					}
				});
			}
		}else{
			if(!formData){
				formData = {};
			}
			
			if(!formData.custom){
				formData.custom = {};
			}
			
			formData.custom.sourceCode = {}; // clear
		}
	};
	
	$scope.listAccounts = function (customType, callback) {
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/gitAccounts/accounts/list',
			params : {
				fullList : true
			}
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				let configRecords = [];
				let customRecords = [];
				
				if(response){
					response.forEach(function (eachAccount) {
						if(eachAccount.repos){
							eachAccount.repos.forEach(function (eachRepo) {
								// eachRepo : name, serviceName, type
								if(eachRepo.type === 'config'){
									configRecords.push({
										owner : eachAccount.owner,
										provider : eachAccount.provider,
										accountId : eachAccount._id.toString(),
										name : eachRepo.name,
										type : eachRepo.type,
										configSHA : eachRepo.configSHA
									});
								}
								
								if(customType && eachRepo.type === customType){
									
									let acceptableTypes = ['custom','static','service','daemon']; // and multi
									if(customType === 'multi'){
										if(eachRepo.configSHA){
											eachRepo.configSHA.forEach(function (sub) {
												if(acceptableTypes.indexOf(sub.contentType) !== -1 ) {
													customRecords.push({
														owner: eachAccount.owner,
														provider: eachAccount.provider,
														accountId: eachAccount._id.toString(),
														name: eachRepo.name,
														subName: sub.contentName,
														type: eachRepo.type,
														configSHA: eachRepo.configSHA
													});
												}
											});
										}
									}else{
										if(acceptableTypes.indexOf(customType) !== -1 ){
											customRecords.push({
												owner : eachAccount.owner,
												provider : eachAccount.provider,
												accountId : eachAccount._id.toString(),
												name : eachRepo.name,
												type : eachRepo.type,
												configSHA : eachRepo.configSHA
											});
										}
									}
								}
								
							});
						}
					});
				}
				
				$scope.configRepos.customType = customRecords;
				$scope.configRepos.config = configRecords;
				
				callback();
			}
		});
	};
	
	// the same used in overview
	function decodeRepoNameAndSubName(name) {
		let splits = name.split('***');
		
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
	
	$scope.fetchBranches = function (confOrCustom) {
		let formData = $scope.form.formData;
		
		let selectedRepo;
		
		if (confOrCustom === 'conf') {
			selectedRepo = formData.custom.sourceCode.configuration.repo;
		} else { // cust
			let decoded = formData.custom.sourceCode.custom.repo;
			selectedRepo = decodeRepoNameAndSubName(decoded).name;
			$scope.selectedCustomClear = selectedRepo;
		}
		
		if (!selectedRepo || selectedRepo === '') {
			return;
		}
		
		let accountData = {};
		$scope.configRepos.config.forEach(function (eachAcc) {
			if (eachAcc.name === selectedRepo) {
				accountData = eachAcc;
			}
		});
		
		if(Object.keys(accountData).length === 0){
			$scope.configRepos.customType.forEach(function (eachAcc) {
				if (eachAcc.name === selectedRepo) {
					accountData = eachAcc;
				}
			});
		}
		
		getSendDataFromServer($scope, ngDataApi, {
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
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.configReposBranches[selectedRepo] = response.branches;
			}
		});
	};
	// source code updates ends
	
	$scope.iwantenvironment = function(flag){
		switch(flag){
			case 1:
				$scope.emptyEnvironment = true;
				$scope.nonginxEnvironment = false;
				break;
			case 2:
				$scope.emptyEnvironment = false;
				$scope.nonginxEnvironment = true;
				break;
			case 3:
				$scope.emptyEnvironment = false;
				$scope.nonginxEnvironment = false;
				break;
		}
		
		$scope.showIntro = false;
	};
	
	$scope.changeLikeEnv = function(code){
		
		$scope.previousPlatformDeployment = true;
		$scope.previousEnvironment = $scope.form.formData.deployment.previousEnvironment;
		renderPreviousDeployInfo();
	};
	
	function renderPreviousDeployInfo(){
		for(let i = $scope.availableEnvironments.length -1; i >=0; i--){
			if($scope.availableEnvironments[i].code === $scope.previousEnvironment){
				// console.log($scope.availableEnvironments[i]);
				// console.log("------");
				$scope.platform = $scope.availableEnvironments[i].deployer.selected.split(".")[1];
				$scope.driver = $scope.availableEnvironments[i].deployer.selected.split(".")[2];
				if($scope.platform  !== 'manual'){
					$scope.config = $scope.availableEnvironments[i].deployer.container[$scope.platform][$scope.driver];
				}
				
			}
		}
		
		if($scope.platform === 'docker' && $scope.driver === 'remote'){
			$scope.hideDeleteCert = true;
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/platforms/list",
				"params": {
					"env": $scope.previousEnvironment
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					if(response&& response.certs){
						let certs = [];
						response.certs.forEach((oneCert)=>{
							if(oneCert.metadata.env[$scope.previousEnvironment.toUpperCase()]){
								certs.push({
									_id: oneCert._id,
									filename: oneCert.filename,
									certType: oneCert.metadata.certType
								});
							}
						});
						$scope.config.certs = certs;
					}
				}
			});
		}
	}
	
	$scope.showProviderLink = function(myCloudProvider, technology){
		$scope.cloudProviderHelpLink[technology] = myCloudProvider.help[technology];
	};
	
	$scope.Step1 = function () {
		overlayLoading.show();
		
		let entries = {
			code: {
				required: true,
				disabled: false,
				onAction : function(){
					$scope.portalDeployment = !!($scope.form && $scope.form.formData && $scope.form.formData.code === 'PORTAL');
				}
			},
			description: {
				required: true
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
						
						if (!$localStorage.addEnv) {
							$localStorage.addEnv = {};
						}
						
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
				
				if($scope.wizard.gi.code === 'PORTAL'){
					if($routeParams.portal){
						$scope.portalDeployment = true;
					}
					else{
						$scope.form.formData = {};
						$scope.wizard.gi = {};
						$localStorage.addEnv = {};
					}
				}
			}
			
			if($routeParams.portal){
				$scope.form.formData.code = 'PORTAL';
			}
			else{
				if($scope.wizard.gi && $scope.wizard.gi.code && $scope.wizard.gi.code === 'PORTAL'){
					$scope.form.formData = {};
					$scope.wizard.gi = {};
					$localStorage.addEnv = {};
				}
			}
			
			$scope.tempFormEntries.code.onAction();
			
			overlayLoading.hide();
		});
	};
	
	$scope.switchDriver = function (driver) {
		if (!$scope.platforms) {
			$scope.platforms = {
				manual: true,
				docker: false,
				kubernetes: false,
				previous: false
			};
		}
		
		switch (driver) {
			case 'previous':
				if($scope.form.formData.deployment.previousEnvironment){
					$scope.changeLikeEnv();
				}
				$scope.platforms.previous = true;
				$scope.platforms.docker = false;
				$scope.platforms.kubernetes = false;
				$scope.platforms.manual = false;
				$scope.allowLocalContainerDeployment = getDashboardDeploymentStyle();
				break;
			case 'docker':
				delete $scope.previousEnvironment;
				$scope.platforms.previous = false;
				$scope.platforms.docker = true;
				$scope.platforms.kubernetes = false;
				$scope.platforms.manual = false;
				$scope.allowLocalContainerDeployment = getDashboardDeploymentStyle();
				break;
			case 'kubernetes':
				delete $scope.previousEnvironment;
				$scope.platforms.previous = false;
				$scope.platforms.kubernetes = true;
				$scope.platforms.docker = false;
				$scope.platforms.manual = false;
				$scope.allowLocalContainerDeployment = getDashboardDeploymentStyle();
				break;
			case 'manual':
			default:
				delete $scope.previousEnvironment;
				$scope.platforms.previous = false;
				$scope.platforms.docker = false;
				$scope.platforms.kubernetes = false;
				$scope.platforms.manual = true;
				break;
		}
	};
	
	function getDashboardDeploymentStyle(){
		let status = false;
		$localStorage.environments.forEach( (oneEnv) => {
			if(oneEnv.code === 'DASHBOARD' && oneEnv.deployer.type !== 'manual'){
				status = true
			}
		});
		
		return status;
	}
	
	$scope.showContent = function(id, value, form){
		if(!form.formData.remoteCertificates){
			form.formData.remoteCertificates = {};
		}
		form.formData.remoteCertificates[id] = value;
	};
	
	$scope.Step2 = function () {
		overlayLoading.show();
		$scope.previousPlatformDeployment = false;
		var configuration = angular.copy(environmentsConfig.form.add.step2.entries);
		
		function handleFormData(formData, advancedMode){
			if ($scope.platforms.manual) {
				formData.selectedDriver = 'manual';
				delete formData.kubernetes;
				delete formData.docker;
				delete formData.previousEnvironment;
				
				delete $scope.wizard.controller;
				delete $scope.wizard.nginx;
				
				$localStorage.addEnv.step2 = angular.copy(formData);
				$scope.wizard.deploy = angular.copy(formData);
				
				$scope.lastStep = 2;
				if(advancedMode){
					$scope.Step3();
				}
				else if($scope.portalDeployment){
					$scope.Step21();
				}
				else{
					overview.run($scope);
				}
			}
			else if($scope.platforms.previous){
				if($scope.previousEnvironment === ''){
					$window.alert("Select the environment your want to clone its deployment settings to proceed!");
					return false;
				}
				formData.deployment = {};
				$scope.availableEnvironments.forEach((oneEnv)=>{
					if(oneEnv.code === $scope.previousEnvironment){
						if(oneEnv.deployer.type === 'manual'){
							formData.selectedDriver = oneEnv.deployer.type;
							formData.deployment.manual = {
								nodes: oneEnv.deployment.manual.nodes
							};
							delete formData.kubernetes;
							delete formData.docker;
							delete formData.previousEnvironment;
							
							delete $scope.wizard.controller;
							delete $scope.wizard.nginx;
						}
						else{
							formData.previousEnvironment = $scope.previousEnvironment;
							formData.selectedDriver = oneEnv.deployer.selected.split(".")[1]; //docker || kubernetes
							
							if (formData.selectedDriver === 'docker') {
								delete formData.kubernetes;
								formData.deployment.docker = {};
								let localRemote = (formData.deployment.docker.dockerremote) ? 'remote' : 'local';
								
								formData.deployment.docker = oneEnv.deployer.container.docker[localRemote];
								formData.deployment.docker.dockerremote = oneEnv.deployer.selected !== 'container.docker.local';
							}
							
							if (formData.selectedDriver === 'kubernetes') {
								delete formData.docker;
								formData.deployment.kubernetes ={};
								formData.deployment.kubernetes.kubernetesremote = oneEnv.deployer.selected !== 'container.kubernetes.local';
								let localRemote = (formData.deployment.kubernetes.kubernetesremote) ? 'remote' : 'local';
								formData.deployment.kubernetes = {
									kubernetesremote: oneEnv.deployer.selected !== 'container.kubernetes.local',
									port: oneEnv.deployer.container.kubernetes[localRemote].apiPort,
									NS: oneEnv.deployer.container.kubernetes[localRemote].namespace.default,
									perService: oneEnv.deployer.container.kubernetes[localRemote].namespace.perService,
									token: oneEnv.deployer.container.kubernetes[localRemote].auth.token
								};
								
								if(oneEnv.deployer.container.kubernetes[localRemote].nodes){
									formData.deployment.kubernetes.nodes = oneEnv.deployer.container.kubernetes[localRemote].nodes;
								}
							}
						}
					}
				});
				
				$localStorage.addEnv.step2 = angular.copy(formData);
				$scope.wizard.deploy = angular.copy(formData);
				
				$scope.lastStep = 2;
				if(advancedMode){
					$scope.Step3();
				}
				else if($scope.portalDeployment){
					$scope.Step21();
				}
				else{
					overview.run($scope);
				}
			}
			else {
				delete formData.previousEnvironment;
				if ($scope.platforms.docker) {
					delete formData.kubernetes;
					delete formData.deployment.kubernetes;
					formData.selectedDriver = 'docker';
					formData.deployment.docker.dockerremote = true;
					if (!formData.deployment.docker.nodes || !formData.deployment.docker.externalPort || !formData.deployment.docker.network) {
						$window.alert("Provide the information on how to connect to docker on your remote machine.");
						return false;
					}
					
					formData.deployment.docker.apiPort = formData.deployment.docker.externalPort;
					
					if (!formData.remoteCertificates || !formData.remoteCertificates.ca || !formData.remoteCertificates.cert || !formData.remoteCertificates.key) {
						$window.alert("Docker requires you provide certificates so that the dashboard can connect to it securely. Please fill in the docker certificates.");
						return false;
					}
				}
				if ($scope.platforms.kubernetes) {
					delete formData.docker;
					delete formData.deployment.docker;
					formData.selectedDriver = 'kubernetes';
					formData.deployment.kubernetes.kubernetesremote = true;
					if (!formData.deployment.kubernetes.nodes || !formData.deployment.kubernetes.port || !formData.deployment.kubernetes.token || !formData.deployment.kubernetes.NS || !Object.hasOwnProperty.call(formData.deployment.kubernetes, 'perService')) {
						$window.alert("Provide the information on how to connect to kubernetes on your remote machine.");
						return false;
					}
				}
				
				if(!formData.selectedDriver){
					$window.alert("You have not specified the deployment strategy of this environment.");
					return false;
				}
				
				$localStorage.addEnv.step2 = angular.copy(formData);
				$scope.wizard.deploy = angular.copy(formData);
				$scope.lastStep = 2;
				if(advancedMode){
					$scope.Step3();
				}
				else if($scope.portalDeployment){
					$scope.Step21();
				}
				else{
					overview.run($scope);
				}
			}
		}
		
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
				}
			]
		};
		
		if($scope.portalDeployment){
			options.actions.push({
				'type': 'submit',
				'label': "Next",
				'btn': 'primary',
				'action': function (formData) {
					handleFormData(formData, false);
				}
			});
		}
		else if($scope.emptyEnvironment){
			options.actions.push({
				'type': 'submit',
				'label': 'OverView & Finalize',
				'btn': 'primary',
				'action': function(formData){
					handleFormData(formData, false);
				}
			});
		}
		else{
			options.actions.push({
				'type': 'submit',
				'label': "Next",
				'btn': 'primary',
				'action': function (formData) {
					handleFormData(formData, true);
				}
			});
		}
		
		options.actions.push({
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
		});
		
		buildForm($scope, $modal, options, function () {
			if ($localStorage.addEnv && $localStorage.addEnv.step2) {
				$scope.form.formData = angular.copy($localStorage.addEnv.step2);
			}
			
			if (!$scope.form.formData.deployment) {
				$scope.form.formData.deployment = {};
			}
			
			if($scope.form.formData.previousEnvironment){
				$scope.form.formData.deployment.previousEnvironment = $scope.form.formData.previousEnvironment;
				$scope.previousEnvironment = $scope.form.formData.previousEnvironment;
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
				manual: $scope.form.formData.selectedDriver === 'manual' || false,
				previous: $scope.previousEnvironment
			};
			
			if($scope.previousEnvironment && $scope.previousEnvironment !== ''){
				$scope.previousPlatformDeployment = true;
				$scope.platforms = {
					docker: false,
					kubernetes: false,
					manual: false,
					previous: $scope.previousEnvironment
				};
				renderPreviousDeployInfo();
			}
			
			$scope.allowLocalContainerDeployment = getDashboardDeploymentStyle();
			overlayLoading.hide();
		});
	};
	
	$scope.switchCluster = function (driver) {
		if (!$scope.clusters) {
			$scope.clusters = {
				local: true,
				external: false,
				share: false
			};
		}
		$timeout(function(){
			switch (driver) {
				case 'external':
					$scope.clusters.local = false;
					$scope.clusters.share = false;
					$scope.clusters.external = true;
					break;
				case 'share':
					$scope.clusters.share = true;
					$scope.clusters.local = false;
					$scope.clusters.external = false;
					break;
				default:
				case 'local':
					$scope.clusters.local = true;
					$scope.clusters.share = false;
					$scope.clusters.external = false;
					break;
			}
		}, 100);
	};
	
	$scope.removeServer = function(index, type){
		$scope.form.formData.cluster[type].servers.splice(index, 1);
	};
	
	$scope.AddNewServer = function(type){
		$scope.form.formData.cluster[type].servers.push({
			host: 'localhost',
			port: 27017
		});
	};
	
	$scope.Step21 = function () {
		overlayLoading.show();
		$scope.sharedClusters = [];
		var configuration = angular.copy(environmentsConfig.form.add.step21.entries);
		
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
						if ($scope.clusters.local) {
							// ensure name, at least one server in array and url param
							if(!formData.cluster.local.name){
								$window.alert("Enter a name for the server");
								return false;
							}
							formData.cluster.local.servers[0].host= formData.cluster.local.name;
							if(formData.cluster.local.servers.length === 0){
								$window.alert("At least one server should be configured");
								return false;
							}
							if(!formData.cluster.local.servers[0].host || !formData.cluster.local.servers[0].port){
								$window.alert("At least one server should be configured");
								return false;
							}
							delete formData.cluster.external;
							delete formData.cluster.share;
						}
						else if($scope.clusters.external){
							// ensure at least one server in array
							if(!formData.cluster.external.name){
								$window.alert("Enter a name for the server");
								return false;
							}
							if(formData.cluster.external.servers.length === 0){
								$window.alert("At least one server should be configured");
								return false;
							}
							if(!formData.cluster.external.servers[0].host || !formData.cluster.local.servers[0].port){
								$window.alert("At least one server should be configured");
								return false;
							}
							
							delete formData.cluster.local;
							delete formData.cluster.share;
						}
						else if($scope.clusters.share){
							// ensure the name
							if(!formData.cluster.share.name){
								$window.alert("Choose an existing shared server to use");
								return false;
							}
							
							delete formData.cluster.local;
							delete formData.cluster.external;
						}
						
						$localStorage.addEnv.step21 = angular.copy(formData.cluster);
						$scope.wizard.cluster = angular.copy(formData.cluster);
						$scope.lastStep = 21;
						$scope.Step3();
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
		addEnv.listServers($scope,  (servers) => {
			$scope.sharedClusters = servers;
			
			buildForm($scope, $modal, options, function () {
				$scope.form.formData = {
					cluster: {
						local: {
							servers : [
								{
									host: 'localhost',
									port: 27017
								}
							],
							URLParam: {
								"bufferMaxEntries": 0,
								"maxPoolSize": 5
							}
						},
						share: {},
						external :{
							servers : [
								{
									host: 'localhost',
									port: 27017
								}
							],
							URLParam: {
								"bufferMaxEntries": 0,
								"maxPoolSize": 5
							}
						}
					}
				};
				
				if ($localStorage.addEnv && $localStorage.addEnv.step21) {
					let alreadyChosen = angular.copy($localStorage.addEnv.step21);
					if(alreadyChosen.local){
						$scope.form.formData.cluster.local = alreadyChosen.local;
						$scope.switchCluster('local');
					}
					if(alreadyChosen.external){
						$scope.form.formData.cluster.external = alreadyChosen.external;
						$scope.switchCluster('external');
					}
					if(alreadyChosen.share){
						$scope.form.formData.cluster.share = alreadyChosen.share;
						$scope.switchCluster('share');
					}
				}
				else{
					if (!$scope.clusters) {
						$scope.clusters = {
							local: true,
							external: false,
							share: false
						};
					}
					$scope.switchCluster('local');
				}
				overlayLoading.hide();
			});
		});
	};
	
	$scope.Step3 = function () {
		overlayLoading.show();
		$scope.serviceRecipes = [];
		$scope.currentServiceName = 'controller';
		getCatalogRecipes((recipes) => {
			recipes.forEach((oneRecipe) => {
				if (oneRecipe.type === 'service' && oneRecipe.subtype === 'soajs') {
					$scope.serviceRecipes.push(oneRecipe);
				}
			});
			
			let entries = {
				tKeyPass: {
					required: false
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
				},
				username: {
					required: ($scope.portalDeployment === true)
				},
				password: {
					required: ($scope.portalDeployment === true)
				},
				email: {
					required: ($scope.portalDeployment === true)
				},
				mode: {
					required: false,
					onAction: function () {
						$scope.tempFormEntries.number.required = ['deployment', 'replicated'].indexOf($scope.form.formData.mode) !== -1;
					}
				},
				number: {
					required: ($scope.wizard.deploy.selectedDriver !== 'manual')
				},
				memory: {
					required: ($scope.wizard.deploy.selectedDriver !== 'manual')
				},
				catalog: {
					required: ($scope.wizard.deploy.selectedDriver !== 'manual')
				},
				branch: {
					required: ($scope.wizard.deploy.selectedDriver !== 'manual')
				}
			};
			doBuildForm(entries);
		});
		
		function doBuildForm(entries) {
			var configuration = angular.copy(environmentsConfig.form.add.step3.entries);
			$scope.tempFormEntries = entries;
			let serviceBranches;
			let submitLabel = 'Next';
			if ($scope.wizard.deploy.selectedDriver === 'manual' || $scope.nonginxEnvironment) {
				submitLabel = 'OverView & Finalize';
			}
			
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
							if($scope.portalDeployment){
								$scope.Step21();
							}
							else{
								$scope.Step2();
							}
						}
					},
					{
						'type': 'submit',
						'label': submitLabel,
						'btn': 'primary',
						'action': function (formData) {
							for (let fieldName in $scope.tempFormEntries) {
								if($scope.tempFormEntries[fieldName].required && !formData[fieldName]){
									$window.alert('Some fields are still missing: ' + fieldName);
									return false;
								}
							}
							
							if (formData.soajsFrmwrk) {
								if (!formData.cookiesecret || !formData.sessionName || !formData.sessionSecret) {
									$window.alert("If you want to SOAJS Framework to persist your session, make sure you fill all of: cookie secret, session name & session secret");
									return false;
								}
							}
							
							$scope.wizard.gi.sensitive = formData.sensitive || false;
							$scope.wizard.gi.tKeyPass = formData.tKeyPass;
							
							if($scope.portalDeployment){
								$scope.wizard.gi.username = formData.username;
								$scope.wizard.gi.password = formData.password;
								$scope.wizard.gi.email = formData.email;
							}
							
							if (formData.soajsFrmwrk) {
								$scope.wizard.gi.soajsFrmwrk = formData.soajsFrmwrk;
								$scope.wizard.gi.cookiesecret = formData.cookiesecret;
								$scope.wizard.gi.sessionName = formData.sessionName;
								$scope.wizard.gi.sessionSecret = formData.sessionSecret;
							}
							
							delete formData.sensitive;
							delete formData.tKeyPass;
							delete formData.username;
							delete formData.password;
							delete formData.email;
							delete formData.soajsFrmwrk;
							delete formData.cookiesecret;
							delete formData.sessionName;
							delete formData.sessionSecret;
							
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
								}
								
								serviceBranches.branches.forEach((oneBranch) => {
									if (oneBranch.name === formData.branch && oneBranch.commit && oneBranch.commit.sha) {
										formData.commit = oneBranch.commit.sha;
									}
								});
								
								$localStorage.addEnv.step1 = angular.copy($scope.wizard.gi);
								$localStorage.addEnv.step3 = angular.copy(formData);
								$scope.wizard.controller = angular.copy(formData);
								
								$scope.serviceRecipes.forEach((oneServiceRecipe)=>{
									if(oneServiceRecipe._id === $scope.wizard.controller.catalog){
										$scope.wizard.controller.catalogName = oneServiceRecipe.name;
									}
								});
								
								if($scope.nonginxEnvironment){
									overview.run($scope);
								}
								else if($scope.portalDeployment){
									$scope.Step5();
								}
								else{
									$scope.Step4();
								}
							}
							else {
								$localStorage.addEnv.step1 = angular.copy($scope.wizard.gi);
								delete $localStorage.addEnv.step3;
								delete $scope.wizard.controller;
								overview.run($scope);
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
				getServiceBranches($scope.currentServiceName, (controllerBranches) => {
					serviceBranches = controllerBranches;
					$scope.tempFormEntries.catalog.onAction = function () {
						//reset form entries
						delete $scope.form.formData.branch;
						delete $scope.form.formData.imagePrefix;
						delete $scope.form.formData.imageName;
						delete $scope.form.formData.imageTag;
						delete $scope.form.formData.custom;
						
						$scope.setSourceCodeData();
						
						injectCatalogInputs($scope.serviceRecipes, controllerBranches);
					};
					
					$scope.form.formData.deploy = ($scope.wizard.deploy.selectedDriver !== 'manual');
					if ($localStorage.addEnv && $localStorage.addEnv.step3) {
						
						$scope.wizard.controller = angular.copy($localStorage.addEnv.step3);
						$scope.form.formData = $scope.wizard.controller;
						
						if($scope.wizard.deploy && $scope.wizard.deploy.selectedDriver === 'manual'){
							$scope.wizard.controller.deploy = false;
							$scope.form.formData.deploy = false;
						}
						
						if($localStorage.addEnv.step3.catalog){
							$scope.setSourceCodeData();
						}
					}
					
					$scope.wizard.gi = angular.copy($localStorage.addEnv.step1);
					$scope.form.formData.sensitive = $scope.wizard.gi.sensitive;
					$scope.form.formData.tKeyPass = $scope.wizard.gi.tKeyPass;
					$scope.form.formData.username = $scope.wizard.gi.username;
					$scope.form.formData.password = $scope.wizard.gi.password;
					$scope.form.formData.email = $scope.wizard.gi.email;
					$scope.form.formData.soajsFrmwrk = $scope.wizard.gi.soajsFrmwrk;
					$scope.form.formData.cookiesecret = $scope.wizard.gi.cookiesecret;
					$scope.form.formData.sessionName = $scope.wizard.gi.sessionName;
					$scope.form.formData.sessionSecret = $scope.wizard.gi.sessionSecret;
					
					if($scope.wizard.deploy.selectedDriver === 'manual' || ['global', 'daemonset'].indexOf($scope.form.formData.mode) !== -1){
						$scope.tempFormEntries.number = false;
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
						injectCatalogInputs($scope.serviceRecipes, controllerBranches);
					}
					
					if($scope.wizard.gi.code === 'PORTAL'){
						if($routeParams.portal){
							$scope.portalDeployment = true;
						}
					}
					
					overlayLoading.hide();
				});
			});
		}
	};
	
	$scope.Step5 = function(){
		$scope.currentServiceName = "urac";
		$scope.currentStep = "step5";
		$scope.nextStep = "Step6";
		$scope.previousStep = 3;
		$scope.lastStep = 5;
		
		serviceDeployment();
	};
	
	$scope.Step6 = function(){
		$scope.currentServiceName = "oauth";
		$scope.currentStep = "step6";
		$scope.nextStep = "Step4";
		$scope.previousStep = 5;
		$scope.lastStep = 6;
		
		serviceDeployment();
	};
	
	function serviceDeployment(){
		overlayLoading.show();
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
					required: true
				},
				branch: {
					required: true
				}
			};
		
		doBuildForm(entries);
		
		function doBuildForm(entries) {
			var configuration = angular.copy(environmentsConfig.form.add.step31.entries);
			$scope.tempFormEntries = entries;
			let serviceBranches;
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
							let stepNumber = "Step" + $scope.previousStep;
							$scope[stepNumber]();
						}
					},
					{
						'type': 'submit',
						'label': "Next",
						'btn': 'primary',
						'action': function (formData) {
							//check mandatory fields
							for (let fieldName in $scope.tempFormEntries) {
								if (fieldName === 'custom') {
									for (let env in $scope.tempFormEntries.custom) {
										if ($scope.tempFormEntries.custom[env].required) {
											if (!formData.custom[env].value) {
												$window.alert('Some of the fields under ' + $scope.currentServiceName + ' section are still missing.');
												return false;
											}
										}
									}
								}
								else if ($scope.tempFormEntries[fieldName].required) {
									if (!formData[fieldName]) {
										$window.alert('Some of the fields under ' + $scope.currentServiceName + ' section are still missing.');
										return false;
									}
								}
							}
							
							serviceBranches.branches.forEach((oneBranch) => {
								if (oneBranch.name === formData.branch && oneBranch.commit && oneBranch.commit.sha) {
									formData.commit = oneBranch.commit.sha;
								}
							});
							
							$localStorage.addEnv[$scope.currentStep] = angular.copy(formData);
							$scope.wizard[$scope.currentServiceName] = angular.copy(formData);
							
							$scope.serviceRecipes.forEach((oneServiceRecipe)=>{
								if(oneServiceRecipe._id === $scope.wizard[$scope.currentServiceName].catalog){
									$scope.wizard[$scope.currentServiceName].catalogName = oneServiceRecipe.name;
								}
							});
							
							$scope[$scope.nextStep]();
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
				getServiceBranches($scope.currentServiceName, (repoBranches) => {
					serviceBranches = repoBranches;
					$scope.tempFormEntries.catalog.onAction = function () {
						//reset form entries
						
						$scope.setSourceCodeData();
						
						delete $scope.form.formData.branch;
						delete $scope.form.formData.imagePrefix;
						delete $scope.form.formData.imageName;
						delete $scope.form.formData.imageTag;
						delete $scope.form.formData.custom;
						
						injectCatalogInputs($scope.serviceRecipes, repoBranches);
					};
					
					if ($localStorage.addEnv && $localStorage.addEnv[$scope.currentStep]) {
						$scope.wizard[$scope.currentServiceName] = angular.copy($localStorage.addEnv[$scope.currentStep]);
						$scope.form.formData = $scope.wizard[$scope.currentServiceName];
						
						if($localStorage.addEnv[$scope.currentStep].catalog){
							$scope.setSourceCodeData();
						}
					}
					
					$scope.form.formData.deploy = true;
					
					if($scope.wizard.deploy.selectedDriver === 'manual' || ['global', 'daemonset'].indexOf($scope.form.formData.mode) !== -1){
						$scope.tempFormEntries.number = false;
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
					if ($scope.wizard[$scope.currentServiceName] && $scope.wizard[$scope.currentServiceName].catalog) {
						injectCatalogInputs($scope.serviceRecipes, repoBranches);
					}
					overlayLoading.hide();
				});
			});
		}
	}
	
	$scope.Step4 = function () {
		overlayLoading.show();
		$scope.nginxRecipes = [];
		$scope.currentServiceName = 'nginx';
		
		getCatalogRecipes((recipes) => {
			recipes.forEach((oneRecipe) => {
				if (oneRecipe.type === 'server' && oneRecipe.subtype === 'nginx') {
					$scope.nginxRecipes.push(oneRecipe);
				}
			});
			
			let entries = {
				sitePrefix: {
					required: false
				},
				domain: {
					required: true
				},
				apiPrefix: {
					required: false
				},
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
						
						$scope.setSourceCodeData();
						
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
							if($scope.wizard.urac && $scope.wizard.oauth){
								$scope.lastStep = 6;
							}
							else{
								$scope.lastStep = 3;
							}
							let stepNumber = "Step" + $scope.lastStep;
							$scope[stepNumber]();
						}
					},
					{
						'type': 'submit',
						'label': "Next",
						'btn': 'primary',
						'action': function (formData) {
							$scope.lastStep = 4;
							if (!formData.sitePrefix){
								formData.sitePrefix = "site";
							}
							
							if (!formData.apiPrefix){
								formData.apiPrefix = "api";
							}
							
							$scope.wizard.gi.sitePrefix = formData.sitePrefix;
							$scope.wizard.gi.apiPrefix = formData.apiPrefix;
							$scope.wizard.gi.domain = formData.domain;
							$localStorage.addEnv.step1 = $scope.wizard.gi;
							
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
									
									//get the port and protocol from inputs
								}
								else {
									delete formData.certs;
									delete formData.certsGit;
									delete formData.customUi;
									delete formData.http;
									delete formData.https;
									delete formData.ssl;
									
									$scope.nginxRecipes.forEach(function(oneNginxRecipe){
										if(oneNginxRecipe._id === formData.catalog){
											formData.recipe = oneNginxRecipe;
											formData.catalogName = oneNginxRecipe.name;
										}
									});
								}
								
								delete formData.sitePrefix;
								delete formData.apiPrefix;
								delete formData.domain;
								$localStorage.addEnv.step4 = angular.copy(formData);
								$scope.wizard.nginx = angular.copy(formData);
							}
							overview.run($scope);
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
				$scope.wizard.gi = $localStorage.addEnv.step1;
				
				if(!$scope.wizard.gi.apiPrefix || $scope.wizard.gi.apiPrefix === ''){
					$scope.wizard.gi.apiPrefix = "api";
				}
				
				if(!$scope.wizard.gi.sitePrefix || $scope.wizard.gi.sitePrefix === ''){
					$scope.wizard.gi.sitePrefix = "site";
				}
				
				if ($localStorage.addEnv && $localStorage.addEnv.step4) {
					$scope.wizard.nginx = angular.copy($localStorage.addEnv.step4);
					$scope.form.formData = $scope.wizard.nginx;
					
					if($localStorage.addEnv.step4.catalog){
						$scope.setSourceCodeData();
					}
				}
				$scope.form.formData.sitePrefix = $scope.wizard.gi.sitePrefix;
				$scope.form.formData.apiPrefix = $scope.wizard.gi.apiPrefix;
				$scope.form.formData.domain = $scope.wizard.gi.domain;
				
				$scope.supportSSL = false;
				if($scope.wizard.deploy && $scope.wizard.deploy.deployment){
					if($scope.wizard.deploy.deployment.docker || ($scope.wizard.deploy.deployment.kubernetes && $scope.wizard.deploy.deployment.kubernetes.kubernetesremote)){
						$scope.supportSSL = true;
					}
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
	
	function getCatalogRecipes(cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list'
		}, function (error, recipes) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				return cb(recipes);
			}
		});
	}
	
	function getServiceBranches(serviceName, cb) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/gitAccounts/getBranches',
			params: {
				name: serviceName,
				type: 'service'
			}
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				return cb(response);
			}
		});
	}
	
	function injectCatalogInputs(recipes, serviceBranches) {
		let entries = $scope.tempFormEntries;
		let chosenRecipe = $scope.form.formData.catalog;
		
		//append the custom catalog inputs
		recipes.forEach(function (oneRecipe) {
			if (oneRecipe._id === chosenRecipe) {
				
				if(serviceBranches){
					entries.branches = serviceBranches.branches;
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
							name: newInput.name,
							label: newInput.label,
							value: newInput.value,
							type: newInput.type,
							fieldMsg: newInput.fieldMsg,
							required: true
						};
					}
				}
			}
		});
	}
	
	function checkEnvironment(cb){
		if($localStorage.addEnv && $localStorage.addEnv.step1 && $localStorage.addEnv.step1.code){
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/environment',
				params: {
					code: $localStorage.addEnv.step1.code
				}
			}, function (error, pendingEnvironment) {
				overlayLoading.hide();
				if (error) {
					return cb();
				}
				else {
					if(pendingEnvironment && (pendingEnvironment.pending || pendingEnvironment.error)&& pendingEnvironment.template){
						$scope.envId = pendingEnvironment._id;
						$scope.wizard = pendingEnvironment.template;
						$scope.showIntro = false;
						overview.check($scope);
					}
					else{
						return cb();
					}
				}
			});
		}
		else{
			return cb();
		}
	}
	
	$scope.$parent.collapseExpandMainMenu();
	$scope.reRenderMenu('empty');
	if ($scope.access.addEnvironment) {
		checkEnvironment(() => {
			if($routeParams.portal){
				$scope.showIntro = false;
			}
			$scope.Step1();
		});
	}
	
	injectFiles.injectCss('modules/dashboard/environments/environments.css');
}]);