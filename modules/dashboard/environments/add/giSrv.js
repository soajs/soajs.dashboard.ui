"use strict";
var giServices = soajsApp.components;
giServices.service('giSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$location',
	function (ngDataApi, $timeout, $modal, $localStorage, $window, $location) {
	
	function go(currentScope){
		overlayLoading.show();
		
		let entries = {
			code: {
				required: true,
				disabled: false
			},
			description: {
				required: true
			}
		};
		currentScope.tempFormEntries = entries;
		
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
						
						//check mandatory fields
						for (let fieldName in entries ) {
							if (entries[fieldName].required) {
								if (!formData[fieldName]) {
									$window.alert('Some of the fields under controller section are still missing.');
									return false;
								}
							}
						}
						
						formData.code = formData.code.trim().toUpperCase();
						currentScope.wizard.gi = angular.copy(formData);
						$localStorage.addEnv = angular.copy(currentScope.wizard);
						delete $localStorage.addEnv.template.content;
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
						$location.url($location.path());
						currentScope.$parent.go("/environments");
					}
				}
			]
		};
		
		buildForm(currentScope, $modal, options, function () {
			
			currentScope.mapStorageToWizard($localStorage.addEnv);
			
			currentScope.form.formData = angular.copy(currentScope.wizard.gi);

			if(currentScope.wizard.template && (currentScope.wizard.template.name === environmentsConfig.predefinedPortalTemplateName)){
				if(!currentScope.form.formData){
					currentScope.form.formData = {};
				}
				currentScope.form.formData.code = 'PORTAL';
				entries.code.disabled = true;
			}
			
			overlayLoading.hide();
		});
	}
	
	return {
		"go": go
	}
}]);