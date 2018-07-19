"use strict";
var infraLoadBalancerSrv = soajsApp.components;
infraLoadBalancerSrv.service('infraLoadBalancerSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {
	
	function addLoadBalancer(currentScope) {
	}
	
	function editLoadBalancer(currentScope, oneLoadBalancer) {
	}
	
	function deleteLoadBalancer(currentScope, oneLoadBalancer) {
		
		let deleteFireWallOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'loadBalancer',
				'group': currentScope.selectedGroup.name,
				'name': oneLoadBalancer.name
			}
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteFireWallOpts, (error, response) => {
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
	
	function listLoadBalancers(currentScope, oneGroup) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;
		
		//save selected group in scope to be accessed by other functions
		currentScope.selectedGroup = oneGroup;
		
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
				'group': oneGroup.name,
				'extras[]': ['loadBalancers']
			}
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraLoadBalancers = [];
				if (response.loadBalancers && response.loadBalancers.length > 0) {
					currentScope.infraLoadBalancers = response.loadBalancers;
				}
				
				currentScope.infraLoadBalancers.push({
					"addressPools": [
						{
							"name": "tester-lb-address-pool"
						}
					],
					"ipAddresses": [
						{}
					],
					"ipConfigs": [
						{
							"name": "public-ip-config",
							"privateIPAllocationMethod": "Dynamic",
							"isPublic": true,
							"publicIpAddressId": "/subscriptions/d159e994-8b44-42f7-b100-78c4508c34a6/resourceGroups/tester/providers/Microsoft.Network/publicIPAddresses/tester-ip"
						}
					],
					"ports": [
						{
							"name": "port-1",
							"protocol": "Tcp",
							"target": 80,
							"published": 80,
							"idleTimeoutInMinutes": 30,
							"loadDistribution": "Default",
							"enableFloatingIP": false,
							"addressPoolName": "tester-lb-address-pool",
							"lbIpConfigName": "public-ip-config",
							"healthProbePort": 80,
							"healthProbeProtocol": "Http",
							"healthProbeRequestPath": "/",
							"maxFailureAttempts": 20,
							"healthProbeInterval": 10
						}
					],
					"natRules": [
						{
							"name": "nat-rule-1",
							"backendPort": 8081,
							"frontendPort": 30011,
							"protocol": "Tcp",
							"idleTimeoutInMinutes": 4,
							"enableFloatingIP": false,
							"frontendIPConfigName": "public-ip-config"
						}
					],
					"natPools": [],
					"name": "tester-lb",
					"id": "/subscriptions/d159e994-8b44-42f7-b100-78c4508c34a6/resourceGroups/tester/providers/Microsoft.Network/loadBalancers/tester-lb",
					"region": "eastus"
				});
				
				currentScope.infraLoadBalancers.push({
					"addressPools": [
						{
							"name": "tester-lb-address-pool"
						}
					],
					"ipAddresses": [
						{
							"address": "10.3.0.10",
							"type": "private"
						}
					],
					"ipConfigs": [
						{
							"name": "private-ip-config",
							"privateIPAllocationMethod": "Static",
							"isPublic": false,
							"privateIpAddress": "10.3.0.10",
							"subnetId": "/subscriptions/d159e994-8b44-42f7-b100-78c4508c34a6/resourceGroups/tester/providers/Microsoft.Network/virtualNetworks/tester-vn/subnets/tester-vn-subnet"
						}
					],
					"ports": [
						{
							"name": "port-1",
							"protocol": "Tcp",
							"target": 80,
							"published": 80,
							"idleTimeoutInMinutes": 30,
							"loadDistribution": "Default",
							"enableFloatingIP": false,
							"addressPoolName": "tester-lb-address-pool",
							"lbIpConfigName": "private-ip-config",
							"healthProbePort": 80,
							"healthProbeProtocol": "Http",
							"healthProbeRequestPath": "/",
							"maxFailureAttempts": 20,
							"healthProbeInterval": 10
						}
					],
					"natRules": [],
					"natPools": [
						{
							"name": "nat-pool-1",
							"backendPort": 8080,
							"protocol": "Tcp",
							"enableFloatingIP": false,
							"frontendPortRangeStart": 30000,
							"frontendPortRangeEnd": 30010,
							"idleTimeoutInMinutes": 4,
							"frontendIPConfigName": "private-ip-config"
						}
					],
					"name": "tester-lb-2",
					"id": "/subscriptions/d159e994-8b44-42f7-b100-78c4508c34a6/resourceGroups/tester/providers/Microsoft.Network/loadBalancers/tester-lb-2",
					"region": "eastus"
				});
				
				console.log(currentScope.infraLoadBalancers);
			}
		});
		
	}
	
	return {
		'addLoadBalancer': addLoadBalancer,
		'editLoadBalancer': editLoadBalancer,
		'deleteLoadBalancer': deleteLoadBalancer,
		'listLoadBalancers': listLoadBalancers
	};
}]);
