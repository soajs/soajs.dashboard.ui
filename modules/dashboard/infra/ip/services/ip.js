"use strict";
var infraIPSrv = soajsApp.components;
infraIPSrv.service('infraIPSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function addIP(currentScope) {}

	function editIP(currentScope, oneIP) {}

	function deleteIP(currentScope, oneIP) {

		let deleteIPopts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'publicIp',
				'group': currentScope.selectedGroup.name,
				'name': oneIP.name
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteIPopts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The resource group "${currentScope.selectedGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`)
			}
		});
	}

	function listIPs(currentScope, oneGroup) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;
		
		//save selected group in scope to be accessed by other functions
		currentScope.selectedGroup = oneGroup;

		// clean grid from previous list if any
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
				'extras[]': ['publicIps']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraPublicIps = [];
				if (response.publicIps && response.publicIps.length > 0) {
					currentScope.infraPublicIps = response.publicIps;
					
					currentScope.infraPublicIps.forEach((onePublicIP) =>{
						if(onePublicIP.associated){
							onePublicIP.associated = onePublicIP.associated.type + " / " + onePublicIP.associated.name;
						}
					});
					
					
					let gridOptions = {
						grid: infraIPConfig.grid,
						data: currentScope.infraPublicIps,
						left: [],
						top: []
					};
					
					if (currentScope.access.editIP) {
						gridOptions.left.push({
							'label': 'Edit Public IP',
							'icon': 'pencil',
							'handler': 'editIP'
						});
					}
					
					if (currentScope.access.removeIP) {
						gridOptions.left.push({
							'label': 'Delete Public IP',
							'icon': 'bin',
							'handler': 'deleteIP',
							'msg': "Are you sure you want to delete this public IP?"
						});
						gridOptions.top.push({
							'label': 'Delete Public IP(s)',
							'icon': 'bin',
							'handler': 'deleteIP',
							'msg': "Are you sure you want to delete the selected public IP(s)?"
						});
					}
					
					buildGrid(currentScope, gridOptions);
				}
			}
		});
	}

	return {
		'addIP': addIP,
		'editIP': editIP,
		'deleteIP': deleteIP,
		'listIPs': listIPs
	};
}]);
