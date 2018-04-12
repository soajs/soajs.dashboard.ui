"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('addEnvironmentCtrl', ['$scope', '$localStorage', 'ngDataApi', 'injectFiles', 'templateSrv', 'giSrv', 'deploymentSrv', 'registrySrv', 'dynamicSrv', function ($scope, $localStorage, ngDataApi, injectFiles, templateSrv, giSrv, deploymentSrv, registrySrv, dynamicSrv) {
	
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.wizard = {};
	$scope.steps = ['listTemplate', 'generalInfo', 'chooseDeployment', 'chooseRegistry', 'processDynamicSteps', 'displayOverview', 'checkStatus'];
	$scope.addEnvCounter = 4;
	
	function triggerMethod(counter){
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
		if($scope.wizard && $scope.wizard.template){
			$scope.nextStep();
		}
		else{
			templateSrv.go($scope);
		}
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
	
	$scope.displayOverview = function () {
	
	};
	
	$scope.checkStatus = function () {
	
	};
	
	
	function checkEnvironment(cb) {
		if ($localStorage.addEnv && $localStorage.addEnv.gi && $localStorage.addEnv.gi.code) {
			
			$scope.wizard = $localStorage.addEnv;
			
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/environment',
				params: {
					code: $localStorage.addEnv.gi.code
				}
			}, function (error, pendingEnvironment) {
				overlayLoading.hide();
				
				if (pendingEnvironment && (pendingEnvironment.pending || pendingEnvironment.error) && pendingEnvironment.template) {
					$scope.environmentId = pendingEnvironment._id;
					$scope.wizard.template = pendingEnvironment.template;
				}
				return cb();
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
				method = $scope.steps[$scope.steps.length - 1];
			}
			//trigger method
			$scope[method]();
		});
	}
}]);