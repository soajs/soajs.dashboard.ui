"use strict";
var tmplServices = soajsApp.components;
tmplServices.service('templateSrvDeploy', ['ngDataApi', '$routeParams', '$localStorage', '$timeout', '$window', function (ngDataApi, $routeParams, $localStorage, $timeout, $window) {
	
	function isPortalDeployed() {
		let hasPortal = false;
		if ($localStorage && $localStorage.environments) {
			$localStorage.environments.forEach(function (currentEnv) {
				if (currentEnv.code.toLowerCase() === 'portal') {
					hasPortal = true;
				}
			});
		}
		return hasPortal;
	}
	
	function go(currentScope) {
		currentScope.currentStep = 'listTemplate';
		currentScope.showTemplates = false;
		overlayLoading.show();
		
		listInfraProviders(currentScope, () => {
			getSendDataFromServer(currentScope, ngDataApi, {
				'method': 'get',
				'routeName': '/dashboard/templates'
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert('danger', error.message);
				} else {
					if (response) {
						currentScope.allTemplates = angular.copy(response);
						currentScope.templates = angular.copy(response);
						currentScope.oldStyle = false;
						
						for (let i = currentScope.templates.length - 1; i >= 0; i--) {
							if (!currentScope.templates[i].type) {
								currentScope.templates.splice(i, 1);
							}
							else {
								if (currentScope.templates[i].type === '_BLANK') {
									currentScope.oldStyle = true;
								}
								else if (currentScope.templates[i].content && Object.keys(currentScope.templates[i].content).length === 0) {
									delete currentScope.templates[i].content;
								}
								else if (currentScope.templates[i].name === environmentsConfig.predefinedPortalTemplateName && isPortalDeployed()) {
									currentScope.templates.splice(i, 1);
								}
							}
						}
						
						if (currentScope.wizard.template) {
							let storedTemplateFound = false;
							currentScope.templates.forEach(function (oneTemplate) {
								if (currentScope.wizard.template._id && oneTemplate._id === currentScope.wizard.template._id) {
									storedTemplateFound = true;
									currentScope.wizard.template.content = angular.copy(oneTemplate.content);
									currentScope.referringStep = currentScope.currentStep;
									currentScope.nextStep();
								}
								else if (currentScope.wizard.template.name && oneTemplate.name === currentScope.wizard.template.name) {
									storedTemplateFound = true;
									currentScope.wizard.template.content = angular.copy(oneTemplate.content);
									currentScope.wizard.template._id = oneTemplate._id;
									
									if (currentScope.goToStep === 'status') {
										currentScope.checkStatus();
									}
									else {
										currentScope.referringStep = currentScope.currentStep;
										currentScope.nextStep();
									}
								}
							});
							
							if (!storedTemplateFound) {
								// template not found // clear storage and redirect to main page
								delete $localStorage.addEnv;
								delete currentScope.wizard;
								currentScope.$parent.go("/environments-add");
							}
						}
					}
					else {
						currentScope.displayAlert('danger', 'No templates found!');
					}
				}
			});
		});
		
		currentScope.switchEnv = function (type) {
			currentScope.envType = type;
			$localStorage.envType = type;
			displayFormButons(currentScope, 1);
		};
		
		currentScope.chooseTemplate = function (template) {
			chooseTemplate(currentScope, template);
		};
		
		displayFormButons(currentScope);
	}
	
	function chooseTemplate(currentScope, template) {
		currentScope.templates.forEach((oneTemplate) => {
			delete oneTemplate.selected;
		});
		
		template.selected = true;
		
		displayFormButons(currentScope, 2);
	}
	
	function displayFormButons(currentScope, stage) {
		let options = {
			timeout: $timeout,
			entries: [],
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
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
		
		switch (stage) {
			case 1:
				options.actions.unshift({
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function () {
						filterTemplate(currentScope);
						displayFormButons(currentScope, 3);
					}
				});
				break;
			case 2:
				options.actions.unshift({
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						
						let template;
						currentScope.templates.forEach((oneTemplate) => {
							if (oneTemplate.selected) {
								template = oneTemplate;
							}
						});
						
						let stopWizard;
						if (template.deploy && template.deploy.deployments) {
							let deployments = template.deploy.deployments;
							let stepsKeys = Object.keys(deployments);
							stepsKeys.forEach(function (eachStep) {
								if (deployments[eachStep]) {
									let stagesKeys = Object.keys(deployments[eachStep]);
									stagesKeys.forEach(function (eachStage) {
										if (eachStage.includes('.repo.') || eachStage.includes('secrets')) {
											if(template.restriction && template.restriction.deployment && template.restriction.deployment.length > 0){
												if(template.restriction.deployment.indexOf("container") === -1){
													//stop the execution!
													stopWizard = "Detected mismatch between the template restriction and the template content.\nThe template restriction allows only VM Deployment which is used for resources only But, the template content is configured to allow deploying source code.";
												}
											}
										}
									});
								}
							});
						}
						
						if(stopWizard && stopWizard !== ''){
							$window.alert(stopWizard);
						}
						else{
							currentScope.wizard.envType = currentScope.envType;
							currentScope.wizard.template = angular.copy(template);
							currentScope.referringStep = currentScope.currentStep;
							currentScope.nextStep();
						}
					}
				});
				
				options.actions.unshift({
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						currentScope.showTemplates = false;
						displayFormButons(currentScope, 1);
					}
				});
				break;
			case 3:
				options.actions.unshift({
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						currentScope.showTemplates = false;
						displayFormButons(currentScope, 1);
					}
				});
				break;
		}
		
		buildForm(currentScope, null, options, () => {
		});
	}
	
	function filterTemplate(currentScope) {
		let type = currentScope.envType;
		currentScope.showTemplates = true;
		currentScope.templates = angular.copy(currentScope.allTemplates);
		
		for (let i = currentScope.templates.length - 1; i >= 0; i--) {
			let showManualOnly = true;
			let showContainerOnly = true;
			
			let myTemplate = currentScope.templates[i];
			if (myTemplate.restriction && myTemplate.restriction.deployment) {
				if (myTemplate.restriction.deployment.indexOf('container') !== -1) {
					showManualOnly = false;
				}
				if (myTemplate.restriction.deployment.indexOf('vm') !== -1) {
					showManualOnly = false;
					showContainerOnly = false;
				}
			}
			
			// no restriction, check for deployment
			if (myTemplate.deploy && myTemplate.deploy.deployments) {
				let deployments = myTemplate.deploy.deployments;
				let stepsKeys = Object.keys(deployments);
				stepsKeys.forEach(function (deploymentType) {
					if (deployments[deploymentType]) {
						let stagesKeys = Object.keys(deployments[deploymentType]);
						stagesKeys.forEach(function (entryName) {
							if (entryName.includes('.repo.') || entryName.includes('secrets')) {
								showManualOnly = false;
							}
							if (entryName.includes('.resources.')) {
								showManualOnly = false;
								if(deployments[deploymentType][entryName].deploy && deployments[deploymentType][entryName].deploy.vm){
									showContainerOnly = false;
								}
							}
						});
					}
				});
			}
			
			if (type ==='manual' && !showManualOnly) {
				currentScope.templates.splice(i, 1);
			}
			
			if (type ==='container' && !showContainerOnly) {
				currentScope.templates.splice(i, 1);
			}
		}
	}
	
	function listInfraProviders(currentScope, cb) {
		currentScope.noProviders = true;
		currentScope.noTechnology = true;
		
		//get the available providers
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params": {
				"exclude": ["regions", "groups", "templates"]
			}
		}, function (error, providers) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.infraProviders = providers;
				delete providers.soajsauth;
				if (providers && providers.length > 0) {
					providers.forEach((oneProvider) => {
						if(oneProvider.name === 'local'){
							currentScope.noTechnology = false;
						}
						else{
							currentScope.noProviders = false;
						}
					});
				}
				return cb();
			}
		});
	}
	
	return {
		"go": go,
		"filterTemplate": filterTemplate,
		"chooseTemplate": chooseTemplate
	}
}]);
