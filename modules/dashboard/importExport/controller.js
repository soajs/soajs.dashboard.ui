'use strict';
var importApp = soajsApp.components;
var interfaceDomain = location.host;
interfaceDomain = mydomain.split(":")[0];

importApp.controller('importAppCtrl', ['$scope', '$timeout', 'injectFiles', 'importSrv', 'detectBrowser', '$modal', '$window', 'ngDataApi', '$cookies', '$location', function ($scope, $timeout, injectFiles, importSrv, detectBrowser, $modal, $window, ngDataApi, $cookies, $location) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.showSOAJSStoreLink = $scope.$parent.$parent.showSOAJSStoreLink;
	
	$scope.storeLink = importAppConfig.storeLink;

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, importAppConfig.permissions);

	$scope.alerts = null;

	let myBrowser = detectBrowser();
	$scope.isSafari = myBrowser === 'safari';

	$scope.step = 1;

	$scope.switchForms = function () {
		$scope.alerts = null;
        $scope.method = angular.copy($cookies.get("method"));
        if($scope.method === 'import') {
            $scope.importTab = true;
            $scope.exportTab = false;
            $cookies.remove('method', { 'domain': interfaceDomain });
            $scope.importForm();
        } else if ($scope.method === 'export'){
            $scope.importTab = false;
            $scope.exportTab = true;
            $cookies.remove('method', { 'domain': interfaceDomain });
            $scope.exportForm();
        } else {
            $scope.importForm();
		}
	};

	$scope.importForm = function(){
		$scope.step = 1;
		$scope.myTemplate = null;
		let options = {
			timeout: $timeout,
			entries: importAppConfig.form.import.step1,
			name: 'importTemplate',
			actions: [
				{
					type: 'submit',
					label: 'Submit',
					btn: 'primary',
					action: function (formData) {
						if(formData && Object.keys(formData).length > 0){
							importSrv.uploadTemplate($scope, formData.myTemplate_0, () => {
								if($scope.form && $scope.form.formData){
									$scope.form.formData = {};
								}
								$scope.$parent.displayAlert('success', "Your Template has been imported successfully.");
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
					}
				}
			]
		};
		buildForm($scope, null, options, () => {
		});
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

	$scope.goToExportSection = function(index){
		$scope.exportSectionCounter = index;
	};

	$scope.AllorNone = function(){
		$scope.exportSections[$scope.exportSectionCounter].all = !$scope.exportSections[$scope.exportSectionCounter].all
		angular.forEach($scope.exportSections[$scope.exportSectionCounter].data, function (item) {
			item.selected = $scope.exportSections[$scope.exportSectionCounter].all;
		});
	};

	$scope.generateTemplate = function(){
		importSrv.generateTemplate($scope);
	};

	$scope.storeRecordsOf = function(){
		importSrv.storeRecordsOf($scope);
	};

	$scope.exportForm = function(){
		$scope.step = 3;
		$scope.exportSectionCounter = 0;
		importSrv.exportTemplate($scope);
	};
	
	$scope.listTemplates = function(){
		$scope.alerts = null;
		$scope.step = 0;
		if($scope.form && $scope.form.formData){
			$scope.form.formData = {};
		}
		importSrv.listTemplates($scope);
	};

	injectFiles.injectCss("modules/dashboard/importExport/import.css");

    // Start here
    $scope.switchForms();
	
	$scope.$on("$destroy", function () {
		delete $scope.method;
		$cookies.remove('method', { 'domain': interfaceDomain });
	});
}]);