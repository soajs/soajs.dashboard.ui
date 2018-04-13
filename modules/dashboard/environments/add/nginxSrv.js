"use strict";
var nginxServices = soajsApp.components;
nginxServices.service('nginxSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	function handleFormData(currentScope, formData) {
		currentScope.wizard.nginx = angular.copy(formData);
		$localStorage.addEnv = angular.copy(currentScope.wizard);
		delete $localStorage.addEnv.template.content;
		currentScope.nextStep();
	}
	
	function go(currentScope) {
		
		let nginxResourceExists = false;
		if(currentScope.wizard.deployment.selectedDriver !== 'manual'){
			if (currentScope.wizard.template && currentScope.wizard.template.content && currentScope.wizard.template.content.deployments && currentScope.wizard.template.content.deployments.resources) {
				let resources = currentScope.wizard.template.content.deployments.resources;
				
				for(let oneResource in resources){
					if(resources[oneResource].type === 'server' && resources[oneResource].category === 'nginx'){
						nginxResourceExists = true;
					}
				}
			}
		}
		
		if (!nginxResourceExists) {
			currentScope.nextStep();
		} else {
			
			overlayLoading.show();
			let configuration = angular.copy(environmentsConfig.form.add.step6.entries);
			
			let options = {
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
							if (currentScope.form && currentScope.form.formData) {
								currentScope.form.formData = {};
							}
							currentScope.previousStep();
						}
					}
				]
			};
			
			if (!currentScope.wizard.template.content || Object.keys(currentScope.wizard.template.content).length === 0) {
				options.actions.push({
					'type': 'submit',
					'label': 'OverView & Finalize',
					'btn': 'primary',
					'action': function (formData) {
						handleFormData(currentScope, formData);
					}
				});
			}
			else {
				options.actions.push({
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						handleFormData(currentScope, formData);
					}
				});
			}
			
			options.actions.push({
				'type': 'reset',
				'label': translation.cancel[LANG],
				'btn': 'danger',
				'action': function () {
					delete $localStorage.addEnv;
					delete currentScope.wizard;
					currentScope.form.formData = {};
					currentScope.$parent.go("/environments")
				}
			});
			
			buildForm(currentScope, $modal, options, function () {
				
				currentScope.mapStorageToWizard($localStorage.addEnv);
				
				if (currentScope.wizard.nginx) {
					currentScope.form.formData = angular.copy(currentScope.wizard.nginx);
				}
				
				if (!currentScope.form.formData) {
					currentScope.form.formData = {};
				}
				
				overlayLoading.hide();
			});
		}
	}
	
	return {
		"go": go
	}
}]);