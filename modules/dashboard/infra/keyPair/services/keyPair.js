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
				break;
		}
	}

	function displayKeyPairVms(currentScope, oneKeyPair) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'aws':
				awsInfraKeyPairSrv.displayKeyPairVms(currentScope, oneKeyPair);
				break;
			default:
				break;
		}
	}

	return {
		'addKeyPair': addKeyPair,
		'deleteKeyPair': deleteKeyPair,
		'listKeyPairs': listKeyPairs,
		'displayKeyPairVms': displayKeyPairVms
	};
}]);
