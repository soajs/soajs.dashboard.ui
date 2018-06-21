"use strict";
var vmServices = soajsApp.components;
vmServices.service('vmSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$location', 'platformsVM', function (ngDataApi, $timeout, $modal, $localStorage, $window, $location, platformsVM) {
		
	function go(currentScope) {
		overlayLoading.show();
		
		//override default save action with what ui wizard needs
		currentScope.saveActionMethodAdd = function(modalScope, oneProvider, formData, modalInstance){
			//formData should include
			/*
				1- template chosen
				2- region to use
				3- template inputs
			 */
			let vmLayerContext = {
				"params":{
					"env": currentScope.envCode,
					'technology': 'vm',
					"infraId": oneProvider._id,
				},
				"data": formData
			};
			
			//hook the vm to the wizard scope
			if(!currentScope.wizard.vms){
				currentScope.wizard.vms = [];
			}
			currentScope.wizard.vms.push(vmLayerContext);
			
			appendVMsTotheList();
			
			if(modalInstance){
				modalInstance.close();
			}
		};
		
		currentScope.saveActionMethodModify = function(modalScope, oneVMLayer, oneProvider, formData, modalInstance){
			//formData should include
			/*
				1- template chosen
				2- region to use
				3- template inputs
			 */
			let vmLayerContext = {
				"params":{
					"env": currentScope.envCode,
					'technology': 'vm',
					"infraId": oneProvider._id,
				},
				"data": formData
			};
			
			//hook the vm to the wizard scope
			currentScope.wizard.vms.forEach((oneExistingTempVMLayer) => {
				if(oneExistingTempVMLayer.params.infraId === vmLayerContext.params.infraId){
					if(oneExistingTempVMLayer.data.name === vmLayerContext.data.name){
						//this is the one
						oneExistingTempVMLayer = vmLayerContext;
					}
				}
			});
			
			if(modalInstance){
				modalInstance.close();
			}
		};
		
		//hook the listeners
		currentScope.addVMLayer = function(){
			platformsVM.addVMLayer(currentScope);
		};
		
		currentScope.editVMLayer = function(oneVMLayerFromList){
			let oneVMLayer = angular.copy(oneVMLayerFromList);
			currentScope.wizard.vms.forEach((oneExistingTempVMLayer) => {
				if(oneExistingTempVMLayer.params.infraId === oneVMLayer.infraProvider._id){
					if(oneExistingTempVMLayer.data.name === oneVMLayer.name){
						//this is the one
						oneVMLayer.formData = oneExistingTempVMLayer.data;
					}
				}
			});
			
			platformsVM.editVMLayer(currentScope, oneVMLayer);
		};
		
		currentScope.inspectVMLayer = function(oneVMLayer){
			platformsVM.inspectVMLayer(currentScope, oneVMLayer);
		};
		
		//hook the listeners
		currentScope.listVMLayers = function() {
			platformsVM.listVMLayers(currentScope, () => {
				appendVMsTotheList();
			});
		};
		
		currentScope.deleteVMLayer = function(oneVMLayer) {
			if(oneVMLayer.forceEditDelete){
				for(let layerName in currentScope.vmLayers){
					if(layerName === oneVMLayer.infraProvider.name + "_" + oneVMLayer.name){
						delete currentScope.vmLayers[layerName];
					}
				}
			}
		};
		
		//if there are registered vms to be created by the wizard hook them to the scope
		function appendVMsTotheList() {
			if(currentScope.wizard.vms){
				currentScope.wizard.vms.forEach((oneVM) => {
					
					let myProvider;
					currentScope.infraProviders.forEach((oneProvider) => {
						if(oneProvider._id === oneVM.params.infraId){
							myProvider = oneProvider;
						}
					});
					if(myProvider){
						let myVM = {
							forceEditDelete: true,
							name: oneVM.data.name,
							infraProvider: myProvider,
							list: []
						};
						
						for(let i =0; i < oneVM.data.workernumber; i++){
							myVM.list.push({
								'id': oneVM.data.name + '-instance-' + (i+1),
								'name': oneVM.data.name + '-instance-' + (i+1),
								"labels": {},
								"ports": [],
								"voluming": {},
								"env": [],
								"ip": "",
								"layer" : oneVM.data.name,
								"network": "N/A",
								"tasks": [
									{
										"id": oneVM.data.name + '-instance-' + (i+1) + "-task",
										"name": oneVM.data.name + '-instance-' + (i+1) + "-task",
										"status": {
											"state": "to be created",
											"ts": new Date().getTime()
										},
										"ref": {
											"os": {
												"type": "N/A",
												"diskSizeGB": 0
											}
										}
									}
								]
							});
						}
						console.log(oneVM);
						console.log(myVM);
						
						currentScope.vmLayers[myProvider.name + "_" + myVM.name] = myVM;
					}
				});
			}
		}
		
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
				
				//if there are registered vms to be created by the wizard hook them to the scope
				currentScope.wizard.vms = angular.copy($localStorage.addEnv.vms);
				appendVMsTotheList();
				
				//build the navigation buttons at the bottom of the page
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
							'action': function () {
								currentScope.referringStep = 'vm';
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