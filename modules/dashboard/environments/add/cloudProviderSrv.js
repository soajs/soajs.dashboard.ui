"use strict";
var cloudProviderServices = soajsApp.components;
cloudProviderServices.service('cloudProviderSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', 'platformCloudProvider', 'vmSrv', function (ngDataApi, $timeout, $modal, $localStorage, $window, platformCloudProvider, vmSrv) {
	
	/**
	 * check if previous scope is already filled and highlight the selected container technology chosen
	 * @param currentScope
	 */
	function checkOpenDefaults(currentScope, cb) {
		if (currentScope.wizard.deployment) {
			if (currentScope.wizard.deployment && currentScope.wizard.deployment.previousEnvironment && currentScope.wizard.deployment.previousEnvironment !== '') {
				currentScope.containers.getEnvironments(() => {
					currentScope.containers.form.formData.previousEnvironment = currentScope.wizard.deployment.previousEnvironment;
					currentScope.containers.changeLikeEnv();
					currentScope.containers.switchDriver("previous");
					return cb();
				});
			}
			else if (currentScope.wizard.deployment.selectedInfraProvider) {
				let oneProvider;
				currentScope.containers.techProviders.forEach((techProvider) => {
					if (techProvider._id === currentScope.wizard.deployment.selectedInfraProvider._id) {
						oneProvider = techProvider;
					}
				});
				
				if (currentScope.wizard.deployment.selectedInfraProvider.deploy) {
					if (currentScope.wizard.deployment.selectedInfraProvider.deploy.technology === 'docker') {
						$timeout(() => {
							currentScope.containers.selectProvider(oneProvider, 'docker');
							currentScope.containers.switchDriver('docker');
							for (let i in currentScope.wizard.deployment.selectedInfraProvider.deploy) {
								currentScope.containers.form.formData[i] = currentScope.wizard.deployment.selectedInfraProvider.deploy[i];
								if (i === 'infraCodeTemplate') {
									currentScope.containers.form.entries[0].onAction(i, currentScope.containers.form.formData[i], currentScope.containers.form);
								}
							}
							return cb();
						}, 1500);
					}
					else if (currentScope.wizard.deployment.selectedInfraProvider.deploy.technology === 'kubernetes') {
						$timeout(() => {
							currentScope.containers.selectProvider(oneProvider, 'kubernetes');
							currentScope.containers.switchDriver('kubernetes');
							for (let i in currentScope.wizard.deployment.selectedInfraProvider.deploy) {
								currentScope.containers.form.formData[i] = currentScope.wizard.deployment.selectedInfraProvider.deploy[i];
								if (i === 'infraCodeTemplate') {
									currentScope.containers.form.entries[0].onAction(i, currentScope.containers.form.formData[i], currentScope.containers.form);
								}
							}
							return cb();
						}, 1500);
					}
					else {
						return cb();
					}
				}
				else {
					return cb();
				}
			}
		}
		else return cb();
	}
	
	/**
	 * method that invokes the vmSrv which in turn overloads the default VM functionality of the service and adds wrappers around them to store data in the wizard scope instead of calling the APIs directly.
	 * @param currentScope
	 */
	function encapsulateDefaultVMServiceFunctions(currentScope, cb) {
		vmSrv.go(currentScope, cb);
	}
	
	/**
	 * handle storing one cloud provider configuration in wizard scope
	 * @param currentScope
	 * @param formData
	 */
	function handleFormData(currentScope, cloudProviderFormData) {
		//mimic behavior as if infra env code was set
		if (!currentScope.envCode) {
			currentScope.envCode = currentScope.wizard.gi.code;
		}
		
		//if not already set or different than previous
		if (!currentScope.wizard.deployment || !currentScope.wizard.deployment.selectedInfraProvider || (currentScope.wizard.deployment.selectedInfraProvider && currentScope.wizard.deployment.selectedInfraProvider.infraId !== cloudProviderFormData.infraId)) {
			//store the details of this cloud provider so that the next interface opens
			currentScope.wizard.deployment = {
				selectedInfraProvider: angular.copy(cloudProviderFormData)
			};
			delete currentScope.wizard.deployment.technology;
			$localStorage.addEnv = angular.copy(currentScope.wizard);
		}
		if (currentScope.wizard.selectedInfraProvider
			&& currentScope.wizard.selectedInfraProvider.deploy
			&& currentScope.wizard.selectedInfraProvider.deploy.config){
			currentScope.wizard.selectedInfraProvider.deploy.config.namespace.default = currentScope.wizard.gi.code;
		}
		let containerCheck = false, vmCheck = false;
		currentScope.attach = true;
		//mimic behavior as if environment has restriction
		currentScope.environment = {
			restriction: {
				[currentScope.wizard.deployment.selectedInfraProvider.infraId]: {
					[currentScope.wizard.deployment.selectedInfraProvider.region]: {
						'network': currentScope.wizard.deployment.selectedInfraProvider.network
					}
				}
			}
		};
		
		overlayLoading.show();
		currentScope.cloud.printProvider(() => {
			//restrict certain technologies
			if (currentScope.wizard.template.restriction && currentScope.wizard.template.restriction.deployment) {
				
				let docker = false;
				let kubernetes = false;
				let vm = false;
				
				let restriction = currentScope.wizard.template.restriction;
				restriction.deployment.forEach((oneTechnology) => {
					if (oneTechnology === 'container') {
						//check the driver
						if (restriction.driver) {
							if (restriction.driver.includes('container.docker')) {
								docker = true;
							}
							if (restriction.driver.includes('container.kubernetes')) {
								kubernetes = true;
							}
						}
						else {
							docker = true;
							kubernetes = true;
						}
					}
					else {
						//check the driver
						if (restriction.deployment.includes('vm')) {
							vm = true;
						}
					}
				});
				
				if (currentScope.wizard.deployment.selectedInfraProvider.showDocker) {
					currentScope.wizard.deployment.selectedInfraProvider.showDocker = docker;
				}
				
				if (currentScope.wizard.deployment.selectedInfraProvider.showDocker) {
					currentScope.wizard.deployment.selectedInfraProvider.showKube = kubernetes;
				}
				if (currentScope.wizard.deployment.selectedInfraProvider.showVm) {
					currentScope.wizard.deployment.selectedInfraProvider.showVm = vm;
				}
				
				currentScope.cloud.showDocker = docker;
				currentScope.cloud.showKube = kubernetes;
				currentScope.cloud.showVm = vm;
			}
			
			//check if container form is already filled case of back and refresh
			if (currentScope.cloud.showDocker || currentScope.cloud.showKube) {
				checkOpenDefaults(currentScope, () => {
					containerCheck = true;
					moveOn();
				});
			}
			
			//check if vm is already filled
			if (currentScope.cloud.showVm) {
				encapsulateDefaultVMServiceFunctions(currentScope, () => {
					vmCheck = true;
					moveOn();
				});
			}
			
			//recalculate and print form buttons
			currentScope.cloud.form.actions = [
				{
					'type': 'submit',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						go(currentScope, true);
					}
				},
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						let containerCluster = false, vmLayers = false;
						let containerRequired = false, vmRequired = false;
						
						let bankTemplate = false;
						//calculate blank template
						if (!currentScope.wizard.template.deploy || Object.keys(currentScope.wizard.template.deploy).length === 0) {
							bankTemplate = true;
						}
						//template is blank, variation 2
						else if (currentScope.wizard.template.deploy && currentScope.wizard.template.deploy.deployments) {
							if(Object.keys(currentScope.wizard.template.deploy.deployments).length === 0){
								bankTemplate = true;
							}
							else {
								if(Object.keys(currentScope.wizard.template.deploy.deployments.pre).length === 0 && Object.keys(currentScope.wizard.template.deploy.deployments.steps).length === 0 && Object.keys(currentScope.wizard.template.deploy.deployments.post).length === 0){
									bankTemplate = true;
								}
							}
						}
						
						//template supports vm but not restricted to only vm
						if (currentScope.wizard.template.restriction) {
							let restriction = currentScope.wizard.template.restriction;
							
							if (restriction.deployment) {
								
								if (restriction.deployment.includes('container')) {
									containerRequired = true;
								}
								
								if (restriction.deployment.includes('vm')) {
									vmRequired = true;
								}
							}
						}
						
						//check if there is a secret or source code deployment then container is required
						//check if there is a resource that requires vm deployment
						if (currentScope.wizard.template.deploy && currentScope.wizard.template.deploy.deployments) {
							let deployments = currentScope.wizard.template.deploy.deployments;
							let stepsKeys = Object.keys(deployments);
							stepsKeys.forEach(function (deploymentType) {
								if (deployments[deploymentType]) {
									let stagesKeys = Object.keys(deployments[deploymentType]);
									stagesKeys.forEach(function (entryName) {
										if (entryName.includes('.repo.') || entryName.includes('secrets')) {
											containerRequired = true;
										}
										if (entryName.includes('.resources.')) {
											if (deployments[deploymentType][entryName].deploy && deployments[deploymentType][entryName].deploy.restriction && deployments[deploymentType][entryName].deploy.restriction.type === 'vm') {
												vmRequired = true;
											}
										}
									});
								}
							});
						}
						
						//if provider supports containers and containers is set, collect the data.
						if (currentScope.containers) {
							if (Object.keys(currentScope.containers.form.formData).length > 0 && (currentScope.cloud.showKube || currentScope.cloud.showDocker)) {
								//check if he can proceed....
								let proceed = false;
								if (currentScope.containers.form && currentScope.containers.form.formData && currentScope.containers.form.formData.previousEnvironment) {
									formData = {previousEnvironment: currentScope.containers.form.formData.previousEnvironment};
									proceed = true;
								}
								else {
									formData = angular.copy(currentScope.containers.form.formData);
									delete formData.selectedProvider;
									currentScope.containers.techProviders[0].deploy = angular.copy(formData);
									proceed = true;
								}
								
								containerCluster = proceed;
							}
							else {
								if (!containerRequired) {
									containerCluster = true;
								}
							}
						}
						else {
							if (!containerRequired) {
								containerCluster = true;
							}
						}
						
						//if provider supports vm and vm is set, collect the data.
						if (currentScope.cloud.showVm) {
							vmLayers = !((!currentScope.wizard.vms || currentScope.wizard.vms.length === 0) && (!currentScope.wizard.vmOnBoard || currentScope.wizard.vmOnBoard.length === 0));
						}
						else {
							if (!vmRequired) {
								vmLayers = true;
							}
						}
						
						if (containerCluster || vmLayers) {
							let proceed = false;
							if (containerCluster && currentScope.containers) {
								//override the default behavior of attach container, push information into the scope
								currentScope.containers.defaultAttachContainerAction = function (currentScope, postData) {
									
									let finalPostData;
									if (containerRequired || ((postData.selectedInfraProvider && postData.selectedInfraProvider.deploy && postData.selectedInfraProvider.deploy.infraCodeTemplate) || postData.deployment.previousEnvironment)) {
										currentScope.wizard.selectedInfraProvider = postData.selectedInfraProvider;
										finalPostData = {
											selectedDriver: 'container',
											technology: postData.deployment.selectedDriver,
											selectedInfraProvider: postData.selectedInfraProvider
										};
										
										for (let i in cloudProviderFormData) {
											finalPostData.selectedInfraProvider[i] = cloudProviderFormData[i];
										}
										
										if (postData.deployment.previousEnvironment) {
											finalPostData.previousEnvironment = postData.deployment.previousEnvironment;
										}
									}
									else {
										$window.alert("The Template you have chosen requires a container cluster as infrastructure.\nEither choose to use the same cluster of a previous created environment or select an Infra As Code Template and fill out its inputs to proceed!");
									}
									
									//update the wizard scope
									currentScope.wizard.deployment = angular.copy(finalPostData);
									$localStorage.addEnv = angular.copy(currentScope.wizard);
								};
								
								if (!currentScope.containers.platforms && !bankTemplate) {
									$window.alert("The Template you have chosen requires a container cluster as infrastructure.\nEither choose to use the same cluster of a previous created environment or select an Infra As Code Template and fill out its inputs to proceed!");
								}
								else if(currentScope.containers.platforms){
									proceed = true;
									//trigger attaching the container cluster
									currentScope.containers.attachContainerTechnology(formData);
								}
							}
							
							if (vmLayers) {
								proceed = true;
								//update the wizard with the vm layers created and/or on-boarded
								$localStorage.addEnv = angular.copy(currentScope.wizard);
							}
							
							if (!proceed) {
								$window.alert("Please configure how to create a container cluster or how to create or on-board a virtual machine cluster to proceed!");
							}
							else {
								//either the deployment has a container configured or ( manual + vms )
								if( //if vms created
									(currentScope.wizard.vms && currentScope.wizard.vms.length > 0) ||
									//or if vms onboarded
									(currentScope.wizard.vmOnBoard && currentScope.wizard.vmOnBoard.length > 0) ||
									//or if cluster created
									(currentScope.wizard.deployment && currentScope.wizard.deployment.selectedInfraProvider && currentScope.wizard.deployment.selectedInfraProvider.deploy && currentScope.wizard.deployment.selectedInfraProvider.deploy.infraCodeTemplate) ||
									(currentScope.wizard.deployment && currentScope.wizard.deployment.selectedInfraProvider && currentScope.wizard.deployment.selectedInfraProvider.deploy && currentScope.wizard.deployment.previousEnvironment && currentScope.wizard.deployment.selectedDriver && currentScope.wizard.deployment.technology)
								){
									currentScope.referringStep = currentScope.currentStep;
									$localStorage.addEnv = angular.copy(currentScope.wizard);
									currentScope.nextStep();
								}
								else{
									$window.alert("Please configure how to create a container cluster or how to create or on-board a virtual machine cluster to proceed!");
								}
							}
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
		
		function moveOn(){
			if(containerCheck && vmCheck){
				overlayLoading.hide();
			}
		}
	}
	
	/**
	 * main section driver
	 * @param currentScope
	 */
	function go(currentScope, forcePageOne) {
		
		currentScope.currentStep = 'cloudProvider';
		currentScope.mapStorageToWizard($localStorage.addEnv);
		
		currentScope.originalEnvironment = angular.copy(currentScope.environment);
		
		//reset the section
		delete currentScope.environment;
		delete currentScope.attach;
		
		if (!currentScope.cloud) {
			currentScope.cloud = currentScope.$new(true); //true means detached from main currentScope
			
			//reset the form and its data
			currentScope.cloud.form = {formData: {}};
		}
		
		if(currentScope.cloudProviders){
			currentScope.cloud.cloudProviders = angular.copy(currentScope.cloudProviders);
		}
		
		/**
		 * invoke the list cloud provider main function
		 */
		overlayLoading.show();
		platformCloudProvider.go(currentScope, 'selectProvider', () => {
			
			if(!currentScope.cloudProviders){
				currentScope.cloudProviders = angular.copy(currentScope.cloud.cloudProviders);
			}
			
			if(currentScope.referringStep === 'gi' || forcePageOne){
				//calculate and set the form buttons
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
				
				if (currentScope.wizard.template.restriction) {
					//restrict certain infra
					if (currentScope.wizard.template.restriction.infra && currentScope.cloud.cloudProviders) {
						for (let i = currentScope.cloud.cloudProviders.length - 1; i >= 0; i--) {
							if (!currentScope.wizard.template.restriction.infra.includes(currentScope.cloud.cloudProviders[i].name)) {
								currentScope.cloud.cloudProviders.splice(i, 1);
							}
						}
					}
					
					//restrict certain technologies
					if (currentScope.wizard.template.restriction.deployment && currentScope.cloud.cloudProviders) {
						for (let i = currentScope.cloud.cloudProviders.length - 1; i >= 0; i--) {
							let removeInfra = false;
							
							currentScope.wizard.template.restriction.deployment.forEach((oneTechnology) => {
								if (oneTechnology === 'container') {
									if (currentScope.wizard.template.restriction.driver) {
										
										let docker = true, kubernetes = true;
										if (currentScope.wizard.template.restriction.driver.includes("container.docker") && !currentScope.cloud.cloudProviders[i].technologies.includes("docker")) {
											docker = false;
										}
										if (currentScope.wizard.template.restriction.driver.includes("container.kubernetes") && !currentScope.cloud.cloudProviders[i].technologies.includes("kubernetes")) {
											kubernetes = false;
										}
										
										if (!docker && !kubernetes) {
											removeInfra = true;
										}
									}
									else if (!currentScope.cloud.cloudProviders[i].technologies.includes('docker') && !currentScope.cloud.cloudProviders[i].technologies.includes('kubernetes')) {
										removeInfra = true;
									}
								}
								else {
									if (!currentScope.cloud.cloudProviders[i].technologies.includes(oneTechnology)) {
										removeInfra = true;
									}
								}
							});
							
							if (removeInfra) {
								currentScope.cloud.cloudProviders.splice(i, 1);
							}
						}
					}
				}
				
				//override the default behavior of the show next button and its functionality
				currentScope.cloud.showNextButton = function () {
					
					if (currentScope.cloud.form.formData.network && currentScope.cloud.form.formData.network !== '') {
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
									goToStep2();
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
				if (currentScope.wizard.deployment && currentScope.wizard.deployment.selectedInfraProvider && currentScope.cloud.cloudProviders) {
					currentScope.cloud.form.formData = angular.copy(currentScope.wizard.deployment.selectedInfraProvider);
					
					//locate the previous existing cloud provider and set it
					currentScope.cloud.cloudProviders.forEach((oneProvider) => {
						if (oneProvider._id === currentScope.cloud.form.formData.infraId) {
							currentScope.cloud.form.formData.selectedProvider = oneProvider;
							oneProvider.expanded = true;
							
							//expand other inputs
							currentScope.cloud.populateProviderExtra(() => {
								currentScope.cloud.showNextButton();
								overlayLoading.hide();
							});
						}
					});
				}
				else{
					overlayLoading.hide();
				}
			}
			else{
				currentScope.cloud.form.formData.selectedProvider = currentScope.wizard.deployment.selectedInfraProvider;
				currentScope.cloud.form.formData.region = currentScope.wizard.deployment.selectedInfraProvider.region;
				currentScope.cloud.form.formData.network = currentScope.wizard.deployment.selectedInfraProvider.network;
				
				//provider extra
				currentScope.cloud.cloudProviders.forEach((oneProvider) => {
					if(oneProvider._id === currentScope.cloud.form.formData.selectedProvider.infraId){
						currentScope.cloud.form.formData.providerExtra = oneProvider.providerExtra;
					}
				});
				
				goToStep2();
			}
		});
		
		function goToStep2(){
			if (!currentScope.cloud.form.formData.selectedProvider) {
				$window.alert("Select a cloud Provider to proceed.");
				return false;
			}
			
			if (!currentScope.cloud.form.formData.region) {
				$window.alert("Select a region for this cloud Provider to proceed.");
				return false;
			}
			
			if (!currentScope.cloud.form.formData.network) {
				$window.alert("Select a network for this cloud Provider to proceed.");
				return false;
			}
			
			//call api and lock the infra then update the environment scope
			let cloudProviderConfig = {
				"infraId": currentScope.cloud.form.formData.selectedProvider._id || currentScope.cloud.form.formData.selectedProvider.infraId,
				"name": currentScope.cloud.form.formData.selectedProvider.name,
				"label": currentScope.cloud.form.formData.selectedProvider.label,
				"region": currentScope.cloud.form.formData.region,
				"network": currentScope.cloud.form.formData.network
			};
			
			if(!cloudProviderConfig.name){
				currentScope.cloudProviders.forEach((oneProvider) => {
					if(oneProvider._id === cloudProviderConfig.infraId){
						cloudProviderConfig.name = oneProvider.name;
						cloudProviderConfig.label = oneProvider.label;
					}
				});
			}
			
			if (currentScope.cloud.form.formData.providerExtra && Object.keys(currentScope.cloud.form.formData.providerExtra).length > 0) {
				if (!cloudProviderConfig.extras) {
					cloudProviderConfig.extras = {};
				}
				for (let property in currentScope.cloud.form.formData.providerExtra) {
					let paramProperty = (property === 'groups') ? 'group' : property;
					cloudProviderConfig.extras[paramProperty] = currentScope.cloud.form.formData.providerExtra[property];
				}
			}
			
			handleFormData(currentScope, cloudProviderConfig)
		}
	}
	
	return {
		"go": go
	}
}]);