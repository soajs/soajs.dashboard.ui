"use strict";
var awsInfraIPSrv = soajsApp.components;
awsInfraIPSrv.service('awsInfraIPSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', function (ngDataApi, $localStorage, $timeout, $modal) {

	let infraIPConfig = {
		form: {
			addIP: [
				{
					'name': 'heading',
					'type': 'html',
					'value': "<label>Use this form to request a new IP Address. This address can be later attached to an instance when creating/updating a VM layer.</label>"
				}
			]
		},

		grid: {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{ 'label': 'Address', 'field': 'address' },
				{ 'label': 'Type', 'field': 'type' },
				{ 'label': 'Private Address', 'field': 'privateAddress' },
				{ 'label': 'Instance', 'field': 'instanceName' },
				{ 'label': 'VM Layer', 'field': 'vmLayerName' }
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
									listIPs(currentScope, currentScope.selectedRegion);
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
					listIPs(currentScope, currentScope.selectedRegion);
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
					response.publicIps.forEach((oneIp) => {
						if(!oneIp.privateAddress) {
							oneIp.privateAddress = 'N/A';
						}

						oneIp.instanceName = 'Not yet associated';
						oneIp.vmLayerName = 'Not yet associated';
						if(currentScope.vmlayers && Array.isArray(currentScope.vmlayers) && currentScope.vmlayers.length > 0) {
							currentScope.vmlayers.forEach((oneInstance) => {
								if(oneInstance.ip && Array.isArray(oneInstance.ip) && oneInstance.ip.length > 0) {
									oneInstance.ip.forEach((oneEntry) => {
										if(oneEntry.address === oneIp.address && oneIp.region === oneInstance.region) {
											oneIp.instanceName = oneInstance.name;
											
											
											let found = false;
											$localStorage.environments.forEach((oneEnv) => {
												if(oneEnv.code.toUpperCase() === oneInstance.labels['soajs.env.code'].toUpperCase()){
													found = true;
												}
											});
											
											if(found){
												oneIp.vmLayerName = `<span title="Virtual Machine"><a href="#/environments-platforms?envCode=${oneInstance.labels['soajs.env.code']}&tab=vm&layer=${oneInstance.layer}"><span class="icon icon-stack"></span>&nbsp;<b>${oneInstance.layer}</b></a></span>`;
											}
											else{
												oneIp.vmLayerName += `<span title="Virtual Machine"><span class="icon icon-stack"></span>&nbsp;<b>${oneVmLayer.layer}</b></span>`;
											}
										}
									});
								}
							});
						}

						currentScope.infraPublicIps.push(oneIp);
					});

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
		'deleteIP': deleteIP,
		'listIPs': listIPs
	};
}]);
