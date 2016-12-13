"use strict";
var myModule = soajsApp.components;
myModule.controller('myModuleCtrl', ['$scope', '$modal', 'myModuleSrv', function($scope, $modal, myModuleSrv) {
	$scope.$parent.isUserLoggedIn();

	//define the permissions
	var permissions = {
		'list': ['myService', '/list'],
		'add': ['myService', '/add']
	};

	$scope.access = {};
	//call the method and compare the permissions with the ACL
	//allowed permissions are then stored in scope.access
	constructModulePermissions($scope, $scope.access, permissions);

	//function that lists the entries in a grid
	$scope.listEntries = function() {
		var opts = {
			"url": "http://dashboard-api.soajs.org:4000/myService/list",
			"method": "get"
		};
		myModuleSrv.getEntriesFromAPI(opts, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				myModuleSrv.printGrid($scope, response.data);
			}
		});
	};

	//function that prints one data record to the console
	$scope.viewEntry = function(oneDataRecord) {
		console.log(oneDataRecord);
		$modal.open({
			templateUrl: "infoBox.html",
			size: 'lg',
			backdrop: false,
			keyboard: true,
			controller: function($scope, $modalInstance) {
				$scope.title = "Viewing One Entry";
				$scope.data = JSON.stringify(oneDataRecord, null, 2);
				setTimeout(function() {highlightMyCode()}, 500);
				$scope.ok = function() {
					$modalInstance.dismiss('ok');
				};
			}
		});
	};

	//function that adds a new entry by using form & modal
	$scope.addEntry = function() {
		if($scope.access.add) {

			var submit = function(formData) {  //operation function, returns the data entered in the form
				var opts = {
					url: "http://dashboard-api.soajs.org/myService/add",
					method: "post",
					data: formData
				};
				myModuleSrv.sendEntryToAPI(opts, function(error) {
					if(error) {
						$scope.$parent.displayAlert('danger', error.message);
					}
					else {
						$scope.$parent.displayAlert('success', "Your entry has beend added.");
						$scope.form.formData = {};
						$scope.modalInstance.close();
						$scope.listEntries();
					}
				});
			};

			myModuleSrv.buildForm($scope, $modal, submit);
		}
	};

	//if scope.access.list is allowed, call listEntries
	if($scope.access.list) {
		$scope.listEntries();
	}
}]);