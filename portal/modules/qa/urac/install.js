"use strict";
var uracModuleQa = uiModuleQa + '/urac';

var uracModuleQaTranslation = {
	"uracManagement": {
		"ENG": "Urac Management",
		"FRA": "Urac Management"
	},
	"uracTenantManagement": {
		"ENG": "Tenant Urac Management",
		"FRA": "Tenant Urac Management"
	},
	"manageURAC": {
		"ENG": "Manage URAC",
		"FRA": "Manage URAC"
	},
	"tokensUserId": {
		"ENG": "User",
		"FRA": "User"
	},
	"tokensToken": {
		"ENG": "Token",
		"FRA": "Token"
	},
	"tokensExpires": {
		"ENG": "Expiry Date",
		"FRA": "Date d'expiration"
	},
	"tokensStatus": {
		"ENG": "Status",
		"FRA": "Status"
	},
	"tokensService": {
		"ENG": "Service",
		"FRA": "Service"
	},
	"areYouSureWantDeleteSelectedToken": {
		"ENG": "Are you sure you want to delete selected token(s)",
		"FRA": "Etes vouz sure que vous voulez suprimer le token "
	},
	"errorMessageDeleteToken": {
		"ENG": "Unable to delete Token.",
		"FRA": "Unable to delete Token."
	},
	"successMessageDeleteToken": {
		"ENG": "Token deleted successfully.",
		"FRA": "Token deleted successfully."
	},
	"tokens": {
		"ENG": "Tokens",
		"FRA": "Tokens"
	},
	"tenantOrganizationChart": {
		"ENG": "Tenant Organization Chart",
		"FRA": "Tenant Organization Chart"
	},
	"addNewMember": {
		"ENG": "Add New Member",
		"FRA": "Ajouter New Member"
	},
	"addNewGroup": {
		"ENG": "Add New Group",
		"FRA": "Ajouter New Group"
	},
	"myOrganizationChart": {
		"ENG": "My Organization Chart",
		"FRA": "My Organization Chart"
	},
	"userACL": {
		"ENG": "User ACL",
		"FRA": "User ACL"
	},
	//controller
	"needToChooseGroupAccessTypeSetGroups": {
		"ENG": "You need to choose at least one group when the access type is set to Groups",
		"FRA": "You need to choose at least one group when the access type is set to Groups"
	},
	"userAclDeletedSuccessfully": {
		"ENG": "User Acl Deleted Successfully",
		"FRA": "User Acl Deleted Successfully"
	},
	//config
	"formGroupCodePlaceholder": {
		"ENG": "Enter the Code of the group",
		"FRA": "Enter the Code of the group"
	},
	"formGroupCodeTooltip": {
		"ENG": "Group codes are alphanumeric. Maximum length 20 characters",
		"FRA": "Group codes are alphanumeric. Maximum length 20 characters"
	},
	"formGroupNamePlaceHolder": {
		"ENG": "Enter the Name of the group",
		"FRA": "Enter the Name of the group"
	},
	"formGroupDescriptionPlaceholder": {
		"ENG": "Enter the Description of the Group",
		"FRA": "Enter the Description of the Group"
	},
	"formGroupUsersTooltip": {
		"ENG": "Check to add user to group",
		"FRA": "Check to add user to group"
	},
	//services
	//groups
	"linkUsersGroup": {
		"ENG": "Link Users to Group",
		"FRA": "Link Users to Group"
	},
	"areYouSureWantDeleteSelectedGroup": {
		"ENG": "Are you sure you want to delete the selected group(s)?",
		"FRA": "Are you sure you want to delete the selected group(s)?"
	},
	"areYouSureWantDeleteGroup": {
		"ENG": "Are you sure you want to delete this group?",
		"FRA": "Are you sure you want to delete this group?"
	},
	"addGroup": {
		"ENG": "Add Group",
		"FRA": "Add Group"
	},
	"groupAddedSuccessfully": {
		"ENG": "Group Added Successfully",
		"FRA": "Group Added Successfully"
	},
	"editGroup": {
		"ENG": "Edit Group",
		"FRA": "Edit Group"
	},
	"groupUpdatedSuccessfully": {
		"ENG": "Group Updated Successfully",
		"FRA": "Group Updated Successfully"
	},
	"errorMessageDeleteGroup": {
		"ENG": "one or more of the selected Groups(s) status was not deleted",
		"FRA": "one or more of the selected Groups(s) status was not deleted"
	},
	"successMessageDeleteGroup": {
		"ENG": "Selected Groups(s) has been deleted",
		"FRA": "Selected Groups(s) has been deleted"
	},
	"selectedGroupRemoved": {
		"ENG": "Selected group has been removed",
		"FRA": "Selected group has been removed"
	},
	"addUsersGroup": {
		"ENG": "Add Users to Group",
		"FRA": "Add Users to Group"
	},
	"addingUsers": {
		"ENG": "Adding Users",
		"FRA": "Adding Users"
	},
	"UserAddedSuccessfully": {
		"ENG": "User(s) Added Successfully",
		"FRA": "User(s) Added Successfully"
	},
	//members
	"editACL": {
		"ENG": "Edit ACL",
		"FRA": "Edit ACL"
	},
	"areYouSureWantActivateSelectedMember": {
		"ENG": "Are you sure you want to activate the selected member(s)?",
		"FRA": "Are you sure you want to activate the selected member(s)?"
	},
	"areYouSureWantDeactivateSelectedMember": {
		"ENG": "Are you sure you want to deactivate the selected member(s)?",
		"FRA": "Are you sure you want to deactivate the selected member(s)?"
	},
	"assignGroups": {
		"ENG": "Assign groups",
		"FRA": "Assign groups"
	},
	"addMember": {
		"ENG": "Add Member",
		"FRA": "Add Member"
	},
	"memberAddedSuccessfully": {
		"ENG": "Member Added Successfully",
		"FRA": "Member Added Successfully"
	},
	"selectStatusUser": {
		"ENG": "Select the status of the user",
		"FRA": "Select the status of the user"
	},
	"editMember": {
		"ENG": "Edit Member",
		"FRA": "Edit Member"
	},
	"memberUpdatedSuccessfully": {
		"ENG": "Member Updated Successfully",
		"FRA": "Member Updated Successfully"
	},
	"errorMessageActivateMembers": {
		"ENG": "one or more of the selected Member(s) status was not updated",
		"FRA": "one or more of the selected Member(s) status was not updated"
	},
	"successMessageActivateMembers": {
		"ENG": "Selected Member(s) has been activated",
		"FRA": "Selected Member(s) has been activated"
	},
	"errorMessageDeactivateMembers": {
		"ENG": "one or more of the selected Member(s) status was not updated",
		"FRA": "one or more of the selected Member(s) status was not updated"
	},
	"successMessageDeactivateMembers": {
		"ENG": "Selected Member(s) has been deactivated",
		"FRA": "Selected Member(s) has been deactivated"
	},
	//Directives
	//editUserAcl
	"updateACLof": { // Update ACL of (user)
		"ENG": "Update ACL of",
		"FRA": "Update ACL of"
	},
	"areYouSureWantClearACLUser": {
		"ENG": "Are you sure you want to clear the ACL of this user",
		"FRA": "Are you sure you want to clear the ACL of this user"
	},
	"members": {
		"ENG": "Members",
		"FRA": "Members"
	}
};

for (var attrname in uracModuleQaTranslation) {
	translation[attrname] = uracModuleQaTranslation[attrname];
}

var uracModuleQaNav = [
	{
		'id': 'urac-management',
		'label': translation.uracManagement[LANG],
		'url': '#/urac-management',
		'tplPath': uracModuleQa + '/directives/listTenants.tmpl',
		'icon': 'users',
		'checkPermission': {
			'service': 'urac',
			'route': '/owner/admin/listUsers',
			'method': 'get'
		},
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'mainMenu': true,
		'contentMenu': true,
		'tracker': true,
		'order': 100,
		'scripts': [uracModuleQa + '/config.js', uracModuleQa + '/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'urac-tenant-management',
		'label': translation.uracTenantManagement[LANG],
		'url': '#/urac-management/members',
		'tplPath': uracModuleQa + '/directives/members.tmpl',
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'tracker': true,
		'scripts': [
			uracModuleQa + '/config.js',
			uracModuleQa + '/controller.js',
			uracModuleQa + '/services/members.js',
			uracModuleQa + '/services/groups.js',
			uracModuleQa + '/services/tokens.js'
		],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'urac-user-acl',
		'label': 'Edit User Acl',
		'url': '#/urac-management/:uId/editUserAcl',
		'tplPath': uracModuleQa + '/directives/editUserAcl.tmpl',
		'tracker': true,
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'scripts': [
			uracModuleQa + '/config.js',
			uracModuleQa + '/controller.js',
			uracModuleQa + '/services/acl.js'
		],
		'ancestor': [translation.home[LANG], translation.uracTenantManagement[LANG]]
	}
];

navigation = navigation.concat(uracModuleQaNav);