"use strict";
var productizationService = soajsApp.components;
productizationService.service('aclHelpers', ['aclDrawHelpers', function (aclDrawHelpers) {
	
	function groupApisForDisplay(apisArray, apiGroupName) {
		return aclDrawHelpers.groupApisForDisplay(apisArray, apiGroupName);
	}
	
	function groupApisForPackageDisplay(apisArray, apiGroupName) {
		return aclDrawHelpers.groupApisForPackageDisplay(apisArray, apiGroupName);
	}
	
	function fillAcl(currentScope) {
		var count = 0;
		var myAcl = {};
		var envCodes = currentScope.environments_codes;
		var aclFill = currentScope.aclFill;
		envCodes.forEach(function (oneEnv) {
			if (aclFill && aclFill[oneEnv.code.toLowerCase()]) {
				if (objectIsEnv(aclFill[oneEnv.code.toLowerCase()])) {
					count++;
					myAcl[oneEnv.code.toUpperCase()] = aclFill[oneEnv.code.toLowerCase()];
					propagateAcl(currentScope, myAcl[oneEnv.code.toUpperCase()]);
				}
			}
		});
		
		if (count === 0) {
			//old schema
			myAcl[envCodes[0].code.toUpperCase()] = aclFill;
			propagateAcl(currentScope, myAcl[envCodes[0].code.toUpperCase()]);
			envCodes.forEach(function (oneEnv) {
				if (oneEnv.code !== envCodes[0].code) {
					myAcl[oneEnv.code.toUpperCase()] = angular.copy(myAcl[envCodes[0].code]);
				}
			});
			currentScope.msg.type = 'warning';
			currentScope.msg.msg = translation.warningMsgAcl[LANG];
		}
		currentScope.aclFill = myAcl;
		
		overlayLoading.hide();
	}
	
	function fillPackageAcl(currentScope) {
		var count = 0;
		var myAcl = {};
		var envCodes = currentScope.environments_codes;
		var aclFill = currentScope.aclFill;
		envCodes.forEach(function (oneEnv) {
			if (aclFill[oneEnv.code.toLowerCase()]) {
				if (objectIsEnv(aclFill[oneEnv.code.toLowerCase()])) {
					count++;
					myAcl[oneEnv.code.toUpperCase()] = aclFill[oneEnv.code.toLowerCase()];
					propagatePackageAcl(currentScope, myAcl[oneEnv.code.toUpperCase()], envCodes[0].code);
				}
			}
		});
		
		if (count === 0) {
			//old schema
			myAcl[envCodes[0].code.toUpperCase()] = aclFill;
			propagatePackageAcl(currentScope, myAcl[envCodes[0].code.toUpperCase()], envCodes[0].code);
			envCodes.forEach(function (oneEnv) {
				if (oneEnv.code !== envCodes[0].code) {
					myAcl[oneEnv.code.toUpperCase()] = angular.copy(myAcl[envCodes[0].code]);
				}
			});
			currentScope.msg.type = 'warning';
			currentScope.msg.msg = translation.warningMsgAcl[LANG];
		}
		currentScope.aclFill = myAcl;
		
		overlayLoading.hide();
	}
	
	function propagateAcl(currentScope, aclFill) {
		for (var serviceName in aclFill) {
			if (aclFill.hasOwnProperty(serviceName)) {
				var currentService = {};
				for (var x = 0; x < currentScope.allServiceApis.length; x++) {
					if (currentScope.allServiceApis[x].name === serviceName) {
						currentService = currentScope.allServiceApis[x];
						break;
					}
				}
				aclDrawHelpers.fillServiceAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.fillServiceApiAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.applyApiRestriction(aclFill, currentService);
			}
		}
	}
	
	function propagatePackageAcl(currentScope, aclFill, code) {
		for (var serviceName in aclFill) {
			if (aclFill.hasOwnProperty(serviceName)) {
				var currentService = {};
				for (var x = 0; x < currentScope.allServiceApis.length; x++) {
					if (currentScope.allServiceApis[x].name === serviceName) {
						currentService = currentScope.allServiceApis[x];
						break;
					}
				}
				// currentService = compareWithScope(currentScope, currentService, code);
				// console.log(currentService)
				aclDrawHelpers.fillServiceAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.fillServiceApiAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.applyApiRestriction(aclFill, currentService);
			}
		}
	}
	
	function compareWithScope(currentScope, service, code) {
		let scopeAcl = angular.copy(currentScope.aclScopeFill);
		if (scopeAcl[code.toLowerCase()] && scopeAcl[code.toLowerCase()][service.name] ) {
			if (Object.keys(scopeAcl[code.toLowerCase()][service.name]).length > 0){
				Object.keys(service.versions).forEach((oneVersion)=>{
					if (!scopeAcl[code.toLowerCase()][service.name] [oneVersion]){
						delete service.versions[oneVersion];
					}
				});
			}
		} else {
			service = {}
		}
		return service
	}
	
	
	function applyPermissionRestriction(scope, envCode, service) {
		var aclFill = scope.aclFill[envCode];
		aclDrawHelpers.applyApiRestriction(aclFill, service);
	}
	
	function checkForGroupDefault(scope, envCode, service, grp, val, myApi, v) {
		var aclFill = scope.aclFill[envCode];
		aclDrawHelpers.checkForGroupDefault(aclFill, service, grp, val, myApi, v);
	}
	
	function constructAclFromPost(aclFill, pak) {
		var aclObj = {};
		for (var envCode in aclFill) {
			aclObj[envCode.toLowerCase()] = {};
			if (!pak){
				var result = aclFromPostPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
			}
			else {
				var result = aclFromPostPackPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
			}
			
			if (!result.valid) {
				return result;
			}
			if (Object.keys(aclObj[envCode.toLowerCase()]).length === 0) {
				delete aclObj[envCode.toLowerCase()];
			}
		}
		if (result.valid) {
			result.data = aclObj;
		}
		return result;
	}
	
	function aclFromPostPerEnv(aclEnvFill, aclEnvObj) {
		if (!aclDrawHelpers.prepareSaveObject(aclEnvFill, aclEnvObj).valid) {
			return {'valid': false, 'data': aclEnvObj};
		}
		
		return {'valid': true, 'data': aclEnvObj};
	}
	function aclFromPostPackPerEnv(aclEnvFill, aclEnvObj) {
		if (!aclDrawHelpers.prepareSaveObjectPack(aclEnvFill, aclEnvObj).valid) {
			return {'valid': false, 'data': aclEnvObj};
		}
		
		return {'valid': true, 'data': aclEnvObj};
	}
	
	return {
		'groupApisForDisplay': groupApisForDisplay,
		'fillAcl': fillAcl,
		'fillPackageAcl': fillPackageAcl,
		'applyPermissionRestriction': applyPermissionRestriction,
		'checkForGroupDefault': checkForGroupDefault,
		'constructAclFromPost': constructAclFromPost,
		'groupApisForPackageDisplay': groupApisForPackageDisplay
	}
}]);