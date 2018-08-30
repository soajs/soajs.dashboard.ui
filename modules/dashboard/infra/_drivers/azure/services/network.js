"use strict";
var azureInfraNetworkSrv = soajsApp.components;
azureInfraNetworkSrv.service('azureInfraNetworkSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', '$window', function (ngDataApi, $localStorage, $timeout, $modal, $window) {

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
					'name': 'region',
					'label': 'Region',
					'type': 'readonly',
					'value': "",
					'fieldMsg': 'Region where the network will be located',
					'required': true
				},
				{
					'name': 'address',
					'label': 'Address',
					'type': 'text',
					'value': "",
					"placeholder": "10.0.0.0/16",
					'fieldMsg': 'Enter an address for the network',
					'required': false
				},
				{
					'name': 'dnsServers',
					'label': 'DNS Servers',
					'type': 'text',
					'value': "",
					'fieldMsg': 'Enter DNS servers for this network separated by commas. Example: 0.0.0.0, 1.1.1.1',
					'required': false
				},
				{
					'name': 'subnets',
					'label': 'Subnets',
					'type': 'jsoneditor',
					'value': [],
					'fieldMsg': 'Enter an array of subnets for this network. Exmaple: [{ "name": "mySubnet1", "address": "10.0.0.0/16" }, { "name": "mySubnet2", "address": "10.0.0.0/24" }]',
					'required': false
				}
			],

			labelInput : {
				'name': 'LabelGroup',
				'type': 'group',
				'label': 'New Label',
				'entries': [
					{
						'name': 'labelName',
						'label': 'Label Name',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter the name of the label',
						'fieldMsg': 'Enter the name of the label',
						'placeholder': "My label name"
					},
					{
						'name': 'labelValue',
						'label': 'Label Value',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter the value of the label',
						'fieldMsg': 'Enter the value of the label',
						'placeholder': "My label Value"
					},
					{
						'type': 'html',
						'name': 'rLabel',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			}
		},

		grid: {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{ 'label': 'Network Name', 'field': 'name' },
				{ 'label': 'Network Address Prefixes', 'field': 'addressPrefixes' },
				{ 'label': 'Network DNS Servers', 'field': 'dnsServers' },
				{ 'label': 'Network Subnets', 'field': 'subnets' }
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
									"region": currentScope.selectedGroup.region,
									"labels": {},
									"name": data.name,
									"group": currentScope.selectedGroup.name,
									"subnets": data.subnets
								}
							}
						};


						let addressPattern = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
						if (formData.address && formData.address.length > 0 && !addressPattern.test(formData.address)) {
							return $window.alert("Make sure the address you entered follows the correct CIDR format.");
						}

						if (data.address) {
							postOpts.data.params.address = splitAndTrim(data.address);
						}

						if (data.dnsServers) {
							let dnsPattern = /^([0-90-90-9]{1,3}\.){3}[0-90-90-9]{1,3}$/;
							postOpts.data.params.dnsServers = splitAndTrim(data.dnsServers);

							let valid = true;
							postOpts.data.params.dnsServers.forEach((oneDNS) => {
								if (!dnsPattern.test(oneDNS)) {
									valid = false;
								}
							});

							if (!valid) {
								return $window.alert("Make sure the DNS addresses you entered follow the correct CIDR format.");
							}
						}

						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
							overlayLoading.hide();
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.displayAlert('success', "Netowkr created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listNetworks(currentScope, currentScope.selectedGroup);
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

		//set value of region to selectedRegion
		options.form.entries[1].value = currentScope.selectedGroup.region;

		buildFormWithModal(currentScope, $modal, options);
	}

	function splitAndTrim(string) {
		let x = string.split(',');

		for (let i = 0; i < x.length; i++) {
			x[i] = x[i].trim();
		};

		return x;
	}

	function editNetwork(currentScope, originalNetwork) {
		let oneNetwork = angular.copy(originalNetwork);
		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraNetworkConfig.form.network)
			},
			data: oneNetwork,
			name: 'editNetwork',
			label: 'Edit Network',
			actions: [
				{
					'type': 'submit',
					'label': "Update Network",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						let postOpts = {
							"method": "put",
							"routeName": "/dashboard/infra/extras",
							"params": {
								"infraId": currentScope.currentSelectedInfra._id,
								"technology": "vm"
							},
							"data": {
								"params": {
									"section": "network",
									"region": currentScope.selectedGroup.region,
									"labels": {},
									"name": data.name,
									"group": currentScope.selectedGroup.name,
									"subnets": data.subnets
								}
							}
						};

						let addressPattern = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
						if (formData.address && formData.address.length > 0 && !addressPattern.test(formData.address)) {
							return $window.alert("Make sure the address you entered follows the correct CIDR format.");
						}

						if (data.address) {
							postOpts.data.params.address = splitAndTrim(data.address);
						}

						if (data.dnsServers && data.dnsServers.length > 0) {
							//join elements of array to string before provoking splitAndTrim
							data.dnsServers = data.dnsServers.join();

							let dnsPattern = /^([0-90-90-9]{1,3}\.){3}[0-90-90-9]{1,3}$/;
							postOpts.data.params.dnsServers = splitAndTrim(data.dnsServers);

							let valid = true;
							postOpts.data.params.dnsServers.forEach((oneDNS) => {
								if (!dnsPattern.test(oneDNS)) {
									valid = false;
								}
							});

							if (!valid) {
								return $window.alert("Make sure the DNS addresses you entered follow the correct CIDR format.");
							}
						}

						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
							overlayLoading.hide();
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.displayAlert('success', "Network Updated successfully. Changes take a bit of time to be populated and might require you to refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listNetworks(currentScope, currentScope.selectedGroup);
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

		buildFormWithModal(currentScope, $modal, options, () => {
			currentScope.form.formData = oneNetwork;
			currentScope.form.entries[0].type = 'readonly';

			currentScope.form.formData.address = oneNetwork.address.join(",");

			currentScope.form.entries[3].value = oneNetwork.dnsServers.join(",");

			oneNetwork.subnets.forEach((oneSub) => {
				currentScope.form.entries[4].value.push({
					"name": oneSub.name,
					"address": oneSub.address
				});
			});


		});
	}

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
				currentScope.displayAlert('success', `The network has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listNetworks(currentScope, currentScope.selectedGroup);
				}, 2000);
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
				if (currentScope.infraNetworks.length > 0) {
					currentScope.infraNetworks[0].open = true;
				}

				if (currentScope.vmlayers) {
					let processedFirewalls = [];
					currentScope.infraNetworks.forEach((oneNetwork) => {
						oneNetwork.subnets.forEach((oneSubnet) => {
							currentScope.vmlayers.forEach((oneVmLayer) => {
								if (oneVmLayer.network && oneVmLayer.network.toLowerCase() === oneNetwork.name.toLowerCase() && oneSubnet.name === oneVmLayer.layer) {

									if(oneVmLayer.labels&& oneVmLayer.labels['soajs.env.code']){
										let found = false;
										$localStorage.environments.forEach((oneEnv) => {
											if (oneEnv.code.toUpperCase() === oneVmLayer.labels['soajs.env.code'].toUpperCase()) {
												found = true;
											}
										});

										oneSubnet.vm = {
											vmLayer: oneVmLayer.layer,
											group: oneGroup.name,
											envCode: oneVmLayer.labels['soajs.env.code'],
											region: oneVmLayer.labels['soajs.service.vm.location'],
											link: found
										};
									}
									else{
										oneSubnet.vm = {
											vmLayer: oneVmLayer.layer,
											group: oneGroup.name,
											link: false
										};
									}

									if(!oneNetwork.firewall){
										oneNetwork.firewall = [];
									}

									if(processedFirewalls.indexOf(oneVmLayer.securityGroup) === -1){
										processedFirewalls.push(oneVmLayer.securityGroup);
										oneNetwork.firewall.push({
											group: oneGroup.name,
											name: oneVmLayer.securityGroup
										});
									}
								}
							});
						});
					});
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
