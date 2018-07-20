"use strict";
var infraLoadBalancerSrv = soajsApp.components;
infraLoadBalancerSrv.service('infraLoadBalancerSrv', ['azureInfraLoadBalancerSrv', function (azureInfraLoadBalancerSrv) {
	
	function addLoadBalancer(currentScope) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraLoadBalancerSrv.addLoadBalancer(currentScope);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}
	
	function editLoadBalancer(currentScope, oneLoadBalancer) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraLoadBalancerSrv.editLoadBalancer(currentScope, oneLoadBalancer);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}
	
	function deleteLoadBalancer(currentScope, oneLoadBalancer) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraLoadBalancerSrv.deleteLoadBalancer(currentScope, oneLoadBalancer);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function listLoadBalancers(currentScope, oneGroup) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraLoadBalancerSrv.listLoadBalancers(currentScope, oneGroup);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}
	
	return {
		'addLoadBalancer': addLoadBalancer,
		'editLoadBalancer': editLoadBalancer,
		'deleteLoadBalancer': deleteLoadBalancer,
		'listLoadBalancers': listLoadBalancers
	};
}]);
