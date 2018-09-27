"use strict";
var tmplServices = soajsApp.components;
tmplServices.service('templateSrvDeploy', ['ngDataApi', '$routeParams', '$localStorage', '$timeout', function (ngDataApi, $routeParams, $localStorage, $timeout) {
	
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
						
						// if($routeParams.portal){
						// 	delete $localStorage.envType;
						// 	currentScope.templates.forEach(function (oneTemplate) {
						// 		if(oneTemplate.name === environmentsConfig.predefinedPortalTemplateName){
						// 			if(!currentScope.wizard.template){
						// 				currentScope.wizard.template = {};
						// 			}
						// 			currentScope.wizard.template.content = angular.copy(oneTemplate.content);
						// 			currentScope.nextStep();
						// 		}
						// 	});
						// }
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
						delete $localStorage.addEnv;
						delete currentScope.wizard;
						delete currentScope.reusableData;
						currentScope.form.formData = {};
						currentScope.$parent.go("/environments")
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
						
						currentScope.wizard.template = angular.copy(template);
						currentScope.nextStep();
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
		if (type === 'manual') {
			for (let i = currentScope.templates.length - 1; i >= 0; i--) {
				let showManualDeploy = true; // show manual iff none of the stages is repos/resources/secrets deployment
				if (currentScope.templates[i].restriction && currentScope.templates[i].restriction.deployment) {
					if (currentScope.templates[i].restriction.deployment.indexOf('container') !== -1) {
						showManualDeploy = false;
					}
					if (currentScope.templates[i].restriction.deployment.indexOf('vm') !== -1) {
						showManualDeploy = false;
					}
				}
				
				if (!showManualDeploy) {
					currentScope.templates.splice(i, 1);
				}
			}
		}
		else {
			// Show all
			// for (let i = currentScope.templates.length - 1; i >= 0; i--) {
			// 	let showManualDeploy = false; // show manual iff none of the stages is repos/resources/secrets deployment
			//
			// 	if (!currentScope.templates[i].deploy || Object.keys(currentScope.templates[i].deploy).length === 0) {
			// 		showManualDeploy = true;
			// 	}
			// 	//template is blank, variation 2
			// 	if (currentScope.templates[i].deploy && currentScope.templates[i].deploy.deployments) {
			// 		if (Object.keys(currentScope.templates[i].deploy.deployments).length === 0) {
			// 			showManualDeploy = true;
			// 		}
			// 		else {
			// 			if (Object.keys(currentScope.templates[i].deploy.deployments.pre).length === 0 && Object.keys(currentScope.templates[i].deploy.deployments.steps).length === 0 && Object.keys(currentScope.templates[i].deploy.deployments.post).length === 0) {
			// 				showManualDeploy = true;
			// 			}
			// 		}
			// 	}
			//
			// 	if (currentScope.templates[i].restriction && currentScope.templates[i].restriction.deployment) {
			// 		if (currentScope.templates[i].restriction.deployment.indexOf('container') !== -1) {
			// 			currentScope.infraProviders.forEach((oneProvider) => {
			// 				if (oneProvider.technologies.includes('docker') || oneProvider.technologies.includes('kubernetes')) {
			// 					showManualDeploy = true;
			// 				}
			// 			});
			// 		}
			// 		if (currentScope.templates[i].restriction.deployment.indexOf('vm') !== -1) {
			// 			currentScope.infraProviders.forEach((oneProvider) => {
			// 				if (oneProvider.technologies.includes('vm')) {
			// 					showManualDeploy = true;
			// 				}
			// 			});
			// 		}
			// 	} else {
			// 		showManualDeploy = true;
			// 	}
			//
			// 	if (!showManualDeploy) {
			// 		currentScope.templates.splice(i, 1);
			// 	}
			// }
		}
	}
	
	function listInfraProviders(currentScope, cb) {
		if (currentScope.envType && currentScope.envType === 'manual') {
			return cb();
		}
		
		currentScope.noProviders = false;
		
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
				if (!providers || providers.length === 0) {
					currentScope.noProviders = true;
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
