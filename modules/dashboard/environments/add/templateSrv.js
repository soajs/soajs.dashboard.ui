"use strict";
var tmplServices = soajsApp.components;
tmplServices.service('templateSrvDeploy', ['ngDataApi', '$routeParams', '$localStorage', function (ngDataApi, $routeParams, $localStorage) {

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
						currentScope.templates.forEach(function (oneTemplate) {
							if(oneTemplate.name === environmentsConfig.predefinedPortalTemplateName){
								currentScope.wizard.template = angular.copy(oneTemplate);
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
	}

	function chooseTemplate(currentScope, template){
		currentScope.wizard.template = angular.copy(template);
		currentScope.nextStep();
	}

	return {
		"go": go,
		"chooseTemplate": chooseTemplate
	}
}]);
