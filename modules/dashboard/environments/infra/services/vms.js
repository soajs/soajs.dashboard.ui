"use strict";
var vmsServices = soajsApp.components;
vmsServices.service('platformsVM', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {
	
	function listVMLayers(currentScope) {
		//call common function
		getInfraProvidersAndVMLayers(currentScope, ngDataApi, currentScope.envCode, currentScope.infraProviders, (vmLayers) => {
			currentScope.vmLayers = vmLayers;
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
	
	}
	
	function editVMLayer(currentScope, oneVMLayer){
	
	}
	
	return {
		'listVMLayers': listVMLayers,
		'inspectVMLayer': inspectVMLayer,
		'addVMLayer': addVMLayer,
		'editVMLayer': editVMLayer,
		'deleteVMLayer': deleteVMLayer
	}
}]);
