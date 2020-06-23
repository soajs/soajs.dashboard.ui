"use strict";
var giServices = soajsApp.components;
giServices.service('giSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$location', '$routeParams',
	function (ngDataApi, $timeout, $modal, $localStorage, $window, $location, $routeParams) {
		
		function go(currentScope) {
			currentScope.currentStep = 'gi';
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
							currentScope.referringStep = 'gi';
							//check mandatory fields
							for (let fieldName in entries) {
								if (entries[fieldName].required) {
									if (!formData[fieldName]) {
										$window.alert('Some of the fields are still missing.');
										return false;
									}
								}
							}
							
							formData.code = formData.code.trim().toUpperCase();
							
							var options = {
								"method": "get",
								"routeName": "/dashboard/environment/list",
								"params": {}
							};
							// Check for Env code
							getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
								if (error) {
									currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
								}
								else {
									let goNext = true;
									if (response && response.length) {
										response.forEach(function (one) {
											if (one.code.toUpperCase() === formData.code) {
												goNext = false;
												currentScope.$parent.displayAlert('danger', "This environment already exists!" );
											}
										})
									}
									
									if (goNext) {
										if (formData.code === 'PORTAL') {
											environmentsConfig.predefinedPortalTemplateName = currentScope.wizard.template.name;
										}
										
										currentScope.wizard.gi = angular.copy(formData);
										$localStorage.addEnv = angular.copy(currentScope.wizard);
										delete $localStorage.addEnv.template.content;
										currentScope.referringStep = currentScope.currentStep;
										currentScope.nextStep();
									}
									
								}
							});
							
							
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							currentScope.exitWizard();
						}
					}
				]
			};
			
			buildForm(currentScope, $modal, options, function () {
				
				currentScope.mapStorageToWizard($localStorage.addEnv);
				
				currentScope.form.formData = angular.copy(currentScope.wizard.gi);
				if (!currentScope.form.formData) {
					currentScope.form.formData = {};
				}
				
				if ($routeParams.portal) {
					currentScope.form.formData.code = 'PORTAL';
					entries.code.disabled = true;
				}
				else if (currentScope.wizard.template && (currentScope.wizard.template.name === environmentsConfig.predefinedPortalTemplateName)) {
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