"use strict";
var googleInfraNetworkSrv = soajsApp.components;
googleInfraNetworkSrv.service('googleInfraNetworkSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', '$window', function (ngDataApi, $localStorage, $timeout, $modal, $window) {

	let infraNetworkConfig = {
		form: {
			network: [
				{
					'name': 'name',
					'label': 'Name',
					'type': 'text',
					'value': "",
					'placeholder': 'Network Name',
					'fieldMsg': 'Enter a name for the network',
					'required': true
				},
				{
					'name': 'description',
					'label': 'Description',
					'type': 'text',
					'value': "",
					'fieldMsg': 'Enter a description for the network',
					'required': false
				},
				{
					'name': 'autoCreate',
					'label': 'Subnet creation mode',
					'type': 'readonly',
					'value': "Automatic",
					'fieldMsg': 'Created network is assigned with default CIDR and it automatically creates one subnetwork per region.',
					'required': false
				}
			]
		},
		grid: {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{ 'label': 'Network Name', 'field': 'name' },
				{ 'label': 'Network Address', 'field': 'address' },
				{ 'label': 'Region', 'field': 'region' },
				{ 'label': 'Network Gateway', 'field': 'gateway' }
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'name',
			'defaultLimit': 10
		},
	};

	function addNetwork(currentScope) {
		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraNetworkConfig.form.network)
			},
			name: 'addNetwork',
			label: 'Add New Network',
			actions: [
				{
					'type': 'submit',
					'label': "Create Network",
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
									"section": "network",
									"name": data.name,
									"description": data.description
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
								currentScope.displayAlert('success', "Network created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listNetworks(currentScope);
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

	function deleteNetwork(currentScope, oneNetwork) {
		let deleteNetworkOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.getFromParentScope('currentSelectedInfra')._id,
				'technology': 'vm',
				'section': 'network',
				'name' : oneNetwork.name,
                'id': oneNetwork.id
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
				currentScope.displayAlert('success', `The network has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listNetworks(currentScope);
				}, 2000);
			}
		});
	}

	function listNetworks(currentScope, oneRegion) {
        currentScope.infraRegions = [{ v : 'allregions', l: 'All Regions'}];
        currentScope.oneRegion = oneRegion;
		let oneInfra = currentScope.getFromParentScope('currentSelectedInfra');
        currentScope.infraRegions = currentScope.infraRegions.concat(oneInfra.regions);

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'api': oneInfra.api,
				'extras[]': ['networks']
			}
		};
		if (oneRegion && oneRegion !== 'allregions') {
            listOptions.params.region = oneRegion
		} else if (listOptions.params.region) {
			delete listOptions.params.region
		}
		
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
				if (currentScope.infraNetworks.length > 0) {
					currentScope.infraNetworks[0].open = true;
				}
			}
		});

	}
	return {
		'addNetwork': addNetwork,
		'deleteNetwork': deleteNetwork,
		'listNetworks': listNetworks
	};
}]);
