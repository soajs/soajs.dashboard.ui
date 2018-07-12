"use strict";
var infraGroupApp = soajsApp.components;
infraGroupApp.controller('infraGroupCtrl', ['$scope', '$localStorage', '$window', '$modal', '$timeout', '$cookies', 'injectFiles', 'ngDataApi', 'infraCommonSrv', 'infraGroupSrv', function ($scope, $localStorage, $window, $modal, $timeout, $cookies, injectFiles, ngDataApi, infraCommonSrv, infraGroupSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraGroupConfig.permissions);
	
	infraCommonSrv.getInfraFromCookie($scope);
	
	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["groups", "regions", "templates"], () => {
			// infraIACSrv.rerenderTemplates($scope);
		});
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
						$scope.go("/infra");
					}
					else{
						delete $scope.$parent.$parent.currentSelectedInfra.templates;
						$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
					}
				}
			});
		}
	};

	$scope.addGroup = function (oneInfra) {
		infraGroupSrv.addGroup($scope, oneInfra);
	};

	$scope.editGroup = function (oneGroup, oneInfra) {
		infraGroupSrv.editGroup($scope, oneInfra, oneGroup);
	};

	$scope.deleteGroup = function (oneGroup) {
		infraGroupSrv.deleteGroup($scope, oneGroup);
	};

	$scope.listGroups = function (oneRegion, oneInfra) {
		infraGroupSrv.listGroups($scope, oneInfra, oneRegion);
	};

	if ($scope.access.list) {
		$scope.getProviders();

		let getInfraOpts = {
			'id': $scope.$parent.$parent.currentSelectedInfra._id,
			'exclude': ['templates', 'groups']
		};
		//get infra with groups to populate dropdown menu
		infraCommonSrv.getInfra($scope, getInfraOpts, (error, response) => {
			if (error) {
				$scope.displayAlert('danger', error);
			}
			else {
				if (response.regions && response.regions.length > 0) {
					$scope.infraRegions = response.regions;
				}
				// QUESTION: do we need an else state in case no regions? there will never be a case with no regions
			}
		});
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
