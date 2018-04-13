"use strict";
var statusServices = soajsApp.components;
statusServices.service('statusSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	function go(currentScope){
		console.log("inta bel status ....");
		
		/**
		 * automatically make call to environment/add
		 *
		 * upon response
		 *
		 *  if error
		 *      display error with buttons style 2
		 *
		 *  else
		 *
		 *      call check status
		 *
		 *          if error
		 *              display error with buttons style 2
		 *
		 *          else
		 *
		 *              if done
		 *                  display error with buttons style 3
		 *
		 *              else
		 *                  wait 5 seconds then
		 *                  call check status again
		 *
		 */
	}
	
	return {
		"go": go
	}
	
}]);