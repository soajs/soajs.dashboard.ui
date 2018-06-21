"use strict";
var vmServices = soajsApp.components;
vmServices.service('vmSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$location', 'platformsVM', function (ngDataApi, $timeout, $modal, $localStorage, $window, $location, platformsVM) {
		
	function go(currentScope) {
		overlayLoading.show();
		
		//override default save action with what ui wizard needs
		currentScope.saveActionMethod = function(modalScope, formData, modalInstance){
			console.log("inside environment wizard ");
			console.log(arguments);
			//store information about vms that should be created.
		};
		
		//hook the listeners
		currentScope.addVMLayer = function(){
			platformsVM.addVMLayer(currentScope);
		};
		
		currentScope.inspectVMLayer = function(oneVMLayer){
			platformsVM.inspectVMLayer(currentScope, oneVMLayer);
		};
		
		//hook the listeners
		currentScope.listVMLayers = function() {
			platformsVM.listVMLayers(currentScope);
		};
		
		if(!currentScope.restrictions.vm){
			if(['registry', 'dynamicSrv'].indexOf(currentScope.referringStep) !== -1){
				currentScope.referringStep = 'vm';
				currentScope.previousStep();
			}
			else{
				currentScope.referringStep = 'vm';
				currentScope.nextStep();
			}
		}
		else{
			//execute main function
			delete currentScope.envCode;
			platformsVM.listVMLayers(currentScope, () => {
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
								currentScope.referringStep = 'vm';
								if (currentScope.form && currentScope.form.formData) {
									currentScope.form.formData = {};
								}
								currentScope.previousStep();
							}
						}
					]
				};
				
				buildForm(currentScope, $modal, options, function () {
					
					if(Object.keys(currentScope.vmLayers).length > 0){
						options.actions.push({
							'type': 'submit',
							'label': "Next",
							'btn': 'primary',
							'action': function (formData) {
								currentScope.referringStep = 'vm';
								
								//todo: store the vms to be created only --> line 9
								currentScope.wizard.vms = angular.copy(formData);
								$localStorage.addEnv = angular.copy(currentScope.wizard);
								currentScope.nextStep();
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
							$location.url($location.path());
							currentScope.$parent.go("/environments");
						}
					});
					
					overlayLoading.hide();
				});
			});
		}
	}
	
	return {
		"go": go
	}
}]);