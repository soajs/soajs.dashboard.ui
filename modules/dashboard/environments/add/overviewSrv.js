"use strict";
var overviewServices = soajsApp.components;
overviewServices.service('overviewSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	function handleFormData(currentScope) {
		currentScope.nextStep();
	}
	
	function mapUserInputsToOverview(currentScope) {
		
		let wizard = currentScope.wizard;
		
		// in case the wizard skipped steps // make sure u have wizard.template, wizard.gi ....
		function updateWizardToStandards(wizard) {
			let standards = ['template', 'gi', 'deployment', 'registry', 'nginx'];
			standards.forEach(function (std) {
				if (!wizard[std]) {
					wizard[std] = {};
				}
			});
		}
		
		updateWizardToStandards(wizard);
		
		let output = {
			data: {
				"code": wizard.gi.code, // required
				"description": wizard.gi.description, // required
				"domain": wizard.nginx.domain || "",
				"apiPrefix": wizard.nginx.apiPrefix || "",
				"sitePrefix": wizard.nginx.sitePrefix || "",
				"sensitive": wizard.registry.sensitive || false,
				"soajsFrmwrk": wizard.registry.soajsFrmwrk || false,
				"cookiesecret": wizard.registry.cookiesecret || "",
				"sessionName": wizard.registry.sessionName || "",
				"sessionSecret": wizard.registry.sessionSecret || "",
				"deployPortal": (currentScope.wizard.template.name === environmentsConfig.predefinedPortalTemplateName),
				"deployment": wizard.deployment,
				"templateId": wizard.template._id // required
			},
			template: {
				deploy: wizard.template.deploy
			}
		};
		
		return output;
	}
	
	function go(currentScope) {
		
		currentScope.overview = mapUserInputsToOverview(currentScope);
		
		overlayLoading.show();
		let configuration = angular.copy(environmentsConfig.form.add.step6.entries);
		
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
					handleFormData(currentScope);
				}
			});
		}
		else {
			options.actions.push({
				'type': 'submit',
				'label': "Next",
				'btn': 'primary',
				'action': function (formData) {
					handleFormData(currentScope);
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
			overlayLoading.hide();
		});
		
		
	}
	
	return {
		go: go
	};
	
}]);