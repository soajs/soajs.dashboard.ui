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
			},
			port: {
				required: true,
				value: 4000
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
						if (!formData || !formData.deployment || !formData.deployment.manual || !formData.deployment.manual.nodes || formData.deployment.manual.nodes !== '127.0.0.1' || !formData.deployment.manual.port) {
							$window.alert("Invalid or NO IP address found for this type of environments, unable to proceed!");
							currentScope.form.actions.splice(1, 1);
							return false;
						}
						
						formData.selectedDriver = 'manual';
						currentScope.referringStep = currentScope.currentStep;
						
						var options = {
							"method": "get",
							"routeName": "/dashboard/environment/list",
							"params": {}
						};
						// Check for Env code
						getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
							if (error) {
								currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								let conflict1 = false, conflict2 = false, conflict3 = false;
								response.forEach((oneEnv) => {
									if(parseInt(oneEnv.services.config.ports.controller) === formData.deployment.manual.port){
										conflict1 = true;
									}
									else if (parseInt(oneEnv.services.config.ports.controller) + parseInt(oneEnv.services.config.ports.maintenanceInc) === formData.deployment.manual.port){
										conflict2 = true;
									}
									else if(
										formData.deployment.manual.port > parseInt(oneEnv.services.config.ports.controller) &&
										formData.deployment.manual.port < parseInt(oneEnv.services.config.ports.controller) + parseInt(oneEnv.services.config.ports.maintenanceInc)
									){
										conflict3 = true;
									}
								});
								
								if(conflict1){
									$window.alert("There is another manual development environment that has the same API gateway port!");
									return false;
								}
								
								if(conflict2){
									$window.alert("There is another manual development environment that has the same API gateway with the same maintenance port!");
									return false;
								}
								
								if(conflict3){
									$window.alert("The Gateway port you provided conflicts with the port range configuration of another environment's API Gateway!");
									return false;
								}
								
								currentScope.wizard.deployment = angular.copy(formData);
								$localStorage.addEnv = angular.copy(currentScope.wizard);
								currentScope.nextStep();
							}
						});
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
			
			if (!currentScope.form.formData.deployment.manual.port) {
				currentScope.form.formData.deployment.manual.port = entries.port.value;
			}
			
			overlayLoading.hide();
		});
	}
	
	return {
		"go": go
	}
}]);