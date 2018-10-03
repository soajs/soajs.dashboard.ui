"use strict";
var overviewServices = soajsApp.components;
overviewServices.service('overviewSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	function handleFormData(currentScope) {
		currentScope.referringStep = currentScope.currentStep;
		currentScope.nextStep();
	}
	
	function mapUserInputsToOverview(currentScope) {
		return currentScope.mapUserInputsToOverview(true);
	}
	
	function go(currentScope) {
		currentScope.currentStep = 'overview';
		currentScope.mapStorageToWizard($localStorage.addEnv);
		
		currentScope.overview = mapUserInputsToOverview(currentScope);
		//if filled by add environment wizard and only contains vms that are to be created at the end
		if(currentScope.wizard.vms){
			currentScope.overview.vms = [];
			
			currentScope.wizard.vms.forEach((oneVMLayerInputs) => {
				
				let specsData = angular.copy(oneVMLayerInputs.data);
				delete specsData.name;
				delete specsData.region;
				delete specsData.infraCodeTemplate;
				
				let myProvider;
				currentScope.infraProviders.forEach((oneProvider) => {
					if(oneProvider._id === oneVMLayerInputs.params.infraId){
						myProvider = oneProvider;
					}
				});
				
				let myVM = {
					infraProvider: myProvider,
					name: oneVMLayerInputs.data.name,
					region: oneVMLayerInputs.data.region,
					template: oneVMLayerInputs.data.infraCodeTemplate,
					specs: specsData
				};
				
				currentScope.overview.vms.push(myVM);
			});
		}
		
		currentScope.isObjEmpty = function (obj) {
			return (!obj || Object.keys(obj).length === 0);
		};
		
		overlayLoading.show();
		
		let options = {
			timeout: $timeout,
			entries: [],
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
						currentScope.referringStep = currentScope.currentStep;
						currentScope.previousStep();
					}
				}
			]
		};
		
		options.actions.push({
			'type': 'submit',
			'label': "Create Environment",
			'btn': 'primary',
			'action': function (formData) {
				handleFormData(currentScope);
			}
		});
		
		options.actions.push({
			'type': 'reset',
			'label': translation.cancel[LANG],
			'btn': 'danger',
			'action': function () {
				currentScope.exitWizard();
			}
		});
		
		buildForm(currentScope, $modal, options, function () {
			overlayLoading.hide();
		});
	}
	
	return {
		"go": go
	};
	
}]);