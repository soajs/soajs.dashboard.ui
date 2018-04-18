"use strict";
var regServices = soajsApp.components;
regServices.service('registrySrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	function handleFormData(currentScope, formData) {
		currentScope.wizard.registry = angular.copy(formData);
		$localStorage.addEnv = angular.copy(currentScope.wizard);
		delete $localStorage.addEnv.template.content;
		currentScope.nextStep();
	}
	
	function go(currentScope) {
		
		
		let controllerRepoExist = false;
		if (currentScope.wizard.template && currentScope.wizard.template.content && currentScope.wizard.template.content.deployments && currentScope.wizard.template.content.deployments.repo) {
			let repos = currentScope.wizard.template.content.deployments.repo;
			for(let oneRepo in repos){
				if(repos[oneRepo].gitSource && repos[oneRepo].gitSource.owner === 'soajs' && repos[oneRepo].gitSource.repo === 'soajs.controller'){
					controllerRepoExist = true;
				}
			}
		}
		
		if (!controllerRepoExist) {
			currentScope.nextStep();
		} else {
			
			currentScope.clearOnPersistMySession = function () {
				if (currentScope.form.formData) {
					delete currentScope.form.formData.cookiesecret;
					delete currentScope.form.formData.sessionName;
					delete currentScope.form.formData.sessionSecret;
				}
				
			};
			
			overlayLoading.show();
			let configuration = angular.copy(environmentsConfig.form.add.registry.entries);
			
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
				
				if (currentScope.wizard.registry) {
					currentScope.form.formData = angular.copy(currentScope.wizard.registry);
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