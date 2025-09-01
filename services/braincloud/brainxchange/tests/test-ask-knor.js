const MagiExchangeClient = require('../client/magi-client');

async function testAskKnor() {
  console.log('🧪 Testing: Ask Knor about favorite flavor\n');
  
  const igor = new MagiExchangeClient();
  const knor = new MagiExchangeClient();

  try {
    // Connect and identify both users
    console.log('📡 Igor connecting...');
    await igor.connect();
    await igor.identify('igor@example.com', 'Igor');
    
    console.log('📡 Knor connecting...');  
    await knor.connect();
    await knor.identify('knor@example.com', 'Knor');

    // Igor creates invite
    console.log('\n🎟️ Igor creating invitation...');
    const invite = await igor.createInvite();
    console.log(`✅ Invite created: ${invite.code}`);

    // Set up Knor's response handler
    knor.onQuestion(async (content, from, fromNickname) => {
      console.log(`\n❓ Knor received: "${content}" from ${fromNickname}`);
      
      if (content.toLowerCase().includes('flavor')) {
        console.log('🍦 Knor thinking about flavors...');
        setTimeout(async () => {
          await knor.answer('My favorite flavor is vanilla ice cream!', from);
          console.log('📤 Knor answered');
        }, 1000);
      }
    });

    // Set up Igor's answer handler
    igor.onAnswer((content, from, fromNickname) => {
      console.log(`\n💬 Igor received answer from ${fromNickname}: "${content}"`);
      console.log('\n✅ Success! Knor responded about their favorite flavor');
      
      // Clean up
      setTimeout(() => {
        igor.disconnect();
        knor.disconnect();
        process.exit(0);
      }, 1000);
    });

    // Knor connects with invite
    console.log('\n🔗 Knor connecting with invite...');
    await knor.connectWithCode(invite.code);
    console.log('✅ Connection established');

    // Wait a moment, then Igor asks the question
    setTimeout(async () => {
      console.log('\n❓ Igor asking Knor about favorite flavor...');
      await igor.ask('what is your favorite flavor?', 'knor@example.com');
      console.log('✅ Question sent to Knor');
    }, 1000);

    // Timeout fallback
    setTimeout(() => {
      console.log('\n⏱️ Test timeout');
      igor.disconnect();
      knor.disconnect();
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    igor.disconnect();
    knor.disconnect();
    process.exit(1);
  }
}

console.log('═'.repeat(50));
console.log(' ASK KNOR ABOUT FAVORITE FLAVOR');
console.log('═'.repeat(50));
testAskKnor();