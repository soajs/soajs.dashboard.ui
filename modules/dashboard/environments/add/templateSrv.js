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
	
	function go(currentScope){
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
						
						for(let i = currentScope.templates.length -1; i >=0; i--){
							if(!currentScope.templates[i].type){
								currentScope.templates.splice(i, 1);
							}
							else{
								
								if (currentScope.templates[i].type === '_BLANK') {
									currentScope.oldStyle = true;
								}
								else if(currentScope.templates[i].content && Object.keys(currentScope.templates[i].content).length === 0){
									delete currentScope.templates[i].content;
								}
								else if(currentScope.templates[i].name === environmentsConfig.predefinedPortalTemplateName && isPortalDeployed()){
									currentScope.templates.splice(i, 1);
								}
							}
						}
						
						if(currentScope.wizard.template){
							let storedTemplateFound = false;
							currentScope.templates.forEach(function (oneTemplate) {
								if(currentScope.wizard.template._id && oneTemplate._id === currentScope.wizard.template._id){
									storedTemplateFound = true;
									currentScope.wizard.template.content = angular.copy(oneTemplate.content);
									currentScope.nextStep();
								}
								else if(currentScope.wizard.template.name && oneTemplate.name === currentScope.wizard.template.name){
									storedTemplateFound = true;
									currentScope.wizard.template.content = angular.copy(oneTemplate.content);
									currentScope.wizard.template._id = oneTemplate._id;
									
									if(currentScope.goToStep === 'status'){
										currentScope.checkStatus();
									}
									else{
										currentScope.nextStep();
									}
								}
							});
							
							if(!storedTemplateFound){
								// template not found // clear storage and redirect to main page
								delete $localStorage.addEnv;
								delete currentScope.wizard;
								currentScope.$parent.go("/environments-add");
							}
						}
						
						if($routeParams.portal){
							delete $localStorage.envType;
							currentScope.templates.forEach(function (oneTemplate) {
								if(oneTemplate.name === environmentsConfig.predefinedPortalTemplateName){
									currentScope.wizard.template.content = angular.copy(oneTemplate.content);
									currentScope.nextStep();
								}
							});
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
	
	function chooseTemplate(currentScope, template){
		currentScope.templates.forEach((oneTemplate) => {
			delete oneTemplate.selected;
		});
		
		template.selected = true;
		
		displayFormButons(currentScope, 2);
	}
	
	function displayFormButons(currentScope, stage){
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
						currentScope.form.formData = {};
						currentScope.$parent.go("/environments")
					}
				}
			]
		};
		
		switch(stage){
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
							if(oneTemplate.selected){
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
		
		buildForm(currentScope, null, options, () => {});
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
				}
				
				if (!showManualDeploy) {
					currentScope.templates.splice(i, 1);
				}
			}
		}
	}
	
	function listInfraProviders(currentScope, cb) {
		if (currentScope.envType && currentScope.envType === 'manual') {
			return cb();
		}
		
		currentScope.showDockerAccordion = false;
		currentScope.showKubeAccordion = false;
		
		//get the available providers
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra"
		}, function (error, providers) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			}
			else {
				delete providers.soajsauth;
				providers.forEach((oneProvider) => {
					if(oneProvider.technologies.indexOf('docker') !== -1){
						currentScope.showDockerAccordion = true;
					}
					if(oneProvider.technologies.indexOf('kubernetes') !== -1){
						currentScope.showKubeAccordion = true;
					}
				});
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
