"use strict";
var swaggerEditorSrv = soajsApp.components;

swaggerEditorSrv.service('swaggerEditorSrv', ['$timeout', 'ngDataApi', '$window', function ($timeout, ngDataApi, $window) {
	/*
	 * This function generate the service by testing all the required fields in the service info tab and the YAML code
	 * in the swagger documentation , catching their values and downloading the service files following the composer notation.
	 *
	 * @param currentScope
	 * @param type : generateService or saveService
	 * @returns {*}
	 */
	function prepareServiceAndCallApi(currentScope, type) {
		if (currentScope.myBrowser === 'safari') {
			$window.alert("The Downloader is not compatible with Safari, please choose another browser.");
			return null;
		}
		
		var extKeyRequired = false;
		var urac = false;
		var urac_Profile = false;
		var urac_ACL = false;
		var provision_ACL = false;
		if (Array.isArray(currentScope.form.formData.extKeyRequired)) {
			extKeyRequired = (currentScope.form.formData.extKeyRequired[0] === 'true');
		}
		else {
			extKeyRequired = (currentScope.form.formData.extKeyRequired === 'true');
		}
		
		if (Array.isArray(currentScope.form.formData.urac)) {
			urac = (currentScope.form.formData.urac[0] === 'true');
		}
		else {
			urac = (currentScope.form.formData.urac === 'true');
		}
		
		if (Array.isArray(currentScope.form.formData.urac_Profile)) {
			urac_Profile = (currentScope.form.formData.urac_Profile[0] === 'true');
		}
		else {
			urac_Profile = (currentScope.form.formData.urac_Profile === 'true');
		}
		
		if (Array.isArray(currentScope.form.formData.urac_ACL)) {
			urac_ACL = (currentScope.form.formData.urac_ACL[0] === 'true');
		}
		else {
			urac_ACL = (currentScope.form.formData.urac_ACL === 'true');
		}
		
		if (Array.isArray(currentScope.form.formData.provision_ACL)) {
			provision_ACL = (currentScope.form.formData.provision_ACL[0] === 'true');
		}
		else {
			provision_ACL = (currentScope.form.formData.provision_ACL === 'true');
		}
		
		var oauth = false;
		if (Array.isArray(currentScope.form.formData.oauth)) {
			oauth = (currentScope.form.formData.oauth[0] === 'true');
		}
		else {
			oauth = (currentScope.form.formData.oauth === 'true');
		}
		
		var session = false;
		if (Array.isArray(currentScope.form.formData.session)) {
			session = (currentScope.form.formData.session[0] === 'true');
		}
		else {
			session = (currentScope.form.formData.session === 'true');
		}
		
		var dbs = [];
		for (var i = 0; i < currentScope.form.formData.dbCount; i++) {
			
			if (currentScope.form.formData['name' + i]) {
				var dbObj = {
					prefix: currentScope.form.formData['prefix' + i] || ""
				};
				
				dbObj.name = currentScope.form.formData['name' + i];
				
				if (Array.isArray(currentScope.form.formData['model' + i]) && currentScope.form.formData['model' + i].length > 0) {
					dbObj[currentScope.form.formData['model' + i][0]] = true;
				}
				else if (currentScope.form.formData['model' + i]) {
					dbObj[currentScope.form.formData['model' + i]] = true;
				}
				if ((Array.isArray(currentScope.form.formData['model' + i]) && currentScope.form.formData['model' + i][0] === 'mongo') || (currentScope.form.formData['model' + i] === 'mongo')) {
					dbObj['multitenant'] = (currentScope.form.formData['multitenant' + i] === 'true');
				}
				if (Object.keys(dbObj).length >= 2 && dbObj[currentScope.form.formData['model' + i]]) {
					dbs.push(dbObj);
				}
			}
		}
		
		var yaml = currentScope.schemaCode.trim();
		
		if (yaml === '' && type ==='generateService') {
			currentScope.onGenerateError = "172: No YAML Code Found";
			return false;
		}
		
		var serviceName = '';
		if (currentScope.form.formData.serviceName) {
			serviceName = currentScope.form.formData.serviceName.trim();
		}
		if (serviceName === '') {
			currentScope.onGenerateError = "172: Missing required field : service name";
			return false;
		}
		
		var serviceGroup = '';
		if (currentScope.form.formData.serviceGroup) {
			serviceGroup = currentScope.form.formData.serviceGroup.trim();
		}
		if (serviceGroup === '') {
			currentScope.onGenerateError = "172: Missing required field : service group";
			return false;
		}
		
		var servicePort = '';
		if (currentScope.form.formData.servicePort) {
			servicePort = currentScope.form.formData.servicePort;
		}
		if (servicePort === '') {
			currentScope.onGenerateError = "172: Missing required field : service port";
			return false;
		}
		
		var serviceVersion = '';
		if (currentScope.form.formData.serviceVersion) {
			serviceVersion = currentScope.form.formData.serviceVersion;
		}
		if (serviceVersion === '') {
			currentScope.onGenerateError = "172: Missing required field : service version";
			return false;
		}
		
		var requestTimeout = '';
		if (Object.hasOwnProperty.call(currentScope.form.formData, "requestTimeout")) {
			requestTimeout = currentScope.form.formData.requestTimeout;
		}
		if (requestTimeout === '') {
			currentScope.onGenerateError = "172: Missing required field : requestTimeout";
			return false;
		}
		
		var requestTimeoutRenewal = '';
		if (Object.hasOwnProperty.call(currentScope.form.formData, "requestTimeoutRenewal")) {
			requestTimeoutRenewal = currentScope.form.formData.requestTimeoutRenewal;
		}
		if (requestTimeoutRenewal === '') {
			currentScope.onGenerateError = "172: Missing required field : requestTimeoutRenewal";
			return false;
		}
		
		if(type === 'generateService'){
			var options = {
				"method": "send",
				"routeName": "/dashboard/swagger/generate",
				"headers": {
					"Accept": "application/zip"
				},
				"responseType": 'arraybuffer',
				"data": {
					"data": {
						"service": {
							"serviceName": serviceName,
							"serviceGroup": serviceGroup,
							"servicePort": servicePort,
							"serviceVersion": serviceVersion,
							"requestTimeout": requestTimeout,
							"requestTimeoutRenewal": requestTimeoutRenewal,
							"extKeyRequired": extKeyRequired,
							"oauth": oauth,
							"session": session,
							"urac": urac,
							"urac_Profile": urac_Profile,
							"urac_ACL": urac_ACL,
							"provision_ACL": provision_ACL
						},
						"yaml": yaml
					}
				}
			};
			if (dbs && Array.isArray(dbs) && dbs.length > 0) {
				options["data"]['data']['service']["dbs"] = dbs;
			}
			
			currentScope.onGenerateError = '';
			getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
				if (error) {
					currentScope.onGenerateError = `${error.message}`;
				}
				else {
					openSaveAsDialog(currentScope.form.formData.serviceName + ".zip", response, "application/zip");
					currentScope.$parent.go("/endpoints");
				}
			});
		}else{ // save only
			let route = 'add';
			let method = 'post';
			if(currentScope.mode === 'edit'){
				method = 'put';
				route = 'edit';
			}
			
			let _id = currentScope.serviceOnEditId;
			
			var options = {
				"method": method,
				"routeName": "/dashboard/apiBuilder/"+route,
				"headers": {
					'Content-Type': 'application/json'
				},
				"params": {
					"mainType": "services",
					"id": _id
				},
				"data": {
					"serviceName": serviceName,
					"serviceGroup": serviceGroup,
					"servicePort": servicePort,
					"serviceVersion": serviceVersion,
					"requestTimeout": requestTimeout,
					"requestTimeoutRenewal": requestTimeoutRenewal,
					"extKeyRequired": extKeyRequired,
					"oauth": oauth,
					"session": session,
					"urac": urac,
					"urac_Profile": urac_Profile,
					"urac_ACL": urac_ACL,
					"provision_ACL": provision_ACL
				}
			};
			if (dbs && Array.isArray(dbs) && dbs.length > 0) {
				options["data"]["dbs"] = dbs;
			}
			
			currentScope.onGenerateError = '';
			getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
				if (error) {
					currentScope.onGenerateError = `${error.message}`;
				}
				else {
					currentScope.$parent.go("/endpoints");
				}
			});
		}
		
	}
	
	/*
	 * This function builds the service information form, add an empty database and give you the ability to add another
	 * database will keeping the index dynamic.
	 */
	function buildSwaggerForm(currentScope) {
		
		var count = 0;
		var infoForm = swaggerEditorConfig.form;
		infoForm.timeout = $timeout;
		
		infoForm.entries.forEach(function (entry) {
			if (entry.name === 'dbs') {
				entry.entries = [];
				var oneClone = angular.copy(dbForm.db);
				var mtRef;
				for (var i = 0; i < oneClone.length; i++) {
					oneClone[i].name = oneClone[i].name.replace("%count%", count);
					if (oneClone[i].name === "multitenant" + count) {
						mtRef = oneClone[i];
					}
					if (oneClone[i].name === "model" + count) {
						oneClone[i].onAction = function (id, data, form) {
							// to disable the multitenant feature if es is selected
							mtRef.disabled = (data === "es");
						}
					}
				}
				entry.entries = entry.entries.concat(oneClone);
				count++;
			}
			
			if (entry.name === 'addDb') {
				entry.onAction = function (id, data, form) {
					var oneClone = angular.copy(dbForm.db);
					var mtRef;
					form.entries.forEach(function (entry) {
						if (entry.name === 'dbs' && entry.type === 'group') {
							for (var i = 0; i < oneClone.length; i++) {
								oneClone[i].name = oneClone[i].name.replace("%count%", count);
								
								if (oneClone[i].name === "multitenant" + count) {
									mtRef = oneClone[i];
								}
								if (oneClone[i].name === "model" + count) {
									oneClone[i].onAction = function (id, data, form) {
										// to disable the multitenant feature if es is selected
										mtRef.disabled = (data === "es");
									}
								}
							}
							entry.entries = entry.entries.concat(oneClone);
						}
					});
					count++;
					form.formData.dbCount = count;
				};
			}
			
			if(currentScope.mode === 'edit'){ // load values
				if (entry.type === 'text' || entry.type === 'number') {
					entry.value = currentScope.form.formData[entry.name];
				}
				
				if (entry.type === 'radio') {
					entry.value.forEach(function (eachValue) {
						eachValue.selected = (String(eachValue.v) === String(currentScope.form.formData[entry.name]));
					});
				}
				
				// for dbs so far
				if (entry.type === 'group') {
					entry.entries = [];
					count = 0;
					currentScope.form.formData[entry.name].forEach(function (eachSavedRecord) {
						let dbs = angular.copy(dbForm.db);
						
						dbs.forEach(function (eachDb) {
							let name = eachDb.name.substring(0, eachDb.name.indexOf('%count%'));
							eachDb.name = eachDb.name.replace('%count%', count);
							
							if (eachDb.type === 'text' || eachDb.type === 'number') {
								eachDb.value = eachSavedRecord[name];
							}
							
							if (eachDb.type === 'select') { // model
								eachDb.value.forEach(function (eachValue) {
									eachValue.selected = eachSavedRecord.hasOwnProperty(eachValue.v);
								});
							}
							
							if (eachDb.type === 'radio') { // multitenant
								eachDb.value.forEach(function (eachValue) {
									eachValue.selected = (String(eachSavedRecord.hasOwnProperty(name)) === String(eachValue.v));
								});
							}
							
							entry.entries.push(eachDb);
						});
						count++;
					});
				}
			}
		});
		
		buildForm(currentScope, null, infoForm, function () {
			currentScope.form.formData.dbCount = count;
		});
	}
	
	return {
		'prepareServiceAndCallApi': prepareServiceAndCallApi,
		'buildSwaggerForm': buildSwaggerForm
	}
}]);
