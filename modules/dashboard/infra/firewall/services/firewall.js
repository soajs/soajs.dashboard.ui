"use strict";
var infraFirewallSrv = soajsApp.components;
infraFirewallSrv.service('infraFirewallSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function addFirewall(currentScope, oneInfra) {}

	function editFirewall(currentScope, oneInfra, oneFirewall) {}

	function deleteFirewall(currentScope, oneFirewall) {

		let deleteFireWallOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'securityGroup',
				'group': currentScope.selectedGroup.name,
				'name': oneFirewall.name
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteFireWallOpts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The resource group "${currentScope.selectedGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`)

				//trigger listFirewalls to fetch changes
				// NOTE: this is useless since deleting will take a long time and the UI won't show any changes immediately
				listFirewalls(currentScope, currentScope.$parent.$parent.currentSelectedInfra, currentScope.selectedGroup);
			}
		});
	}

	function listFirewalls(currentScope, oneGroup, oneInfra) {

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
				'extras[]': ['securityGroups']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				if (response.securityGroups && response.securityGroups.length > 0) {
					currentScope.infraSecurityGroups = response.securityGroups;

					let gridOptions = {
						grid: infraFirewallConfig.grid,
						data: currentScope.infraSecurityGroups,
						left: [],
						top: []
					};

					if (currentScope.access.editFirewall) {
						gridOptions.left.push({
							'label': 'Edit Firewall',
							'icon': 'pencil',
							'handler': 'editFirewall'
						});
					}

					if (currentScope.access.removeFirewall) {
						gridOptions.left.push({
							'label': 'Delete Firewall',
							'icon': 'bin',
							'handler': 'deleteFirewall',
							'msg': "Are you sure you want to delete this firewall?"
						});
						gridOptions.top.push({
							'label': 'Delete Firewall(s)',
							'icon': 'bin',
							'handler': 'deleteFirewall',
							'msg': "Are you sure you want to delete the selected firewall(s)?"
						});
					}

					buildGrid(currentScope, gridOptions);
				}
				else {
					currentScope.displayAlert('danger', `The group "${oneGroup.name}" does not have any firewalls to be listed.`);
				}
			}
		});
	}

	return {
		'addFirewall': addFirewall,
		'editFirewall': editFirewall,
		'deleteFirewall': deleteFirewall,
		'listFirewalls': listFirewalls
	};
}]);
