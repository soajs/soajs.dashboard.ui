"use strict";
var hacloudServices = soajsApp.components;
hacloudServices.service('hacloudSrv', ['ngDataApi', '$cookies', '$modal', '$timeout', '$window', function (ngDataApi, $cookies, $modal, $timeout, $window) {
	
	function inspectItem(currentScope, item) {
		let formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = item;
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: item.metadata.name + ' | Info',
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function createItem(currentScope, type) {
		let formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: 'Create ' + type,
			actions: [
				{
					'type': 'submit',
					'label': "Create " + type,
					'btn': 'primary',
					action: function (formData) {
						getSendDataFromServer(currentScope, ngDataApi, {
							method: 'post',
							routeName: '/infra/kubernetes/resource/' + type,
							data: {
								configuration: {
									env: currentScope.selectedEnvironment.code,
								},
								body: formData.jsonData
							},
						}, function (error) {
							if (error) {
								currentScope.displayAlert('danger', error.message);
							} else {
								currentScope.displayAlert('success', type + ' Added successfully.');
								switch(type) {
									case "Secret":
										currentScope.listSecrets();
										break;
									case "PVC":
										currentScope.listPVC();
										break;
									case "PV":
										currentScope.listPV();
										break;
									case "Service":
										currentScope.listServices();
										break;
									case "Deployment":
										currentScope.listDeployments();
										break;
									case "DaemonSet":
										currentScope.listDaemonSets();
										break;
									case "CronJob":
										currentScope.listCronJobs();
										break;
									case "HPA":
										currentScope.listHPA();
										break;
									case "StorageClass":
										currentScope.listStorageClass();
										break;
									default:
										currentScope.listServices();
								}
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						});
					}
				},
				{
					type: 'reset',
					label: 'Cancel',
					btn: 'danger',
					action: function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function editItem(currentScope, item, type) {
		let formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = item;
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: 'Edit Item',
			actions: [
				{
					'type': 'submit',
					'label': "Edit Item",
					'btn': 'primary',
					action: function (formData) {
						let opts = {
							method: 'put',
							routeName: '/infra/kubernetes/resource/' + type,
							data: {
								configuration: {
									env: currentScope.selectedEnvironment.code,
								},
								body: formData.jsonData
							},
						};
						switch(type) {
							case "PV":
								opts.data.body.kind = 'PersistentVolume';
								break;
							case "Service":
								opts.data.body.kind = 'Service';
								break;
							case "Deployment":
								opts.data.body.kind = 'Deployment';
								break;
							case "DaemonSet":
								opts.data.body.kind = 'DaemonSet';
								break;
							case "CronJob":
								opts.data.body.kind = 'CronJob';
								break;
							case "HPA":
								opts.data.body.kind = 'HorizontalPodAutoscaler';
								break;
							case "StorageClass":
								opts.data.body.kind = 'StorageClass';
								break;
							default:
								opts.data.body.kind = 'Service';
						}
						getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
							if (error) {
								currentScope.displayAlert('danger', error.message);
							} else {
								currentScope.displayAlert('success', type + ' Edited successfully.');
								switch(type) {
									case "PV":
										currentScope.listPV();
										break;
									case "Service":
										currentScope.listServices();
										break;
									case "Deployment":
										currentScope.listDeployments();
										break;
									case "DaemonSet":
										currentScope.listDaemonSets();
										break;
									case "CronJob":
										currentScope.listCronJobs();
										break;
									case "HPA":
										currentScope.listHPA();
										break;
									case "StorageClass":
										currentScope.listStorageClass();
										break;
									default:
										currentScope.listServices();
								}
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						});
					}
				},
				{
					type: 'reset',
					label: 'Cancel',
					btn: 'danger',
					action: function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}
	
	return {
		'inspectItem': inspectItem,
		'createItem': createItem,
		'editItem': editItem,
	};
}]);
