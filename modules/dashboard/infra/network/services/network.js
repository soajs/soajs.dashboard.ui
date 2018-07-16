"use strict";
var infraNetworkSrv = soajsApp.components;
infraNetworkSrv.service('infraNetworkSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', 'infraCommonSrv', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload, infraCommonSrv) {

	function addNetwork(currentScope) {}

	function editNetwork(currentScope, oneNetwork) {}

	function deleteNetwork(currentScope, oneNetwork) {

		let deleteNetworkOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'network',
				'group': currentScope.selectedGroup.name,
				'name': oneNetwork.name
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteNetworkOpts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The resource group "${currentScope.selectedGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`);
			}
		});
	}

	function listNetworks(currentScope, oneGroup) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;
		
		//save selected group in scope to be accessed by other functions
		currentScope.selectedGroup = oneGroup;

		//clean grid from previous list if any
		if (currentScope.grid && currentScope.grid.rows && currentScope.grid.filteredRows && currentScope.grid.original) {
			currentScope.grid.rows = [];
			currentScope.grid.filteredRows = [];
			currentScope.grid.original = [];
		}

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'group': oneGroup.name,
				'extras[]': ['networks']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraNetworks = [];
				if (response.networks && response.networks.length > 0) {
					currentScope.infraNetworks = response.networks;
				}
			}
		});

	}

	return {
		'addNetwork': addNetwork,
		'editNetwork': editNetwork,
		'deleteNetwork': deleteNetwork,
		'listNetworks': listNetworks
	};
}]);
