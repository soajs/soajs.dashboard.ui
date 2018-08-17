"use strict";

var infraKeyPairSrv = soajsApp.components;
infraKeyPairSrv.service('infraKeyPairSrv', ['awsInfraKeyPairSrv', function (awsInfraKeyPairSrv) {

	function addKeyPair(currentScope) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'aws':
				awsInfraKeyPairSrv.addKeyPair(currentScope);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function deleteKeyPair(currentScope, oneKeyPair) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'aws':
				awsInfraKeyPairSrv.deleteKeyPair(currentScope, oneKeyPair);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function listKeyPairs(currentScope, oneGroupOrRegion) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'aws':
				awsInfraKeyPairSrv.listKeyPairs(currentScope, oneGroupOrRegion);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	return {
		'addKeyPair': addKeyPair,
		'deleteKeyPair': deleteKeyPair,
		'listKeyPairs': listKeyPairs
	};
}]);
