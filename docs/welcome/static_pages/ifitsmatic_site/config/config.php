<?php
// If It's Magic - Configuration File
// This file should be kept secure and not publicly accessible

// Security check - only allow access from our form handler
if (!defined('FORM_HANDLER_ACCESS')) {
    http_response_code(403);
    die('Access denied');
}

// Email configuration
define('NOTIFICATION_EMAIL', 'email@ifitsmagic.com');
define('FROM_EMAIL', 'noreply@ifitsmagic.com');

// SMTP Configuration - Dreamhost settings (iPhone setup style)
define('SMTP_HOST', 'smtp.dreamhost.com');
define('SMTP_PORT', 587); // STARTTLS port for Dreamhost
define('SMTP_USERNAME', 'noreply@ifitsmagic.com');
define('SMTP_PASSWORD', 'mpeqyj9jnx3TQXxqn');
define('SMTP_ENCRYPTION', 'tls'); // STARTTLS for port 587

// Security settings
define('MAX_SUBMISSIONS_PER_HOUR', 20);
define('MAX_NAME_LENGTH', 100);
define('MAX_NOTE_LENGTH', 1000);

// Spam detection keywords
$SPAM_KEYWORDS = [
    'viagra', 'cialis', 'casino', 'loan', 'crypto', 'bitcoin',
    'investment', 'millionaire', 'lottery', 'winner', 'congratulations',
    'urgent', 'click here', 'make money', 'work from home', 'free money'
];

return [
    'notification_email' => NOTIFICATION_EMAIL,
    'from_email' => FROM_EMAIL,
    'smtp_host' => SMTP_HOST,
    'smtp_port' => SMTP_PORT,
    'smtp_username' => SMTP_USERNAME,
    'smtp_password' => SMTP_PASSWORD,
    'smtp_encryption' => SMTP_ENCRYPTION,
    'max_submissions_per_hour' => MAX_SUBMISSIONS_PER_HOUR,
    'max_name_length' => MAX_NAME_LENGTH,
    'max_note_length' => MAX_NOTE_LENGTH,
    'spam_keywords' => $SPAM_KEYWORDS
];
?>