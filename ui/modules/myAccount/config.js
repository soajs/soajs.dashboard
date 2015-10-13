"use strict";
var loginConfig={
		formConf: {
			'name': 'login',
			'label': 'Login',
			'msgs':{
				'footer': ''
			},
			
			'entries': [
				{
					'name': 'username',
					'label': 'Username',
					'type': 'text',
					'placeholder': 'Enter Username...',
					'value': '',
					'tooltip': 'Usernames are alphanumeric and support _ character only',
					'required': true
				},
				{
					'name': 'password',
					'label': 'Password',
					'type': 'password',
					'placeholder': 'Enter Password...',
					'value': '',
					'fieldMsg':' <a href="#/forgotPw">Forgot your password?</a> ',
					'tooltip': 'Passwords are alphanumeric and support _ character only',
					'required': true
				}
			]			
		}		
};
var resetPwConfig= {
	formConf: {
			'name': 'resetPw',
			'label': 'Reset Password',
			'msgs':{
				'header': 'Please enter a new password',
				'footer': ''
			},			
			'entries': [
				{
						'name': 'password',
						'label': 'New Password',
						'type': 'password',
						'placeholder': 'Enter New Password...',
						'value': '',
						'tooltip': 'Passwords are alphanumeric and support _ character only',
						'required': true
				},
				{
						'name': 'confirmPassword',
						'label': 'Confirm Password',
						'type': 'password',
						'placeholder': 'Re-enter Password...',
						'value': '',
						'tooltip': 'Passwords are alphanumeric and support _ character only',
						'required': true
				}
			]	
				
		}			
};
var setPasswordConfig= {
		formConf: {
				'name': 'resetPw',
				'label': 'Set your Password',			
				'entries': [
					{
							'name': 'password',
							'label': 'Password',
							'type': 'password',
							'placeholder': 'Enter Password...',
							'value': '',
							'tooltip': 'Passwords are alphanumeric and support _ character only',
							'required': true
					},
					{
							'name': 'confirmPassword',
							'label': 'Confirm Password',
							'type': 'password',
							'placeholder': 'Re-enter Password...',
							'value': '',
							'tooltip': 'Passwords are alphanumeric and support _ character only',
							'required': true
					}
				]	
					
			}			
	};
var forgetPwConfig={
		formConf: {
			'name': 'forgotPw',
			'label': 'Forgot Password',
			'msgs':{
				'header': 'Please enter your account email address or username to reset your password',
				'footer': ''
			},
			
			'entries': [
				{
					'name': 'username',
					'label': 'Username',
					'type': 'text',
					'placeholder': 'Enter Username...',
					'value': '',
					'tooltip': 'Usernames are alphanumeric and support _ character only',
					'required': true
				} 
			]	
				
		}		
};

var changePwConfig={
	formConf: {
		'name': 'changePassword',
		'label': 'Change Pw',
		'entries': [
					{
						'name': 'oldPassword',
						'label': 'Old Password',
						'type': 'text',
						'placeholder': 'Enter your Old Password...',
						'value': '',
						'tooltip': 'Passwords are alphanumeric and support _ character only',
						'required': true
					},
					{
						'name': 'password',
						'label': 'New Password',
						'type': 'password',
						'placeholder': 'Enter New Password...',
						'value': '',
						'tooltip': 'Passwords are alphanumeric and support _ character only',
						'required': true
					},
					{
						'name': 'confirmPassword',
						'label': 'Confirm Password',
						'type': 'password',
						'placeholder': 'Re-enter Password...',
						'value': '',
						'tooltip': 'Passwords are alphanumeric and support _ character only',
						'required': true
					}
				 ]	
			
	}		
};
var changeEmailConfig={
		formConf: {
			'name': '',
			'label': '',
			'entries': [
				{
					'name': 'email',
					'label': 'New Email',
					'type': 'email',
					'placeholder': 'Enter Email...',
					'value': '',
					'tooltip': 'myemail@example.domain',
					'required': true
				}
			]	
				
		}		
	};
var registerConfig={
		formConf: {
			'name': 'newProfile',
			'label': 'Register',
			'entries': [
					{
						'name': 'firstName',
						'label': 'First Name',
						'type': 'text',
						'placeholder': 'Enter First Name...',
						'value': '',
						'tooltip': 'Enter the First Name of the User',
						'required': true
					},
					{
						'name': 'lastName',
						'label': 'Last Name',
						'type': 'text',
						'placeholder': 'Enter Last Name...',
						'value': '',
						'tooltip': 'Enter the Last Name of the User',
						'required': true
					},
					{
						'name': 'email',
						'label': 'Email',
						'type': 'email',
						'placeholder': 'Enter Email...',
						'value': '',
						'tooltip': 'myemail@example.domain',
						'required': true
					},
					{
						'name': 'username',
						'label': 'Username',
						'type': 'text',
						'placeholder': 'Enter Username...',
						'value': '',
						'tooltip': 'Usernames are alphanumeric and support _ character only',
						'required': true
					},
					{
						'name': 'password',
						'label': 'Password',
						'type': 'password',
						'placeholder': 'Enter Password...',
						'value': '',
						'tooltip': 'Passwords are alphanumeric and support _ character only',
						'required': true
					},
					{
						'name': 'confirmPassword',
						'label': 'Confirm Password',
						'type': 'password',
						'placeholder': 'Re-enter Password...',
						'value': '',
						'tooltip': 'Passwords are alphanumeric and support _ character only',
						'required': true
					}  
			]					
		}		
};
var profileConfig={
		formConf: {
			'name': 'editProfile',
			'label': 'Edit Profile',
			'instructions': ' instructions ',
			'entries': [
				{
					'name': 'firstName',
					'label': 'First Name',
					'type': 'text',
					'placeholder': 'Enter First Name...',
					'value': '',
					'tooltip': 'Enter the First Name of the User',
					'required': true
				},
				{
					'name': 'lastName',
					'label': 'Last Name',
					'type': 'text',
					'placeholder': 'Enter Last Name...',
					'value': '',
					'tooltip': 'Enter the Last Name of the User',
					'required': true
				},
				{
					'name': 'email',
					'label': 'Email',
					'type': 'readonly',
					'placeholder': 'Enter Email...',
					'tooltip': 'myemail@example.domain',
					'required': true
				},
				
				{
					'name': 'username',
					'label': 'Username',
					'type': 'text',
					'placeholder': 'Enter Username...',
					'value': '',
					'tooltip': 'Usernames are alphanumeric and support _ character only',
					'required': true
				},
				{
					'name': 'profile',
					'label': 'Profile',
					'type': 'textarea',
					'value': '',
					'placeholder': 'JSON object representing your profile ...',
					'tooltip': 'Fill in your additional profile information.',
					'required': false,
					'rows': 10
				}         
		             	 
					         
			            
			]	
				
		}		
};