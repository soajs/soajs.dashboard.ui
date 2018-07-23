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
		currentScope.addVMLayer = function () {
			tempScope.add = currentScope.$new(true);
			tempScope.add.infraProviders = angular.copy(currentScope.infraProviders);
			tempScope.add.envCode = envCode;
			tempScope.displayAlert = currentScope.displayAlert;
			
			if (currentScope.reusableData) {
				tempScope.add.reusableData = currentScope.reusableData;
			}
			//override default save action with what ui wizard needs
			tempScope.add.saveActionMethodAdd = function (modalScope, oneProvider, formData, modalInstance) {
				//formData should include
				/*
				 1- template chosen
				 2- region to use
				 3- template inputs
				 */
				if (tempScope.add.reusableData) {
					currentScope.reusableData = tempScope.add.reusableData;
				}
				
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
						"env": currentScope.wizard.gi.code,
						'technology': 'vm',
						"infraId": oneProvider._id,
					},
					"data": {
						"infraCodeTemplate": formData.infraCodeTemplate,
						"region": formData.region,
						"group": formData.group,
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
				
				if (tempScope.add) {
					delete tempScope.add;
				}
				if (modalInstance) {
					modalInstance.close();
				}
			};
			
			platformsVM.addVMLayer(tempScope.add);
		};
		
		currentScope.editVMLayer = function (oneVMLayerFromList) {
			tempScope.edit = currentScope.$new(true);
			tempScope.edit.infraProviders = angular.copy(currentScope.infraProviders);
			tempScope.edit.envCode = envCode;
			tempScope.displayAlert = currentScope.displayAlert;
			if (currentScope.reusableData) {
				tempScope.edit.reusableData = currentScope.reusableData;
			}
			
			tempScope.edit.saveActionMethodModify = function (modalScope, oneVMLayer, oneProvider, formData, modalInstance) {
				//formData should include
				/*
				 1- template chosen
				 2- region to use
				 3- template inputs
				 */
				if (tempScope.edit.reusableData) {
					currentScope.reusableData = tempScope.edit.reusableData;
				}
				
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
						"env": currentScope.wizard.gi.code,
						'technology': 'vm',
						"infraId": oneProvider._id,
					},
					"data": {
						"infraCodeTemplate": formData.infraCodeTemplate,
						"region": formData.region,
						"group": formData.group,
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
					if (oneExistingTempVMLayer.params.infraId === oneVMLayerFromList.infraProvider._id) {
						if (oneExistingTempVMLayer.data.name === oneVMLayerFromList.name) {
							currentScope.wizard.vms[i] = vmLayerContext;
						}
					}
				}
				
				if (tempScope.edit) {
					delete tempScope.edit;
				}
				
				if (modalInstance) {
					modalInstance.close();
				}
			};
			
			let oneVMLayer = angular.copy(oneVMLayerFromList);
			currentScope.wizard.vms.forEach((oneExistingTempVMLayer) => {
				if (oneExistingTempVMLayer.params.infraId === oneVMLayer.infraProvider._id) {
					if (oneExistingTempVMLayer.data.name === oneVMLayer.name) {
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
			
			for (let i in oneVMLayer.formData.specs) {
				oneVMLayer.formData.inputs[i] = oneVMLayer.formData.specs[i];
			}
			platformsVM.editVMLayer(tempScope.edit, oneVMLayer);
		};
		
		currentScope.inspectVMLayer = function (oneVMLayer) {
			tempScope.inspect = currentScope.$new(true);
			platformsVM.inspectVMLayer(tempScope.inspect, oneVMLayer, () => {
				delete tempScope.inspect;
			});
		};
		
		currentScope.getOnBoard = function (vmLayer, release) {
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
					index = currentScope.wizard.onboardNames.indexOf(vmLayer.name);
					if (index !== -1) {
						currentScope.wizard.onboardNames.splice(index, 1)
					}
					for (let x = currentScope.wizard.vmOnBoard.length - 1; x >= 0; x--) {
						if (currentScope.wizard.vmOnBoard[x].params.infraId === myLayer.infraProvider._id &&
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
			
			if (myLayer.template) {
				myLayer.template = {
					_id: myLayer.template._id
				};
			}
			if (!release) {
				let names = [];
				for (let i in myLayer.list) {
					names.push(myLayer.list[i].name);
				}
				obj = {
					"params": {
						"env": currentScope.wizard.gi.code,
						"infraId": myLayer.infraProvider._id,
						"release": release
					},
					"data": {
						'names': names,
						"group": myLayer.list[0].labels['soajs.service.vm.group'],
						"networkName": myLayer.list[0].network,
						"layerName": myLayer.list[0].layer
					}
				};
				vmLayer.list[0].labels['soajs.env.code'] = currentScope.wizard.gi.code;
                vmLayer.list[0].labels['soajs.onBoard'] = "true";

				currentScope.wizard.vmOnBoard.push(obj);
				
				if (currentScope.wizard.onboardNames.indexOf(vmLayer.name) === -1) {
					currentScope.wizard.onboardNames.push(vmLayer.name);
				}
			}
			appendNextButton(currentScope, formButtonOptions);
		};
		
		//hook the listeners
		currentScope.listVMLayers = function () {
			platformsVM.listVMLayers(currentScope, () => {
				appendVMsTotheList();
			});
		};

		currentScope.deleteVMLayer = function (oneVMLayer) {
			if (oneVMLayer.forceEditDelete) {
				for (let layerName in currentScope.vmLayers) {
					if (layerName === oneVMLayer.infraProvider.name + "_" + oneVMLayer.name) {
						delete currentScope.vmLayers[layerName];
					}
				}

				for (let i = currentScope.wizard.vms.length - 1; i >= 0; i--) {
					let oneVM = currentScope.wizard.vms[i];
					if (oneVM.params.infraId === oneVMLayer.infraProvider._id) {
						if (oneVM.data.name === oneVMLayer.name) {
							currentScope.wizard.vms.splice(i, 1);
						}
					}
				}
				$localStorage.addEnv = angular.copy(currentScope.wizard);
			}
			appendNextButton(currentScope, formButtonOptions);
		};
		
		//if there are registered vms to be created by the wizard hook them to the scope
		function appendVMsTotheList() {
			// TODO: if onboarded
			if (currentScope.wizard.vms) {
				currentScope.wizard.vms.forEach((oneVM) => {
					
					let myProvider;
					currentScope.infraProviders.forEach((oneProvider) => {
						if (oneVM.params && oneProvider._id === oneVM.params.infraId) {
							myProvider = oneProvider;
						}
					});
					if (myProvider) {
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
		
		function appendNextButton(currentScope, options) {
			//if the next button exists, remove it
			if (options && options.actions) {
				for (let i = options.actions.length - 1; i >= 0; i--) {
					if (options.actions[i].label === 'Next') {
						options.actions.splice(i, 1);
					}
				}
			}
			
			let addNextButton = false;
			//template supports vm but not restricted to only vm
			if (!currentScope.restrictions.vm) {
				addNextButton = true;
			}
			else if (currentScope.restrictions.vm) {
				//template is restricted to only vm and i have vm layers
				if (!currentScope.restrictions.docker && !currentScope.restrictions.kubernetes && ((currentScope.wizard.vms && currentScope.wizard.vms.length) || currentScope.wizard.vmOnBoard)) {
					addNextButton = true;
				}
				else if ((currentScope.restrictions.docker || currentScope.restrictions.kubernetes) && ((currentScope.wizard.vms && currentScope.wizard.vms.length) || currentScope.wizard.vmOnBoard)) {
					addNextButton = true;
				}
			}
			//template is blank
			else if (!currentScope.wizard.template.content || Object.keys(currentScope.wizard.template.deploy).length === 0) {
				addNextButton = true;
			}
			currentScope.optionalVMLayer = addNextButton;

			if (addNextButton && options && options.actions && options.actions.length < 3) {
				options.actions.splice(1, 0, {
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function () {
						
						//if no container and no vm, do not proceed
						let noContainerSelected = false, noVMLayer = false;
						if (currentScope.wizard.deployment) {
							if (!currentScope.wizard.deployment.selectedDriver || currentScope.wizard.deployment.selectedDriver === 'ondemand') {
								noContainerSelected = true;
							}
						}
						
						// TODO
						if ((!currentScope.wizard.vms || currentScope.wizard.vms.length === 0)
							&& (!currentScope.wizard.vmOnBoard || currentScope.wizard.vmOnBoard.length === 0)) {
							noVMLayer = true;
						}
						
						if (noContainerSelected && noVMLayer) {
							$window.alert("You need to attach a container technology or create at least one virtual machine layer to proceed.");
						}
						else {
							currentScope.referringStep = 'vm';
							$localStorage.addEnv = angular.copy(currentScope.wizard);
							currentScope.envCode = envCode;
							// TODO
							currentScope.nextStep();
						}
					}
				});
			}
		}
		
		//on back
		function onBoard(currentScope, vmLayers, vmOnBoards) {
			for (let i in vmLayers) {
				for (let j in vmOnBoards) {
					if (vmLayers[i].name === vmOnBoards[j]) {
						if (!vmLayers[i].list[0].labels['soajs.env.code']) {
							vmLayers[i].list[0].labels['soajs.env.code'] = currentScope.wizard.gi.code
						}
					}
				}
			}
		}
		
		currentScope.form.actions = [];
		
		function listInfraProviders(currentScope, cb) {
			currentScope.infraProviders = [];
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
				return cb();
			});
		}
		
		currentScope.form.actions = [];
		if (!currentScope.restrictions.vm) {
			if (['registry', 'dynamicSrv'].indexOf(currentScope.referringStep) !== -1) {
				currentScope.referringStep = 'vm';
				currentScope.previousStep();
			}
			else {
				currentScope.referringStep = 'vm';
				currentScope.nextStep();
			}
		}
		else {
			//execute main function
			listInfraProviders(currentScope, () => {
				if (!currentScope.vmLayers) {
					currentScope.vmLayers = {};
				}
				delete currentScope.envCode;
				
				//turned off first vm support release
				platformsVM.listVMLayers(currentScope, () => {
					//if there are registered vms to be created by the wizard hook them to the scope
					if (currentScope.wizard.onboardNames && currentScope.vmLayers) {
						onBoard(currentScope, currentScope.vmLayers, currentScope.wizard.onboardNames);
					}

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
						// currentScope.wizard.onboardNames = [];
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

