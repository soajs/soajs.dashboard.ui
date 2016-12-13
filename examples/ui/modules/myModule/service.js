"use strict";
var myModuleService = soajsApp.components;
myModuleService.service('myModuleSrv', ['$timeout', '$http', function($timeout, $http) {

	function callAPI(config, callback) {
		$http(config).success(function(response, status, headers, config) {
			$timeout(function() {
				return callback(null, response);
			}, 500);
		}).error(function(errData, status, headers, config) {
			$timeout(function() {
				return callback(errData);
			}, 500);
		});
	}

	return {
		'getEntriesFromAPI': function(opts, callback) {
			var config = {
				url: opts.url,
				method: opts.method,
				headers:{
					'Content-Type': 'application/json'
				}
			};
			callAPI(config, callback);
		},

		'sendEntryToAPI': function(opts, callback) {
			var config = {
				url: opts.url,
				method: opts.method,
				data: opts.data,
				json: true,
				headers:{
					'Content-Type': 'application/json'
				}
			};
			callAPI(config, callback);
		},

		'printGrid': function($scope, response) {
			var options = {
				'grid': {
					recordsPerPageArray: [20, 50, 100, 200],
					'columns': [
						{'label': 'Title', 'field': 'title'},
						{'label': 'Created', 'field': 'created'}
					],
					'defaultLimit': 20
				},
				'defaultSortField': '',
				'data': response,
				'left': [
					{
						'icon': 'search',
						'label': 'View Item',
						'handler': 'viewEntry'
					}
				]
			};
			buildGrid($scope, options);
		},

		'buildForm': function($scope, $modal, submitAction) {
			var config = {
				"timeout": $timeout,
				"form": {
					"entries": [
						{
							'name': 'title',
							'label': 'Title',
							'type': 'text',
							'placeholder': 'My Entry...',
							'value': '',
							'tooltip': 'Give your entry a name',
							'required': true
						},
						{
							'name': 'description',
							'label': 'Description',
							'type': 'textarea',
							'placeholder': 'My Description...',
							'value': '',
							'tooltip': 'Give your entry a description',
							'required': true
						}
					]
				},
				"name": 'addEntry',
				"label": 'Add New Entry',
				"actions": [
					{
						'type': 'submit',               //button type
						'label': 'Add Entry',          //button label
						'btn': 'primary',               //button class name (AngularJs's Bootstrap)
						'action': submitAction
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function() {
							//reset the form and close modal
							$scope.modalInstance.dismiss('cancel');
							$scope.form.formData = {};
						}
					}
				]
			};

			//call buildForm
			buildFormWithModal($scope, $modal, config);
		}
	}
}]);