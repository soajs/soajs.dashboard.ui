'use strict';
let analyticCatalogApp = soajsApp.components;

analyticCatalogApp.controller('dashboardAppCtrl', ['$scope',
	function ($scope) {
		$scope.$parent.hideMainMenu(false);
	}]);