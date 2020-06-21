"use strict";
let manualServices = soajsApp.components;
manualServices.service('manualServices', [function () {
	
	function init(currentScope) {
		currentScope.wizard.currentStep = "manual";
		currentScope.wizard.form.actions = [];
		
		//add go back button
		currentScope.wizard.form.actions.push({
			'type': 'button',
			'label': 'Back',
			'btn': 'success',
			'visible': true,
			'trigger': () => {
				currentScope.wizard.go.gi();
			}
		});
		//check and add next or finalize buttton
		currentScope.wizard.form.actions.push({
			'type': 'submit',
			'label': 'Next',
			'btn': 'primary',
			'visible': true,
			'trigger': () => {
				currentScope.wizard.go.overview();
			}
		});
		
		//add cancel all button
		currentScope.wizard.form.actions.push({
			'type': 'reset',
			'label': translation.cancel[LANG],
			'btn': 'danger',
			'visible': true,
			'trigger': () => {
				currentScope.exitWizard();
			}
		});
	}
	
	function addActions(currentScope) {
		
		currentScope.wizard.form.do = function (action) {
			action.trigger();
		}
	}
	
	return {
		"init": init,
		"addActions": addActions
	}
}]);