"use strict";
var awsInfraIPSrv = soajsApp.components;
awsInfraIPSrv.service('awsInfraIPSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', function (ngDataApi, $localStorage, $timeout, $modal) {

	let infraIPConfig = {
		form: {
			addIP: [
				{
					'name': 'heading',
					'type': 'html',
					'value': "<p align='left'><strong>This will allocate an Elastic IP address to your AWS account.</strong></br></br>After you allocate the Elastic IP address you can associate it with an instance or network interface.</br></br>You may later release this address. When you release an Elastic IP address, it is released to the IP address pool and can be allocated to a different AWS account.</br></br>To proceed, click on <strong>Allocate IP</strong> below.<p>"
				}
			]
		},

		grid: {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{ 'label': 'Address', 'field': 'address' },
				{ 'label': 'Allocation ID', 'field': 'id' },
				{ 'label': 'Type', 'field': 'type' },
				{ 'label': 'Instance ID', 'field': 'instanceId' },
				{ 'label': 'Private Address', 'field': 'privateAddress' }
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'name',
			'defaultLimit': 10
		},
	};

	function addIP(currentScope) {

		let options = {
			timeout: $timeout,
			form: {
				"entries": infraIPConfig.form.addIP
			},
			name: 'addPublicIP',
			label: 'Add New Public IP',
			actions: [
				{
					'type': 'submit',
					'label': "Allocate IP",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						let postOpts = {
							"method": "post",
							"routeName": "/dashboard/infra/extras",
							"params": {
								"infraId": currentScope.currentSelectedInfra._id,
								"technology": "vm"
							},
							"data": {
								"params": {
									"domain": "vpc",
									"section": "publicIp",
									"region": currentScope.selectedRegion
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
								currentScope.displayAlert('success', "Public IP created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listIPs(currentScope, currentScope.selectedGroup);
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

		buildFormWithModal(currentScope, $modal, options);
	}

	function editIP(currentScope, originalIP) { }

	function deleteIP(currentScope, oneIP) {

		let deleteIPopts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'publicIp',
				'region': currentScope.selectedRegion,
				'name': oneIP.id
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
				currentScope.displayAlert('success', `The IP has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listIPs(currentScope, currentScope.selectedGroup);
				}, 2000);
			}
		});
	}

	function listIPs(currentScope, oneRegion) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected group in scope to be accessed by other functions
		currentScope.selectedRegion = oneRegion;

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
				'region': oneRegion,
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

					let gridOptions = {
						grid: infraIPConfig.grid,
						data: currentScope.infraPublicIps,
						left: [],
						top: []
					};

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
