<?php
// If It's Magic - Early Access Form Handler
// Secure PHP script to handle form submissions and send emails

// SMTP Email Function
function sendSMTPEmail($host, $port, $username, $password, $encryption, $from, $to, $subject, $body, $replyTo = null) {
    $socket = null;
    $debug_log = [];
    
    try {
        // Create connection
        $context = stream_context_create();
        if ($encryption === 'ssl') {
            $socket = stream_socket_client("ssl://$host:$port", $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);
        } else {
            $socket = stream_socket_client("$host:$port", $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);
        }
        
        if (!$socket) {
            error_log("SMTP Error: Cannot connect to $host:$port - $errno: $errstr");
            return false;
        }
        
        $debug_log[] = "Connected to $host:$port";
        
        // Read initial response
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '220') {
            return false;
        }
        
        // EHLO
        fwrite($socket, "EHLO " . $_SERVER['HTTP_HOST'] . "\r\n");
        $response = fgets($socket, 515);
        
        // STARTTLS if needed
        if ($encryption === 'tls') {
            fwrite($socket, "STARTTLS\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) != '220') {
                return false;
            }
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            
            // EHLO again after TLS
            fwrite($socket, "EHLO " . $_SERVER['HTTP_HOST'] . "\r\n");
            $response = fgets($socket, 515);
        }
        
        // AUTH LOGIN
        fwrite($socket, "AUTH LOGIN\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '334') {
            return false;
        }
        
        // Username
        fwrite($socket, base64_encode($username) . "\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '334') {
            return false;
        }
        
        // Password  
        fwrite($socket, base64_encode($password) . "\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '235') {
            return false;
        }
        
        // MAIL FROM
        fwrite($socket, "MAIL FROM: <$from>\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '250') {
            return false;
        }
        
        // RCPT TO
        fwrite($socket, "RCPT TO: <$to>\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '250') {
            return false;
        }
        
        // DATA
        fwrite($socket, "DATA\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '354') {
            return false;
        }
        
        // Email headers and body
        $headers = "From: If Its Magic <$from>\r\n";
        if ($replyTo) {
            $headers .= "Reply-To: <$replyTo>\r\n";
        }
        $headers .= "To: <$to>\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "X-Mailer: PHP SMTP\r\n";
        $headers .= "\r\n";
        
        fwrite($socket, $headers . $body . "\r\n.\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '250') {
            return false;
        }
        
        // QUIT
        fwrite($socket, "QUIT\r\n");
        fclose($socket);
        
        return true;
        
    } catch (Exception $e) {
        error_log("SMTP Exception: " . $e->getMessage());
        if ($socket) {
            fclose($socket);
        }
        return false;
    } finally {
        // Log debug info
        if (!empty($debug_log)) {
            error_log("SMTP Debug: " . implode(" | ", $debug_log));
        }
    }
}

// Load secure configuration from config folder (outside public)
define('FORM_HANDLER_ACCESS', true);
$config = require_once __DIR__ . '/../config/config.php';

// Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Rate limiting (simple file-based) - store in data folder (outside public)
$rate_limit_file = __DIR__ . '/../data/rate_limit.json';
$max_submissions_per_hour = $config['max_submissions_per_hour'];
$current_time = time();

// Create data directory if it doesn't exist (outside public)
if (!is_dir(__DIR__ . '/../data')) {
    mkdir(__DIR__ . '/../data', 0755, true);
}

if (file_exists($rate_limit_file)) {
    $rate_data = json_decode(file_get_contents($rate_limit_file), true);
    if ($rate_data && ($current_time - $rate_data['timestamp']) < 3600) {
        if ($rate_data['count'] >= $max_submissions_per_hour) {
            http_response_code(429);
            echo json_encode(['success' => false, 'message' => 'Too many submissions. Please try again later.']);
            exit;
        }
        $rate_data['count']++;
    } else {
        $rate_data = ['timestamp' => $current_time, 'count' => 1];
    }
} else {
    $rate_data = ['timestamp' => $current_time, 'count' => 1];
}

file_put_contents($rate_limit_file, json_encode($rate_data));

// Get and validate input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
    exit;
}

// Sanitize and validate required fields
$name = isset($input['name']) ? trim(strip_tags($input['name'])) : '';
$email = isset($input['email']) ? trim(strtolower($input['email'])) : '';
$note = isset($input['note']) ? trim(strip_tags($input['note'])) : '';

// Validation
if (empty($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Name is required']);
    exit;
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Valid email is required']);
    exit;
}

if (strlen($name) > $config['max_name_length']) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Name too long']);
    exit;
}

if (strlen($note) > $config['max_note_length']) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Note too long']);
    exit;
}

// Basic spam detection
$spam_keywords = $config['spam_keywords'];
$combined_text = strtolower($name . ' ' . $email . ' ' . $note);

foreach ($spam_keywords as $keyword) {
    if (strpos($combined_text, $keyword) !== false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Submission rejected']);
        exit;
    }
}

// Prepare email
$to = $config['notification_email'];
$subject = '✨ New Early Access Signup - If It\'s Magic';
$timestamp = date('Y-m-d H:i:s T');

$email_body = "
🌟 New Early Access Signup for If It's Magic!

📅 Submitted: {$timestamp}
👤 Name: {$name}
📧 Email: {$email}

💬 Note to team:
" . ($note ? $note : '(No note provided)') . "

---
Sent from ifitsmagic.com early access form
";

$headers = [
    'From: If Its Magic <' . $config['from_email'] . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
    'Return-Path: ' . $config['from_email'],
    'X-Priority: 3'
];

// Try basic mail() function first with proper headers
$headers_array = [
    'From: If Its Magic <' . $config['from_email'] . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0'
];

// Create debug log file
$debug_file = __DIR__ . '/../data/email_debug.log';

$email_sent = mail($to, $subject, $email_body, implode("\r\n", $headers_array));

file_put_contents($debug_file, date('Y-m-d H:i:s') . " - Basic mail() result: " . ($email_sent ? 'SUCCESS' : 'FAILED') . "\n", FILE_APPEND);

// If basic mail fails, try SMTP
if (!$email_sent) {
    file_put_contents($debug_file, date('Y-m-d H:i:s') . " - Trying SMTP...\n", FILE_APPEND);
    
    $email_sent = sendSMTPEmail(
        $config['smtp_host'],
        $config['smtp_port'], 
        $config['smtp_username'],
        $config['smtp_password'],
        $config['smtp_encryption'],
        $config['from_email'],
        $to,
        $subject,
        $email_body,
        $email // reply-to
    );
    
    file_put_contents($debug_file, date('Y-m-d H:i:s') . " - SMTP result: " . ($email_sent ? 'SUCCESS' : 'FAILED') . "\n", FILE_APPEND);
} else {
    file_put_contents($debug_file, date('Y-m-d H:i:s') . " - Email sent via basic mail() to: $to\n", FILE_APPEND);
    
    // Schedule async delivery check
    $check_script = __DIR__ . '/../scripts/check_delivery.php';
    $message_id = 'msg_' . time() . '_' . rand(1000, 9999);
    file_put_contents($debug_file, date('Y-m-d H:i:s') . " - Message ID: $message_id - scheduling delivery check\n", FILE_APPEND);
    
    // Run async check in background
    if (file_exists($check_script)) {
        $cmd = "php $check_script '$to' '$message_id' > /dev/null 2>&1 &";
        exec($cmd);
    }
}

if ($email_sent) {
    // Log successful submission (outside web root)
    $log_entry = [
        'timestamp' => $timestamp,
        'name' => $name,
        'email' => $email,
        'has_note' => !empty($note),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    
    $log_file = __DIR__ . '/../data/submissions.log';
    file_put_contents($log_file, json_encode($log_entry) . "\n", FILE_APPEND | LOCK_EX);
    
    echo json_encode([
        'success' => true, 
        'message' => 'Thank you! We\'ll be in touch soon.'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Sorry, there was an error sending your submission. Please try again.'
    ]);
}
?>