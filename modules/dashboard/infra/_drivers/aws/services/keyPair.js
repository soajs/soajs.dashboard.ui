"use strict";
var awsInfraKeyPairSrv = soajsApp.components;
awsInfraKeyPairSrv.service('awsInfraKeyPairSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', function (ngDataApi, $localStorage, $timeout, $modal) {

	let infraKeyPairConfig = {
		form: {
			addKeyPair: [
                {
                    'name': 'name',
                    'label': 'Key Pair Name',
                    'type': 'text',
                    'value': '',
                    'required': true,
                    'tooltip': 'Enter the name of the key pair',
                    'placeholder': "myKeyPair"
                },
                {
                    'name': 'region',
                    'label': 'Region',
                    'type': 'text',
                    'value': '',
                    'required': true,
                    'disabled': true,
                    'tooltip': 'Enter the region for the key pair'
                },
			],

			labelInput : {
				'name': 'labelGroup',
				'type': 'group',
				'label': 'New Label',
				'entries': [
					{
						'name': 'labelName',
						'label': 'Label Name',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter the name of the label',
						'fieldMsg': 'Enter the name of the label',
						'placeholder': "My label name"
					},
					{
						'name': 'labelValue',
						'label': 'Label Value',
						'type': 'text',
						'value': '',
						'required': true,
						'tooltip': 'Enter the value of the label',
						'fieldMsg': 'Enter the value of the label',
						'placeholder': "My label Value"
					},
					{
						'type': 'html',
						'name': 'rLabel',
						'value': '<span class="icon icon-cross"></span>'
					}
				]
			}
		},

		grid: {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{ 'label': 'Name', 'field': 'name' },
				{ 'label': 'Fingerprint', 'field': 'fingerprint' },
				{ 'label': 'Associated To', 'field': 'associated' }
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'name',
			'defaultLimit': 10
		},
	};

	function addKeyPair(currentScope) {
		let options = {
			timeout: $timeout,
			form: {
				"entries": angular.copy(infraKeyPairConfig.form.addKeyPair)
			},
			name: 'addKeyPair',
			label: 'Add New Key Pair',
			actions: [
				{
					'type': 'submit',
					'label': "Create Key Pair",
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						let postOpts = {
							"method": "post",
							"routeName": "/dashboard/infra/extras",
							"params": {
								"infraId": currentScope.currentSelectedInfra._id,
								"technology": "vm",
								"waitResponse": true
							},
							"data": {
								"params": {
									"section": "keyPair",
									"region": currentScope.selectedRegion,
									"name": data.name,
                                    "labels": {}
								}
							}
						};

						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error, response) {
							overlayLoading.hide();
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.displayAlert('success', "Key pair created successfully. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.");
								alert("You will now receive your key pair as a pem file. Please store it in a secure location since it won't be available for download later. You won't be able to connect to your instances in case you lose this key.");
								openSaveAsDialog(`${formData.name}.pem`, response.privateKey, 'application/x-pem-file');
								currentScope.modalInstance.close();
								$timeout(() => {
									listKeyPairs(currentScope, currentScope.selectedRegion);
								}, 2000);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete currentScope.form.formData;
						currentScope.modalInstance.close();
					}
				}
			]
		};

		//set value of region to selectedRegion
		options.form.entries[1].value = currentScope.selectedRegion;

		buildFormWithModal(currentScope, $modal, options);
	}

	function deleteKeyPair(currentScope, oneKeyPair) {
		let deleteKeyPairOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'keyPair',
				'region': currentScope.selectedRegion,
				'name': oneKeyPair.name
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteKeyPairOpts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The Key pair has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listKeyPairs(currentScope, currentScope.selectedRegion);
				}, 2000);
			}
		});
	}

	function listKeyPairs(currentScope, oneRegion) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected region in scope to be accessed by other functions
		currentScope.selectedRegion = oneRegion;

		// clean grid from previous list if any
		if (currentScope.grid && currentScope.grid.rows && currentScope.grid.filteredRows && currentScope.grid.original) {
			currentScope.grid.rows = [];
			currentScope.grid.filteredRows = [];
			currentScope.grid.original = [];
		}

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'region': oneRegion,
				'extras[]': ['keyPairs'],
				"section": "keyPair"
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraKeyPairs = [];
				if (response.keyPairs && response.keyPairs.length > 0) {
					currentScope.infraKeyPairs = response.keyPairs;

					currentScope.infraKeyPairs.forEach((oneKeyPair) => {
						oneKeyPair.layers = [];
						currentScope.vmlayers.forEach((oneVmInstance) => {
							if(oneVmInstance.keyPair && oneVmInstance.keyPair === oneKeyPair.id) {
								let foundLayer = oneKeyPair.layers.find((oneEntry) => { return oneEntry.name === oneVmInstance.layer });
								if(foundLayer) {
									foundLayer.instances.push({
										id: oneVmInstance.id,
										name: oneVmInstance.name
									});
								}
								else {
									oneKeyPair.layers.push({
										name: oneVmInstance.layer,
										region: oneVmInstance.region,
										instances: [ { id: oneVmInstance.id, name: oneVmInstance.name } ]
									});
								}
							}
						});

						oneKeyPair.associated = '';
						if(oneKeyPair.layers.length === 0) {
							oneKeyPair.associated = `<span title='Virtual Machine'>Not associated yet</span>`
						}
						else {
							oneKeyPair.associated = `<span title='Virtual Machine'>Associated to ${oneKeyPair.layers.length} machines. Click on <span class="icon icon-stack"></span> to view them</span>`
						}
					});


					let gridOptions = {
						grid: infraKeyPairConfig.grid,
						data: currentScope.infraKeyPairs,
						left: [
							{
								'label': 'View Associated Instnaces',
								'icon': 'stack',
								'handler': 'displayKeyPairVms'
							}
						],
						top: []
					};

					if (currentScope.access.removeKeyPair) {
						gridOptions.left.push({
							'label': 'Delete Key Pair',
							'icon': 'bin',
							'handler': 'deleteKeyPair',
							'msg': "Are you sure you want to delete this key pair?"
						});
						gridOptions.top.push({
							'label': 'Delete Key Pair(s)',
							'icon': 'bin',
							'handler': 'deleteKeyPair',
							'msg': "Are you sure you want to delete the selected key pair(s)?"
						});
					}

					buildGrid(currentScope, gridOptions);
				}
			}
		});
	}

	function displayKeyPairVms(currentScope, oneKeyPair) {
		var newModal = $modal.open({
			templateUrl: "displayKeyPairVms.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				$scope.title = `Virtual Machines Associated To ${oneKeyPair.name}`;
				$scope.keyPair = oneKeyPair;

				$scope.dismiss = function(){
					$modalInstance.close();
				};
			}
		});
	}

	return {
		'addKeyPair': addKeyPair,
		'deleteKeyPair': deleteKeyPair,
		'listKeyPairs': listKeyPairs,
		'displayKeyPairVms': displayKeyPairVms
	};
}]);
