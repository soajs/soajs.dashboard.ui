"use strict";
var infraGroupSrv = soajsApp.components;
infraGroupSrv.service('infraGroupSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', 'infraCommonSrv', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload, infraCommonSrv) {

	function addGroup(currentScope) {
		currentScope.labelCounter = 0;

		let options = {
			timeout: $timeout,
			form: {
				"entries": infraGroupConfig.form.addGroup
			},
			name: 'addResourceGroup',
			label: 'Add New Resource Group',
			actions: [
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete currentScope.form.formData;
						currentScope.modalInstance.close();
					}
				},
				{
					'type': 'submit',
					'label': "Create Resource Group",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						let labels = {};
						for (let i = 0; i < currentScope.labelCounter; i ++) {
							labels[data['labelName'+i]] = data['labelValue'+i];
						}

						let postOpts = {
							"method": "post",
							"routeName": "/dashboard/infra/extras",
							"params": {
								"infraId": currentScope.currentSelectedInfra._id,
								"technology": "vm"
							},
							"data": {
								"params": {
									"section": "group",
									"region": currentScope.selectedRegion.v,
									"labels": labels,
									"name": data.name
								}
							}
						};

						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
							overlayLoading.hide();
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.form.displayAlert('success', "Resource Group created successfully.");
								currentScope.modalInstance.close();
								currentScope.go("#/infra-groups");
							}
						});
					}
				}
			]
		};

		options.form.entries[2].entries[0].onAction = function (id, value, form) {
			addNewLabel(currentScope);
		};

		//set value of region to selectedRegion
		options.form.entries[1].value = currentScope.selectedRegion.l;

		buildFormWithModal(currentScope, $modal, options);
	}

	function addNewLabel(currentScope) {
		let labelCounter = currentScope.labelCounter;
		let tmp = angular.copy(infraGroupConfig.form.labelInput);
		tmp.name += labelCounter;
		tmp.entries[0].name += labelCounter;
		tmp.entries[1].name += labelCounter;
		tmp.entries[2].name += labelCounter;

		tmp.entries[2].onAction = function (id, value, form) {
			let count = parseInt(id.replace('rLabel', ''));

			for (let i = form.entries[2].entries.length - 1; i >= 0; i--) {
				if (form.entries[2].entries[i].name === 'labelGroup' + count) {
					//remove from formData
					for (var fieldname in form.formData) {
						if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}
					//remove from formEntries
					form.entries[2].entries.splice(i, 1);
					break;
				}
			}
		};

		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[2].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
		}
		else {
			// formConfig[5].tabs[7].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
		}
		currentScope.labelCounter ++;
	}

	function editGroup(currentScope, oneGroup) {}

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
				currentScope.displayAlert('success', `The resource group "${oneGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`);
			}
		});
	}

	function listGroups(currentScope, oneRegion) {

		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;
		//save selected region in scope
		// NOTE: we are using this value to trigger listGroups from deleteGroup
		//no need to save this value in the scope if we decide to NOT listGroups from deleteGroup
		currentScope.selectedRegion = oneRegion;

		//clean grid from previous list if any
		if (currentScope.grid && currentScope.grid.rows && currentScope.grid.filteredRows && currentScope.grid.original) {
			currentScope.grid.rows = [];
			currentScope.grid.filteredRows = [];
			currentScope.grid.original = [];
		}

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
							if (oneRegion && oneGroup.region === oneRegion.v) {
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

					if (currentScope.infraResourceGroups.length === 0) {
						// BUG: doesn't show "No Records Found" in case of no groups in selected region
						currentScope.displayAlert('danger', `The region "${oneRegion.l}" does not have any resource groups to be listed`);
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
