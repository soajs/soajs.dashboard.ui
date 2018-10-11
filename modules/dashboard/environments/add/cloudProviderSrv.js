"use strict";
var cloudProviderServices = soajsApp.components;
cloudProviderServices.service('cloudProviderSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', 'platformCloudProvider', function (ngDataApi, $timeout, $modal, $localStorage, $window, platformCloudProvider) {
	
	/**
	 * check if previous scope is already filled and highlight the selected container technology chosen
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
							currentScope.attach = true;
							currentScope.containers.selectProvider(oneProvider, 'docker');
							
							$timeout(() => {
								for(let i in currentScope.wizard.deployment.selectedInfraProvider.deploy){
									currentScope.containers.form.formData[i] = currentScope.wizard.deployment.selectedInfraProvider.deploy[i];
									if(i === 'infraCodeTemplate'){
										currentScope.containers.form.entries[0].onAction(i, currentScope.containers.form.formData[i], currentScope.containers.form);
									}
								}
							}, 500);
						}, 500);
					}
					
					if(currentScope.wizard.deployment.selectedInfraProvider.deploy.technology === 'kubernetes'){
						currentScope.containers.switchDriver('kubernetes');
						$timeout(() => {
							currentScope.attach = true;
							currentScope.containers.selectProvider(oneProvider, 'kubernetes');
							
							$timeout(() => {
								for(let i in currentScope.wizard.deployment.selectedInfraProvider.deploy){
									currentScope.containers.form.formData[i] = currentScope.wizard.deployment.selectedInfraProvider.deploy[i];
									if(i === 'infraCodeTemplate'){
										currentScope.containers.form.entries[0].onAction(i, currentScope.containers.form.formData[i], currentScope.containers.form);
									}
								}
							}, 500);
						}, 500);
					}
				}
			}
		}
	}
	
	/**
	 * handle storing one cloud provider configuration in wizard scope
	 * @param currentScope
	 * @param formData
	 */
	function handleFormData(currentScope, cloudProviderFormData) {
		
		//mimic behavior as if infra env code was set
		if(!currentScope.envCode){
			currentScope.envCode = currentScope.wizard.gi.code;
		}
		
		//if not already set or different than previous
		if(!currentScope.wizard.deployment || (currentScope.wizard.deployment.selectedInfraProvider && currentScope.wizard.deployment.selectedInfraProvider.infraId !== cloudProviderFormData.infraId)){
			//store the details of this cloud provider so that the next interface opens
			currentScope.wizard.deployment = {
				selectedInfraProvider: angular.copy(cloudProviderFormData)
			};
			delete currentScope.wizard.deployment.technology;
			$localStorage.addEnv = angular.copy(currentScope.wizard);
		}
		
		//mimic behavior as if environment has restriction
		currentScope.environment = {
			restriction : {
				[currentScope.wizard.deployment.selectedInfraProvider.infraId] : {
					[currentScope.wizard.deployment.selectedInfraProvider.region]: {
						'network': currentScope.wizard.deployment.selectedInfraProvider.network
					}
				}
			}
		};
		
		//call print provider to render the display of available cloud provider infra options
		currentScope.cloud.printProvider(() => {
			
			//check if container form is already filled case of back and refresh
			if(currentScope.cloud.showDocker || currentScope.cloud.showKube){
				$timeout(() => {
					checkOpenDefaults(currentScope);
				}, 500);
			}
			
			console.log(currentScope.containers);
			console.log(currentScope.vms);
			
			//recalculate and print form buttons
			currentScope.cloud.form.actions = [
				{
					'type': 'submit',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						go(currentScope);
					}
				},
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						
						//todo: need to add the ability to choose either container or vms
						
						//todo: need to add assertion on restrictions from template
						//if provider supports containers and containers is set, collect the data.
						if(currentScope.cloud.showKube || currentScope.cloud.showDocker){
							//check if he can proceed....
							let proceed = false;
							if(currentScope.containers.form && currentScope.containers.form.formData && currentScope.containers.form.formData.previousEnvironment){
								formData = { previousEnvironment: currentScope.containers.form.formData.previousEnvironment };
								proceed = true;
							}
							else{
								currentScope.containers.techProviders[0].deploy = angular.copy(formData);
								delete currentScope.containers.techProviders[0].deploy.selectedProvider;
								proceed = true;
							}
							
							if(!proceed){
								$window.alert("Either choose to use the same cluster of a previous created environment or select an Infra As Code Template and fill out its inputs so you can proceed.");
							}
							else{
								//override the default behavior of attach container, push information into the scope
								currentScope.containers.defaultAttachContainerAction = function(currentScope, postData){
									
									currentScope.wizard.selectedInfraProvider = postData.selectedInfraProvider;
									
									let finalPostData = {
										selectedDriver: 'container'
									};
									
									//todo: check the extras
									
									if(postData.deployment.previousEnvironment){
										finalPostData.previousEnvironment = postData.deployment.previousEnvironment;
										finalPostData.technology = postData.deployment.selectedDriver;
									}
									else {
										finalPostData.technology = postData.deployment.selectedDriver;
									}
									
									finalPostData.selectedInfraProvider = postData.selectedInfraProvider;
									
									//clone the line 13 to final postData
									for(let i in currentScope.wizard.deployment.selectedInfraProvider){
										finalPostData.selectedInfraProvider[i] = currentScope.wizard.deployment.selectedInfraProvider[i]
									}
									
									//update the wizard scope
									currentScope.wizard.deployment = angular.copy(finalPostData);

									$localStorage.addEnv = angular.copy(currentScope.wizard);
								};
								
								currentScope.containers.attachContainerTechnology(formData);
							}
						}
						
						//if provider supports vm and vm is set, collect the data.
						if(currentScope.cloud.showVM){
						
						}
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete currentScope.cloud;
						delete currentScope.containers;
						delete currentScope.vms;
						currentScope.exitWizard();
					}
				}
			];
		});
	}
	
	/**
	 * main section driver
	 * @param currentScope
	 */
	function go(currentScope){
		
		currentScope.currentStep = 'cloudProvider';
		
		currentScope.originalEnvironment = angular.copy(currentScope.environment);
		
		//reset the section
		delete currentScope.environment;
		delete currentScope.attach;
		
		if(!currentScope.cloud){
			currentScope.cloud = currentScope.$new(true); //true means detached from main currentScope
			
			//reset the form and its data
			currentScope.cloud.form = { formData: {} };
			
			//calculate and set the form buttons
			currentScope.cloud.form.actions = [
				{
					'type': 'submit',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						delete currentScope.cloud;
						delete currentScope.containers;
						delete currentScope.vms;
						currentScope.referringStep = currentScope.currentStep;
						currentScope.previousStep();
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete currentScope.cloud;
						delete currentScope.containers;
						delete currentScope.vms;
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
								delete currentScope.containers;
								delete currentScope.vms;
								currentScope.referringStep = currentScope.currentStep;
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
									if(!cloudProviderConfig.extras){
										cloudProviderConfig.extras = {};
									}
									for(let property in currentScope.cloud.form.formData.providerExtra){
										let paramProperty = (property === 'groups') ? 'group': property;
										cloudProviderConfig.extras[paramProperty] = currentScope.cloud.form.formData.providerExtra[property];
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
								delete currentScope.cloud;
								delete currentScope.containers;
								delete currentScope.vms;
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