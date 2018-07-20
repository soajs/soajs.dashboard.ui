"use strict";
var infraGroupApp = soajsApp.components;
infraGroupApp.controller('infraGroupCtrl', ['$scope', '$routeParams', '$localStorage', '$timeout', 'injectFiles', 'infraCommonSrv', 'infraGroupSrv', function ($scope, $routeParams, $localStorage, $timeout, injectFiles, infraCommonSrv, infraGroupSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;
	
	
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraGroupConfig.permissions);
	
	infraCommonSrv.getInfraFromCookie($scope);
	
	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		$scope.currentInfraName = infraCommonSrv.getInfraDriverName($scope);
		infraCommonSrv.switchInfra($scope, oneInfra, ["groups", "templates"], () => {
			// infraIACSrv.rerenderTemplates($scope);
			if ($scope.$parent.$parent.currentSelectedInfra.regions && $scope.$parent.$parent.currentSelectedInfra.regions.length > 0) {
				$scope.infraRegions = $scope.$parent.$parent.currentSelectedInfra.regions;
				
				$scope.selectedRegion = $scope.infraRegions[0];
				$timeout(() => {
					overlayLoading.show();
					infraGroupSrv.listGroups($scope, $scope.selectedRegion);
				}, 500);
			}
		});
	};
	
	$scope.$parent.$parent.activateProvider = function () {
		infraCommonSrv.activateProvider($scope);
	};
	
	$scope.getProviders = function () {
		if($localStorage.infraProviders){
			$scope.$parent.$parent.infraProviders = angular.copy($localStorage.infraProviders);
			if(!$scope.$parent.$parent.currentSelectedInfra){
				if($routeParams.infraId){
					$scope.$parent.$parent.infraProviders.forEach((oneProvider) => {
						if(oneProvider._id === $routeParams.infraId){
							$scope.$parent.$parent.currentSelectedInfra = oneProvider;
							delete $scope.$parent.$parent.currentSelectedInfra.templates;
							$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
						}
					});
				}
				
				if(!$scope.$parent.$parent.currentSelectedInfra){
					$scope.go("/infra");
				}
			}
			else{
				delete $scope.$parent.$parent.currentSelectedInfra.templates;
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
						if($routeParams.infraId){
							$scope.$parent.$parent.infraProviders.forEach((oneProvider) => {
								if(oneProvider._id === $routeParams.infraId){
									$scope.$parent.$parent.currentSelectedInfra = oneProvider;
									delete $scope.$parent.$parent.currentSelectedInfra.templates;
									$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
								}
							});
						}
						
						if(!$scope.$parent.$parent.currentSelectedInfra){
							$scope.go("/infra");
						}
					}
					else{
						delete $scope.$parent.$parent.currentSelectedInfra.templates;
						$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
					}
				}
			});
		}
	};

	$scope.addGroup = function () {
		infraGroupSrv.addGroup($scope);
	};

	$scope.editGroup = function (oneGroup) {
		infraGroupSrv.editGroup($scope, oneGroup);
	};

	$scope.deleteGroup = function (oneGroup) {
		infraGroupSrv.deleteGroup($scope, oneGroup);
	};

	$scope.listGroups = function (oneRegion) {
		infraGroupSrv.listGroups($scope, oneRegion);
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
