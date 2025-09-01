<?php
// Async Email Delivery Verification Script
// Runs in background to check if email was actually delivered

if ($argc < 3) {
    die("Usage: php check_delivery.php <email> <message_id>\n");
}

$email = $argv[1];
$message_id = $argv[2];
$debug_file = __DIR__ . '/../data/email_debug.log';

// Wait a few seconds for mail to process
sleep(5);

$timestamp = date('Y-m-d H:i:s');

// Check mail queue
$queue_check = shell_exec('mailq 2>/dev/null | grep -c "^[A-F0-9]"');
$queue_count = trim($queue_check);

file_put_contents($debug_file, "$timestamp - [$message_id] Mail queue check: $queue_count messages queued\n", FILE_APPEND);

// Check system mail logs for our email
$log_patterns = [
    '/var/log/mail.log',
    '/var/log/maillog',
    '/var/log/exim4/mainlog',
    '/home/*/logs/*/mail.log'
];

$found_delivery = false;
$delivery_status = 'UNKNOWN';

foreach ($log_patterns as $log_pattern) {
    $log_files = glob($log_pattern);
    foreach ($log_files as $log_file) {
        if (is_readable($log_file)) {
            // Check last 50 lines for our email
            $recent_logs = shell_exec("tail -50 '$log_file' 2>/dev/null | grep -i '$email'");
            if ($recent_logs) {
                file_put_contents($debug_file, "$timestamp - [$message_id] Found mail log entries for $email\n", FILE_APPEND);
                
                // Look for delivery indicators
                if (strpos($recent_logs, 'delivered') !== false || strpos($recent_logs, 'accepted') !== false) {
                    $delivery_status = 'DELIVERED';
                    $found_delivery = true;
                } elseif (strpos($recent_logs, 'bounced') !== false || strpos($recent_logs, 'failed') !== false) {
                    $delivery_status = 'FAILED';
                    $found_delivery = true;
                } elseif (strpos($recent_logs, 'deferred') !== false || strpos($recent_logs, 'retry') !== false) {
                    $delivery_status = 'DEFERRED';
                    $found_delivery = true;
                }
                break 2;
            }
        }
    }
}

// Check if it's a local delivery (same domain)
if (strpos($email, '@ifitsmagic.com') !== false) {
    file_put_contents($debug_file, "$timestamp - [$message_id] Local delivery attempted to $email\n", FILE_APPEND);
    
    // For local delivery, check if mail directory exists
    $local_mail_dirs = [
        "/home/*/mail/$email/",
        "/home/*/Maildir/",
        "/var/mail/" . substr($email, 0, strpos($email, '@'))
    ];
    
    foreach ($local_mail_dirs as $mail_dir_pattern) {
        $mail_dirs = glob($mail_dir_pattern);
        foreach ($mail_dirs as $mail_dir) {
            if (is_dir($mail_dir)) {
                file_put_contents($debug_file, "$timestamp - [$message_id] Found local mail directory: $mail_dir\n", FILE_APPEND);
                
                // Check for recent mail files
                $recent_mail = shell_exec("find '$mail_dir' -type f -newer /tmp -exec ls -la {} \; 2>/dev/null | head -5");
                if ($recent_mail) {
                    file_put_contents($debug_file, "$timestamp - [$message_id] Recent mail files found in local mailbox\n", FILE_APPEND);
                    $delivery_status = 'LOCAL_DELIVERED';
                    $found_delivery = true;
                }
                break 2;
            }
        }
    }
}

// Final status
if (!$found_delivery) {
    file_put_contents($debug_file, "$timestamp - [$message_id] No delivery confirmation found - email may be queued or logs not accessible\n", FILE_APPEND);
    
    // Try to ping the mail server
    $smtp_test = shell_exec("echo 'QUIT' | nc -w 5 smtp.dreamhost.com 587 2>/dev/null");
    if ($smtp_test) {
        file_put_contents($debug_file, "$timestamp - [$message_id] SMTP server responsive - likely delivery issue\n", FILE_APPEND);
    } else {
        file_put_contents($debug_file, "$timestamp - [$message_id] SMTP server connection test failed\n", FILE_APPEND);
    }
} else {
    file_put_contents($debug_file, "$timestamp - [$message_id] Final delivery status: $delivery_status\n", FILE_APPEND);
}

// Wait a bit more and do a second check
sleep(10);

$final_queue_check = shell_exec('mailq 2>/dev/null | grep -c "^[A-F0-9]"');
$final_queue_count = trim($final_queue_check);

file_put_contents($debug_file, "$timestamp - [$message_id] Final mail queue check: $final_queue_count messages queued\n", FILE_APPEND);

if ($queue_count !== $final_queue_count) {
    file_put_contents($debug_file, "$timestamp - [$message_id] Mail queue changed - message likely processed\n", FILE_APPEND);
} else {
    file_put_contents($debug_file, "$timestamp - [$message_id] Mail queue unchanged - message may be stuck or delivered\n", FILE_APPEND);
}
?>