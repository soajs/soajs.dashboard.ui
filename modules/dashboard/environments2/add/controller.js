"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('addEnvironmentCtrl', ['$scope', '$window', '$modal', '$location', '$localStorage', 'ngDataApi', 'injectFiles', 'templateSrvDeploy', 'giSrv', 'manualSrv', 'cloudProviderSrv', 'containerSrv', 'vmSrv', 'registrySrv', 'overviewSrv', 'dynamicSrv', 'nginxSrv', 'statusSrv', function ($scope, $window, $modal, $location, $localStorage, ngDataApi, injectFiles, templateSrvDeploy, giSrv, manualSrv, cloudProviderSrv, containerSrv, vmSrv, registrySrv, overviewSrv, dynamicSrv, nginxSrv, statusSrv) {
	
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.wizard = {};
	
	//list of steps the wizard executes, each step has a method below
	$scope.steps = {
		"manual": ['listTemplate', 'generalInfo', 'manualDeployment', 'processDynamicSteps', 'displayOverview', 'checkStatus'],
		"container": ['listTemplate', 'generalInfo', 'technologyDeployment', 'chooseRegistry', 'processDynamicSteps', 'chooseNginx', 'displayOverview', 'checkStatus'],
		"singleInfra": ['listTemplate', 'generalInfo', 'selectCloudProvider', 'chooseRegistry', 'processDynamicSteps', 'chooseNginx', 'displayOverview', 'checkStatus'],
	};
	
	$scope.addEnvCounter = 0;
	$scope.environmentWizard = true;
	$scope.envType = '';

	function triggerMethod(counter) {
		let method = $scope.steps[$scope.envType][counter];
		console.log(counter, method);
		$scope[method]();
	}
	
	$scope.nextStep = function () {
		jQuery("html, body").animate({scrollTop: 0 });
		$scope.addEnvCounter++;
		if ($scope.addEnvCounter >= $scope.steps[$scope.envType].length - 1) {
			$scope.addEnvCounter = $scope.steps[$scope.envType].length - 1;
		}
		triggerMethod($scope.addEnvCounter);
	};
	
	$scope.previousStep = function () {
		jQuery("html, body").animate({scrollTop: 0 });
		$scope.addEnvCounter--;
		if ($scope.addEnvCounter <= 0) {
			$scope.addEnvCounter = 0;
		}
		triggerMethod($scope.addEnvCounter);
	};

	$scope.listTemplate = function () {
		templateSrvDeploy.go($scope);
	};
	
	$scope.generalInfo = function () {
		giSrv.go($scope);
	};
	
	$scope.manualDeployment = function () {
		manualSrv.go($scope);
	};
	
	$scope.technologyDeployment = function () {
		containerSrv.go($scope);
	};
	
	$scope.selectCloudProvider = function () {
		cloudProviderSrv.go($scope);
	};
	
	$scope.vmDeployment = function () {
		vmSrv.go($scope);
	};
	
	$scope.chooseRegistry = function () {
		registrySrv.go($scope);
	};
	
	$scope.processDynamicSteps = function () {
		dynamicSrv.go($scope);
	};
	
	$scope.chooseNginx = function () {
		nginxSrv.go($scope);
	};
	
	$scope.displayOverview = function () {
		overviewSrv.go($scope);
	};
	
	$scope.checkStatus = function () {
		statusSrv.go($scope);
	};
	
	$scope.mapStorageToWizard = function (storage) {
		if (!$scope.wizard) {
			$scope.wizard = {};
		}
		let template;
		if ($scope.wizard.template) {
			template = angular.copy($scope.wizard.template);
		}
		if ($localStorage.addEnv) {
			$scope.wizard = angular.copy($localStorage.addEnv);
		}
		if ($scope.wizard.template && template) {
			$scope.wizard.template.content = template.content;
		}
	};
	
	$scope.mapUserInputsToOverview = function (fromOverview) {
		
		let wizard = angular.copy($scope.wizard);
		
		// in case the wizard skipped steps // make sure u have wizard.template, wizard.gi ....
		function updateWizardToStandards(wizard) {
			let standards = ['template', 'gi', 'deployment', 'registry', 'nginx'];
			standards.forEach(function (std) {
				if (!wizard[std]) {
					wizard[std] = {};
				}
			});
		}
		
		updateWizardToStandards(wizard);
		
		let apiTemplateDeployInfo = angular.copy(wizard.template.deploy);
		
		for( let stage in apiTemplateDeployInfo ){
			for( let group in apiTemplateDeployInfo[stage] ){
				for( let stepName in apiTemplateDeployInfo[stage][group]){
					if(stepName.includes(".resources.")){
						if(apiTemplateDeployInfo[stage][group][stepName].imfv && Array.isArray(apiTemplateDeployInfo[stage][group][stepName].imfv) && apiTemplateDeployInfo[stage][group][stepName].imfv.length > 0) {
							apiTemplateDeployInfo[stage][group][stepName].imfv.forEach((oneResourceImfv) => {
								delete oneResourceImfv.enableAutoScale;
								if(oneResourceImfv.deploy){
									oneResourceImfv.deploy.options = oneResourceImfv.deployOptions; // overwriting deploy // todo: verify with mike
								}
							});
						}
					}
					
					if(stepName.includes(".repo.")){
						if(apiTemplateDeployInfo[stage][group][stepName].imfv && Array.isArray(apiTemplateDeployInfo[stage][group][stepName].imfv) && apiTemplateDeployInfo[stage][group][stepName].imfv.length > 0){
							apiTemplateDeployInfo[stage][group][stepName].imfv.forEach((oneRepoImfv) => {
								if(oneRepoImfv.serviceName === 'controller'){
									oneRepoImfv.name = oneRepoImfv.serviceName;
									oneRepoImfv.type = "service";
									oneRepoImfv.options = oneRepoImfv.default.options;
									oneRepoImfv.deploy = true;
									oneRepoImfv.options.custom.type = oneRepoImfv.type;
									delete oneRepoImfv.serviceName;
									delete oneRepoImfv.default;
								}
								else if(oneRepoImfv.version){
									oneRepoImfv.name = oneRepoImfv.serviceName;
									oneRepoImfv.options = oneRepoImfv.version.options;
									oneRepoImfv.deploy = true;
									oneRepoImfv.options.custom.type = oneRepoImfv.type;
									oneRepoImfv.options.custom.version = parseFloat(oneRepoImfv.options.custom.version);
									delete oneRepoImfv.serviceName;
									delete oneRepoImfv.version;
								}
								
								// add recipe name from id, only on overview
								if(fromOverview && oneRepoImfv.options.recipe){
									for(let type in $scope.recipes){
										$scope.recipes[type].forEach((oneRecipe) =>{
											if(oneRecipe._id === oneRepoImfv.options.recipe){
												oneRepoImfv.options.recipeName = oneRecipe.name;
											}
										});
									}
								}
							});
						}
					}
					if(stepName === 'custom_registry'){
						if(apiTemplateDeployInfo[stage][group][stepName].imfv && Array.isArray(apiTemplateDeployInfo[stage][group][stepName].imfv) && apiTemplateDeployInfo[stage][group][stepName].imfv.length > 0){
							apiTemplateDeployInfo[stage][group][stepName].imfv.forEach((oneCustomReg) => {
								if(!oneCustomReg.shared){
									oneCustomReg.shared = false;
								}
								if(!oneCustomReg.plugged){
									oneCustomReg.plugged = false;
								}
								if(!oneCustomReg.shared){
									oneCustomReg.shared = false;
								}
								delete oneCustomReg.textMode;
							});
						}
					}
					
					// delete step if empty // dont show empty accordeon
					if(fromOverview && (apiTemplateDeployInfo[stage][group][stepName] && Object.keys(apiTemplateDeployInfo[stage][group][stepName]).length === 0)){
						delete apiTemplateDeployInfo[stage][group][stepName];
					}
				}
			}
		}
		
		let output = {
			data: {
				"code": wizard.gi.code, // required
				"description": wizard.gi.description, // required
				"sensitive": (wizard.registry && wizard.registry.sensitive),
				"deployPortal": ($scope.wizard.template.name === environmentsConfig.predefinedPortalTemplateName),
				"deploy": wizard.deployment,
				"templateId": wizard.template._id // required
			},
			template: {
				deploy: apiTemplateDeployInfo
			}
		};
		if (wizard.deployment.namespace){
			output.data.namespace = wizard.deployment.namespace;
		}
		if(wizard.selectedInfraProvider){
			output.data.infraId = wizard.selectedInfraProvider._id; // required
			output.selectedInfraProvider = wizard.selectedInfraProvider;
			
			if(fromOverview){
				output.containers = {};
				output.containers.platform = output.selectedInfraProvider.deploy.technology;
				if(output.selectedInfraProvider.deploy.config){
					output.containers.config = output.selectedInfraProvider.deploy.config;
					output.containers.config.nodes = output.containers.config.ipaddress;
					output.containers.config.apiProtocol = output.containers.config.protocol;
					output.containers.config.apiPort = output.containers.config.port;
					output.containers.config.auth = {
						token: output.containers.config.token
					};
				}
			}
			else{
				if(output.selectedInfraProvider.deploy){
					delete output.selectedInfraProvider.deploy.config;
				}
				
				if(output.data.deploy.selectedInfraProvider && output.data.deploy.selectedInfraProvider.deploy){
					delete output.data.deploy.selectedInfraProvider.deploy.config;
				}
			}
		}
		
		if(wizard.nginx && wizard.nginx && wizard.nginx.domain){
			output.data.domain = wizard.nginx.domain;
		}
		
		if(wizard.nginx && wizard.nginx.apiPrefix){
			output.data.apiPrefix = wizard.nginx.apiPrefix;
		}
		
		if(wizard.nginx && wizard.nginx.sitePrefix){
			output.data.sitePrefix = wizard.nginx.sitePrefix;
		}
		
		if(wizard.registry && wizard.registry.cookiesecret){
			output.data.cookiesecret = wizard.registry.cookiesecret;
		}
		
		if(wizard.registry && wizard.registry.sessionName){
			output.data.sessionName = wizard.registry.sessionName;
		}
		
		if(wizard.registry && wizard.registry.sessionSecret){
			output.data.sessionSecret = wizard.registry.sessionSecret;
		}
		
		if(wizard.registry && wizard.registry.tKeyPass){
			output.data.tKeyPass = wizard.registry.tKeyPass;
		}
		
		return output;
	};
	
	$scope.exitWizard = function(){
		delete $localStorage.addEnv;
		delete $scope.wizard;
		delete $scope.reusableData;
		delete $scope.referringStep;
		delete $scope.currentStep;
		delete $scope.cloudProviders
		$scope.form.formData = {};
		$location.url($location.path());
		$scope.$parent.go("/environments");
	};
	
	function checkEnvironment(cb) {
		if ($localStorage.addEnv && $localStorage.addEnv.gi && $localStorage.addEnv.gi.code) {
			
			$scope.wizard = angular.copy($localStorage.addEnv);
			
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/environment',
				params: {
					code: $localStorage.addEnv.gi.code
				}
			}, function (error, pendingEnvironment) {
				overlayLoading.hide();
				delete pendingEnvironment.soajsauth;
				
				if(pendingEnvironment && Object.keys(pendingEnvironment).length > 0){
					$scope.environmentId = pendingEnvironment._id;
					
					//recalculate envType
					if(pendingEnvironment.deployer.type === 'manual'){
						$scope.envType = 'manual';
					}
					else if(pendingEnvironment.restriction && Object.keys(pendingEnvironment.restriction).length > 0){
						$scope.envType = 'singleInfra';
					}
					else if(pendingEnvironment.deployer.type ==='container'){
						$scope.envType = 'container';
					}
					else{
						let parentScope = $scope;
						$modal.open({
							templateUrl: "invalidEnvConfiguration.tmpl",
							size: 'lg',
							backdrop: true,
							keyboard: true,
							controller: function ($scope, $modalInstance) {
								
								$scope.close = function(){
									delete $localStorage.addEnv;
									delete parentScope.wizard;
									if(parentScope.form){
										parentScope.form.formData = {};
									}
									parentScope.$parent.go("/environments");
									$modalInstance.close();
								};
							}
						});
					}
				}
				else if($scope.wizard && $scope.wizard.envType){
					$scope.envType = $scope.wizard.envType;
				}
				else {
					let parentScope = $scope;
					$modal.open({
						templateUrl: "invalidEnvConfiguration.tmpl",
						size: 'lg',
						backdrop: true,
						keyboard: true,
						controller: function ($scope, $modalInstance) {
							
							$scope.close = function(){
								delete $localStorage.addEnv;
								delete parentScope.wizard;
								if(parentScope.form){
									parentScope.form.formData = {};
								}
								parentScope.$parent.go("/environments");
								$modalInstance.close();
							};
						}
					});
				}
				
				if (pendingEnvironment && (pendingEnvironment.pending || pendingEnvironment.error) && pendingEnvironment.template) {
					$scope.wizard.template = pendingEnvironment.template;
					delete $scope.wizard.template._id;
					$scope.goToStep = 'status';
					$scope.listTemplate();
				}
				else if(pendingEnvironment && Object.keys(pendingEnvironment).length > 0){
					delete $localStorage.addEnv;
					delete $scope.wizard;
					if($scope.form){
						$scope.form.formData = {};
					}
					$scope.$parent.go("/environments");
				}
				else{
					return cb();
				}
			});
		}
		else {
			$scope.envType = '';
			return cb();
		}
	}
	
	injectFiles.injectCss('modules/dashboard/environments/environments-add.css');
	$scope.$parent.collapseExpandMainMenu(true);
	$scope.reRenderMenu('empty');
	
	if ($scope.access.addEnvironment) {
		checkEnvironment(() => {
			let type = angular.copy($scope.envType);
			if(!type || type === ''){
				type = 'manual';
			}
			
			let method = $scope.steps[type][$scope.addEnvCounter];
			//go to status, this happens if refresh was triggered after invoking deploy environment
			if ($scope.environmentId) {
				$scope.addEnvCounter = $scope.steps[type].length - 1;
				method = $scope.steps[type][$scope.addEnvCounter];
			}
			//trigger method
			$scope[method]();
		});
	}
}]);