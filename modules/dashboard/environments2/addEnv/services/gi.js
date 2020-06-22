"use strict";
let giServices = soajsApp.components;
giServices.service('giServices', [function () {
	
	function init(currentScope) {
		currentScope.wizard.currentStep = "gi";
		currentScope.wizard.form.actions = [];
		
		//add go back button
		currentScope.wizard.form.actions.push({
			'type': 'button',
			'label': 'Back',
			'btn': 'success',
			'visible': true,
			'trigger': () => {
				currentScope.wizard.go.type();
			}
		});
		//check and add next or finalize buttton
		currentScope.wizard.form.actions.push({
			'type': 'submit',
			'label': 'Next',
			'btn': 'primary',
			'visible': true,
			'trigger': () => {
				if (!currentScope.wizard.form.data.code || !currentScope.wizard.form.data.description) {
					currentScope.$parent.displayAlert('danger', null, true, 'console', "Please fill in all required fields!");
				} else {
					if (currentScope.wizard.envType === "manual") {
						currentScope.wizard.go.manual();
					} else if (currentScope.wizard.envType === "container") {
						currentScope.wizard.go.container();
					}
				}
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