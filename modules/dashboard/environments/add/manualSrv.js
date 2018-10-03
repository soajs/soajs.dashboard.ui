"use strict";
var manualServices = soajsApp.components;
manualServices.service('manualSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$location', function (ngDataApi, $timeout, $modal, $localStorage, $window, $location) {
	
	function go(currentScope) {
		currentScope.currentStep = 'manual';
		
		overlayLoading.show();
		
		let entries = {
			ipAddress: {
				required: true,
				disabled: true,
				value: '127.0.0.1'
			}
		};
		currentScope.tempFormEntries = entries;
		
		let options = {
			timeout: $timeout,
			entries: [],
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						if (currentScope.form && currentScope.form.formData) {
							currentScope.form.formData = {};
						}
						currentScope.referringStep = currentScope.currentStep;
						currentScope.previousStep();
					}
				},
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						if (!formData || !formData.deployment || !formData.deployment.manual || !formData.deployment.manual.nodes || formData.deployment.manual.nodes !== '127.0.0.1') {
							$window.alert("Invalid or NO IP address found for this type of environments, unable to proceed!");
							currentScope.form.actions.splice(1, 1);
							return false;
						}
						
						formData.selectedDriver = 'manual';
						currentScope.referringStep = currentScope.currentStep;
						
						currentScope.wizard.deployment = angular.copy(formData);
						$localStorage.addEnv = angular.copy(currentScope.wizard);
						currentScope.nextStep();
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.exitWizard();
					}
				}
			]
		};
		
		buildForm(currentScope, $modal, options, function () {
			
			currentScope.mapStorageToWizard($localStorage.addEnv);
			
			currentScope.form.formData = angular.copy(currentScope.wizard.deployment);
			
			if (!currentScope.form.formData) {
				currentScope.form.formData = {};
			}
			
			if (!currentScope.form.formData.deployment) {
				currentScope.form.formData.deployment = {};
			}
			
			if (!currentScope.form.formData.deployment.manual) {
				currentScope.form.formData.deployment.manual = {};
			}
			
			if (!currentScope.form.formData.deployment.manual.nodes) {
				currentScope.form.formData.deployment.manual.nodes = entries.ipAddress.value;
			}
			
			overlayLoading.hide();
		});
	}
	
	return {
		"go": go
	}
}]);