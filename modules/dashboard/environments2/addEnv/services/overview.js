"use strict";
let overviewServices = soajsApp.components;
overviewServices.service('overviewServices', [function () {
	
	function init(currentScope) {
		currentScope.wizard.currentStep = "overview";
		currentScope.wizard.form.actions = [];
		
		//add go back button
		currentScope.wizard.form.actions.push({
			'type': 'button',
			'label': 'Back',
			'btn': 'success',
			'visible': true,
			'trigger': () => {
				if (currentScope.wizard.envType === "manual") {
					currentScope.wizard.go.manual();
				} else if (currentScope.wizard.envType === "container") {
					currentScope.wizard.go.container();
				}
			}
		});
		//check and add next or finalize buttton
		currentScope.wizard.form.actions.push({
			'type': 'submit',
			'label': 'Add Environment',
			'btn': 'primary',
			'visible': true,
			'trigger': () => {
				console.log(currentScope.wizard);
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