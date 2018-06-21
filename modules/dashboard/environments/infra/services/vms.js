"use strict";
var vmsServices = soajsApp.components;
vmsServices.service('platformsVM', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', function (ngDataApi, $timeout, $modal, $cookies, $window) {
	
	function listInfraProviders(currentScope, cb) {
		//get the available providers
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra"
		}, function (error, providers) {
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
	
	function listVMLayers(currentScope, cb) {
		
		if(!currentScope.infraProviders){
			listInfraProviders(currentScope, () => {
				nextStep();
			});
		}
		else{
			nextStep();
		}
		
		function nextStep(){
			//call common function
			getInfraProvidersAndVMLayers(currentScope, ngDataApi, currentScope.envCode, currentScope.infraProviders, (vmLayers) => {
				currentScope.vmLayers = vmLayers;
				if(cb && typeof cb === 'function'){
					return cb();
				}
			});
		}
	}
	
	function inspectVMLayer(currentScope, oneVMLayer){
		let formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = angular.copy(oneVMLayer);
		delete formConfig.entries[0].value.infraProvider.regions;
		
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
	
	function deleteVMLayer(currentScope, oneVMLayer){
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/vm",
			"params": {
				"env": currentScope.envCode,
				"layerName": oneVMLayer.name,
				"infraId": oneVMLayer.infraProvider._id,
				'technology': 'vm'
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				listVMLayers(currentScope);
			}
		});
	}
	
	function addVMLayer (currentScope){
		
		function defaultSaveActionMethod(modalScope, oneProvider, formData, modalInstance) {
			if(currentScope.saveActionMethodAdd){
				currentScope.saveActionMethodAdd(modalScope, oneProvider, formData, modalInstance);
			}
			else{
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
						"env": currentScope.envCode,
						'technology': 'vm',
						"infraId": oneProvider._id
					},
					"data": formData
				}, function (error, response) {
					if (error) {
						modalScope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						currentScope.displayAlert('success', "Virtual Machine Layer created, the process will take few minutes before it shows up in the list.");
						if(modalInstance){
							modalInstance.close();
						}
						$timeout(() => {
							listVMLayers(currentScope);
						}, 1000);
					}
				});
			}
		}
		
		let saveActionMethod = defaultSaveActionMethod;
		
		let vmProviders = angular.copy(currentScope.infraProviders);
		for (let i = vmProviders.length -1; i >=0; i--){
			let oneProvider = vmProviders[i];
			if(oneProvider.technologies.indexOf("vm") === -1){
				vmProviders.splice(i, 1);
			}
		}
		
		if(vmProviders.length > 1){
			let formEntries = [{
				type: 'select',
				label: "Select Infra Provider",
				name: "infraProvider",
				value: [],
				required: true,
				fieldMsg: "Select the Infra Provider you want to create the VM Layer at."
			}];
			
			vmProviders.forEach((oneProvider) => {
				formEntries[0].value.push({
					v: oneProvider,
					l: oneProvider.label
				});
			});
			
			let options = {
				timeout: $timeout,
				form: {
					"entries": formEntries
				},
				name: 'selectProvider',
				label: 'Select Infra Cloud Provider',
				actions: [
					{
						'type': 'submit',
						'label': translation.submit[LANG],
						'btn': 'primary',
						'action': function (formData) {
							populateVMLayerForm(currentScope, formData.infraProvider, formData.infraProvider.drivers[0].toLowerCase(), null, saveActionMethod);
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							currentScope.modalInstance.dismiss('cancel');
							currentScope.form.formData = {};
						}
					}
				]
			};
			buildFormWithModal(currentScope, $modal, options);
		}
		else if(vmProviders.length > 0){
			populateVMLayerForm(currentScope, vmProviders[0], vmProviders[0].drivers[0].toLowerCase(), null, saveActionMethod);
		}
	}
	
	function editVMLayer(currentScope, oneVMLayer){
		// oneVMLayerTemplateRecord --> retrieved from db
		
		function defaultSaveActionMethod(modalScope, oneProvider, formData, modalInstance) {
			if(currentScope.saveActionMethodModify){
				currentScope.saveActionMethodModify(modalScope, oneVMLayer, oneProvider, formData, modalInstance);
			}
			else{
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
						"env": currentScope.envCode,
						'technology': 'vm',
						"infraId": oneProvider._id,
						"layerName": oneVMLayer._id
					},
					"data": formData
				}, function (error, response) {
					if (error) {
						modalScope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						currentScope.displayAlert('success', "Virtual Machine Layer updated, the process will take few minutes before it shows up in the list.");
						if(modalInstance){
							modalInstance.close();
						}
						$timeout(() => {
							listVMLayers(currentScope);
						}, 1000);
					}
				});
			}
		}
		
		//if add environment made the call, this vm actually exists only in wizard scope
		if(currentScope.saveActionMethodModify){
			let oneVMLayerTemplateRecord = oneVMLayer.formData;
			let saveActionMethod = defaultSaveActionMethod;
			populateVMLayerForm(currentScope, oneVMLayer.infraProvider, oneVMLayer.infraProvider.drivers[0].toLowerCase(), oneVMLayerTemplateRecord, saveActionMethod);
		}
		else{
			/**
			 * call api and get how this vm layer was created
			 */
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/cloud/vm/template",
				"params": {
					"env": currentScope.envCode,
					'technology': 'vm',
					"infraId": oneVMLayer.infraProvider._id,
					"vmLayer": oneVMLayer.name
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					let oneVMLayerTemplateRecord = response;
					let saveActionMethod = defaultSaveActionMethod;
					populateVMLayerForm(currentScope, oneVMLayer.infraProvider, oneVMLayer.infraProvider.drivers[0].toLowerCase(), oneVMLayerTemplateRecord, saveActionMethod);
				}
			});
		}
	}
	
	function populateVMLayerForm(currentScope, oneProvider, technology, data, submitActionMethod) {
		let selectedInfraProvider = angular.copy(oneProvider);
		let formEntries = angular.copy(environmentsConfig.providers[oneProvider.name][technology].ui.form.deploy.entries);
		
		if(formEntries && formEntries.length > 0){
			formEntries.forEach((oneEntry) => {
				if (oneEntry.name === 'region') {
					oneEntry.value = oneProvider.regions;
					oneEntry.value[0].selected = true;
				}
			});
			
			let infraTemplates =[];
			oneProvider.templates.forEach((oneTmpl) => {
				let label = oneTmpl.name;
				if(oneTmpl.description && oneTmpl.description !== ''){
					label += " | " + oneTmpl.description;
				}
				infraTemplates.push({'v': oneTmpl.name, 'l': label});
			});
			
			formEntries.unshift({
				type: 'select',
				name: 'infraCodeTemplate',
				label: "Infra Code Template",
				value: infraTemplates,
				required: true,
				fieldMsg: "Pick which Infra Code template to use for the deployment of your cluster.",
				onAction: function(id, value, form){
					updateFormEntries(value, form);
				}
			});
			
			$modal.open({
				templateUrl: "infraProvider.tmpl",
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope, $modalInstance) {
					fixBackDrop();
					$scope.title = 'Configuring Deployment on ' + selectedInfraProvider.label;
					
					let formConfig = {
						timeout: $timeout,
						data: data,
						"entries": formEntries,
						name: 'vmdeployon' + selectedInfraProvider.name,
						"actions": [
							{
								'type': 'submit',
								'label': "Save & Continue",
								'btn': 'primary',
								'action': function (formData) {
									
									let myPattern = /^([a-zA-Z0-9_\-\.]){2,80}$/;
									if(!myPattern.test(formData.name)){
										$window.alert("Make sure that the VMLayer name is between 2 and 80 characters where alphanumeric, hyphen, underscore, and period are the only allowed characters.");
									}
									else{
										submitActionMethod($scope, oneProvider, formData, $modalInstance);
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
						if(data){
							$scope.form.formData = data;
							updateFormEntries(data.infraCodeTemplate, $scope.form);
						}
					});
				}
			});
		}
		
		function updateFormEntries(value, form){
			oneProvider.templates.forEach((oneTmpl) => {
				if(oneTmpl.name === value && oneTmpl.inputs && Array.isArray(oneTmpl.inputs)){
					form.entries = form.entries.concat(oneTmpl.inputs);
				}
			});
		}
	}
	
	return {
		'listInfraProviders': listInfraProviders,
		'listVMLayers': listVMLayers,
		'inspectVMLayer': inspectVMLayer,
		'addVMLayer': addVMLayer,
		'editVMLayer': editVMLayer,
		'populateVMLayerForm': populateVMLayerForm,
		'deleteVMLayer': deleteVMLayer
	}
}]);
