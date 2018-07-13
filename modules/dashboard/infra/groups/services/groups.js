"use strict";
var infraGroupSrv = soajsApp.components;
infraGroupSrv.service('infraGroupSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', 'infraCommonSrv', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload, infraCommonSrv) {

	function addGroup(currentScope, oneInfra) {}

	function editGroup(currentScope, oneInfra, oneGroup) {}

	function deleteGroup(currentScope, oneGroup) {

		let deleteGroupOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'group',
				'name': oneGroup.name
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteGroupOpts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The resource group "${oneGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`)

				//trigger listGroups to fetch changes
				// NOTE: this is useless since deleting will take a long time and the UI won't show any changes immediately
				listGroups(currentScope, currentScope.$parent.$parent.currentSelectedInfra, currentScope.selectedRegion);
			}
		});
	}

	function listGroups(currentScope, oneInfra, oneRegion) {

		//save selected region in scope
		// NOTE: we are using this value to trigger listGroups from deleteGroup
		//no need to save this value in the scope if we decide to NOT listGroups from deleteGroup
		currentScope.selectedRegion = oneRegion

		let getInfraOpts = {
			'id': oneInfra._id,
			'exclude': ['templates', 'regions']
		};

		infraCommonSrv.getInfra(currentScope, getInfraOpts, (error, response) => {
				if (error) {
					currentScope.displayAlert('danger', error);
				}
				else {
					currentScope.infraResourceGroups = [];

					if (response.groups && response.groups.length > 0) {
						//loop over groups and push to the array the ones with matching region
						response.groups.forEach((oneGroup) => {
							if (oneGroup.region === oneRegion.v) {
								currentScope.infraResourceGroups.push(oneGroup);
							}
						});

						let gridOptions = {
							grid: infraGroupConfig.grid,
							data: currentScope.infraResourceGroups,
							left: [],
							top: []
						};

						if (currentScope.access.editGroup) {
							gridOptions.left.push({
								'label': 'Edit Resource Group',
								'icon': 'pencil',
								'handler': 'editGroup'
							});
						}

						if (currentScope.access.removeGroup) {
							gridOptions.left.push({
								'label': 'Delete Resource Group',
								'icon': 'bin',
								'handler': 'deleteGroup',
								'msg': "Are you sure you want to delete this resource group?"
							});
							gridOptions.top.push({
								'label': 'Delete Group(s)',
								'icon': 'bin',
								'handler': 'deleteGroup',
								'msg': "Are you sure you want to delete the selected resource group(s)?"
							});
						}

						buildGrid(currentScope, gridOptions);
					}
					else {
						currentScope.displayAlert('danger', `The region "${oneRegion.l}" does not have any resource groups to be list`);
					}
				}
		});
	}

	return {
		'addGroup': addGroup,
		'editGroup': editGroup,
		'deleteGroup': deleteGroup,
		'listGroups': listGroups
	};
}]);
