"use strict";
var regServices = soajsApp.components;
regServices.service('registrySrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	function go(currentScope){
		
		/**
		 * create flag with value false
		 * loop in  template / content / deployments/ repo
		 *      if there is a repo whose gitSource info refer to controller
		 *          set flag to true
		 *
		 * once loop finishes
		 *  if flag is false, trigger nextStep call
		 *
		 *  if flag is true,
		 *
		 *      print form and ask the user to fill it
		 *
		 */
		
		
		// overlayLoading.show();
		//
		// let entries = {
		// 	code: {
		// 		required: true,
		// 		disabled: false
		// 	},
		// 	description: {
		// 		required: true
		// 	}
		// };
		// currentScope.tempFormEntries = entries;
		//
		// let options = {
		// 	timeout: $timeout,
		// 	entries: [],
		// 	name: 'addEnvironment',
		// 	label: translation.addNewEnvironment[LANG],
		// 	actions: [
		// 		{
		// 			'type': 'submit',
		// 			'label': "Next",
		// 			'btn': 'primary',
		// 			'action': function (formData) {
		//
		// 				//check mandatory fields
		// 				for (let fieldName in entries ) {
		// 					if (entries[fieldName].required) {
		// 						if (!formData[fieldName]) {
		// 							$window.alert('Some of the fields under controller section are still missing.');
		// 							return false;
		// 						}
		// 					}
		// 				}
		//
		// 				formData.code = formData.code.toUpperCase();
		// 				currentScope.wizard.gi = angular.copy(formData);
		// 				$localStorage.addEnv = angular.copy(currentScope.wizard);
		// 				currentScope.nextStep();
		// 			}
		// 		},
		// 		{
		// 			'type': 'reset',
		// 			'label': translation.cancel[LANG],
		// 			'btn': 'danger',
		// 			'action': function () {
		// 				delete $localStorage.addEnv;
		// 				delete currentScope.wizard;
		// 				currentScope.form.formData = {};
		// 				currentScope.$parent.go("/environments")
		// 			}
		// 		}
		// 	]
		// };
		//
		// buildForm(currentScope, $modal, options, function () {
		// 	if ($localStorage.addEnv) {
		// 		currentScope.wizard = $localStorage.addEnv;
		// 	}
		//
		// 	currentScope.form.formData = angular.copy(currentScope.wizard.gi);
		//
		// 	if(currentScope.wizard.template && (currentScope.wizard.template.name === environmentsConfig.predefinedPortalTemplateName)){
		// 		if(!currentScope.form.formData){
		// 			currentScope.form.formData = {};
		// 		}
		// 		currentScope.form.formData.code = 'PORTAL';
		// 		entries.code.disabled = true;
		// 	}
		//
		// 	overlayLoading.hide();
		// });
	}
	
	return {
		"go": go
	}
}]);