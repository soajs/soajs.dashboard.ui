"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('addEnvironmentCtrl', ['$scope', '$localStorage', 'ngDataApi', 'injectFiles', 'templateSrvDeploy', 'giSrv', 'deploymentSrv', 'vmSrv', 'registrySrv', 'overviewSrv', 'dynamicSrv', 'nginxSrv', 'statusSrv', function ($scope, $localStorage, ngDataApi, injectFiles, templateSrvDeploy, giSrv, deploymentSrv, vmSrv, registrySrv, overviewSrv, dynamicSrv, nginxSrv, statusSrv) {
	
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.wizard = {};
	
	//list of steps the wizard executes, each step has a method below
	$scope.steps = ['listTemplate', 'generalInfo', 'chooseDeployment', 'chooseVM', 'chooseRegistry', 'processDynamicSteps', 'chooseNginx', 'displayOverview', 'checkStatus'];
	$scope.addEnvCounter = 0;
	$scope.environmentWizard = true;
	$scope.envType = '';

	function triggerMethod(counter) {
		let method = $scope.steps[counter];
		$scope[method]();
	}
	
	$scope.nextStep = function () {
		jQuery("html, body").animate({scrollTop: 0 });
		$scope.addEnvCounter++;
		if ($scope.addEnvCounter >= $scope.steps.length - 1) {
			$scope.addEnvCounter = $scope.steps.length - 1;
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
	
	$scope.chooseDeployment = function () {
		deploymentSrv.go($scope);
	};
	
	$scope.chooseVM = function () {
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
		
		let wizard = $scope.wizard;
		
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
									oneRepoImfv.options.custom.version = parseInt(oneRepoImfv.options.custom.version);
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
		
		if(wizard.selectedInfraProvider){
			output.data.infraId = wizard.selectedInfraProvider._id; // required
		}
		
		if(wizard.selectedInfraProvider){
			output.selectedInfraProvider = wizard.selectedInfraProvider;
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
				
				if(pendingEnvironment){
					$scope.environmentId = pendingEnvironment._id;
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
			return cb();
		}
	}
	
	injectFiles.injectCss('modules/dashboard/environments/environments-add.css');
	$scope.$parent.collapseExpandMainMenu(true);
	$scope.reRenderMenu('empty');
	
	if ($scope.access.addEnvironment) {
		checkEnvironment(() => {
			let method = $scope.steps[$scope.addEnvCounter];
			//go to status, this happens if refresh was triggered after invoking deploy environment
			if ($scope.environmentId) {
				$scope.addEnvCounter = $scope.steps.length - 1;
				method = $scope.steps[$scope.addEnvCounter];
			}
			//trigger method
			$scope[method]();
		});
	}
}]);