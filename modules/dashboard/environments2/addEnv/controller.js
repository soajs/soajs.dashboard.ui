"use strict";
let addEnv = soajsApp.components;
addEnv.controller('addEnvCtrl', ['$scope', 'ngDataApi', 'injectFiles', 'typeServices', 'giServices', 'manualServices', 'containerServices', 'overviewServices', function ($scope, ngDataApi, injectFiles, typeServices, giServices, manualServices, containerServices, overviewServices) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.wizard = {
		"images": {"kubernetes": "./themes/" + themeToUse + "/img/kubernetes_logo.png"},
		"currentStep": "type",
		"providerLabel": "",
		"envType": null,
		"provider": null,
		"providers": null,
		"form": {
			"data": {
				"template": "Blank environment"
			},
			"actions": []
		},
		"go": {
			"type": () => {
				typeServices.init($scope);
				typeServices.addActions($scope);
			},
			"gi": () => {
				giServices.init($scope);
				giServices.addActions($scope);
			},
			"manual": () => {
				manualServices.init($scope);
				manualServices.addActions($scope);
			},
			"container": () => {
				containerServices.init($scope);
				containerServices.addActions($scope);
			},
			"overview": () => {
				overviewServices.init($scope);
				overviewServices.addActions($scope);
			}
		}
	};
	$scope.setEnv = function (type) {
		$scope.wizard.envType = type;
		typeServices.addActions($scope)
	};
	$scope.setProvider = function (provider) {
		$scope.wizard.provider = provider;
		$scope.wizard.providerLabel = provider.label;
		containerServices.addActions($scope)
	};
	
	$scope.exitWizard = function () {
		delete $scope.wizard;
		$scope.$parent.go("/environments-platforms");
	};
	
	$scope.$parent.collapseExpandMainMenu(true);
	$scope.reRenderMenu('empty');
	
	$scope.wizard.go.type();
	
	injectFiles.injectCss('modules/dashboard/environments2/environments-add.css');
}]);
