'use strict';
var templatesApp = soajsApp.components;

templatesApp.controller('templatesAppCtrl', ['$scope', '$timeout', 'injectFiles', 'templateSrv', function ($scope, $timeout, injectFiles, templateSrv) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, templatesAppConfig.permissions);
	
	$scope.alerts = [];
	
	$scope.step = 0;
	$scope.importForm = function(){
		$scope.step = 1;
		$scope.myTemplate = null;
		let options = {
			timeout: $timeout,
			entries: templatesAppConfig.form.import.step1,
			name: 'importTemplate',
			actions: [
				{
					type: 'submit',
					label: 'Submit',
					btn: 'primary',
					action: function (formData) {
						if(formData && Object.keys(formData).length > 0){
							templateSrv.uploadTemplate($scope, formData.myTemplate_0, () => {
								if($scope.form && $scope.form.formData){
									$scope.form.formData = {};
								}
								$scope.$parent.displayAlert('success', "Your Template has been imported successfully.");
								$scope.listTemplates();
							});
						}
					}
				},
				{
					type: 'reset',
					label: 'Reset',
					btn: 'danger',
					action: function () {
						if($scope.form && $scope.form.formData){
							$scope.form.formData = {};
						}
						$scope.listTemplates();
					}
				}
			]
		};
		buildForm($scope, null, options, () => {});
	};
	
	$scope.previousStep = function(){
		$scope.exportSectionCounter--;
		if($scope.exportSectionCounter <0){
			$scope.exportSectionCounter = 0;
		}
	};
	
	$scope.nextStep = function(){
		$scope.exportSectionCounter++;
		if($scope.exportSectionCounter >= $scope.exportSections.length -1){
			$scope.exportSectionCounter = $scope.exportSections.length -1;
		}
	};
	
	$scope.selectAll = function () {
		angular.forEach($scope.exportSections[$scope.exportSectionCounter].data, function (item) {
			item.selected = true;
		});
	};
	
	$scope.selectNone = function () {
		angular.forEach($scope.exportSections[$scope.exportSectionCounter].data, function (item) {
			item.selected = false;
		});
	};
	
	$scope.generateTemplate = function(){
		templateSrv.generateTemplate($scope);
	};
	
	$scope.storeRecordsOf = function(){
		templateSrv.storeRecordsOf($scope);
	};
	
	$scope.exportForm = function(){
		$scope.step = 3;
		templateSrv.exportTemplate($scope);
	};
	
	$scope.listTemplates = function(){
		$scope.step = 0;
		if($scope.form && $scope.form.formData){
			$scope.form.formData = {};
		}
		templateSrv.listTemplates($scope);
	};
	
	$scope.deleteTmpl = function(oneTemplate){
		templateSrv.deleteTmpl($scope, oneTemplate);
	};
	
	$scope.upgradeTemplates = function(){
		templateSrv.upgradeTemplates($scope);
	};
	
	injectFiles.injectCss("modules/dashboard/templates/templates.css");
	
	// Start here
	if ($scope.access.list) {
		$scope.listTemplates();
	}
	
}]);