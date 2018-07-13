"use strict";
var infraLoadBalancerSrv = soajsApp.components;
infraLoadBalancerSrv.service('infraLoadBalancerSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function addLoadBalancer(currentScope, oneInfra) {}

	function editLoadBalancer(currentScope, oneInfra, oneLoadBalancer) {}

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
				currentScope.displayAlert('success', `The resource group "${currentScope.selectedGroup.name}" has been successfully deleted. Your changes should become visible in a few minutes.`)

				//trigger listLoadBalancers to fetch changes
				// NOTE: this is useless since deleting will take a long time and the UI won't show any changes immediately
				listLoadBalancers(currentScope, currentScope.$parent.$parent.currentSelectedInfra, currentScope.selectedGroup);
			}
		});
	}

	function listLoadBalancers(currentScope, oneGroup, oneInfra) {

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
				if (response.loadBalancers && response.loadBalancers.length > 0) {
					currentScope.infraLoadBalancers = response.loadBalancers;

					let gridOptions = {
						grid: infraLoadBalancerConfig.grid,
						data: currentScope.infraLoadBalancers,
						left: [],
						top: []
					};

					if (currentScope.access.editLoadBalancer) {
						gridOptions.left.push({
							'label': 'Edit Load Balancer',
							'icon': 'pencil',
							'handler': 'editLoadBalancer'
						});
					}

					if (currentScope.access.removeLoadBalancer) {
						gridOptions.left.push({
							'label': 'Delete Load Balancer',
							'icon': 'bin',
							'handler': 'deleteLoadBalancer',
							'msg': "Are you sure you want to delete this load balancer?"
						});
						gridOptions.top.push({
							'label': 'Delete Load Balancer(s)',
							'icon': 'bin',
							'handler': 'deleteLoadBalancer',
							'msg': "Are you sure you want to delete the selected load balancer(s)?"
						});
					}

					buildGrid(currentScope, gridOptions);
				}
				else {
					currentScope.displayAlert('danger', `The group "${oneGroup.name}" does not have any load balancers to be listed.`);
				}
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
