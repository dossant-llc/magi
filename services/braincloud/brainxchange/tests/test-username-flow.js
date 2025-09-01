const BrainXchangeClient = require('../client/brainxchange-client');

async function testUsernameFlow() {
  console.log('🧪 Testing BrainXchange with Username Identity\n');
  
  // Create two clients with identities
  const igor = new BrainXchangeClient();
  const zack = new BrainXchangeClient();

  try {
    // Step 1: Connect both clients
    console.log('📡 Connecting Igor to server...');
    await igor.connect();
    
    console.log('🆔 Igor identifying as "igor@example.com" (Igor Rodriguez)...');
    await igor.identify('igor@example.com', 'Igor Rodriguez');
    console.log(`✅ Igor identified: ${igor.getCurrentUser().nickname}`);

    console.log('\n📡 Connecting Zack to server...');
    await zack.connect();
    
    console.log('🆔 Zack identifying as "zack.sushi@gmail.com" (Zack Chen)...');
    await zack.identify('zack.sushi@gmail.com', 'Zack Chen');
    console.log(`✅ Zack identified: ${zack.getCurrentUser().nickname}`);

    // Step 2: Igor creates invitation
    console.log('\n🎟️ Igor creating invitation code...');
    const invite = await igor.createInvite();
    console.log(`✅ Invitation created: ${invite.code} from ${invite.from}`);

    // Step 3: Set up message handlers with identity info
    igor.onQuestion((content, from, fromNickname) => {
      console.log(`\n❓ Igor received question from ${fromNickname} (${from}): "${content}"`);
    });

    igor.onAnswer(async (content, from, fromNickname) => {
      console.log(`\n💬 Igor received answer from ${fromNickname} (${from}): "${content}"`);
      console.log('\n✅ Username targeting test completed successfully!');
      
      // Test targeting by username
      console.log('\n🎯 Testing username targeting...');
      console.log('Igor asking Zack specifically by username...');
      await igor.ask("What's your favorite dessert?", "zack.sushi@gmail.com");
    });

    zack.onQuestion(async (content, from, fromNickname) => {
      console.log(`\n❓ Zack received question from ${fromNickname} (${from}): "${content}"`);
      
      // Zack's responses based on the question
      let answer;
      if (content.includes('sushi')) {
        answer = 'My favorite sushi is salmon nigiri and spicy tuna rolls!';
      } else if (content.includes('dessert')) {
        answer = 'I love mochi ice cream and dorayaki!';
        
        // After answering, clean up and exit
        setTimeout(() => {
          console.log('\n🎉 All username functionality tests passed!');
          console.log('\nConnected friends:');
          const friends = zack.getConnectedFriends();
          friends.forEach(friend => {
            console.log(`  - ${friend.nickname} (${friend.username})`);
          });
          
          igor.disconnect();
          zack.disconnect();
          process.exit(0);
        }, 1000);
      }
      
      console.log(`🔍 ${zack.getCurrentUser().nickname}'s magi searching knowledge base...`);
      setTimeout(async () => {
        console.log(`📤 ${zack.getCurrentUser().nickname}'s magi sending answer...`);
        // Answer directly to the person who asked
        await zack.answer(answer, from);
      }, 1000);
    });

    igor.onFriendConnected((friend) => {
      console.log(`👥 Igor: ${friend.nickname} (${friend.username}) connected!`);
    });

    zack.onFriendConnected((friend) => {
      console.log(`👥 Zack: ${friend.nickname} (${friend.username}) connected!`);
    });

    // Step 4: Zack connects using invitation code (with identity)
    console.log(`\n🔗 Zack connecting with code: ${invite.code}...`);
    const connection = await zack.connectWithCode(invite.code, 'zack.sushi@gmail.com', 'Zack Chen');
    console.log(`✅ Connection established with ${connection.friend.nickname}`);

    // Wait a moment for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 5: Igor asks Zack specifically by username
    console.log('\n🍣 Igor asking Zack (by username) about favorite sushi...');
    await igor.ask("What's your favorite sushi?", "zack.sushi@gmail.com");
    console.log('✅ Question sent to specific user');

    // Keep the script running to receive responses
    setTimeout(() => {
      console.log('\n⏱️ Test timeout - no response received');
      igor.disconnect();
      zack.disconnect();
      process.exit(1);
    }, 15000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    igor.disconnect();
    zack.disconnect();
    process.exit(1);
  }
}

// Run the test
console.log('═'.repeat(60));
console.log(' BRAINXCHANGE - USERNAME IDENTITY TEST');
console.log('═'.repeat(60));
testUsernameFlow();