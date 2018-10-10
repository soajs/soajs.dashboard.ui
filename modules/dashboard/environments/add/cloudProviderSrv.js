"use strict";
var cloudProviderServices = soajsApp.components;
cloudProviderServices.service('cloudProviderSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', 'platformCloudProvider', function (ngDataApi, $timeout, $modal, $localStorage, $window, platformCloudProvider) {
	
	/**
	 * handle storing one cloud provider configuration in wizard scope
	 * @param currentScope
	 * @param formData
	 */
	function handleFormData(currentScope, formData) {
		currentScope.wizard.deployment = {
			selectedInfraProvider: angular.copy(formData)
		};
		$localStorage.addEnv = angular.copy(currentScope.wizard);
		currentScope.nextStep();
	}
	
	/**
	 * main section driver
	 * @param currentScope
	 */
	function go(currentScope){
		
		currentScope.currentStep = 'cloudProvider';
		
		currentScope.originalEnvironment = angular.copy(currentScope.environment);
		
		if(!currentScope.cloud){
			currentScope.cloud = currentScope.$new(true); //true means detached from main currentScope
			
			//reset the form and its data
			currentScope.cloud.form = { formData: {} };
			
			//calculate and set the form buttons
			currentScope.cloud.form.actions = [
				{
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						delete currentScope.cloud;
						currentScope.referringStep = currentScope.currentStep;
						if (currentScope.form && currentScope.form.formData) {
							currentScope.form.formData = {};
						}
						currentScope.previousStep();
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
			];
		}
		
		/**
		 * invoke the list cloud provider main function
		 */
		platformCloudProvider.go(currentScope, 'selectProvider', () => {
			
			//override the default behavior of the show next button and its functionality
			currentScope.cloud.showNextButton = function() {
				
				if(currentScope.cloud.form.formData.network && currentScope.cloud.form.formData.network !== ''){
					//fix the buttons of this page
					
					//re-print new buttons for page
					currentScope.cloud.form.actions = [
						{
							'type': 'button',
							'label': "Back",
							'btn': 'success',
							'action': function () {
								delete currentScope.cloud;
								currentScope.referringStep = currentScope.currentStep;
								if (currentScope.form && currentScope.form.formData) {
									currentScope.form.formData = {};
								}
								currentScope.previousStep();
							}
						},
						{
							'type': 'button',
							'label': "Next",
							'btn': 'primary',
							'action': function () {
								if(!currentScope.cloud.form.formData.selectedProvider){
									$window.alert("Select a cloud Provider to proceed.");
									return false;
								}
								
								if(!currentScope.cloud.form.formData.region){
									$window.alert("Select a region for this cloud Provider to proceed.");
									return false;
								}
								
								if(!currentScope.cloud.form.formData.network){
									$window.alert("Select a network for this cloud Provider to proceed.");
									return false;
								}
								
								//call api and lock the infra then update the environment scope
								let cloudProviderConfig = {
									"infraId": currentScope.cloud.form.formData.selectedProvider._id,
									"region": currentScope.cloud.form.formData.region,
									"network": currentScope.cloud.form.formData.network
								};
								
								if(currentScope.cloud.form.formData.providerExtra && Object.keys(currentScope.cloud.form.formData.providerExtra).length > 0){
									if(!cloudProviderConfig.data.extras){
										cloudProviderConfig.data.extras = {};
									}
									for(let property in currentScope.cloud.form.formData.providerExtra){
										let paramProperty = (property === 'groups') ? 'group': property;
										cloudProviderConfig.data.extras[paramProperty] = currentScope.cloud.form.formData.providerExtra[property];
									}
								}
								
								handleFormData(currentScope, cloudProviderConfig)
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
					];
				}
			};
			
			//check if the form was already filled
			currentScope.mapStorageToWizard($localStorage.addEnv);
			
			//set the region and network and infra information
			if (currentScope.wizard.deployment && currentScope.wizard.deployment.selectedInfraProvider) {
				currentScope.cloud.form.formData = angular.copy(currentScope.wizard.deployment.selectedInfraProvider);
				
				//locate the previous existing cloud provider and set it
				currentScope.cloud.cloudProviders.forEach((oneProvider) => {
					if(oneProvider._id === currentScope.cloud.form.formData.infraId){
						currentScope.cloud.form.formData.selectedProvider = oneProvider;
						oneProvider.expanded = true;
						
						//expand other inputs
						currentScope.cloud.populateProviderExtra ();
						$timeout(() => {
							currentScope.cloud.showNextButton();
						}, 500);
					}
				});
			}
		});
	}
	
	return {
		"go": go
	}
}]);