"use strict";
let customRegistryCtrl = soajsApp.components;
customRegistryCtrl.controller('customRegistryCtrl', ['$scope', '$cookies', 'ngDataApi', 'injectFiles', '$modal', '$timeout', '$localStorage',
	function ($scope, $cookies, ngDataApi, injectFiles, $modal, $timeout, $localStorage) {
		$scope.$parent.isUserLoggedIn();
		$scope.access = {};
		constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
		
		function openModal(options) {
			let currentScope = $scope;
			$modal.open({
				templateUrl: options.templateUrl,
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope, $modalInstance) {
					$scope.formData = {};
					$scope.access = currentScope.access;
					$scope.environments = angular.copy($localStorage.environments);
					$scope.message = {};
					
					// For edit
					if (options.item) {
						$scope.formData = options.item;
					}
					for (let i = 0; i < $scope.environments.length; i++) {
						if ($scope.formData.sharedEnvs) {
							if ($scope.formData.sharedEnvs [$scope.environments[i].code]) {
								$scope.environments[i].selected = true;
							}
						}
						if ($scope.environments[i].code === currentScope.envCode) {
							$scope.environments[i].hidden = true;
						}
					}
					fixBackDrop();
					overlayLoading.show();
					$scope.displayAlert = function (type, message) {
						$scope.message[type] = message;
						setTimeout(function () {
							$scope.message = {};
						}, 5000);
					};
					$scope.cancel = function () {
						if ($modalInstance) {
							$modalInstance.close();
						}
					};
					$scope.submit = function () {
						if (options.submit) {
							options.submit($scope, $modalInstance);
						}
					};
					$scope.changed = function (type, value) {
						if (options.changed) {
							options.changed($scope, $modalInstance, type, value)
						}
					};
					$scope.enableTextMode = function () {
						$scope.textMode = !$scope.textMode;
						if ($scope.textMode) {
							$scope.editor.session.setMode("ace/mode/text");
						} else {
							$scope.editor.session.setMode("ace/mode/json");
						}
					};
					let aceCustomRegistry = {
						"name": 'customRegistry',
						"height": '16px',
						"firstTime": true
					};
					$scope.options = {
						aceEditorConfig: {
							maxLines: Infinity,
							minLines: 1,
							useWrapMode: true,
							showGutter: true,
							mode: 'json',
							firstLineNumber: 1,
							onLoad: function (_editor) {
								_editor.$blockScrolling = Infinity;
								_editor.scrollToLine(0, true, true);
								_editor.scrollPageUp();
								_editor.clearSelection();
								_editor.setShowPrintMargin(false);
								_editor.setHighlightActiveLine(false);
								$scope.editor = _editor;
								// const heightUpdateFunction = function () {
								// 	let newHeight =
								// 		_editor.getSession().getScreenLength()
								// 		* _editor.renderer.lineHeight
								// 		+ _editor.renderer.scrollBar.getWidth();
								//
								// 	if (aceCustomRegistry.fixedHeight) {
								// 		newHeight = parseInt(aceCustomRegistry.height);
								// 	}
								// 	else if (parseInt(aceCustomRegistry.height) && parseInt(aceCustomRegistry.height) > newHeight) {
								// 		newHeight = parseInt(aceCustomRegistry.height);
								// 	}
								// 	try {
								// 		if ($scope.formData && $scope.formData.value && aceCustomRegistry.firstTime) {
								// 			aceCustomRegistry.firstTime = false;
								// 			let screenLength = 1;
								// 			if (typeof JSON.parse($scope.formData.value) === 'object') {
								// 				_editor.session.setMode("ace/mode/json");
								// 				screenLength = Object.keys(JSON.parse($scope.formData.value)).length * 16;
								// 				if (screenLength > 1) {
								// 					screenLength += 32;
								// 				}
								// 			} else {
								// 				$scope.textMode = true;
								// 				_editor.session.setMode("ace/mode/text");
								// 				screenLength = 16;
								// 			}
								// 			if (screenLength > newHeight) {
								// 				newHeight = screenLength;
								// 			}
								// 		} else {
								// 			aceCustomRegistry.firstTime = false;
								// 		}
								// 	} catch (e) {
								// 		$scope.textMode = true;
								// 		_editor.session.setMode("ace/mode/text");
								// 		aceCustomRegistry.firstTime = false;
								// 	}
								// 	_editor.renderer.scrollBar.setHeight(newHeight.toString() + "px");
								// 	_editor.renderer.scrollBar.setInnerHeight(newHeight.toString() + "px");
								// 	$timeout(function () {
								// 		jQuery('#' + aceCustomRegistry.name).height(newHeight.toString());
								// 		_editor.resize(true);
								// 	}, 5);
								// };
								// heightUpdateFunction();
								// $timeout(function () {
								// 	_editor.heightUpdate = heightUpdateFunction();
								// 	// Set initial size to match initial content
								// 	heightUpdateFunction();
								//
								// 	// Whenever a change happens inside the ACE editor, update
								// 	// the size again
								// 	_editor.getSession().on('change', heightUpdateFunction);
								// }, 2000);
							}
						}
					};
					overlayLoading.hide();
				}
			});
		}
		
		$scope.edit = function (item) {
			let options = {
				"templateUrl": "editRegistry.tmpl",
				"item": angular.copy(item),
				"submit": function (modalScope, modalInstance) {
					if (!modalScope.formData.name || !modalScope.formData.value) {
						modalScope.displayAlert('danger', "Please fill in all required fields!");
					} else {
						let itemValue = modalScope.formData.value;
						if (!modalScope.textMode) {
							try {
								itemValue = JSON.parse(modalScope.formData.value);
							} catch (e) {
								modalScope.displayAlert('Invalid JSON Object');
								return;
							}
						}
						modalScope.formData.shared = !!modalScope.formData.shared;
						modalScope.formData.plugged = !!modalScope.formData.plugged;
						modalScope.formData.sharedEnvs = {};
						if (modalScope.formData.shared) {
							for (let i = 0; i < modalScope.environments.length; i++) {
								if (modalScope.environments[i].selected) {
									modalScope.formData.sharedEnvs[modalScope.environments[i].code] = true;
								}
							}
						}
						getSendDataFromServer(modalScope, ngDataApi, {
							"method": "put",
							"routeName": "/console/registry/custom",
							"data": {
								"id": modalScope.formData._id,
								"env": item.created,
								"data": {
									"name": modalScope.formData.name,
									"plugged": modalScope.formData.plugged,
									"shared": modalScope.formData.shared,
									"sharedEnvs": modalScope.formData.sharedEnvs,
									"value": itemValue
								}
							}
						}, function (error) {
							if (error) {
								modalScope.displayAlert('danger', error.message);
							}
							else {
								item.name = modalScope.formData.name;
								item.plugged = modalScope.formData.plugged;
								item.shared = modalScope.formData.shared;
								if (modalScope.formData.sharedEnvs) {
									item.sharedEnvs = modalScope.formData.sharedEnvs;
								}
								item.value = modalScope.formData.value;
								modalScope.displayAlert('success', "Custom registry has been updated.");
								$scope.$parent.displayAlert('success', "Custom registry has been updated.");
								if (modalInstance) {
									modalInstance.close();
								}
							}
						});
					}
				}
			};
			if (options.item && options.item.value && typeof(options.item.value) === 'object') {
				options.item.value = JSON.stringify(options.item.value, null, 2);
			}
			openModal(options);
		};
		$scope.add = function () {
			let options = {
				"templateUrl": "addRegistry.tmpl",
				"submit": function (modalScope, modalInstance) {
					if (!modalScope.formData.name || !modalScope.formData.value) {
						modalScope.displayAlert('danger', "Please fill in all required fields!");
					} else {
						let itemValue = modalScope.formData.value;
						if (!modalScope.textMode) {
							try {
								itemValue = JSON.parse(modalScope.formData.value);
							} catch (e) {
								modalScope.displayAlert('Invalid JSON Object');
								return;
							}
						}
						modalScope.formData.shared = !!modalScope.formData.shared;
						modalScope.formData.plugged = !!modalScope.formData.plugged;
						if (modalScope.formData.shared) {
							for (let i = 0; i < modalScope.environments.length; i++) {
								if (modalScope.environments[i].selected) {
									if (!modalScope.formData.sharedEnvs) {
										modalScope.formData.sharedEnvs = {};
									}
									modalScope.formData.sharedEnvs[modalScope.environments[i].code] = true;
								}
							}
						}
						getSendDataFromServer(modalScope, ngDataApi, {
							"method": "post",
							"routeName": "/console/registry/custom",
							"data": {
								"env": $scope.envCode,
								"data": {
									"name": modalScope.formData.name,
									"plugged": modalScope.formData.plugged,
									"shared": modalScope.formData.shared,
									"sharedEnvs": modalScope.formData.sharedEnvs,
									"value": itemValue
								}
							}
						}, function (error) {
							if (error) {
								modalScope.displayAlert('danger', error.message);
							}
							else {
								modalScope.displayAlert('success', "Custom registry has been added.");
								$scope.$parent.displayAlert('success', "Custom registry has been added.");
								if (modalInstance) {
									modalInstance.close();
								}
							}
						});
					}
				}
			};
			openModal(options);
		};
		
		$scope.plug = function (item, plugged) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"routeName": "/console/registry/custom",
				"data": {
					"id": item._id,
					"data": {
						"plugged": plugged
					}
				}
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					item.plugged = plugged;
					$scope.$parent.displayAlert('success', "Custom registry has been " + (plugged ? "plugged." : "un-plugged."));
				}
			});
		};
		
		$scope.delete = function (item) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "delete",
				"routeName": "/console/registry/custom",
				"data": {
					"id": item._id,
					"env": item.created
				}
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', "Custom registry has been deleted.");
				}
			});
		};
		
		$scope.get = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/registry/custom",
				"params": {
					"env": $scope.envCode
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					$scope.listItems = response || null;
				}
			});
		};
		
		if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
			$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
			if ($scope.envCode) {
				$scope.get();
			}
		}
		
		injectFiles.injectCss("modules/dashboard/environments/environments.css");
	}]);
