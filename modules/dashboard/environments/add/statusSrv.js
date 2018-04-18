"use strict";
var statusServices = soajsApp.components;
statusServices.service('statusSrv', ['statusAPISrv', function (statusAPISrv) {
	
	function go(currentScope){
		statusAPISrv.go(currentScope);
	}
	
	return {
		"go": go
	}
	
}]);