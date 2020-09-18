"use strict";
var CDApp = soajsApp.components;
CDApp.controller('notificationCtrl', ['$scope', 'ngDataApi', 'injectFiles', '$localStorage', '$modal', '$timeout', function ($scope, ngDataApi, injectFiles, $localStorage, $modal, $timeout) {
	$scope.$parent.isUserNameLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, settingAppConfig.permissions);
	
	$scope.limits = [
		{
			l: 50,
			v: 50,
		},
		{
			l: 100,
			v: 100,
		},
		{
			l: 200,
			v: 200,
		},
		{
			l: 300,
			v: 300,
		},
		{
			l: 400,
			v: 400,
		},
		{
			l: 500,
			v: 100,
		}
	];
	$scope.searchOptions = {
		types: ["Registry", "Deployment", "Notification", "Multitenant"],
		sections: ["Default", "Custom", "Throttling", "DB", "Resource configuration", "Catalog", "Continuous delivery", "Kubernetes", "Environment", "ACL"],
		envs: [],
		limit: $scope.limits[1]
	};
	$scope.searchValues = {};
	if ($localStorage.environments.length > 0) {
		$localStorage.environments.forEach((envRecord) => {
			$scope.searchOptions.envs.push(envRecord.code);
		});
	}
	$scope.pagination = {
		totalItems: 0,
		currentPage: 1,
		itemsPerPage: $scope.searchOptions.limit ? $scope.searchOptions.limit.l : 100
	};
	$scope.search = function (page) {
		let opts = {};
		if ($scope.searchValues) {
			opts = $scope.searchValues;
		}
		if ($scope.searchOptions.limit) {
			opts.limit = $scope.searchOptions.limit.l;
		}
		if (page > 1) {
			opts.start = $scope.searchOptions.limit.l * (page - 1);
		}
		else {
			delete opts.start;
		}
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/console/ledger',
			'params': opts
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.ledgers = response.items;
				$scope.pagination.totalItems = response.count;
				$scope.pagination.itemsPerPage = $scope.searchOptions.limit.l;
			}
		});
	};
	$scope.reset = function () {
		$scope.searchValues = {};
	};
	
	$scope.preview = function (ledger, type) {
		let formConfig = {
			'entries': [
				{
					'name': 'jsonData',
					'label': '',
					'type': 'jsoneditor',
					'options': {
						'mode': 'view',
						'availableModes': []
					},
					'height': '500px',
					"value": {}
				}
			]
		};
		if (type === "username") {
			formConfig.entries[0].value = ledger.who;
		} else if (type === "input") {
			try {
				formConfig.entries[0].value = JSON.parse(ledger.input);
			} catch (e) {
				console.log(e);
				formConfig.entries[0].value = ledger.input;
			}
		} else {
			try {
				formConfig.entries[0].value = JSON.parse(ledger.output);
			} catch (e) {
				console.log(e);
				formConfig.entries[0].value = ledger.output;
			}
		}
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'ledgerInfo',
			label: type + ' | Info',
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
	injectFiles.injectCss("modules/dashboard/settings/notification/notifications.css");
	if ($scope.access.searchLedger) {
		$scope.search();
	}
}]);

CDApp.filter('searchFilter', function () {
	return function (input, searchKeyword) {
		if (!searchKeyword) return input;
		if (!input || !Array.isArray(input) || input.length === 0) return input;
		
		var output = [];
		input.forEach(function (oneInput) {
			if (oneInput) {
				//using full_name since it's composed of owner + name
				if (oneInput.l && oneInput.l.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
					output.push(oneInput);
				}
			}
		});
		
		return output;
	}
});

CDApp.filter('changeISOString', function () {
	return function (input) {
		if (!input) return input;
		
		return new Date(input).toISOString();
	}
});
