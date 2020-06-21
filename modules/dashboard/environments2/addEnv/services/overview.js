"use strict";
let overviewServices = soajsApp.components;
overviewServices.service('overviewServices', ['ngDataApi', function (ngDataApi) {
	
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
				let options = {
					"method": "post",
					"routeName": "/console/environment",
					"data": {
						"code": currentScope.wizard.form.data.code,
						"description": currentScope.wizard.form.data.description,
						"settings": {
							"type": currentScope.wizard.envType
						}
					}
				};
				if (currentScope.wizard.envType === "manual") {
					options.data.settings.port = currentScope.wizard.form.data.port;
				}
				if (currentScope.wizard.envType === "container") {
					options.data.settings.namespace = currentScope.wizard.form.data.namespace;
					options.data.settings.id = currentScope.wizard.provider._id;
					options.data.settings.type = "kubernetes";
				}
				getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
					if (error) {
						currentScope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
					}
					if (response) {
						currentScope.$parent.displayAlert('success', "Environment has been created.");
						currentScope.exitWizard();
					}
				});
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