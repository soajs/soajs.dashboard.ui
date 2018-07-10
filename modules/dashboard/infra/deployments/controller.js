"use strict";
var infraDepApp = soajsApp.components;
infraDepApp.controller('infraDepCtrl', ['$scope', '$localStorage', '$cookies', 'injectFiles', 'ngDataApi', 'infraCommonSrv', function ($scope, $localStorage, $cookies, injectFiles, ngDataApi, infraCommonSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraDepConfig.permissions);
	
	infraCommonSrv.getInfraFromCookie($scope);
	
	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["groups", "regions", "templates"]);
	};
	
	$scope.$parent.$parent.activateProvider = function () {
		infraCommonSrv.activateProvider($scope);
	};
	
	$scope.getProviders = function () {
		if($localStorage.infraProviders){
			$scope.$parent.$parent.infraProviders = angular.copy($localStorage.infraProviders);
			if(!$scope.$parent.$parent.currentSelectedInfra){
				$scope.go("/infra");
			}
			else{
				delete $scope.$parent.$parent.currentSelectedInfra.deployments;
				$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
			}
		}
		else{
			//list infras to build sidebar
			infraCommonSrv.getInfra($scope, {
				id: null,
				exclude: ["groups", "regions", "templates"]
			}, (error, infras) => {
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
					else{
						delete $scope.$parent.$parent.currentSelectedInfra.deployments;
						$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
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
				for(let i = oneInfra.deployments.length -1; i >=0; i--){
					if(oneInfra.deployments[i].id === oneDeployment.id){
						oneInfra.deployments.splice(i, 1);
					}
				}
				$scope.displayAlert("success", "Deployment deleted successfully.");
				$scope.getProviders(true);
			}
		});
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
