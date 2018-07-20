"use strict";
var infraGroupSrv = soajsApp.components;
infraGroupSrv.service('infraGroupSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', 'infraCommonSrv', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload, infraCommonSrv) {

	function addGroup(currentScope) {
		// currentScope.labelCounter = 0;

		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraGroupConfig.form.addGroup)
			},
			name: 'addResourceGroup',
			label: 'Add New Resource Group',
			actions: [
				{
					'type': 'submit',
					'label': "Create Resource Group",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						// let labels = {};
						// for (let i = 0; i < currentScope.labelCounter; i ++) {
						// 	labels[data['labelName'+i]] = data['labelValue'+i];
						// }

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
									"labels": {},
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
								currentScope.displayAlert('success', "Resource Group created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listGroups(currentScope, currentScope.selectedRegion);
								}, 2000);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete currentScope.form.formData;
						currentScope.modalInstance.close();
					}
				}
			]
		};

		// options.form.entries[2].entries[0].onAction = function (id, value, form) {
		// 	addNewLabel(currentScope);
		// };

		//set value of region to selectedRegion
		options.form.entries[1].value = currentScope.selectedRegion.l;

		buildFormWithModal(currentScope, $modal, options);
	}

	// function addNewLabel(currentScope) {
	// 	let labelCounter = currentScope.labelCounter;
	// 	let tmp = angular.copy(infraGroupConfig.form.labelInput);
	// 	tmp.name += labelCounter;
	// 	tmp.entries[0].name += labelCounter;
	// 	tmp.entries[1].name += labelCounter;
	// 	tmp.entries[2].name += labelCounter;
	//
	// 	tmp.entries[2].onAction = function (id, value, form) {
	// 		let count = parseInt(id.replace('rLabel', ''));
	//
	// 		for (let i = form.entries[2].entries.length - 1; i >= 0; i--) {
	// 			if (form.entries[2].entries[i].name === 'labelGroup' + count) {
	// 				//remove from formData
	// 				for (var fieldname in form.formData) {
	// 					if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
	// 						delete form.formData[fieldname];
	// 					}
	// 				}
	// 				//remove from formEntries
	// 				form.entries[2].entries.splice(i, 1);
	// 				break;
	// 			}
	// 		}
	// 	};
	//
	// 	if (currentScope.form && currentScope.form.entries) {
	// 		currentScope.form.entries[2].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
	// 	}
	// 	else {
	// 		// formConfig[5].tabs[7].entries.splice(currentScope.form.entries[2].entries.length - 1, 0, tmp);
	// 	}
	// 	currentScope.labelCounter ++;
	// }

	function editGroup(currentScope, oneGroup) {
		// currentScope.labelCounter = (oneGroup.labels && typeof oneGroup.labels === 'object') ? Object.keys(oneGroup.labels).length : 0;

		oneGroup.region = currentScope.selectedRegion.l;

		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraGroupConfig.form.editGroup)
			},
			data: oneGroup,
			name: 'editResourceGroup',
			label: 'Edit Resource Group',
			actions: [
				{
					'type': 'submit',
					'label': "Update Resource Group",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						let labels = {};
						for (let i = 0; i < currentScope.labelCounter; i ++) {
							labels[data['labelName'+i]] = data['labelValue'+i];
						}

						let postOpts = {
							"method": "put",
							"routeName": "/dashboard/infra/extras",
							"params": {
								"infraId": currentScope.currentSelectedInfra._id,
								"technology": "vm"
							},
							"data": {
								"params": {
									"section": "group",
									"region": currentScope.selectedRegion.v,
									"labels": {},
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
								currentScope.displayAlert('success', "Resource Group Updated successfully. Changes take a bit of time to be populated and might require you to refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listGroups(currentScope, currentScope.selectedRegion);
								}, 2000);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete currentScope.form.formData;
						currentScope.modalInstance.close();
					}
				}
			]
		};

		// //assertion to avoid splicing label entries more than once
		// if (options.form.entries[2].entries.length !== currentScope.labelCounter + 1) {
		// 	//set labels
		// 	for (let i = 0; i < currentScope.labelCounter; i++) {
		// 		// change the labels to formData style
		// 		oneGroup['labelName'+i] = Object.keys(oneGroup.labels)[i];
		// 		oneGroup['labelValue'+i] = oneGroup.labels[Object.keys(oneGroup.labels)[i]];
		//
		// 		//add labels to the form based on label counters
		// 		let tmp = angular.copy(infraGroupConfig.form.labelInput);
		// 		tmp.name += i;
		// 		tmp.entries[0].name += i;
		// 		tmp.entries[1].name += i;
		// 		tmp.entries[2].name += i;
		//
		// 		tmp.entries[2].onAction = function (id, value, form) {
		// 			let count = parseInt(id.replace('rLabel', ''));
		//
		// 			for (let i = form.entries[2].entries.length - 1; i >= 0; i--) {
		// 				if (form.entries[2].entries[i].name === 'labelGroup' + count) {
		// 					//remove from formData
		// 					for (var fieldname in form.formData) {
		// 						if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
		// 							delete form.formData[fieldname];
		// 						}
		// 					}
		// 					//remove from formEntries
		// 					form.entries[2].entries.splice(i, 1);
		// 					break;
		// 				}
		// 			}
		// 		};
		// 		options.form.entries[2].entries.splice(options.form.entries[2].entries.length - 1, 0, tmp);
		// 	}
		// }
		//
		// options.form.entries[2].entries[currentScope.labelCounter].onAction = function (id, value, form) {
		// 	addNewLabel(currentScope);
		// };

		buildFormWithModal(currentScope, $modal, options, () => {
			currentScope.form.formData = oneGroup;
		});
	}

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
				currentScope.displayAlert('success', `The resource group "${oneGroup.name}" has been successfully deleted. Changes take a bit of time to be populated and might require you to refresh in the list after a few seconds.`);
				$timeout(() => {
					listGroups(currentScope, currentScope.selectedRegion);
				}, 2000);
			}
		});
	}

	function listGroups(currentScope, oneRegion) {

		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected region in scope
		// NOTE: we are using this value to trigger listGroups from deleteGroup
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

						currentScope.infraResourceGroups.forEach((oneGroup) => {
							oneGroup.networks = "<a href='#/infra-networks?group=" + oneGroup.name + "'>Networks</a>";
							oneGroup.firewalls = "<a href='#/infra-firewall?group=" + oneGroup.name + "'>Firewalls</a>";
							oneGroup.ips = "<a href='#/infra-ip?group=" + oneGroup.name + "'>Public IPs</a>";
							oneGroup.lbs = "<a href='#/infra-lb?group=" + oneGroup.name + "'>Load Balancers</a>";
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
								'msg': "Deleting a resource group will remove all components attached to it. Are you sure you want to delete this resource group?"
							});
							gridOptions.top.push({
								'label': 'Delete Group(s)',
								'icon': 'bin',
								'handler': 'deleteGroup',
								'msg': "Deleting a resource group will remove all components attached to it. Are you sure you want to delete the selected resource group(s)?"
							});
						}

						buildGrid(currentScope, gridOptions);
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
