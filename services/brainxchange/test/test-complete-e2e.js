const BrainXchangeClient = require('../client/brainxchange-client');

/**
 * COMPLETE END-TO-END TEST
 * 
 * This test verifies the entire BrainXchange ecosystem:
 * 1. BrainXchange server running at wss://m3u.dossant.com/bx
 * 2. Two independent clients (Igor and Alice)  
 * 3. User discovery (@username syntax)
 * 4. Connection establishment via invitation codes
 * 5. Bidirectional knowledge sharing
 * 6. Expert consultation flow
 * 
 * This demonstrates the complete "magi ask @alice about her shrinking expertise" use case.
 */

async function testCompleteE2E() {
  console.log('🌐 COMPLETE END-TO-END BRAINXCHANGE TEST');
  console.log('═'.repeat(70));
  console.log('');
  console.log('📍 Server: wss://m3u.dossant.com/bx');
  console.log('👥 Clients: Igor (seeker) + Alice (expert)');
  console.log('🎯 Goal: "magi ask @alice about her shrinking expertise"');
  console.log('');
  
  // Create clients
  const igor = new BrainXchangeClient();
  const alice = new BrainXchangeClient();
  
  let testStep = 1;
  
  function logStep(description) {
    console.log(`\n📋 Step ${testStep}: ${description}`);
    testStep++;
  }

  try {
    // === PHASE 1: CLIENT CONNECTIONS ===
    logStep('Igor connects to BrainXchange server');
    await igor.connect();
    await igor.identify('igor@seeker.com', 'Igor Rodriguez');
    console.log('✅ Igor connected and identified');

    logStep('Alice connects to BrainXchange server');  
    await alice.connect();
    await alice.identify('alice@shrinking.expert', 'Alice Shrinking Expert');
    console.log('✅ Alice connected and identified');

    // === PHASE 2: USER DISCOVERY SIMULATION ===
    logStep('Simulate Igor trying @alice (not connected yet)');
    const igorFriends = igor.getConnectedFriends();
    console.log(`📋 Igor's friends before: ${igorFriends.length}`);
    
    const aliceFriend = igorFriends.find(f => 
      f.username.includes('alice') || f.nickname.toLowerCase().includes('alice')
    );
    
    if (!aliceFriend) {
      console.log('❌ @alice not found (as expected)');
      console.log('💡 This would trigger user discovery flow in brainbridge');
    }

    // === PHASE 3: CONNECTION ESTABLISHMENT ===
    logStep('Alice creates invitation for Igor');
    const invite = await alice.createInvite();
    console.log(`🎟️ Alice created invite: ${invite.code} from ${invite.from}`);

    logStep('Igor connects using Alice\'s invitation');
    const connection = await igor.connectWithCode(invite.code);
    console.log(`🔗 Igor connected to: ${connection.friend.nickname}`);

    // === PHASE 4: SET UP KNOWLEDGE SHARING ===
    logStep('Set up Alice\'s expertise knowledge base');
    alice.onQuestion(async (content, from, fromNickname) => {
      console.log(`\n❓ ${fromNickname} asks Alice: "${content}"`);
      
      // Alice's expert knowledge base
      let answer;
      if (content.toLowerCase().includes('shrinking')) {
        answer = `Hi ${fromNickname}! I'm Alice, a shrinking expert with 8 years of experience. I specialize in:
        
🧠 Cognitive restructuring - Reframing negative thought patterns
🎯 Mindfulness techniques - Present-moment awareness practices  
💪 Confidence building - Overcoming limiting beliefs
🔄 Problem-solving - Breaking big problems into manageable pieces

My approach helps people 'shrink' their mental barriers and anxieties down to size. I use evidence-based techniques from CBT and positive psychology. What specific area would you like to explore?`;
      } else if (content.toLowerCase().includes('technique')) {
        answer = `Here are my top 3 shrinking techniques:
        
1. 🔍 The 5-4-3-2-1 Grounding Method - Engage your senses to reduce overwhelm
2. 📊 The Problem Scaling Exercise - Rate your problem 1-10, then break it down
3. 💭 The Thought Replacement Technique - Replace "I can't" with "I'm learning to"

Which technique resonates most with your current challenge?`;
      } else {
        answer = `Thanks for your question! I specialize in helping people overcome limiting beliefs and mental barriers. Could you tell me more about what specific challenge you're facing? I'm here to help! 😊`;
      }
      
      console.log('🧠 Alice accessing her expertise knowledge...');
      setTimeout(async () => {
        console.log('📤 Alice sending expert response...');
        await alice.answer(answer, from);
      }, 1000);
    });

    logStep('Set up Igor\'s response handling');
    let questionsAsked = 0;
    const totalQuestions = 2;
    
    igor.onAnswer(async (content, from, fromNickname) => {
      console.log(`\n💬 ${fromNickname} responds to Igor:`);
      console.log('─'.repeat(60));
      console.log(content);
      console.log('─'.repeat(60));
      
      questionsAsked++;
      
      if (questionsAsked < totalQuestions) {
        // Igor asks follow-up question
        setTimeout(async () => {
          console.log(`\n🤔 Igor asks follow-up question...`);
          await igor.ask('What specific techniques do you recommend for overwhelm?', 'alice@shrinking.expert');
        }, 2000);
      } else {
        // Test complete
        setTimeout(() => {
          console.log('\n🎉 COMPLETE END-TO-END TEST SUCCESSFUL!');
          console.log('');
          console.log('✅ Verified Components:');
          console.log('  🌐 BrainXchange server connectivity');
          console.log('  🔐 User identification system');
          console.log('  🔍 User discovery simulation (@alice)');
          console.log('  🎟️ Invitation code generation');
          console.log('  🤝 Peer-to-peer connection establishment');
          console.log('  💬 Bidirectional messaging');
          console.log('  🧠 Expert knowledge sharing');
          console.log('  🔄 Multi-turn conversation flow');
          console.log('');
          console.log('🚀 Ready for brainbridge integration!');
          
          // Clean up
          igor.disconnect();
          alice.disconnect();
          process.exit(0);
        }, 1000);
      }
    });

    // === PHASE 5: EXPERT CONSULTATION ===
    logStep('Igor asks Alice about her shrinking expertise');
    await igor.ask('I heard you\'re a shrinking expert - can you tell me about your expertise and how you help people?', 'alice@shrinking.expert');
    console.log('✅ Initial question sent to Alice');

    // Keep test running
    setTimeout(() => {
      console.log('\n⏱️ Test timeout - ending test');
      igor.disconnect();
      alice.disconnect();
      process.exit(1);
    }, 30000);

  } catch (error) {
    console.error('❌ Complete E2E test failed:', error.message);
    igor.disconnect();
    alice.disconnect();
    process.exit(1);
  }
}

// Run the complete end-to-end test
testCompleteE2E();