"use strict";
var vmServices = soajsApp.components;
vmServices.service('vmSrv', ['$localStorage', '$timeout', 'platformsVM', function ($localStorage, $timeout, platformsVM) {
	
	function go(currentScope, cb) {
		
		currentScope.vms = currentScope.cloud.$new();
		currentScope.vms.envCode = null;
		currentScope.vms.form.formData.selectedProvider = currentScope.cloud.form.formData.selectedProvider;
		
		currentScope.vms.form.formData.selectedProvider.region = currentScope.wizard.deployment.selectedInfraProvider.region;
		currentScope.vms.form.formData.selectedProvider.network = currentScope.wizard.deployment.selectedInfraProvider.network;
		
		if(currentScope.wizard.deployment.selectedInfraProvider.extras){
			currentScope.vms.form.formData.selectedProvider.extra = currentScope.wizard.deployment.selectedInfraProvider.extras;
		}
		
		/**
		 * Override the default behavior of create vm layer to append data to the scope
		 */
		currentScope.vms.addVMLayer = function () {
			currentScope.vms.envCode = currentScope.envCode.toUpperCase();
			
			//override default save action with what ui wizard needs
			currentScope.vms.saveActionMethodAdd = function (modalScope, oneProvider, formData, modalInstance) {
				//formData should include
				/*
				 1- template chosen
				 2- region to use
				 3- template inputs
				 */
				for (let i in formData) {
					if (i.indexOf("add_another") !== -1) {
						delete formData[i];
					}
					else if (i.indexOf("remove_another") !== -1) {
						delete formData[i];
					}
				}
				
				let vmLayerContext = {
					"params": {
						"env": currentScope.wizard.gi.code
					},
					"data": {
						"infraCodeTemplate": formData.infraCodeTemplate,
						"name": formData.name,
						"specs": formData
					}
				};
				
				//hook the vm to the wizard scope
				if (!currentScope.wizard.vms) {
					currentScope.wizard.vms = [];
				}
				currentScope.wizard.vms.push(vmLayerContext);
				
				appendVMsTotheList();
				
				if (modalInstance) {
					modalInstance.close();
				}
			};
			
			platformsVM.addVMLayer(currentScope);
		};
		
		/**
		 * Override the default behavior of edit vm layer to modify appended data in the scope
		 */
		currentScope.vms.editVMLayer = function (oneVMLayerFromList) {
			currentScope.vms.envCode = currentScope.envCode.toUpperCase();
			
			currentScope.vms.saveActionMethodModify = function (modalScope, oneVMLayer, oneProvider, formData, modalInstance) {
				//formData should include
				/*
				 1- template chosen
				 2- region to use
				 3- template inputs
				 */
				for (let i in formData) {
					if (i.indexOf("add_another") !== -1) {
						delete formData[i];
					}
					else if (i.indexOf("remove_another") !== -1) {
						delete formData[i];
					}
				}
				
				let vmLayerContext = {
					"params": {
						"env": currentScope.wizard.gi.code
					},
					"data": {
						"infraCodeTemplate": formData.infraCodeTemplate,
						"name": formData.name,
						"specs": formData
					}
				};
				delete vmLayerContext.data.specs.inputs;
				delete vmLayerContext.data.specs.specs;
				
				//update the entry
				oneVMLayerFromList.specs.specs = formData;
				
				//update copy in wizard
				for (let i = 0; i < currentScope.wizard.vms.length; i++) {
					let oneExistingTempVMLayer = currentScope.wizard.vms[i];
					if (oneExistingTempVMLayer.data.name === oneVMLayerFromList.name) {
						currentScope.wizard.vms[i] = vmLayerContext;
					}
				}
				
				$localStorage.addEnv = angular.copy(currentScope.wizard);
				
				if (modalInstance) {
					modalInstance.close();
				}
			};
			
			let oneVMLayer = angular.copy(oneVMLayerFromList);
			currentScope.wizard.vms.forEach((oneExistingTempVMLayer) => {
				if (oneExistingTempVMLayer.data.name === oneVMLayer.name) {
					//this is the one
					oneVMLayer.formData = angular.copy(oneExistingTempVMLayer.data);
					oneVMLayer.formData.infraCodeTemplate = oneVMLayer.template;
				}
			});
			
			oneVMLayer.formData.inputs = angular.copy(oneVMLayer.formData.specs);
			
			platformsVM.editVMLayer(currentScope, oneVMLayer);
		};
		
		/**
		 * Invoke vm layer inspect operation
		 * @param oneVMLayer
		 */
		currentScope.vms.inspectVMLayer = function (oneVMLayer) {
			platformsVM.inspectVMLayer(currentScope.vms, oneVMLayer);
		};
		
		/**
		 * Override the default behavior of delete vm layer to remove entry from the scope list
		 * @param oneVMLayer
		 */
		currentScope.vms.deleteVMLayer = function (oneVMLayer) {
			if (oneVMLayer.forceEditDelete) {
				if (currentScope.vms.vmLayers) {
					for (let layerName in currentScope.vms.vmLayers) {
						if (layerName === oneVMLayer.infraProvider.name + "_" + oneVMLayer.name) {
							delete currentScope.vms.vmLayers[layerName];
						}
					}
				}
				
				for (let i = currentScope.wizard.vms.length - 1; i >= 0; i--) {
					let oneVM = currentScope.wizard.vms[i];
					if (oneVM.data.name === oneVMLayer.name) {
						currentScope.wizard.vms.splice(i, 1);
					}
				}
				$localStorage.addEnv = angular.copy(currentScope.wizard);
			}
		};
		
		function compareArrays(arr1, arr2){
			// if the other array is a falsy value, return
			if (!arr2)
				return false;
			
			// compare lengths - can save a lot of time
			if (arr1.length != arr2.length)
				return false;
			
			for (var i = 0, l= arr1.length; i < l; i++) {
				// Check if we have nested arrays
				if (arr1[i] != arr2[i]) {
					// Warning - two different object instances will never be equal: {x:20} != {x:20}
					return false;
				}
			}
			return true;
		}
		
		/**
		 * Override the default behavior of onboard/release vm layer to store and reomve entries from the scope list
		 * @param vmLayer
		 * @param release
		 */
		currentScope.vms.getOnBoard = function (vmLayer, release) {
			if (!currentScope.wizard.vmOnBoard) {
				currentScope.wizard.vmOnBoard = [];
			}
			if (!currentScope.wizard.onboardNames) {
				currentScope.wizard.onboardNames = [];
			}
			
			let obj;
			let index;
			let myLayer = angular.copy(vmLayer);
			if (release) {
				if (currentScope.wizard.onboardNames && currentScope.wizard.onboardNames.length > 0) {
					index = currentScope.wizard.onboardNames.indexOf(vmLayer.name + "__" + vmLayer.list[0].network);
					if (index !== -1) {
						currentScope.wizard.onboardNames.splice(index, 1)
					}
					
					for (let x = currentScope.wizard.vmOnBoard.length - 1; x >= 0; x--) {
						if (currentScope.wizard.vmOnBoard[x].params.env === currentScope.envCode &&
							currentScope.wizard.vmOnBoard[x].data.layerName === myLayer.list[0].layer
						) {
							currentScope.wizard.vmOnBoard.splice(x, 1);
						}
					}
				}
				delete vmLayer.list[0].labels['soajs.env.code'];
				if (vmLayer.list[0].labels['soajs.onBoard']) {
					delete vmLayer.list[0].labels['soajs.onBoard'];
				}
			}
			else {
				let ids = [];
				for (let i in myLayer.list) {
					ids.push(myLayer.list[i].id);
				}
				obj = {
					"params": {
						"env": currentScope.wizard.gi.code,
						"release": release
					},
					"data": {
						'ids': ids,
						"layerName": myLayer.list[0].layer
					}
				};
				
				vmLayer.list[0].labels['soajs.env.code'] = currentScope.wizard.gi.code;
				vmLayer.list[0].labels['soajs.onBoard'] = "true";
				
				if(currentScope.wizard.vmOnBoard.length > 0){
					currentScope.wizard.vmOnBoard.forEach((registeredVM) => {
						if(registeredVM.data.layerName !== obj.data.layerName && !compareArrays(registeredVM.data.ids, obj.data.ids)){
							currentScope.wizard.vmOnBoard.push(obj);
						}
					});
				}
				else{
					currentScope.wizard.vmOnBoard.push(obj);
				}
				
				if (!currentScope.wizard.onboardNames.includes(vmLayer.name + "__" + vmLayer.list[0].network)) {
					currentScope.wizard.onboardNames.push(vmLayer.name + "__" + vmLayer.list[0].network);
				}
			}
			$localStorage.addEnv = angular.copy(currentScope.wizard);
		};
		
		/**
		 * overload the default list vm layers and call add filters and append to scope list
		 */
		currentScope.vms.listVMLayers = function (cb) {
			platformsVM.listVMLayers(currentScope, null, false, () => {
				filterVmLayers(currentScope);
				
				//if there are registered vms to be created by the wizard hook them to the scope
				if (currentScope.wizard.onboardNames && currentScope.vms.vmLayers) {
					onBoard(currentScope, currentScope.vms.vmLayers, currentScope.wizard.onboardNames);
				}
				
				currentScope.wizard.vms = angular.copy($localStorage.addEnv.vms);
				appendVMsTotheList();
				
				if(cb && typeof cb === 'function'){
					return cb();
				}
			});
		};
		
		/**
		 * if there are registered vms to be created by the wizard hook them to the scope
		 */
		function appendVMsTotheList() {
			if (currentScope.wizard.vms) {
				currentScope.wizard.vms.forEach((oneVM) => {
					
					let myProvider = currentScope.vms.form.formData.selectedProvider;
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
					
					currentScope.vms.vmLayers = insertObjFirst(currentScope.vms.vmLayers, myProvider.name + "_" + myVM.name, myVM);
				});
				$localStorage.addEnv = angular.copy(currentScope.wizard);
			}
		}
		
		/**
		 * keep the vms that either do not have a soajs label or that have a soajs label that matches the env code in the wizard scope
		 * @param currentScope
		 */
		function filterVmLayers(currentScope) {
			//loop on vmLayers and if they have a label['soajs.env.code'] that doesn't match the wizard.gi.code remove the layer
			if (currentScope.vms.vmLayers) {
				for (let vmLayerName in currentScope.vms.vmLayers) {
					let remove = true;
					
					currentScope.vms.vmLayers[vmLayerName].list.forEach((oneInstance) => {
						if ((oneInstance.labels && oneInstance.labels['soajs.env.code'] && oneInstance.labels['soajs.env.code'].toLowerCase() === currentScope.wizard.gi.code.toLowerCase()) || !oneInstance.labels || (oneInstance.labels && !oneInstance.labels['soajs.env.code'])) {
							remove = false;
						}
					});
					
					if (remove) {
						delete currentScope.vms.vmLayers[vmLayerName];
					}
				}
			}
		}
		
		/**
		 * if there are already onboarded vms in the scope, re add them to the list
		 * this happens when clicking back or refreshing the page
		 * @param currentScope
		 * @param vmLayers
		 * @param vmOnBoards
		 */
		function onBoard(currentScope, vmLayers, vmOnBoards) {
			if (vmLayers) {
				for (let i in vmLayers) {
					for (let j in vmOnBoards) {
						if ((vmLayers[i].name + "__" + vmLayers[i].list[0].network) === vmOnBoards[j]) {
							if (!vmLayers[i].list[0].labels['soajs.env.code']) {
								vmLayers[i].list[0].labels['soajs.env.code'] = currentScope.wizard.gi.code;
								vmLayers[i].list[0].labels['soajs.onBoard'] = "true"
							}
						}
					}
				}
			}
		}
		
		$timeout(() => {
			currentScope.vms.listVMLayers(cb);
		}, 500);
	}
	
	return {
		"go": go
	}
}]);
