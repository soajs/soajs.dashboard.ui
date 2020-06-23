"use strict";
let containerServices = soajsApp.components;
containerServices.service('containerServices', ["ngDataApi", function (ngDataApi) {
	
	function init(currentScope) {
		currentScope.wizard.currentStep = "container";
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
			'visible': false,
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
		if (!currentScope.wizard.providers) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/infra/account/kubernetes"
			}, function (error, response) {
				if (response) {
					currentScope.wizard.providers = response;
				}
			});
		}
	}
	
	function addActions(currentScope) {
		if (currentScope.wizard.provider) {
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