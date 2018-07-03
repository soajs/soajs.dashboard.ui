"use strict";
var vmServices = soajsApp.components;
vmServices.service('vmSrv', ['ngDataApi', '$timeout', '$modal', '$cookies', '$localStorage', '$window', '$location', 'platformsVM', function (ngDataApi, $timeout, $modal, $cookies, $localStorage, $window, $location, platformsVM) {
		
	function go(currentScope) {
		overlayLoading.show();
		
		let envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
		
		let formButtonOptions;
		
		let tempScope = {
			add: null,
			edit: null,
			inspect: null
		};
		
		//hook the listeners
		currentScope.addVMLayer = function(){
			tempScope.add = currentScope.$new(true);
			tempScope.add.infraProviders = angular.copy(currentScope.infraProviders);
			tempScope.add.envCode = envCode;
			tempScope.displayAlert = currentScope.displayAlert;
			if(currentScope.reusableData){
				tempScope.add.reusableData = currentScope.reusableData;
			}
			//override default save action with what ui wizard needs
			tempScope.add.saveActionMethodAdd = function(modalScope, oneProvider, formData, modalInstance){
				//formData should include
				/*
					1- template chosen
					2- region to use
					3- template inputs
				 */
				if(tempScope.add.reusableData){
					currentScope.reusableData = tempScope.add.reusableData;
				}
				
				for(let i in formData){
					if(i.indexOf("add_another") !== -1){
						delete formData[i];
					}
					else if(i.indexOf("remove_another") !== -1){
						delete formData[i];
					}
				}
				
				let vmLayerContext = {
					"params":{
						"env": currentScope.wizard.gi.code,
						'technology': 'vm',
						"infraId": oneProvider._id,
					},
					"data": {
						"infraCodeTemplate" : formData.infraCodeTemplate,
						"region" : formData.region,
						"group" : formData.group,
						"name" : formData.name,
						"specs": formData
					}
				};
				
				//hook the vm to the wizard scope
				if(!currentScope.wizard.vms){
					currentScope.wizard.vms = [];
				}
				currentScope.wizard.vms.push(vmLayerContext);
				
				appendVMsTotheList();
				
				if(tempScope.add){
					delete tempScope.add;
				}
				if(modalInstance){
					modalInstance.close();
				}
			};
			
			platformsVM.addVMLayer(tempScope.add);
		};
		
		currentScope.editVMLayer = function(oneVMLayerFromList){
			tempScope.edit = currentScope.$new(true);
			tempScope.edit.infraProviders = angular.copy(currentScope.infraProviders);
			tempScope.edit.envCode = envCode;
			tempScope.displayAlert = currentScope.displayAlert;
			if(currentScope.reusableData){
				tempScope.edit.reusableData = currentScope.reusableData;
			}
			
			tempScope.edit.saveActionMethodModify = function(modalScope, oneVMLayer, oneProvider, formData, modalInstance){
				//formData should include
				/*
					1- template chosen
					2- region to use
					3- template inputs
				 */
				if(tempScope.edit.reusableData){
					currentScope.reusableData = tempScope.edit.reusableData;
				}
				
				for(let i in formData){
					if(i.indexOf("add_another") !== -1){
						delete formData[i];
					}
					else if(i.indexOf("remove_another") !== -1){
						delete formData[i];
					}
				}
				
				let vmLayerContext = {
					"params":{
						"env": currentScope.wizard.gi.code,
						'technology': 'vm',
						"infraId": oneProvider._id,
					},
					"data": {
						"infraCodeTemplate" : formData.infraCodeTemplate,
						"region" : formData.region,
						"group" : formData.group,
						"name" : formData.name,
						"specs": formData
					}
				};
				delete vmLayerContext.data.specs.inputs;
				delete vmLayerContext.data.specs.specs;
				
				//update the entry
				oneVMLayerFromList.specs.specs = formData;
				
				//update copy in wizard
				for(let i = 0; i < currentScope.wizard.vms.length; i++){
					let oneExistingTempVMLayer = currentScope.wizard.vms[i];
					if(oneExistingTempVMLayer.params.infraId === oneVMLayerFromList.infraProvider._id){
						if(oneExistingTempVMLayer.data.name === oneVMLayerFromList.name){
							currentScope.wizard.vms[i] = vmLayerContext;
						}
					}
				}
				
				if(tempScope.edit){
					delete tempScope.edit;
				}
				
				if(modalInstance){
					modalInstance.close();
				}
			};
			
			let oneVMLayer = angular.copy(oneVMLayerFromList);
			currentScope.wizard.vms.forEach((oneExistingTempVMLayer) => {
				if(oneExistingTempVMLayer.params.infraId === oneVMLayer.infraProvider._id){
					if(oneExistingTempVMLayer.data.name === oneVMLayer.name){
						//this is the one
						oneVMLayer.formData = angular.copy(oneExistingTempVMLayer.data);
						oneVMLayer.formData.infraCodeTemplate = oneVMLayer.template;
						oneVMLayer.formData.inputs = {
							region: oneVMLayer.region,
							group: oneVMLayer.group
						};
					}
				}
			});
			
			for(let i in oneVMLayer.formData.specs){
				oneVMLayer.formData.inputs[i] = oneVMLayer.formData.specs[i];
			}
			platformsVM.editVMLayer(tempScope.edit, oneVMLayer);
		};
		
		currentScope.inspectVMLayer = function(oneVMLayer){
			tempScope.inspect = currentScope.$new(true);
			platformsVM.inspectVMLayer(tempScope.inspect, oneVMLayer, () => {
				delete tempScope.inspect;
			});
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
				
				for(let i = currentScope.wizard.vms.length -1; i >= 0; i--){
					let oneVM = currentScope.wizard.vms[i]
					if(oneVM.params.infraId === oneVMLayer.infraProvider._id){
						if(oneVM.data.name === oneVMLayer.name){
							currentScope.wizard.vms.splice(i, 1);
						}
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
						if(oneVM.params && oneProvider._id === oneVM.params.infraId){
							myProvider = oneProvider;
						}
					});
					if(myProvider){
						let vmSpecs = angular.copy(oneVM.data);
						delete vmSpecs.name;
						delete vmSpecs.region;
						delete vmSpecs.infraCodeTemplate;
						let myVM = {
							forceEditDelete: true,
							name: oneVM.data.name,
							infraProvider: myProvider,
							region: oneVM.data.region,
							group: oneVM.data.group,
							template: oneVM.data.infraCodeTemplate,
							specs: vmSpecs
						};
						
						currentScope.vmLayers = insertObjFirst(currentScope.vmLayers, myProvider.name + "_" + myVM.name, myVM);
						appendNextButton(currentScope, formButtonOptions);
					}
				});
			}
		}
		
		function appendNextButton(currentScope, options){
			
			//if the next button exists, remove it
			if(options && options.actions){
				for(let i = options.actions.length -1; i >=0; i--){
					if(options.actions[i].label === 'Next'){
						options.actions.splice(i, 1);
					}
				}
			}
			
			if(Object.keys(currentScope.vmLayers).length > 0){
				if(options && options.actions && options.actions.length < 3){
					options.actions.splice(1 , 0 , {
						'type': 'submit',
						'label': "Next",
						'btn': 'primary',
						'action': function () {
							currentScope.referringStep = 'vm';
							$localStorage.addEnv = angular.copy(currentScope.wizard);
							currentScope.envCode = envCode;
							currentScope.nextStep();
						}
					});
				}
			}
		}
		
		function listInfraProviders(currentScope, cb) {
			//get the available providers
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/infra"
			}, function (error, providers) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					delete providers.soajsauth;
					currentScope.infraProviders = providers;
				}
			});
			return cb();
		}
		
		currentScope.form.actions = [];
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
			listInfraProviders(currentScope, () => {
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
						
						appendNextButton(currentScope, options);
						
						options.actions.push({
							'type': 'reset',
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
								delete $localStorage.addEnv;
								delete currentScope.wizard;
								delete currentScope.reusableData;
								currentScope.form.formData = {};
								$location.url($location.path());
								currentScope.$parent.go("/environments");
							}
						});
						
						formButtonOptions = options;
						
						overlayLoading.hide();
					});
				});
			});
		}
	}
	
	return {
		"go": go
	}
}]);