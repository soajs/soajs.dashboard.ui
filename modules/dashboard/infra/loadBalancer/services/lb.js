"use strict";
var infraLoadBalancerSrv = soajsApp.components;
infraLoadBalancerSrv.service('infraLoadBalancerSrv', ['azureInfraLoadBalancerSrv', 'awsInfraLoadBalancerSrv', function (azureInfraLoadBalancerSrv, awsInfraLoadBalancerSrv) {

	function addLoadBalancer(currentScope) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraLoadBalancerSrv.addLoadBalancer(currentScope);
				break;
			case 'aws':
				awsInfraLoadBalancerSrv.addLoadBalancer(currentScope);
				break;
			default:
				break;
		}
	}

	function editLoadBalancer(currentScope, oneLoadBalancer) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraLoadBalancerSrv.editLoadBalancer(currentScope, oneLoadBalancer);
				break;
			case 'aws':
				awsInfraLoadBalancerSrv.editLoadBalancer(currentScope, oneLoadBalancer);
				break;
			default:
				break;
		}
	}

	function deleteLoadBalancer(currentScope, oneLoadBalancer) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraLoadBalancerSrv.deleteLoadBalancer(currentScope, oneLoadBalancer);
				break;
			case 'aws':
				awsInfraLoadBalancerSrv.deleteLoadBalancer(currentScope, oneLoadBalancer);
				break;
			default:
				break;
		}
	}

	function listLoadBalancers(currentScope, oneGroup) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraLoadBalancerSrv.listLoadBalancers(currentScope, oneGroup);
				break;
			case 'aws':
				awsInfraLoadBalancerSrv.listLoadBalancers(currentScope, oneGroup);
				break;
			default:
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
