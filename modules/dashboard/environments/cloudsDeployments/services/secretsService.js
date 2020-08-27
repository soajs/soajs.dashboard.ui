"use strict";
var secretsApp = soajsApp.components;
secretsApp.service('secretsService', ['ngDataApi', '$timeout', '$window', function (ngDataApi, $timeout, $window) {
	
	function addSecret($scope, $modalInstance, currentScope, actions, extraInputs, data, cb) {
		
		$scope.textMode = false;
		
		let formConfig = angular.copy(cloudsDeploymentConfig.form.addSecret);
		
		if (extraInputs && Array.isArray(extraInputs) && extraInputs.length > 0) {
			formConfig = formConfig.concat(extraInputs);
		}
		
		if (!actions) {
			actions = [
				{
					'type': 'submit',
					'label': "Create Secret",
					'btn': 'primary',
					action: function (formData) {
						$scope.save(formData);
					}
				},
				{
					type: 'reset',
					label: 'Cancel',
					btn: 'danger',
					action: function () {
						$modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		}
		
		$scope.save = function (formData, cb) {
			$scope.$valid = true;
			let input = {
				name: formData.secretName,
				configuration: {
					env: currentScope.selectedEnvironment.code,
				},
				data: {}
			};
			input.content = [];
			let routeName = '/infra/kubernetes/secret';
			if (formData.secretType === 'kubernetes.io/dockercfg') {
				routeName = '/infra/kubernetes/secret/registry';
				input.content = {};
				input.content.username = formData.registryUsername;
				input.content.password = formData.registryPassword;
				input.content.server = formData.registryServer;
				input.content.email = formData.registryEmail;
			} else {
				if (formData.secretFile0) {
					input.datatype = "file";
				}
				
				if (formData.secretData0) {
					input.datatype = "text";
				}
				
				for (let data in formData) {
					if (data && formData.hasOwnProperty(data)) {
						if (input.datatype === "text") {
							if (data.includes("secretData")) {
								if (!input.data[data.replace("secretData", "")]) {
									input.data[data.replace("secretData", "")] = {};
								}
								input.data[data.replace("secretData", "")].content = typeof formData[data] === "string" ? formData[data] : JSON.stringify(formData[data]);
							}
							if (data.includes("secretLabelText")) {
								if (!input.data[data.replace("secretLabelText", "")]) {
									input.data[data.replace("secretLabelText", "")] = {};
								}
								input.data[data.replace("secretLabelText", "")].name = formData[data];
							} else {
							
							}
						} else {
							if (input.datatype === "file") {
								if (data.includes("secretFile")) {
									if (!input.data[data.replace("secretFile", "")]) {
										input.data[data.replace("secretFile", "")] = {};
									}
									input.data[data.replace("secretFile", "")].content = typeof formData[data] === "string" ? formData[data] : JSON.stringify(formData[data]);
								}
								if (data.includes("secretLabelFile")) {
									if (!input.data[data.replace("secretLabelFile", "")]) {
										input.data[data.replace("secretLabelFile", "")] = {};
									}
									input.data[data.replace("secretLabelFile", "")].name = formData[data];
								}
							}
						}
					}
				}
				for (let data in input.data) {
					if (data && input.data.hasOwnProperty(data)) {
						if (!input.data[data].content || input.data[data].content === "") {
							$scope.$valid = false;
						}
						input.content.push(input.data[data]);
					}
				}
				delete input.data;
				delete input.datatype;
				if (!$scope.$valid) {
					$window.alert("Provide a value for your secret to proceed!");
				}
			}
			if ($scope.$valid && $modalInstance) {
				$modalInstance.close();
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'post',
					routeName: routeName,
					data: input
				}, function (error) {
					if (error) {
						currentScope.displayAlert('danger', error.message);
					}
					else {
						currentScope.displayAlert('success', 'Secret created successfully.');
						currentScope.listSecrets();
						$modalInstance.close();
					}
				});
			}
			
			if (cb && typeof cb === 'function') {
				return cb(input);
			}
		};
		
		function enableTextMode(textMode, editor) {
			if (textMode) {
				editor.type = 'textarea';
			} else {
				editor.type = 'jsoneditor';
			}
		}
		
		formConfig[1].tabs[0].entries[0].entries[1].onAction = function (id, value, form) {
			enableTextMode(value, form.entries[1].tabs[0].entries[0].entries[2]);
			delete form.formData.secretData0;
		};
		
		formConfig[1].tabs[0].onAction = function (id, value, form) {
		
			form.formData = {};
			form.formData.secretType = "Opaque";
		};
		
		formConfig[1].tabs[1].onAction = function (id, value, form) {
			form.formData = {};
			form.formData.secretType = "Opaque";
		};
		formConfig[1].tabs[0].onAction = function (id, value, form) {
			
			form.formData = {};
			form.formData.secretType = "kubernetes.io/dockercfg";
		};
		
		formConfig[1].tabs[1].onAction = function (id, value, form) {
			form.formData = {};
			form.formData.secretType = "Opaque";
		};
		formConfig[1].tabs[2].onAction = function (id, value, form) {
			form.formData.secretType = "kubernetes.io/dockercfg";
		};
		$scope.showContent = function (id, value, form) {
			if (!form.formData[id]) {
				form.formData[id] = value;
			}
		};
		
		$scope.removFile = function (form, file) {
			if (form && form.formData) {
				delete form.formData[file]
			}
		};
		let textCounter = 1, fileCounter = 1;
		if (formConfig[1].tabs[0].entries[1]) {
			formConfig[1].tabs[0].entries[1].onAction = function (id, value, form) {
				$scope.addTextEntry();
			};
		}
		if (formConfig[1].tabs[1].entries[1]) {
			formConfig[1].tabs[1].entries[1].onAction = function (id, value, form) {
				$scope.addFileEntry();
			};
		}
		$scope.addTextEntry = function () {
			let tmp = angular.copy(cloudsDeploymentConfig.form.addTextEntry);
			tmp.name += textCounter;
			tmp.entries[0].name += textCounter;
			tmp.entries[1].name += textCounter;
			tmp.entries[2].name += textCounter;
			tmp.entries[1].onAction = function (id, value, form) {
				let count = id.replace("textMode", "");
				enableTextMode(value, form.entries[1].tabs[0].entries[count].entries[2]);
				delete form.formData["secretData" + count];
			};
			tmp.entries[3].name += textCounter;
			tmp.entries[3].onAction = function (id, value, form) {
				let count = parseInt(id.replace('removeEntry', ''));
				for (let i = form.entries[1].tabs[0].entries.length - 1; i >= 0; i--) {
					if (form.entries[1].tabs[0].entries[i].name === 'secretTextGroup' + count) {
						//remove from formData
						for (let fieldname in form.formData) {
							if (['secretLabelText' + count, 'secretData' + count, 'textMode' + count].indexOf(fieldname) !== -1) {
								delete form.formData[fieldname];
							}
						}
						//remove from formEntries
						form.entries[1].tabs[0].entries.splice(i, 1);
						break;
					}
				}
				
			};
			if ($scope.form && $scope.form.entries) {
				$scope.form.entries[1].tabs[0].entries.splice($scope.form.entries[1].tabs[0].entries.length - 1, 0, tmp);
			} else {
				formConfig[1].tabs[0].entries.splice($scope.form.tabs[0].entries.length - 1, 0, tmp);
			}
			textCounter++;
		};
		
		$scope.addFileEntry = function () {
			let tmp = angular.copy(cloudsDeploymentConfig.form.addFileEntry);
			tmp.name += fileCounter;
			tmp.entries[0].name += fileCounter;
			tmp.entries[1].name += fileCounter;
			tmp.entries[2].name += fileCounter;
			tmp.entries[2].onAction = function (id, value, form) {
				let count = parseInt(id.replace('removeEntry', ''));
				
				for (let i = form.entries[1].tabs[1].entries.length - 1; i >= 0; i--) {
					if (form.entries[1].tabs[1].entries[i].name === 'secretFileGroup' + count) {
						//remove from formData
						for (let fieldname in form.formData) {
							if (['secretLabelFile' + count, 'secretFile' + count].indexOf(fieldname) !== -1) {
								delete form.formData[fieldname];
							}
						}
						//remove from formEntries
						form.entries[1].tabs[1].entries.splice(i, 1);
						break;
					}
				}
				
			};
			if ($scope.form && $scope.form.entries) {
				$scope.form.entries[1].tabs[1].entries.splice($scope.form.entries[1].tabs[1].entries.length - 1, 0, tmp);
			} else {
				formConfig[1].tabs[1].entries.splice($scope.form.tabs[1].entries.length - 1, 0, tmp);
			}
			fileCounter++;
		};
		
		let options = {
			timeout: $timeout,
			entries: formConfig,
			data: data,
			name: 'newSecret',
			actions: actions
		};
		buildForm($scope, $modalInstance, options, function () {
			$scope.editor = $scope.form.entries[1].tabs[0].entries[0].entries[1];
			
			if (cb && typeof cb === 'function') {
				return cb();
			}
		});
	}
	
	return {
		'addSecret': addSecret
	}
}]);
