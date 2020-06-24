"use strict";
var productizationService = soajsApp.components;
productizationService.service('aclHelpers', ['aclDrawHelpers', function (aclDrawHelpers) {
	
	function applyPermissionRestriction(aclFill) {
		aclDrawHelpers.applyApiRestriction(aclFill);
	}
	
	function constructAclFromPost(aclFill, pak, env) {
		var aclObj = {
			[env.toLowerCase()] : {}
		};
		
		for (var envCode in aclFill) {
			if (envCode.toLowerCase() === env.toLowerCase()){
				aclObj[envCode.toLowerCase()] = {};
				if (!pak) {
					var result = aclFromPostPerEnv(aclFill[env.toUpperCase()], aclObj[env.toLowerCase()]);
				} else if(pak === "apiGroup"){
					var result = aclFromPostPackPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
				}
				else {
					var result = aclFromPostPackGranularPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
				}
				
				if (!result.valid) {
					return result;
				}
			}
		}
		if (result && result.valid) {
			result.data = aclObj;
			
		}
		else if (!result && pak === 'granular') {
			result =  {
				valid : true,
				data: {}
			};
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
	
	function aclFromPostPackGranularPerEnv(aclEnvFill, aclEnvObj) {
		if (!aclDrawHelpers.prepareSaveObjectPackGranular(aclEnvFill, aclEnvObj).valid) {
			return {'valid': false, 'data': aclEnvObj};
		}
		
		return {'valid': true, 'data': aclEnvObj};
	}
	
	return {
		'applyPermissionRestriction': applyPermissionRestriction,
		'constructAclFromPost': constructAclFromPost,
	}
}]);