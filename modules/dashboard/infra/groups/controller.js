"use strict";
var infraGroupApp = soajsApp.components;
infraGroupApp.controller('infraGroupCtrl', ['$scope', '$routeParams', '$localStorage', '$timeout', 'injectFiles', 'infraCommonSrv', 'infraGroupSrv', function ($scope, $routeParams, $localStorage, $timeout, injectFiles, infraCommonSrv, infraGroupSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;



	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraGroupConfig.permissions);

	infraCommonSrv.getInfraFromCookie($scope);

	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["groups", "templates"], () => {
			$scope.currentInfraName = infraCommonSrv.getInfraDriverName($scope);
			// infraIACSrv.rerenderTemplates($scope);
			if ($scope.getFromParentScope('currentSelectedInfra').regions && $scope.getFromParentScope('currentSelectedInfra').regions.length > 0) {
				$scope.infraRegions = $scope.getFromParentScope('currentSelectedInfra').regions;

				$scope.selectedRegion = $scope.infraRegions[0];
				$timeout(() => {
					if ($scope.getFromParentScope('currentSelectedInfra') && $scope.getFromParentScope('currentSelectedInfra').name && $scope.getFromParentScope('currentSelectedInfra').name === 'azure') {
                        overlayLoading.show();
                        infraGroupSrv.listGroups($scope, $scope.selectedRegion);
					}
				}, 500);
			}
		});
	};

	$scope.$parent.$parent.activateProvider = function () {
		infraCommonSrv.activateProvider($scope);
	};

	$scope.getProviders = function () {
		if($localStorage.infraProviders){
			$scope.updateParentScope('infraProviders', angular.copy($localStorage.infraProviders));
			if(!$scope.getFromParentScope('currentSelectedInfra')){
				if($routeParams.infraId){
					$scope.getFromParentScope('infraProviders').forEach((oneProvider) => {
						if(oneProvider._id === $routeParams.infraId){
							$scope.updateParentScope('currentSelectedInfra', oneProvider);
							delete $scope.getFromParentScope('currentSelectedInfra').templates;
							$scope.$parent.$parent.switchInfra($scope.getFromParentScope('currentSelectedInfra'));
						}
					});
				}

				if(!$scope.getFromParentScope('currentSelectedInfra')){
					$scope.go("/infra");
				}
			}
			else{
				delete $scope.getFromParentScope('currentSelectedInfra').templates;
				$scope.$parent.$parent.switchInfra($scope.getFromParentScope('currentSelectedInfra'));
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
					$scope.updateParentScope('infraProviders', angular.copy($scope.infraProviders));
					if(!$scope.getFromParentScope('currentSelectedInfra')){
						if($routeParams.infraId){
							$scope.getFromParentScope('infraProviders').forEach((oneProvider) => {
								if(oneProvider._id === $routeParams.infraId){
									$scope.updateParentScope('currentSelectedInfra', oneProvider);
									delete $scope.getFromParentScope('currentSelectedInfra').templates;
									$scope.$parent.$parent.switchInfra($scope.getFromParentScope('currentSelectedInfra'));
								}
							});
						}

						if(!$scope.getFromParentScope('currentSelectedInfra')){
							$scope.go("/infra");
						}
					}
					else{
						delete $scope.getFromParentScope('currentSelectedInfra').templates;
						$scope.$parent.$parent.switchInfra($scope.getFromParentScope('currentSelectedInfra'));
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
