"use strict";
var vmsServices = soajsApp.components;
vmsServices.service('platformsVM', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', function (ngDataApi, $timeout, $modal, $cookies, $window) {
	
	/**
	 * function that lists all the vm layers and failed vm deployments for the given provider
	 * @param currentScope
	 * @param envCode
	 * @param oneProvider
	 * @param includeErrors
	 * @param cb
	 */
	function getInfraProvidersVMS(currentScope, envCode, oneProvider, includeErrors, cb) {
		let allVMs = {};
		if(!currentScope.wizard){
			overlayLoading.show();
		}
		
		let requestOptions = {
			"method": "get",
			"routeName": "/dashboard/cloud/vm/list",
			"params": {
				"includeErrors": includeErrors
			}
		};
		
		if(envCode){
			requestOptions.params.env = envCode;
		}
		else{
			requestOptions.params = {
				"infraId": oneProvider._id,
				"region": oneProvider.region,
				"network": oneProvider.network,
				"includeErrors": includeErrors
			};
		}
		
		if (oneProvider.extra) {
			for(let i in oneProvider.extra){
				requestOptions.params[i] = oneProvider.extra[i];
			}
		}
		
		getSendDataFromServer(currentScope, ngDataApi, requestOptions, function (error, providerVMs) {
			if(!currentScope.wizard) {
				overlayLoading.hide();
			}
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				delete providerVMs.soajsauth;
				
				//aggregate response and generate layers from list returned
				if (providerVMs[oneProvider.name] && Array.isArray(providerVMs[oneProvider.name]) && providerVMs[oneProvider.name].length > 0) {
					
					providerVMs[oneProvider.name].forEach((oneVM) => {
						//aggregate and populate groups
						//add infra to group details
						if (!allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
							let vmTemplate = angular.copy(oneVM.template);
							delete oneVM.template;
							if (envCode) {
								if (oneVM.labels && oneVM.labels['soajs.env.code'] && oneVM.labels['soajs.env.code'] === envCode) {
									if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
										allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
									}
									else {
										allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
											name: oneVM.layer,
											infraProvider: oneProvider,
											executeCommand: true,
											list: [oneVM],
											template: vmTemplate
										};
									}
									
								}
								else {
									if (vmTemplate === undefined || !vmTemplate) {
										if (oneVM.labels && !oneVM.labels['soajs.env.code']) {
											if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
												allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM)
											}
											else {
												allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
													name: oneVM.layer,
													infraProvider: oneProvider,
													executeCommand: true,
													list: [oneVM]
												}
											}
										}
									}
								}
							}
							else {
								if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
									allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
								}
								else {
									allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
										name: oneVM.layer,
										infraProvider: oneProvider,
										executeCommand: true,
										list: [oneVM],
										template: vmTemplate
									};
								}
							}
						}
						else {
							if (envCode) {
								if (oneVM.labels && oneVM.labels['soajs.env.code'] && oneVM.labels['soajs.env.code'] === envCode) {
									delete oneVM.template;
									allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
								}
							}
							else {
								delete oneVM.template;
								allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
							}
						}
						
						if (Object.hasOwnProperty.call(oneVM, 'executeCommand') && allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
							//ensure to only update the value of this property if it is true. setting it to false will prevent the user from:
							// - on boarding and deploying in it
							if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].executeCommand === true) {
								allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].executeCommand = oneVM.executeCommand;
							}
						}
					});
				}
				
				if (providerVMs.errors) {
					if (!currentScope.vms.errorVMLayers) {
						currentScope.vms.errorVMLayers = {};
					}
					for (let id in providerVMs.errors) {
						currentScope.vms.errorVMLayers[id] = providerVMs.errors[id];
					}
				}
				
				//remove layer if it has no instances
				currentScope.vms.vmLayers = allVMs;
				
				let myVMKeys = Object.keys(currentScope.vms.vmLayers);
				
				for(let i = myVMKeys.length -1; i >=0; i--){
					if(!currentScope.vms.vmLayers[myVMKeys[i]].list || currentScope.vms.vmLayers[myVMKeys[i]].list.length === 0){
						delete currentScope.vms.vmLayers[myVMKeys[i]];
					}
				}
				
				if(Object.keys(currentScope.vms.vmLayers).length === 0){
					delete currentScope.vms.vmLayers;
				}
				return cb();
			}
		});
	}
	
	/**
	 * function that fetches vm layers that can be on-boarded
	 * @param currentScope
	 * @param cb
	 */
	function listVMLayers(currentScope, envCode, includeErrors, cb) {
		//call common function
		getInfraProvidersVMS(currentScope, envCode, currentScope.vms.form.formData.selectedProvider, includeErrors, () => {
			checkOnboard(currentScope.vms.vmLayers, () => {
				
				if (currentScope.errorVMLayers) {
					for (let vmId in currentScope.errorVMLayers) {
						let vmInfra = currentScope.errorVMLayers[vmId].infraId;
						
						if (currentScope.vms.form.formData.selectedProvider._id === vmInfra) {
							currentScope.errorVMLayers[vmId].infraProvider = currentScope.vms.form.formData.selectedProvider;
						}
					}
				}
				
				currentScope.vms.noVMLayers = (!currentScope.vms.vmLayers || Object.keys(currentScope.vms.vmLayers).length === 0);
				if (cb && typeof cb === 'function') {
					return cb();
				}
			});
		});
	}
	
	/**
	 * check the vm layers can be onboarded or not
	 * @param vmLayers
	 * @param cb
	 * @returns {*}
	 */
	function checkOnboard(vmLayers, cb) {
		if (vmLayers) {
			let vm;
			for (let i = 0; i < Object.keys(vmLayers).length; i++) {
				let found = false;
				vm = vmLayers[Object.keys(vmLayers)[i]];
				if (!vm.template || vm.template === undefined) {
					for (let j = 0; j < vm.list.length; j++) {
						if (vm.list[j].labels && vm.list[j].labels['soajs.env.code']) {
							found = true;
							break;
						}
					}
					if (found) {
						for (let z = 0; z < vm.list.length; z++) {
							if ((vm.list[z].labels && (!vm.list[z].labels['soajs.env.code'] || vm.list[z].labels['soajs.env.code'] === undefined)) || !vm.list[z].labels) {
								vmLayers[Object.keys(vmLayers)[i]].sync = true
							}
						}
					}
				}
				if (vm.template && Object.keys(vm.template).length > 0) {
					for (let j = 0; j < vm.list.length; j++) {
						if (vm.list[j].labels && vm.list[j].labels['soajs.env.code']) {
							found = true;
							break;
						}
					}
					if (found) {
						for (let z = 0; z < vm.list.length; z++) {
							if ((vm.list[z].labels && (!vm.list[z].labels['soajs.env.code'] || vm.list[z].labels['soajs.env.code'] === undefined)) || !vm.list[z].labels) {
								vmLayers[Object.keys(vmLayers)[i]].sync = true
							}
						}
					}
				}
			}
		}
		return cb();
	}
	
	function inspectVMLayer(currentScope, oneVMLayer) {
		let formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = angular.copy(oneVMLayer);
		delete formConfig.entries[0].value.infraProvider.regions;
		delete formConfig.entries[0].value.infraProvider.templates;
		delete formConfig.entries[0].value.infraProvider.groups;
		delete formConfig.entries[0].value.infraProvider.deployments;
		delete formConfig.entries[0].value.infraProvider.api;
		delete formConfig.entries[0].value.template;
		
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: oneVMLayer.name + ' | Layer Inspection',
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function (formData) {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function deleteVMLayer(currentScope, oneVMLayer) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/vm",
			"params": {
				"id": oneVMLayer.template.id,
				"env": currentScope.vms.envCode,
				"layerName": oneVMLayer.name
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				currentScope.displayAlert('success', "Virtual Machine Layer deleted, changes will be available soon.");
				
				listVMLayers(currentScope, currentScope.vms.envCode);
			}
		});
	}
	
	function addVMLayer(currentScope) {
		
		function defaultSaveActionMethod(modalScope, oneProvider, formData, modalInstance) {
			if (currentScope.vms.saveActionMethodAdd) {
				currentScope.vms.saveActionMethodAdd(modalScope, oneProvider, formData, modalInstance);
			}
			else {
				//collect the inputs from formData, formulate API call and trigger it
				//formData should include
				/*
				 1- template chosen
				 2- region to use
				 3- template inputs
				 */
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/cloud/vm",
					"params": {
						"env": currentScope.vms.envCode
					},
					"data": {
						"infraCodeTemplate": formData.infraCodeTemplate,
						"name": formData.name,
						"specs": formData
					}
				}, function (error, response) {
					if (error) {
						modalScope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						currentScope.displayAlert('success', "Virtual Machine Layer created, the process will take few minutes before it shows up in the list.");
						delete currentScope.reusableData;
						if (modalInstance) {
							modalInstance.close();
						}
						$timeout(() => {
							listVMLayers(currentScope, currentScope.vms.envCode);
						}, 1000);
					}
				});
			}
		}
		
		let saveActionMethod = defaultSaveActionMethod;
		
		//currentScope.vms.form.formData.selectedProvider
		let data = {
			inputs: {
				region: currentScope.vms.form.formData.selectedProvider.region,
				network: currentScope.vms.form.formData.selectedProvider.network
			}
		};
		
		if (currentScope.vms.form.formData.selectedProvider.extra) {
			for(let i in currentScope.vms.form.formData.selectedProvider.extra){
				data.inputs[i] = currentScope.vms.form.formData.selectedProvider.extra[i];
			}
		}
		
		populateVMLayerForm(currentScope, currentScope.vms.form.formData.selectedProvider, data, saveActionMethod);
	}
	
	function editVMLayer(currentScope, originalVMLayer) {
		let oneVMLayer = angular.copy(originalVMLayer);
		
		// oneVMLayerTemplateRecord --> retrieved from db
		
		function defaultSaveActionMethod(modalScope, oneProvider, formData, modalInstance) {
			if (currentScope.vms.saveActionMethodModify) {
				currentScope.vms.saveActionMethodModify(modalScope, oneVMLayer, oneProvider, formData, modalInstance);
			}
			else {
				//collect the inputs from formData, formulate API call and trigger it
				//formData should include
				/*
					1- template chosen
					2- region to use
					3- template inputs
				 */
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "put",
					"routeName": "/dashboard/cloud/vm",
					"params": {
						"env": currentScope.vms.envCode,
						"id": oneVMLayer.template.id
					},
					"data": {
						"infraCodeTemplate": formData.infraCodeTemplate,
						"layerName": formData.name,
						"specs": formData
					}
				}, function (error, response) {
					if (error) {
						modalScope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						currentScope.displayAlert('success', "Virtual Machine Layer updated, the process will take few minutes before it shows up in the list.");
						
						delete currentScope.reusableData;
						if (modalInstance) {
							modalInstance.close();
						}
						$timeout(() => {
							listVMLayers(currentScope, currentScope.vms.envCode);
						}, 1000);
					}
				});
			}
		}
		
		//if add environment made the call, this vm actually exists only in wizard scope
		if (currentScope.vms.saveActionMethodModify) {
			let oneVMLayerTemplateRecord = oneVMLayer.formData;
			let saveActionMethod = defaultSaveActionMethod;
			populateVMLayerForm(currentScope, oneVMLayer.infraProvider, oneVMLayerTemplateRecord, saveActionMethod, true);
		}
		else {
			/**
			 * call api and get how this vm layer was created
			 */
			$timeout(() => {
				overlayLoading.show();
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "get",
					"routeName": "/dashboard/cloud/vm/layer/status",
					"params": {
						"env": currentScope.vms.envCode,
						"id": oneVMLayer.template.id,
						"layerName": oneVMLayer.name
					}
				}, function (error, response) {
					overlayLoading.hide();
					if (error) {
						currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						response.infraCodeTemplate = response.template;
						let oneVMLayerTemplateRecord = response;
						let saveActionMethod = defaultSaveActionMethod;
						populateVMLayerForm(currentScope, oneVMLayer.infraProvider, oneVMLayerTemplateRecord, saveActionMethod, true);
					}
				});
			}, 500);
		}
	}
	
	function populateVMLayerForm(currentScope, oneProvider, data, submitActionMethod, editMode) {
		//call the api that ameer will do
		function getInfraExtras(cb) {
			let requestOptions = {
				"method": "get",
				"routeName": "/dashboard/infra/extras",
				"params": {
					"envCode": currentScope.vms.envCode,
					"id": oneProvider._id,
					"region": oneProvider.region,
					"network": oneProvider.network,
					"extras": [] //NOTE empty array means get extras of all available types
				}
			};
			
			if (oneProvider.extra) {
				for(let i in oneProvider.extra){
					requestOptions.params[i] = oneProvider.extra[i];
				}
			}
			
			getSendDataFromServer(currentScope, ngDataApi, requestOptions, function (error, response) {
				if (error) {
					overlayLoading.hide();
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					return cb(response);
				}
			});
		}
		
		function renderForm(computedValues) {
			let selectedInfraProvider = angular.copy(oneProvider);
			let formEntries = [
				{
					"type": "text",
					"readonly": true,
					"disabled": true,
					"required": true,
					"value": data.inputs.region,
					"name": "region",
					"label": "Region",
					"fieldMsg": "The Virtual Machine will be created in this region"
				},
				{
					"type": "text",
					"readonly": true,
					"required": true,
					"disabled": true,
					"value": data.inputs.network,
					"name": "network",
					"label": "Network",
					"fieldMsg": "The Virtual Machine will be created using this network"
				}
			];
			let infraTemplates = [];
			
			if (!currentScope.reusableData) {
				currentScope.reusableData = [];
			}
			
			oneProvider.templates.forEach((oneTmpl) => {
				if (oneTmpl && oneTmpl.driver && environmentsConfig.providers[oneProvider.name] && environmentsConfig.providers[oneProvider.name][oneTmpl.driver.toLowerCase()]) {
					let label = oneTmpl.name;
					if (oneTmpl.description && oneTmpl.description !== '') {
						label += " | " + oneTmpl.description;
					}
					let defaultSelected = (oneTmpl.name === data && data.infraCodeTemplate);
					infraTemplates.push({'v': oneTmpl.name, 'l': label, selected: defaultSelected});
				}
			});
			
			formEntries.push({
				type: 'select',
				name: 'infraCodeTemplate',
				label: "Infra Code Template",
				value: infraTemplates,
				required: true,
				fieldMsg: "Select an Infra Code as Template anc configure how the Virtual Machine Cluster should be created.",
				onAction: function (id, value, form) {
					form.entries.length = 3;
					let iacTemplateTechnology;
					
					for (let i = 0; i < oneProvider.templates.length; i++) {
						if (oneProvider.templates[i].name === value && oneProvider.templates[i].driver) {
							iacTemplateTechnology = oneProvider.templates[i].driver.toLowerCase();
							break;
						}
					}
					
					form.entries = form.entries.concat(angular.copy(environmentsConfig.providers[oneProvider.name][iacTemplateTechnology].ui.form.deploy.entries));
					
					updateFormEntries(computedValues, value, form);
				}
			});
			
			$modal.open({
				templateUrl: "infraProvider.tmpl",
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope, $modalInstance) {
					fixBackDrop();
					$scope.title = 'Creating Virtual Machine Cluster @ ' + selectedInfraProvider.label;
					
					let formConfig = {
						timeout: $timeout,
						data: data.inputs,
						"entries": formEntries,
						name: 'vmdeployon' + selectedInfraProvider.name,
						"actions": [
							{
								'type': 'submit',
								'label': (editMode) ? "Modify" : "Save & Continue",
								'btn': 'primary',
								'action': function (formData) {
									if (!editMode) {
										// add region and group to formData
										formData = Object.assign(formData, data.inputs);
									}
									else {
										if (formData.specs && formData.specs.specs) {
											delete formData.specs.specs;
										}
									}
									
									let myPattern = /^([a-zA-Z0-9_\-\.]){2,80}$/;
									if (!myPattern.test(formData.name)) {
										$window.alert("Make sure that the VMLayer name is between 2 and 80 characters where alphanumeric, hyphen, underscore, and period are the only allowed characters.");
									}
									else {
										remapFormDataBeforeSubmission($scope, formData, () => {
											submitActionMethod($scope, oneProvider, formData, $modalInstance);
										});
									}
								}
							},
							{
								'type': 'reset',
								'label': translation.cancel[LANG],
								'btn': 'danger',
								'action': function () {
									$modalInstance.dismiss('cancel');
								}
							}
						]
					};
					
					buildForm($scope, null, formConfig, () => {
						if (data && data.infraCodeTemplate) {
							$scope.form.formData = data;
							updateFormEntries(computedValues, data.infraCodeTemplate, $scope.form);
						}
					});
				}
			});
		}
		
		function remapFormDataBeforeSubmission(modalScope, formData, cb) {
			
			function mapEntryToFormData(oneEntry) {
				if (oneEntry.entries && oneEntry.multi && Object.hasOwnProperty.call(oneEntry, 'limit')) {
					let tempData = [];
					oneEntry.entries.forEach((oneSubEntry) => {
						let tempObj = {};
						if (oneSubEntry.entries) {
							oneSubEntry.entries.forEach((level2Entries) => {
								if (level2Entries.name.indexOf("add_another") === -1 && level2Entries.name.indexOf("remove_another") === -1) {
									tempObj[level2Entries.name.replace(/_c_[0-9]+/, '')] = formData[level2Entries.name];
									delete formData[level2Entries.name];
								}
								
								mapEntryToFormData(level2Entries)
							});
						}
						else {
							if (oneSubEntry.name.indexOf("add_another") === -1 && oneSubEntry.name.indexOf("remove_another") === -1) {
								tempObj[oneSubEntry.name] = formData[oneSubEntry.name];
							}
						}
						if (Object.keys(tempObj).length > 0) {
							tempData.push(tempObj);
						}
					});
					
					formData[oneEntry.name] = tempData;
				}
				else {
					if (oneEntry.name.indexOf("add_another") !== -1 && oneEntry.name.indexOf("remove_another") !== -1) {
						delete formData[oneEntry.name];
					}
					if (oneEntry.reusable) {
						let tmpObj = {
							"key": oneEntry.reusable.as,
							"formData": {}
						};
						if (formData[oneEntry.name]) {
							tmpObj.formData[oneEntry.reusable.via] = formData[oneEntry.name];
							currentScope.reusableData.push(tmpObj);
						}
					}
				}
			}
			
			function recursiveMapping(oneEntry) {
				
				mapEntryToFormData(oneEntry);
				if (oneEntry.entries) {
					oneEntry.entries.forEach((oneEntry) => {
						recursiveMapping(oneEntry);
					});
				}
			}
			
			modalScope.form.entries.forEach((oneEntry) => {
				recursiveMapping(oneEntry);
			});
			
			return cb();
		}
		
		function updateFormEntries(computedValues, value, form) {
			overlayLoading.show();
			oneProvider.templates.forEach((oneTmpl) => {
				if (oneTmpl.name === value) {
					if (typeof(oneTmpl.inputs) === "string") {
						try {
							oneTmpl.inputs = JSON.parse(oneTmpl.inputs);
						} catch (e) {
							overlayLoading.hide();
							currentScope.displayAlert("danger", "The Infra as Code Template inputs do not have a valid JSON schema.")
						}
					}
					if (oneTmpl.inputs && Array.isArray(oneTmpl.inputs)) {
						form.entries = form.entries.concat(oneTmpl.inputs);
						
						//map computed inputs
						mapComputedInputs(form.entries, computedValues, form);
						
						form.refresh(false);
						$timeout(() => {
							form.buildDisabledRulesIndexer();
							$timeout(() => {
								if (editMode && data && data.inputs && Object.keys(data.inputs).length > 0) {
									for (let i in data.inputs) {
										form.formData[i] = data.inputs[i];
									}
								}
							}, 10);
							overlayLoading.hide();
						}, 1000)
					}
				}
			});
		}
		
		function mapComputedInputs(entries, computedValues, form) {
			
			function mapOneEntry(oneEntry) {
				if (oneEntry.type === 'select' && oneEntry.value && oneEntry.value.key && oneEntry.value.fields) {
					if (computedValues[oneEntry.value.key] && Array.isArray(computedValues[oneEntry.value.key])) {
						let values = [];
						computedValues[oneEntry.value.key].forEach((oneComputedValue) => {
							values.push({
								v: oneComputedValue[oneEntry.value.fields.v],
								l: oneComputedValue[oneEntry.value.fields.l]
							})
						});
						oneEntry.value = values;
					}
				}
				else if (oneEntry.type === 'uiselect' && oneEntry.computedValue && oneEntry.computedValue.key && oneEntry.computedValue.fields) {
					if (computedValues[oneEntry.computedValue.key] && Array.isArray(computedValues[oneEntry.computedValue.key])) {
						let values = [];
						computedValues[oneEntry.computedValue.key].forEach((oneComputedValue) => {
							values.push({
								v: oneComputedValue[oneEntry.computedValue.fields.v],
								l: oneComputedValue[oneEntry.computedValue.fields.l]
							})
						});
						oneEntry.value = values;
					}
				}
			}
			
			function scanEntries(entries) {
				entries.forEach((oneEntry) => {
					if (oneEntry.entries) {
						if (oneEntry.multi) {
							if (oneEntry.limit && oneEntry.limit !== 0) {
								//fixed multi limit
								replicateInput(oneEntry, oneEntry.limit);
							}
							else {
								//add another la yenfezir
								replicateInput(oneEntry, null);
							}
						}
						else {
							scanEntries(oneEntry.entries);
						}
					}
					else {
						mapOneEntry(oneEntry)
					}
				});
			}
			
			function replicateInput(original, limit) {
				
				if (!original.counter) {
					original.counter = 0;
				}
				
				//no limit, add another
				let defaultData;
				if (editMode && data && data.inputs && data.inputs[original.name] && Array.isArray(data.inputs[original.name])) {
					defaultData = data.inputs[original.name];
				}
				
				if (!limit) {
					let arraycount = 0;
					if (editMode && data && data.inputs && data.inputs[original.name] && Array.isArray(data.inputs[original.name])) {
						arraycount = data.inputs[original.name].length;
					}
					
					original.template = angular.copy(original.entries);
					
					let finalEntries = [];
					for (let i = 0; i < arraycount; i++) {
						pushOneDynamicEntry(finalEntries, i, original.template, defaultData);
						original.counter++;
					}
					original.entries = finalEntries;
					
					//hook add another
					original.entries.push({
						"type": "html",
						"name": "add_another" + original.name,
						"value": "<a class='btn btn-sm btn-primary f-right'><span class='icon icon-plus'></span> Add Another</a>",
						"onAction": function (id, value, form) {
							let another = angular.copy(original.template);
							//hook the remove entry input
							let removeButon = {
								"type": "html",
								"name": "remove_another" + original.name,
								"value": "<a class='btn btn-sm btn-danger f-right'><span class='icon icon-cross'></span> Remove</a>",
								"onAction": function (id, value, form) {
									let currentCounter = parseInt(id.split("_c_")[1]);
									for (let i = original.entries.length - 1; i >= 0; i--) {
										if (original.entries[i].name.includes("_c_" + currentCounter)) {
											original.entries.splice(i, 1);
											for (let inputName in form.formData) {
												if (inputName.includes("_c_" + currentCounter)) {
													delete form.formData[inputName];
												}
											}
										}
									}
								}
							};
							
							if (another[0].entries) {
								another[0].entries.unshift(removeButon);
							}
							else {
								another.unshift(removeButon);
							}
							
							let finalEntries = [];
							pushOneDynamicEntry(finalEntries, original.counter, another);
							
							original.counter++;
							let anotherButton = original.entries[original.entries.length - 1];
							original.entries.splice(original.entries.length - 1, 1);
							original.entries = original.entries.concat(finalEntries);
							original.entries.push(anotherButton);
							
							scanEntries(original.entries);
						}
					});
				}
				//yes limit only populate based on count
				else {
					original.template = angular.copy(original.entries);
					let finalEntries = [];
					for (let i = 0; i < limit; i++) {
						pushOneDynamicEntry(finalEntries, i, original.template, defaultData);
						original.counter++;
					}
					original.entries = finalEntries;
				}
				scanEntries(original.entries);
			}
			
			function pushOneDynamicEntry(finalEntries, counter, templateEntries, defaultData) {
				let inputs = angular.copy(templateEntries);
				inputs.forEach((oneInput) => {
					oneInput.name += "_c_" + counter;
					
					if (oneInput.entries) {
						allMyEntries(oneInput.entries, counter, defaultData);
					}
					counter++;
					finalEntries.push(oneInput);
				});
			}
			
			function allMyEntries(entries, countValue, defaultData) {
				entries.forEach(function (oneEntry) {
					if (oneEntry.entries) {
						allMyEntries(oneEntry.entries, countValue, oneEntry.name, defaultData);
					}
					
					// if edit
					if (editMode && defaultData) {
						let thisEntryDefaultData = defaultData[countValue];
						form.formData[oneEntry.name + "_c_" + countValue] = thisEntryDefaultData[oneEntry.name];
						
						//todo: case of json editor
					}
					
					if (oneEntry.name) {
						oneEntry.name += "_c_" + countValue;
					}
				});
			}
			
			scanEntries(entries);
		}
		
		$timeout(() => {
			overlayLoading.show();
			getInfraExtras((computedValues) => {
				overlayLoading.hide();
				if (currentScope.reusableData && currentScope.reusableData.length > 0) {
					currentScope.reusableData.forEach((oneReusableEntry) => {
						if (computedValues[oneReusableEntry.key]) {
							//only unique values
							let addIt = true;
							computedValues[oneReusableEntry.key].forEach((oneComputed) => {
								if (JSON.stringify(oneReusableEntry.formData) === JSON.stringify(oneComputed)) {
									addIt = false;
								}
							});
							
							if (addIt) {
								computedValues[oneReusableEntry.key].push(oneReusableEntry.formData);
							}
						}
						else {
							computedValues[oneReusableEntry.key] = [oneReusableEntry.formData];
						}
					});
				}
				
				renderForm(computedValues);
			});
		}, 500)
	}
	
	function getOnBoard(currentScope, vmLayer, release) {
		let ids = [];
		for (let i in vmLayer.list) {
			ids.push(vmLayer.list[i].id);
		}
		$modal.open({
			templateUrl: (!release && !vmLayer.sync) ? "onboardVM.tmpl" : (release && !vmLayer.sync) ? 'releaseVM.tmpl' : "sync.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				$scope.proceed = function () {
					$modalInstance.close();
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "post",
						"routeName": "/dashboard/cloud/vm/onboard",
						"params": {
							"env": currentScope.vms.envCode,
							"release": release
						},
						"data": {
							'ids': ids,
							"group": vmLayer.list[0].labels['soajs.service.vm.group'],
							"layerName": vmLayer.list[0].layer
						}
					}, function (error) {
						overlayLoading.hide();
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						else {
							if (vmLayer.sync) {
								delete vmLayer.sync;
							}
							listVMLayers(currentScope, currentScope.vms.envCode);
							currentScope.displayAlert('success', "Virtual Machine updated");
						}
					});
				};
				
				$scope.cancel = function () {
					$modalInstance.close();
				};
			}
		});
	}
	
	function go(currentScope, operation) {
		
		if (!currentScope.vms) {
			currentScope.vms = currentScope.$new(); //true means detached from main currentScope
		}
		
		if(!currentScope.wizard){
			
			currentScope.vms.listVMLayers = function (includeErrors, cb) {
				let envCode;
				if(currentScope.vms.envCode){
					envCode = currentScope.vms.envCode;
				}
				listVMLayers(currentScope, envCode, includeErrors, cb);
			};
			
			currentScope.vms.getOnBoard = function (vmLayer, release) {
				getOnBoard(currentScope, vmLayer, release);
			};
			
			currentScope.vms.addVMLayer = function () {
				addVMLayer(currentScope);
			};
			
			currentScope.vms.inspectVMLayer = function (oneVMLayer) {
				inspectVMLayer(currentScope, oneVMLayer);
			};
			
			currentScope.vms.editVMLayer = function (oneVMLayer) {
				editVMLayer(currentScope, oneVMLayer);
			};
			
			currentScope.vms.deleteVMLayer = function (oneVMLayer) {
				deleteVMLayer(currentScope, oneVMLayer);
			};
			
			currentScope.vms.getVMs = function(){
				return (!currentScope.vms.vmLayers || Object.keys(currentScope.vms.vmLayers).length === 0);
			};
		}
		
		if (operation) {
			currentScope.vms[operation]();
		}
	}
	
	return {
		'go': go,
		'listVMLayers': listVMLayers,
		'inspectVMLayer': inspectVMLayer,
		'addVMLayer': addVMLayer,
		'editVMLayer': editVMLayer
	}
}]);
