const BrainXchangeClient = require('../client/brainxchange-client');

async function testCompleteFlow() {
  console.log('🧪 Testing BrainXchange Complete Flow\n');
  
  // Create two clients (Igor and Zack)
  const igor = new BrainXchangeClient();
  const zack = new BrainXchangeClient();

  try {
    // Step 1: Connect both clients
    console.log('📡 Connecting Igor to server...');
    const igorId = await igor.connect();
    console.log(`✅ Igor connected with ID: ${igorId}`);
    
    console.log('🆔 Igor identifying...');
    await igor.identify('igor@test.com', 'Igor Rodriguez');
    console.log('✅ Igor identified');

    console.log('\n📡 Connecting Zack to server...');
    const zackId = await zack.connect();
    console.log(`✅ Zack connected with ID: ${zackId}`);
    
    console.log('🆔 Zack identifying...');
    await zack.identify('zack@test.com', 'Zack Chen');
    console.log('✅ Zack identified');

    // Step 2: Igor creates invitation
    console.log('\n🎟️ Igor creating invitation code...');
    const invite = await igor.createInvite();
    console.log(`✅ Invitation created: ${invite.code} (expires in ${invite.expiresIn})`);

    // Step 3: Set up message handlers for both clients
    igor.onQuestion((content, from) => {
      console.log(`\n❓ Igor received question from ${from}: "${content}"`);
    });

    igor.onAnswer(async (content, from) => {
      // content is the actual message content, not the full message object
      console.log(`\n💬 Igor received answer: "${content}"`);
      console.log('\n✨ Test completed successfully!');
      
      // Clean up
      igor.disconnect();
      zack.disconnect();
      process.exit(0);
    });

    zack.onQuestion(async (content, from) => {
      // content is the actual message content, not the full message object  
      console.log(`\n❓ Zack received question: "${content}"`);
      
      // Zack's magi searches his knowledge and responds
      console.log('🔍 Zack\'s magi searching knowledge base...');
      setTimeout(async () => {
        const answer = 'My favorite sushi is salmon nigiri and spicy tuna rolls!';
        console.log('📤 Zack\'s magi sending answer...');
        await zack.answer(answer);
      }, 1000);
    });

    zack.onAnswer((content, from) => {
      console.log(`\n💬 Zack received answer: "${content}"`);
    });

    igor.onFriendConnected(() => {
      console.log('👥 Igor: Friend connected!');
    });

    zack.onFriendConnected(() => {
      console.log('👥 Zack: Friend connected!');
    });

    // Step 4: Zack connects using invitation code
    console.log(`\n🔗 Zack connecting with code: ${invite.code}...`);
    const connectionId = await zack.connectWithCode(invite.code);
    console.log(`✅ Connection established: ${connectionId}`);

    // Wait a moment for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 5: Igor asks Zack about sushi
    console.log('\n🍣 Igor asking Zack about favorite sushi...');
    await igor.ask('What\'s your favorite sushi?');
    console.log('✅ Question sent');

    // Keep the script running to receive responses
    setTimeout(() => {
      console.log('\n⏱️ Test timeout - no response received');
      igor.disconnect();
      zack.disconnect();
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    igor.disconnect();
    zack.disconnect();
    process.exit(1);
  }
}

// Run the test
console.log('═'.repeat(50));
console.log(' BRAINXCHANGE - END-TO-END TEST');
console.log('═'.repeat(50));
testCompleteFlow();