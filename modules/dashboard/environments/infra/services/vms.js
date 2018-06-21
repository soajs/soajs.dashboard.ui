"use strict";
var vmsServices = soajsApp.components;
vmsServices.service('platformsVM', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {
	
	function listVMLayers(currentScope, cb) {
		//call common function
		getInfraProvidersAndVMLayers(currentScope, ngDataApi, currentScope.envCode, currentScope.infraProviders, (vmLayers) => {
			currentScope.vmLayers = vmLayers;
			
			if(cb && typeof cb === 'function'){
				return cb();
			}
		});
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
				"serviceId": oneVMLayer.name,
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
		
		function defaultSaveActionMethod(modalScope, formData, modalInstance) {
			if(currentScope.saveActionMethod){
				currentScope.saveActionMethod(modalScope, formData, modalInstance);
			}
			else{
				console.log("inside the main module");
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
		// populateVMLayerForm(currentScope, oneVMLayer.infraProvider, oneVMLayer.infraProvider.drivers[0], oneVMLayerTemplateRecord, saveActionMethod);
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
									submitActionMethod($scope, formData, $modalInstance);
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
							updateFormEntries(data.template, $scope.form);
							$scope.form.formData = data;
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
		'listVMLayers': listVMLayers,
		'inspectVMLayer': inspectVMLayer,
		'addVMLayer': addVMLayer,
		'editVMLayer': editVMLayer,
		'populateVMLayerForm': populateVMLayerForm,
		'deleteVMLayer': deleteVMLayer
	}
}]);
