"use strict";
var containerServices = soajsApp.components;
containerServices.service('containerSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', 'platformCntnr', function (ngDataApi, $timeout, $modal, $localStorage, $window, platformCntnr) {
	
	/**
	 * cross reference the template restrictions with the technologies available
	 * determine if docker and/or kubernetes should show up
	 * @param currentScope
	 */
	function calculateRestrictions(currentScope) {
		let restrictions = currentScope.wizard.template.restriction;
		
		// no restrictions obj
		if (restrictions && restrictions.deployment) {
			let docker = false;
			let kubernetes = false;
			
			if (restrictions.deployment.includes('container')) {
				if (restrictions.driver) {
					if (restrictions.driver.includes('container.docker')) {
						docker = true;
					}
					if (restrictions.driver.includes('container.kubernetes')) {
						kubernetes = true;
					}
				}
				else {
					docker = true;
					kubernetes = true;
				}
			}
			currentScope.containers.showDocker = docker;
			currentScope.containers.showKube = kubernetes;
		}
	}
	
	/**
	 * check if previous scope is already filled and highlight the selected
	 * @param currentScope
	 */
	function checkOpenDefaults(currentScope) {
		if(currentScope.wizard.deployment){
			
			if(currentScope.wizard.deployment.deployment && currentScope.wizard.deployment.deployment.previousEnvironment && currentScope.wizard.deployment.deployment.previousEnvironment !== ''){
				currentScope.containers.form.formData.previousEnvironment = currentScope.wizard.deployment.deployment.previousEnvironment;
				currentScope.containers.switchDriver('previous');
			}
			else if(currentScope.wizard.deployment.selectedInfraProvider){
				let oneProvider;
				currentScope.containers.techProviders.forEach((techProvider) => {
					if(techProvider._id === currentScope.wizard.deployment.selectedInfraProvider._id){
						oneProvider = techProvider;
					}
				});
				
				if(currentScope.wizard.deployment.selectedInfraProvider.deploy){
					if(currentScope.wizard.deployment.selectedInfraProvider.deploy.technology === 'docker'){
						currentScope.containers.switchDriver('docker');
						$timeout(() => {
							currentScope.containers.selectProvider(oneProvider, 'docker');
						}, 300);
					}
					
					if(currentScope.wizard.deployment.selectedInfraProvider.deploy.technology === 'kubernetes'){
						currentScope.containers.switchDriver('kubernetes');
						$timeout(() => {
							currentScope.containers.selectProvider(oneProvider, 'kubernetes');
						}, 300);
					}
				}
			}
		}
	}
	
	/**
	 * handle the step via the wizard by collecting the information selected to post in the last step
	 * @param currentScope
	 * @param formData
	 */
	function handleFormData(currentScope, formData) {
		currentScope.containers.defaultAttachContainerAction = function(currentScope, postData){
			currentScope.wizard.selectedInfraProvider = postData.selectedInfraProvider;
			if (currentScope.wizard.selectedInfraProvider
				&& currentScope.wizard.selectedInfraProvider.deploy
				&& currentScope.wizard.selectedInfraProvider.deploy.config
				&& currentScope.wizard.selectedInfraProvider.deploy.config.namespace) {
				currentScope.wizard.selectedInfraProvider.deploy.config.namespace.default = currentScope.wizard.gi.code;
			}
			
			let finalPostData = {
				selectedDriver: 'container',
			};
			
			if(postData.deployment.previousEnvironment){
				finalPostData.previousEnvironment = postData.deployment.previousEnvironment;
				finalPostData.technology = postData.deployment.selectedDriver;
			}
			else{
				finalPostData.technology = postData.deployment.selectedDriver;
			}
			
			finalPostData.selectedInfraProvider = postData.selectedInfraProvider;
			
			currentScope.wizard.deployment = angular.copy(finalPostData);
			$localStorage.addEnv = angular.copy(currentScope.wizard);
			currentScope.nextStep();
		};
		
		currentScope.containers.attachContainerTechnology(formData);
	}
	
	function go(currentScope, cb) {
		
		currentScope.currentStep = 'container';
		
		platformCntnr.go(currentScope, 'attachContainer', () => {
			
			checkOpenDefaults(currentScope);
			
			calculateRestrictions(currentScope);
			
			//reset buttons form
			currentScope.containers.form.actions = [];
			
			//add go back button
			currentScope.containers.form.actions.push({
				'type': 'button',
				'label': 'Back',
				'btn': 'success',
				'action': function () {
					currentScope.referringStep = currentScope.currentStep;
					currentScope.previousStep();
				}
			});
			
			//check and add next or finalize buttton
			currentScope.containers.form.actions.push({
				'type': 'submit',
				'label': 'Next',
				'btn': 'primary',
				'action': function (formData) {
					currentScope.referringStep = currentScope.currentStep;
					handleFormData(currentScope, formData);
				}
			});
			
			//add cancel all button
			currentScope.containers.form.actions.push({
				'type': 'reset',
				'label': translation.cancel[LANG],
				'btn': 'danger',
				'action': function () {
					currentScope.exitWizard();
				}
			});
		});
	}
	
	return {
		"go": go
	}
}]);
