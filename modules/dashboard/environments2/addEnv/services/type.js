"use strict";
let typeServices = soajsApp.components;
typeServices.service('typeServices', [function () {
	
	function init(currentScope) {
		currentScope.wizard.currentStep = "type";
		currentScope.wizard.form.actions = [];
		
		//check and add next or finalize buttton
		currentScope.wizard.form.actions.push({
			'type': 'submit',
			'label': 'Next',
			'btn': 'primary',
			'visible': false,
			'trigger': () => {
				currentScope.wizard.go.gi();
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
		if (currentScope.wizard.envType) {
			for (let i = 0; i < currentScope.wizard.form.actions.length; i++) {
				currentScope.wizard.form.actions[i].visible = true;
			}
		}
		currentScope.wizard.form.do = function (action) {
			action.trigger();
		}
	}
	
	return {
		"init": init,
		"addActions": addActions
	}
}]);