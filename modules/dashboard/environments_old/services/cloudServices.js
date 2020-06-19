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
						let route;
						switch(type) {
							case "Secret":
								route = '/infra/kubernetes/configuration/' + type;
								break;
							case "PVC":
								route = '/infra/kubernetes/storage/' + type;
								break;
							case "PV":
								route = '/infra/kubernetes/storage/' + type;
								break;
							case "Service":
								route = '/infra/kubernetes/service/' + type;
								break;
							case "Deployment":
								route = '/infra/kubernetes/workload/' + type;
								break;
							case "DaemonSet":
								route = '/infra/kubernetes/workload/' + type;
								break;
							case "CronJob":
								route = '/infra/kubernetes/workload/' + type;
								break;
							case "HPA":
								route = '/infra/kubernetes/workload/' + type;
								break;
							case "StorageClass":
								route = '/infra/kubernetes/storage/' + type;
								break;
							case "ClusterRole":
								route = '/infra/kubernetes/rbac/' + type;
								break;
							case "ClusterRoleBinding":
								route = '/infra/kubernetes/rbac/' + type;
								break;
							case "RoleBinding":
								route = '/infra/kubernetes/rbac/' + type;
								break;
							case "APIService":
								route = '/infra/kubernetes/rbac/' + type;
								break;
							case "ServiceAccount":
								route = '/infra/kubernetes/rbac/' + type;
								break;
							default:
								route = '/infra/kubernetes/configuration/' + type;
						}
						let opts = {
							method: 'post',
							routeName: route,
							data: {
								configuration: {
									env: currentScope.selectedEnvironment.code,
								},
								body: formData.jsonData
							},
						};
						getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
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
									case "ClusterRole":
										currentScope.listClusterRoles();
										break;
									case "ClusterRoleBinding":
										currentScope.listClusterRoleBindings();
										break;
									case "RoleBinding":
										currentScope.listRoleBindings();
										break;
									case "APIService":
										currentScope.listApiServices();
										break;
									case "ServiceAccount":
										currentScope.listServiceAccounts();
										break;
									default:
										currentScope.listDeployments();
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
								opts.routeName = '/infra/kubernetes/storage/' + type;
								break;
							case "Service":
								opts.data.body.kind = 'Service';
								opts.routeName = '/infra/kubernetes/service/' + type;
								break;
							case "Deployment":
								opts.data.body.kind = 'Deployment';
								opts.routeName = '/infra/kubernetes/workload/' + type;
								break;
							case "DaemonSet":
								opts.data.body.kind = 'DaemonSet';
								opts.routeName = '/infra/kubernetes/workload/' + type;
								break;
							case "CronJob":
								opts.data.body.kind = 'CronJob';
								opts.routeName = '/infra/kubernetes/workload/' + type;
								break;
							case "HPA":
								opts.data.body.kind = 'HorizontalPodAutoscaler';
								opts.routeName = '/infra/kubernetes/workload/' + type;
								break;
							case "StorageClass":
								opts.data.body.kind = 'StorageClass';
								opts.routeName = '/infra/kubernetes/storage/' + type;
								break;
							default:
								opts.data.body.kind = 'Deployment';
								opts.routeName = '/infra/kubernetes/workload/' + type;
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
										currentScope.listDeployments();
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
