"use strict";
var awsInfraNetworkSrv = soajsApp.components;
awsInfraNetworkSrv.service('awsInfraNetworkSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', '$window', function (ngDataApi, $localStorage, $timeout, $modal, $window) {

	let infraNetworkConfig = {
		form: {
			addNetwork: [
				{
					'name': 'name',
					'label': 'Name',
					'type': 'text',
					'value': "",
					'fieldMsg': 'Name of the new network',
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
					'label': 'Primary Address',
					'type': 'text',
					'value': "",
					"placeholder": "10.0.0.0/16",
					'fieldMsg': 'Enter a primary address for the network. You may later edit the network to add/remove addresses other than the primary address.',
					'required': false
				},
				{
					'name': 'amazonProvidedIpv6CidrBlock',
					'label': 'Request Amazon Provided IPv6 CIDR Block',
					'type': 'buttonSlider',
					'value': false,
					'fieldMsg': 'Turn this slider on to request an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block.',
					'required': false
				},
				{
					'name': 'instanceTenancy',
					'label': 'Instance Tenancy',
					'type': 'select',
					'value': [{"v": "default", "l": "Default"}, {"v": "dedicated", "l": "Dedicated"}],
					'fieldMsg': 'Selecting "Default" launches instances with shared tenancy by default. Selecting "Dedicated" launches instances as dedicated tenancy by default.',
					'required': false
				}
			],
			editNetwork: [
				{
					'name': 'name',
					'label': 'Name',
					'type': 'readonly',
					'value': "",
					'fieldMsg': 'Name of the new network',
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
					'name': 'primaryAddress',
					'label': 'Primary Address',
					'type': 'readonly',
					'value': "",
					'fieldMsg': "The Network's primary address.",
					'required': false
				},
				{
					'name': 'instanceTenancy',
					'label': 'Instance Tenancy',
					'type': 'readonly',
					'value': "",
					'fieldMsg': '',
					'required': false
				},
				{
					'name': 'networkAddresses',
					'label': 'Network Addresses',
					'type': 'group',
					'entries':[
						{
							'type': 'html',
							'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add New Address'/>",
							'name': 'addNewAddress'
						}

					]
				},
				{
					'name': 'networkSubnets',
					'label': 'Network Subnets',
					'type': 'group',
					'entries':[
						{
							'type': 'html',
							'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add New Subnet'/>",
							'name': 'addNewSubnet'
						}

					]
				}
			],
			addressInput: {
				'name': 'addressGroup',
				'type': 'group',
				'label': 'New Address',
				'entries': [
					{
						'name': 'addressIp',
						'label': 'Address IP',
						'type': 'text',
						'value': '',
						'required': true,
						'fieldMsg': 'Enter an address using CIDR notation.',
						'placeholder': "10.0.0.0/24"
					},
					{
						'type': 'html',
						'name': 'rAddress',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			},
			subnetInput: {
				'name': 'subnetGroup',
				'type': 'group',
				'label': 'New Subnet',
				'entries': [
					{
						'name': 'subnetAddress',
						'label': 'Address',
						'type': 'text',
						'value': '',
						'required': true,
						'fieldMsg': 'Enter an address using CIDR notation.',
						'placeholder': "10.0.1.0/24"
					},
					{
						'name': 'subnetAvailabilityZone',
						'label': 'Availability Zone',
						'type': 'select',
						'value': [],
						'required': false,
						'fieldMsg': 'Optional: If no zone is set, it will be auto assigned.'
					},
					{
						'type': 'html',
						'name': 'rSubnet',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			}

		}
	};


	function addNetwork(currentScope) {
		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraNetworkConfig.form.addNetwork)
			},
			name: 'awsAddNetwork',
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
									"region": currentScope.selectedRegion,
									"Ipv6Address": data.amazonProvidedIpv6CidrBlock,
									"InstanceTenancy": data.instanceTenancy
								}
							}
						};


						let addressPattern = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
						if (formData.address && formData.address.length > 0 && !addressPattern.test(formData.address)) {
							return $window.alert("Make sure the address you entered follows the correct CIDR format.");
						}

						if (data.address) {
							postOpts.data.params.address = data.address;
						}

						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
							overlayLoading.hide();
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.displayAlert('success', "Netowrk created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								currentScope.modalInstance.close();
								$timeout(() => {
									listNetworks(currentScope, currentScope.selectedRegion);
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
		options.form.entries[1].value = currentScope.selectedRegion;

		//select first entry by default
		options.form.entries[4].value[0].selected = true;

		buildFormWithModal(currentScope, $modal, options);
	}

	function editNetwork(currentScope, originalNetwork) {
		let oneNetwork = angular.copy(originalNetwork);

		// Make a copy of all addresses -> remove primary address from the array
		let allAddresses = angular.copy(oneNetwork.address);
		allAddresses.splice(oneNetwork.address.indexOf(oneNetwork.primaryAddress), 1);

		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraNetworkConfig.form.editNetwork)
			},
			data: oneNetwork,
			name: 'awsModifyNetwork',
			label: 'Edit Network',
			actions: [
				{
					'type': 'submit',
					'label': "Update Network",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);
						let ipAddresses = [];

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
									"region": currentScope.selectedRegion,
									"id": originalNetwork.id
								}
							}
						};

						//aggregated primary address and other addresses in one array
						let aggregatedAddresses = [];
						aggregatedAddresses.push({ address: oneNetwork.primaryAddress });

						for (let i=0; i<currentScope.addressCounter; i++) {
							if (data['addressIp'+i]) {
								aggregatedAddresses.push({ address: data['addressIp'+i] });
							}
						}

						//aggregate subnets in one array
						let aggregatedSubnets = [];
						for(let i = 0; i < currentScope.subnetCounter; i++) {
							let oneSubnet = {};

							if(data[`subnetAddress${i}`]) oneSubnet.address = data[`subnetAddress${i}`];
							if(data[`subnetAvailabilityZone${i}`]) oneSubnet.availabilityZone = data[`subnetAvailabilityZone${i}`];

							if(oneSubnet.address) aggregatedSubnets.push(oneSubnet);
						}

						postOpts.data.params.addresses = aggregatedAddresses;
						postOpts.data.params.subnets = aggregatedSubnets;

						// // TODO: regex the ips to make sure they are in the correct format
						// let addressPattern = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
						// if (formData.address && formData.address.length > 0 && !addressPattern.test(formData.address)) {
						// 	return $window.alert("Make sure the address you entered follows the correct CIDR format.");
						// }
						//
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
									listNetworks(currentScope, currentScope.selectedRegion);
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

		options.form.entries[4].entries[0].onAction = function(id, value, form){
			addNewAddress(form, currentScope);
		};

		options.form.entries[5].entries[0].onAction = function(id, value, form){
			addNewSubnet(currentScope);
		};

		buildFormWithModal(currentScope, $modal, options, () => {
			currentScope.form.formData = oneNetwork;

			if (oneNetwork.instanceTenancy && oneNetwork.instanceTenancy === 'default') {
				currentScope.form.entries[3].value = "Default";
			}
			else if (oneNetwork.instanceTenancy && oneNetwork.instanceTenancy === 'dedicated'){
				currentScope.form.entries[3].value = "Dedicated";
			}

			currentScope.addressCounter = 0;
			allAddresses.forEach((oneAddress, index) => {
				addNewAddress(currentScope.form, currentScope);
				currentScope.form.formData['addressIp' + index] = oneAddress;
			});

			currentScope.subnetCounter = 0;
			if(oneNetwork.subnets && Array.isArray(oneNetwork.subnets) && oneNetwork.subnets.length > 0) {
				oneNetwork.subnets.forEach((oneSubnet, index) => {
					addNewSubnet(currentScope, { disabled: true });
					currentScope.form.formData[`subnetAddress${index}`] = oneSubnet.address;
					currentScope.form.formData[`subnetAvailabilityZone${index}`] = oneSubnet.availabilityZone;
				});
			}
		});
	}

	function addNewAddress(form, currentScope) {
		let addressCounter = currentScope.addressCounter
		var tmp = angular.copy(infraNetworkConfig.form.addressInput);

		tmp.name += addressCounter;
		tmp.entries[0].name += addressCounter;
		tmp.entries[1].name += addressCounter;

		tmp.entries[1].onAction = function (id, value, form) {
			var count = parseInt(id.replace('rAddress', ''));

			for (let i = form.entries[4].entries.length -1; i >= 0; i--) {
				if (form.entries[4].entries[i].name === 'addressGroup' + count) {
					//remove from formData
					for (var fieldname in form.formData) {
						if (['addressIp' + count].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}
					//remove from formEntries
					form.entries[4].entries.splice(i, 1);
					break;
				}
			}
		};

		if (form && form.entries) {
			form.entries[4].entries.splice(form.entries[4].entries.length - 1, 0, tmp);
		}
		else {
			form.entries[4].entries.splice(form.entries[4].entries.length - 1, 0, tmp);
		}
		currentScope.addressCounter++;
	}

	function addNewSubnet(currentScope, options) {
		let subnetCounter = currentScope.subnetCounter
		var tmp = angular.copy(infraNetworkConfig.form.subnetInput);

		tmp.name += subnetCounter;
		tmp.label = `Subnet ${subnetCounter + 1}`;
		tmp.entries[0].name += subnetCounter;
		tmp.entries[1].name += subnetCounter;
		tmp.entries[2].name += subnetCounter;

		if(options && options.disabled) {
			tmp.entries[0].disabled = true;
			tmp.entries[1].disabled = true;
		}

		tmp.entries[2].onAction = function (id, value, form) {
			var count = parseInt(id.replace('rSubnet', ''));

			for (let i = form.entries[5].entries.length -1; i >= 0; i--) {
				if (form.entries[5].entries[i].name === 'subnetGroup' + count) {
					//remove from formData
					for (var fieldname in form.formData) {
						if ([`subnetAddress${count}`, `subnetAvailabilityZone${count}`].indexOf(fieldname) !== -1) {
							delete form.formData[fieldname];
						}
					}
					//remove from formEntries
					form.entries[5].entries.splice(i, 1);
					break;
				}
			}
		};

		//add availability zones values to entry
		if(currentScope.availabilityZones) {
			tmp.entries[1].value = currentScope.availabilityZones;
		}

		if (currentScope.form && currentScope.form.entries) {
			currentScope.form.entries[5].entries.splice(currentScope.form.entries[5].entries.length - 1, 0, tmp);
		}
		else {
			currentScope.form.entries[5].entries.splice(currentScope.form.entries[5].entries.length - 1, 0, tmp);
		}
		currentScope.subnetCounter++;
	}

	function deleteNetwork(currentScope, oneNetwork) {
		let deleteNetworkOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'network',
				'region': currentScope.selectedRegion,
				'name': oneNetwork.id
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
					listNetworks(currentScope, currentScope.selectedRegion);
				}, 2000);
			}
		});
	}

	function listNetworks(currentScope, oneRegion) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected group in scope to be accessed by other functions
		currentScope.selectedRegion = oneRegion;

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'region': oneRegion,
				'extras[]': ['networks', 'securityGroups', 'availabilityZones']
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

				if(response.availabilityZones) {
					// keep the availability zones in scope for further use
					currentScope.availabilityZones = response.availabilityZones.map((oneAz) => {
						return { v: oneAz.name, l: oneAz.name };
					});
				}

				if (currentScope.vmlayers) {
					let processedFirewalls = [];
					currentScope.infraNetworks.forEach((oneNetwork) => {
						oneNetwork.subnets.forEach((oneSubnet) => {
							currentScope.vmlayers.forEach((oneVmLayer) => {
								if (oneVmLayer.network && oneVmLayer.network.toLowerCase() === oneNetwork.name.toLowerCase() && oneSubnet.name === oneVmLayer.layer) {

									if (oneVmLayer.labels && oneVmLayer.labels['soajs.env.code']) {
										let found = false;
										$localStorage.environments.forEach((oneEnv) => {
											if (oneEnv.code.toUpperCase() === oneVmLayer.labels['soajs.env.code'].toUpperCase()) {
												found = true;
											}
										});

										oneSubnet.vm = {
											vmLayer: oneVmLayer.layer,
											envCode: oneVmLayer.labels['soajs.env.code'],
											region: oneVmLayer.labels['soajs.service.vm.location'],
											link: found
										};
									}
									else{
										oneSubnet.vm = {
											vmLayer: oneVmLayer.layer,
											link: false
										};
									}

									if(!oneNetwork.firewall){
										oneNetwork.firewall = [];
									}

									if(oneVmLayer.securityGroup && Array.isArray(oneVmLayer.securityGroup) && response.securityGroups) {
										oneVmLayer.securityGroup.forEach((oneSecurityGroupId) => {
											if(processedFirewalls.indexOf(oneSecurityGroupId) === -1){
												processedFirewalls.push(oneSecurityGroupId);

												let matchingSecurityGroup = response.securityGroups.find((oneEntry) => { return oneEntry.id === oneSecurityGroupId });
												if(matchingSecurityGroup) {
													oneNetwork.firewall.push({
														id: matchingSecurityGroup.id,
														name: matchingSecurityGroup.name,
														region: matchingSecurityGroup.region
													});
												}
											}
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
