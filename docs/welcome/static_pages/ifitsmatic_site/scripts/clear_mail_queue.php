<?php
// Mail Queue Management Script
// Clear stuck emails and restart mail processing

echo "🔧 Mail Queue Management Tool\n";
echo "========================================\n";

// Check current queue status
echo "📊 Checking current mail queue...\n";
$queue_output = shell_exec('mailq 2>/dev/null');
echo $queue_output . "\n";

$queue_count = shell_exec('mailq 2>/dev/null | grep -c "^[A-F0-9]"');
$queue_count = trim($queue_count);
echo "📫 Current queue count: $queue_count messages\n\n";

if ($queue_count > 0) {
    echo "🧹 Attempting to clear mail queue...\n";
    
    // Try different methods to clear the queue
    $methods = [
        'postsuper -d ALL' => 'Postfix queue clear',
        'exim -bp | grep "^[0-9]" | awk {\'print $3\'} | xargs exim -Mrm' => 'Exim queue clear',
        'sendmail -q' => 'Force sendmail queue processing',
        'sudo service postfix restart' => 'Restart Postfix',
        'sudo service exim4 restart' => 'Restart Exim4'
    ];
    
    foreach ($methods as $command => $description) {
        echo "⚡ Trying: $description\n";
        $result = shell_exec("$command 2>&1");
        if ($result) {
            echo "   Result: " . trim($result) . "\n";
        }
        
        // Check if queue was cleared
        $new_count = shell_exec('mailq 2>/dev/null | grep -c "^[A-F0-9]"');
        $new_count = trim($new_count);
        if ($new_count < $queue_count) {
            echo "✅ Success! Queue reduced from $queue_count to $new_count\n";
            $queue_count = $new_count;
            break;
        }
        echo "   No change in queue size\n\n";
    }
} else {
    echo "✅ Mail queue is already empty\n";
}

// Check mail services status
echo "\n🔍 Checking mail services...\n";
$services = ['postfix', 'exim4', 'sendmail'];
foreach ($services as $service) {
    $status = shell_exec("pgrep $service 2>/dev/null");
    if ($status) {
        echo "✅ $service is running\n";
    } else {
        echo "❌ $service is not running\n";
    }
}

// Check mail configuration
echo "\n📋 Mail configuration check...\n";
$hostname = trim(shell_exec('hostname'));
echo "🏠 Server hostname: $hostname\n";

$mail_name = file_get_contents('/etc/mailname') ?? 'Not found';
echo "📮 Mail name: " . trim($mail_name) . "\n";

// Test basic mail functionality
echo "\n🧪 Testing basic mail functionality...\n";
$test_email = 'test@example.com';
$test_result = mail($test_email, 'Queue Clear Test', 'This is a test email after queue clear', 'From: postmaster@' . $hostname);
echo ($test_result ? "✅ Basic mail() function working" : "❌ Basic mail() function failed") . "\n";

// Final queue check
echo "\n📊 Final mail queue status...\n";
$final_queue = shell_exec('mailq 2>/dev/null');
echo $final_queue . "\n";

$final_count = shell_exec('mailq 2>/dev/null | grep -c "^[A-F0-9]"');
$final_count = trim($final_count);
echo "📫 Final queue count: $final_count messages\n";

// Log the queue clearing attempt
$debug_file = __DIR__ . '/../data/email_debug.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($debug_file, "$timestamp - QUEUE_CLEAR: Attempted queue clear, final count: $final_count\n", FILE_APPEND);

echo "\n🎉 Mail queue management complete!\n";
?>