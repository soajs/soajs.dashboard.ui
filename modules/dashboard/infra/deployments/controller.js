"use strict";
var infraDepApp = soajsApp.components;
infraDepApp.controller('infraDepCtrl', ['$scope', '$localStorage', '$cookies', 'injectFiles', 'ngDataApi', 'infraDepSrv', function ($scope, $localStorage, $cookies, injectFiles, ngDataApi, infraDepSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraDepConfig.permissions);
	
	if($cookies.getObject('myInfra', { 'domain': interfaceDomain })){
		$scope.$parent.$parent.currentSelectedInfra = $cookies.getObject('myInfra', { 'domain': interfaceDomain });
	}
	
	$scope.$parent.$parent.switchInfra = function(oneInfra){
		$scope.$parent.$parent.currentSelectedInfra = oneInfra;
		overlayLoading.show();
		infraDepSrv.getInfra($scope, oneInfra._id, (error, myInfra) => {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.$parent.$parent.currentSelectedInfra = myInfra;
			}
		});
	};
	
	$scope.getProviders = function () {
		if($localStorage.infraProviders){
			$scope.$parent.$parent.infraProviders = angular.copy($localStorage.infraProviders);
			if(!$scope.$parent.$parent.currentSelectedInfra){
				$scope.go("/infra");
			}
		}
		else{
			overlayLoading.show();
			infraDepSrv.getInfra($scope, null, (error, infras) => {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert("danger", error);
				}
				else {
					$scope.infraProviders = infras;
					$localStorage.infraProviders = angular.copy($scope.infraProviders);
					$scope.$parent.$parent.infraProviders = angular.copy($scope.infraProviders);
					if(!$scope.$parent.$parent.currentSelectedInfra){
						$scope.go("/infra");
					}
				}
			});
		}
	};

	$scope.deleteDeployment = function (oneDeployment, oneInfra) {
		let options = {
			"method": "delete",
			"routeName": "/dashboard/infra/deployment",
			"params": {
				"id": oneInfra._id,
				"deploymentId": oneDeployment.id
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.displayAlert("success", "Deployment deleted successfully.");
				$scope.getProviders();
			}
		});
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
