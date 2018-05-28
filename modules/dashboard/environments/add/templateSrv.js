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
		currentScope.environmentTypes = true;
		currentScope.showTemplates = false;
		overlayLoading.show();
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
		
		currentScope.switchEnv = function (type) {
			currentScope.envType = type;
			$localStorage.envType = type;
			currentScope.environmentTypes = true;
			filterTemplate(currentScope, type);
		};
		
		currentScope.chooseTemplate = function (template) {
			chooseTemplate(currentScope, template);
		};
		
		currentScope.chooseEnvironmentType = function(){
			currentScope.environmentTypes = true;
			overlayLoading.show();
			$timeout(() => {
				overlayLoading.hide();
				currentScope.showTemplates = false;
			}, 1000);
		}
	}
	
	function chooseTemplate(currentScope, template){
		currentScope.templates.forEach((oneTemplate) => {
			delete oneTemplate.selected;
		});
		
		template.selected = true;
		
		displayFormButons(currentScope);
	}
	
	function displayFormButons(currentScope){
		let options = {
			timeout: $timeout,
			entries: [],
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
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
				},
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
		overlayLoading.show();
		buildForm(currentScope, null, options, function () {
			$timeout(() => {
				overlayLoading.hide();
				jQuery("html, body").animate({scrollTop: jQuery("html, body").height() });
			}, 500);
		});
	}
	
	function filterTemplate(currentScope, type) {
		overlayLoading.show();
		
		$timeout(() => {
			if(currentScope.form){
				currentScope.form.actions = [];
			}
			
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
					// if (currentScope.templates[i] && currentScope.templates[i].deploy && currentScope.templates[i].deploy.deployments) {
					// 	let deployments = currentScope.templates[i].deploy.deployments;
					// 	let stepsKeys = Object.keys(deployments);
					// 	stepsKeys.forEach(function (eachStep) {
					// 		if (deployments[eachStep]) {
					// 			let stagesKeys = Object.keys(deployments[eachStep]);
					// 			stagesKeys.forEach(function (eachStage) {
					// 				if (eachStage.includes('.repo.') || eachStage.includes('secrets')) {
					// 					showManualDeploy = false;
					// 				}
					// 				if (eachStage.includes('.resources.')) {
					// 					showManualDeploy = false;
					// 				}
					// 			});
					// 		}
					// 	});
					// }
					if (!showManualDeploy) {
						currentScope.templates.splice(i, 1);
					}
				}
			}
			
			overlayLoading.hide();
			
			$timeout(() => {
				let ele = jQuery('#templates').position();
				jQuery("html, body").animate({scrollTop: ele.top});
			}, 500);
		}, 1000);
	}
	
	return {
		"go": go,
		"filterTemplate": filterTemplate,
		"chooseTemplate": chooseTemplate
	}
}]);
