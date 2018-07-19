"use strict";
var infraNetworkSrv = soajsApp.components;
infraNetworkSrv.service('infraNetworkSrv', ['ngDataApi', '$localStorage', function (ngDataApi, $localStorage) {

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


						let myPattern = /^([0-90-90-9]{1,3}\.){3}[0-90-90-9]{1,3}$/;
						if(!myPattern.test(formData.address)){
							$window.alert("Make sure the address you entered follows the correct CIDR format.");
						}

						// // TODO: pass the below items through a regex validation
						// postOpts.data.params.address = splitAndTrim(data.address);
						// postOpts.data.params.dnsServers = splitAndTrim(data.dnsServers);
						//
						// overlayLoading.show();
						// getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error) {
						// 	overlayLoading.hide();
						// 	if (error) {
						// 		currentScope.form.displayAlert('danger', error.message);
						// 	}
						// 	else {
						// 		currentScope.displayAlert('success', "Netowkr created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
						// 		currentScope.modalInstance.close();
						// 		$timeout(() => {
						// 			listNetworks(currentScope, currentScope.selectedGroup);
						// 		}, 2000);
						// 	}
						// });
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

	function editNetwork(currentScope, oneNetwork) {

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

						// TODO: pass the below items through a regex validation
						postOpts.data.params.address = splitAndTrim(data.address);
						postOpts.data.params.dnsServers = splitAndTrim(data.dnsServers);

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

			currentScope.form.formData.address = oneNetwork.address.join().replace(",", ", ");

			currentScope.form.formData.dnsServers = oneNetwork.dnsServers.join().replace(",", ", ");


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
				currentScope.displayAlert('success', `The resource group "${currentScope.selectedGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`);
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
