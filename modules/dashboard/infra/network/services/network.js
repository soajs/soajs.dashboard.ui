"use strict";
var infraNetworkSrv = soajsApp.components;
infraNetworkSrv.service('infraNetworkSrv', ['ngDataApi', '$localStorage', function (ngDataApi, $localStorage) {

	function addNetwork(currentScope) {}

	function editNetwork(currentScope, oneNetwork) {}

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
				currentScope.infraNetworks[0].open = true;
				
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
