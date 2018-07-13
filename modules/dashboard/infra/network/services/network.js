"use strict";
var infraNetworkSrv = soajsApp.components;
infraNetworkSrv.service('infraNetworkSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', 'infraCommonSrv', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload, infraCommonSrv) {

	function addNetwork(currentScope, oneInfra) {}

	function editNetwork(currentScope, oneInfra, oneNetwork) {}

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
				currentScope.displayAlert('success', `The resource group "${oneGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`)

				//trigger listNetworks to fetch changes
				// NOTE: this is useless since deleting will take a long time and the UI won't show any changes immediately
				listNetworks(currentScope, currentScope.$parent.$parent.currentSelectedInfra, currentScope.selectedGroup);
			}
		});
	}

	function listNetworks(currentScope, oneInfra, oneGroup) {
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
				'extras[]': ['networks'],

			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				if (response.networks && response.networks.length > 0) {
					currentScope.infraNetworks = response.networks;

					let gridOptions = {
						grid: infraNetworkConfig.grid,
						data: currentScope.infraNetworks,
						left: [],
						top: []
					};

					if (currentScope.access.editNetwork) {
						gridOptions.left.push({
							'label': 'Edit Network',
							'icon': 'pencil',
							'handler': 'editNetwork'
						});
					}

					if (currentScope.access.removeNetwork) {
						gridOptions.left.push({
							'label': 'Delete Network',
							'icon': 'bin',
							'handler': 'deleteNetwork',
							'msg': "Are you sure you want to delete this network?"
						});
						gridOptions.top.push({
							'label': 'Delete Network(s)',
							'icon': 'bin',
							'handler': 'deleteNetwork',
							'msg': "Are you sure you want to delete the selected network(s)?"
						});
					}

					buildGrid(currentScope, gridOptions);
				}
				else {
					currentScope.displayAlert('danger', `The group "${oneGroup.name}" does not have any networks to be listed`);
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
