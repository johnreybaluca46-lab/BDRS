import Swal from 'sweetalert2';

// 1. Login Failed
export const showLoginFailedAlert = (text = 'Invalid email or password.') => {
  return Swal.fire({
    title: 'Login Failed',
    text: text,
    icon: 'error',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 2. Login Successful
export const showLoginSuccessAlert = (text = 'Welcome back!') => {
  return Swal.fire({
    title: 'Login Successful',
    text: text,
    icon: 'success',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000
  });
};

// 3. Account Not Found
export const showAccountNotFoundAlert = (text = 'No account was found with this email.') => {
  return Swal.fire({
    title: 'Account Not Found',
    text: text,
    icon: 'error',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 4. Incorrect Password
export const showIncorrectPasswordAlert = (text = 'The password you entered is incorrect.') => {
  return Swal.fire({
    title: 'Incorrect Password',
    text: text,
    icon: 'error',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 5. Missing Information
export const showMissingInformationAlert = (text = 'Please fill in all required fields.') => {
  return Swal.fire({
    title: 'Missing Information',
    text: text,
    icon: 'warning',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 6. Email Not Verified
export const showEmailNotVerifiedAlert = (text = 'Please verify your email before logging in.') => {
  return Swal.fire({
    title: 'Email Not Verified',
    text: text,
    icon: 'warning',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 7. Account Disabled
export const showAccountDisabledAlert = (text = 'Your account has been disabled. Please contact the administrator.') => {
  return Swal.fire({
    title: 'Account Disabled',
    text: text,
    icon: 'error',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

export const showAccountPendingAlert = (text = 'Your account is still pending admin approval.') => {
  return Swal.fire({
    title: 'Account Pending',
    text: text,
    icon: 'info',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

export const showAccountRejectedAlert = (text = 'Your resident registration has been rejected.') => {
  return Swal.fire({
    title: 'Registration Rejected',
    text: text,
    icon: 'error',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 8. Registration Successful
export const showRegistrationSuccessAlert = (text = 'Your account has been created successfully.') => {
  return Swal.fire({
    title: 'Registration Successful',
    text: text,
    icon: 'success',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 9. Registration Failed
export const showRegistrationFailedAlert = (text = 'Unable to create your account. Please try again.') => {
  return Swal.fire({
    title: 'Registration Failed',
    text: text,
    icon: 'error',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 10. Session Expired
export const showSessionExpiredAlert = (text = 'Your session has expired. Please log in again.') => {
  return Swal.fire({
    title: 'Session Expired',
    text: text,
    icon: 'warning',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 11. Password Changed
export const showPasswordChangedAlert = (text = 'Your password has been updated successfully.') => {
  return Swal.fire({
    title: 'Password Changed',
    text: text,
    icon: 'success',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 12. Logout Confirmation
export const confirmLogoutAlert = (onConfirm, customText = 'Are you sure you want to log out?') => {
  return Swal.fire({
    title: 'Logout Confirmation',
    text: customText,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#e53e3e',
    cancelButtonColor: '#a0aec0',
    confirmButtonText: 'Logout'
  }).then((result) => {
    if (result.isConfirmed && onConfirm) {
      onConfirm();
    }
  });
};

// 13. Logout Successful
export const showLogoutSuccessAlert = (text = 'You have been logged out successfully.') => {
  return Swal.fire({
    title: 'Logout Successful',
    text: text,
    icon: 'success',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};

// 14. Gmail Does Not Exist
export const showGmailDoesNotExistAlert = () => {
  return Swal.fire({
    title: 'Email Does Not Exist',
    text: 'The Gmail account you entered does not exist. Please use a valid Gmail account.',
    icon: 'error',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
};
