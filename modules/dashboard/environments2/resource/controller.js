"use strict";
let resourceCtrl = soajsApp.components;
resourceCtrl.controller('resourceCtrl', ['$scope', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $cookies, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.edit = function (item) {
	
	};
	$scope.add = function (item) {
	
	};
	
	$scope.plug = function (item, plugged) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/console/registry/resource",
			"data": {
				"id": item._id,
				"data": {
					"plugged": plugged
				}
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			}
			else {
				item.plugged = plugged;
				$scope.$parent.displayAlert('success', "Resource has been " + (plugged ? "plugged." : "un-plugged."));
			}
		});
	};
	
	$scope.delete = function (item) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/console/registry/resource",
			"data": {
				"id": item._id
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Resource has been deleted.");
			}
		});
	};
	
	$scope.get = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/registry/resource",
			"params": {
				"env": $scope.envCode
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			}
			else {
				$scope.listItems = response || null;
			}
		});
	};
	
	if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
		$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
		if ($scope.envCode) {
			$scope.get();
		}
	}
	
	injectFiles.injectCss("modules/dashboard/environments2/environments.css");
}]);
