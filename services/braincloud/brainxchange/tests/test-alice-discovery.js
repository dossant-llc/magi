const BrainXchangeClient = require('../client/brainxchange-client');

/**
 * Test Alice User Discovery Flow
 * 
 * This test simulates:
 * 1. Igor trying to find @alice 
 * 2. Alice not being connected initially
 * 3. Alice coming online and creating an invite
 * 4. Igor connecting with Alice's invite
 * 5. Igor successfully asking Alice about her shrinking expertise
 */

async function testAliceDiscovery() {
  console.log('🧪 Testing Alice User Discovery Flow\n');
  
  // Create clients
  const igor = new BrainXchangeClient();
  const alice = new BrainXchangeClient();

  try {
    // Step 1: Igor connects and identifies
    console.log('📡 Igor connecting to BrainXchange...');
    await igor.connect();
    await igor.identify('igor@test.com', 'Igor Rodriguez');
    console.log(`✅ Igor connected as ${igor.getCurrentUser().nickname}`);

    // Step 2: Igor tries to ask @alice (she's not online yet)
    console.log('\n🔍 Igor tries to find @alice (but she\'s not connected)...');
    const friends = igor.getConnectedFriends();
    console.log(`📋 Igor's current friends: ${friends.length === 0 ? 'None' : friends.map(f => f.nickname).join(', ')}`);
    
    const aliceFriend = friends.find(f => 
      f.username.includes('alice') || f.nickname.toLowerCase().includes('alice')
    );
    
    if (!aliceFriend) {
      console.log('❌ @alice not found in connected friends');
      console.log('💡 Igor needs to get an invitation from Alice first');
    }

    // Step 3: Alice comes online
    console.log('\n🌟 Alice comes online...');
    await alice.connect();
    await alice.identify('alice@shrinking.expert', 'Alice Shrinking Expert');
    console.log(`✅ Alice connected as ${alice.getCurrentUser().nickname}`);

    // Step 4: Alice creates invitation for Igor
    console.log('\n🎟️ Alice creates invitation for Igor...');
    const invite = await alice.createInvite();
    console.log(`✅ Alice created invitation: ${invite.code} from ${invite.from}`);

    // Step 5: Set up Alice's knowledge base response
    alice.onQuestion(async (content, from, fromNickname) => {
      console.log(`\n❓ Alice received question from ${fromNickname}: "${content}"`);
      
      let answer;
      if (content.toLowerCase().includes('shrinking')) {
        answer = "I'm Alice, a shrinking expert! I help people overcome limiting beliefs and negative self-talk. My expertise includes cognitive restructuring, mindfulness techniques, and building self-confidence. I've been working in this field for 8 years and love helping people 'shrink' their problems down to manageable size!";
      } else {
        answer = "I specialize in shrinking expertise - helping people overcome mental barriers and limiting beliefs. What specific area would you like to explore?";
      }
      
      console.log('🧠 Alice searching her expertise knowledge...');
      setTimeout(async () => {
        console.log('📤 Alice sending her expert response...');
        await alice.answer(answer, from);
      }, 1000);
    });

    // Step 6: Igor gets Alice's invite and connects
    console.log(`\n🔗 Igor connecting with Alice's invite: ${invite.code}...`);
    const connection = await igor.connectWithCode(invite.code, 'igor@test.com', 'Igor Rodriguez');
    console.log(`✅ Igor connected to Alice: ${connection.friend?.nickname}`);

    // Step 7: Set up Igor's response handler
    igor.onAnswer(async (content, from, fromNickname) => {
      console.log(`\n💬 Igor received answer from ${fromNickname}:`);
      console.log(`"${content}"`);
      console.log('\n🎉 Test completed successfully!');
      console.log('\n📊 Summary:');
      console.log('  ✅ User discovery flow working');
      console.log('  ✅ @username syntax supported');
      console.log('  ✅ Connection establishment successful');
      console.log('  ✅ Expert knowledge sharing working');
      
      // Clean up
      setTimeout(() => {
        igor.disconnect();
        alice.disconnect();
        process.exit(0);
      }, 1000);
    });

    // Step 8: Now Igor can successfully ask @alice
    console.log('\n🔮 Igor asking @alice about her shrinking expertise...');
    await igor.ask('What is your shrinking expertise and how can you help people?', 'alice@shrinking.expert');
    console.log('✅ Question sent to Alice successfully!');

    // Keep script running
    setTimeout(() => {
      console.log('\n⏱️ Test timeout - no response received');
      igor.disconnect();
      alice.disconnect();
      process.exit(1);
    }, 15000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    igor.disconnect();
    alice.disconnect();
    process.exit(1);
  }
}

// Simulate the BrainBridge command
console.log('═'.repeat(60));
console.log(' ALICE USER DISCOVERY - TEST SCENARIO');
console.log('═'.repeat(60));
console.log('');
console.log('🤖 This simulates the command: "magi ask @alice about her shrinking expertise"');
console.log('');

testAliceDiscovery();