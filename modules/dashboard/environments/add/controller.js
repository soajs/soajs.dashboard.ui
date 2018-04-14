"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('addEnvironmentCtrl', ['$scope', '$localStorage', 'ngDataApi', 'injectFiles', 'templateSrv', 'giSrv', 'deploymentSrv', 'registrySrv', 'overviewSrv', 'dynamicSrv', 'nginxSrv', 'statusSrv', function ($scope, $localStorage, ngDataApi, injectFiles, templateSrv, giSrv, deploymentSrv, registrySrv, overviewSrv, dynamicSrv, nginxSrv, statusSrv) {
	
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.wizard = {};
	$scope.steps = ['listTemplate', 'generalInfo', 'chooseDeployment', 'chooseRegistry', 'processDynamicSteps', 'chooseNginx', 'displayOverview', 'checkStatus'];
	$scope.addEnvCounter = 0;
	
	function triggerMethod(counter) {
		let method = $scope.steps[counter];
		console.log("calling method", method);
		$scope[method]();
	}
	
	$scope.nextStep = function () {
		$scope.addEnvCounter++;
		if ($scope.addEnvCounter >= $scope.steps.length - 1) {
			$scope.addEnvCounter = $scope.steps.length - 1;
		}
		triggerMethod($scope.addEnvCounter);
	};
	
	$scope.previousStep = function () {
		$scope.addEnvCounter--;
		if ($scope.addEnvCounter <= 0) {
			$scope.addEnvCounter = 0;
		}
		triggerMethod($scope.addEnvCounter);
	};
	
	$scope.listTemplate = function () {
		templateSrv.go($scope);
	};
	
	$scope.chooseTemplate = function (template) {
		templateSrv.chooseTemplate($scope, template);
	};
	
	$scope.generalInfo = function () {
		giSrv.go($scope);
	};
	
	$scope.chooseDeployment = function () {
		deploymentSrv.go($scope);
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
	
	$scope.mapUserInputsToOverview = function () {
		
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
					if(stepName.indexOf(".repo.") !== -1){
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
							});
						}
					}
				}
			}
		}
		
		let output = {
			data: {
				"code": wizard.gi.code, // required
				"description": wizard.gi.description, // required
				"sensitive": wizard.registry.sensitive || false,
				"soajsFrmwrk": wizard.registry.soajsFrmwrk || false,
				"deployPortal": ($scope.wizard.template.name === environmentsConfig.predefinedPortalTemplateName),
				"deploy": wizard.deployment,
				"templateId": wizard.template._id // required
			},
			template: {
				deploy: apiTemplateDeployInfo
			}
		};
		
		if(wizard.gi.domain){
			output.data.domain = wizard.gi.domain;
		}
		
		if(wizard.gi.apiPrefix){
			output.data.apiPrefix = wizard.gi.apiPrefix;
		}
		
		if(wizard.gi.sitePrefix){
			output.data.sitePrefix = wizard.gi.sitePrefix;
		}
		
		if(wizard.gi.cookiesecret){
			output.data.cookiesecret = wizard.gi.cookiesecret;
		}
		
		if(wizard.gi.sessionName){
			output.data.sessionName = wizard.gi.sessionName;
		}
		
		if(wizard.gi.sessionSecret){
			output.data.sessionSecret = wizard.gi.sessionSecret;
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
				
				if(pendingEnvironment){
					$scope.environmentId = pendingEnvironment._id;
				}
				
				if (pendingEnvironment && (pendingEnvironment.pending || pendingEnvironment.error) && pendingEnvironment.template) {
					$scope.wizard.template = pendingEnvironment.template;
					$scope.checkStatus();
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
	$scope.$parent.collapseExpandMainMenu();
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