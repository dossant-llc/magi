# Magi Communication System Test Plan

## Test Categories

### 1. Unit Tests

#### Exchange Server Core Functions
- **Invitation Code Generation**
  - [ ] Generate unique 8-character alphanumeric codes
  - [ ] Ensure codes don't collide within reasonable probability
  - [ ] Validate code expiration (24 hour TTL)
  - [ ] Test single-use vs multi-use code behavior

- **Authentication & Authorization**
  - [ ] Validate invitation codes correctly
  - [ ] Reject expired codes
  - [ ] Reject already-used single-use codes
  - [ ] Handle invalid/malformed codes gracefully

- **Message Routing**
  - [ ] Route messages to correct connected magi
  - [ ] Handle routing to disconnected magi
  - [ ] Validate message format and structure
  - [ ] Test rate limiting (10 queries/minute)

#### Client Library Functions
- [ ] Connect to exchange server using invitation code
- [ ] Send properly formatted queries
- [ ] Receive and parse responses
- [ ] Handle connection errors and reconnection
- [ ] Timeout handling for unanswered queries

### 2. Integration Tests

#### Connection Establishment Flow
- [ ] **Test Case**: Two magi instances connect successfully
  - Magi A generates invitation code
  - Magi B connects using code
  - Verify bidirectional connection established

- [ ] **Test Case**: Invalid invitation code rejection
  - Attempt connection with expired code
  - Attempt connection with malformed code
  - Verify appropriate error messages

- [ ] **Test Case**: Connection limits
  - Test maximum connections per magi (5)
  - Test connection timeout (1 hour inactivity)

#### Message Exchange Flow
- [ ] **Test Case**: Basic query-response cycle
  - Magi A sends query: "What's your favorite sushi?"
  - Magi B receives query and responds
  - Magi A receives response
  - Verify message IDs and timestamps

- [ ] **Test Case**: Concurrent queries
  - Multiple simultaneous queries from A to B
  - Verify all responses received correctly
  - Test query-response correlation

- [ ] **Test Case**: Error handling
  - Query to disconnected magi
  - Malformed message handling
  - Network interruption recovery

### 3. System Tests

#### End-to-End Scenarios
- [ ] **Scenario 1**: Complete user workflow
  ```
  1. Igor's magi generates invitation: "ABC123XY"
  2. Igor shares code with Zack
  3. Zack's magi connects using code
  4. Igor asks: "magi ask Zack's magi what's his favorite sushi?"
  5. Query routed through exchange server
  6. Zack's magi searches local knowledge base
  7. Response sent back: "Salmon nigiri and spicy tuna rolls"
  8. Igor receives answer
  ```

- [ ] **Scenario 2**: Multi-user network
  ```
  1. Three users: Igor, Zack, Sarah
  2. Igor connects to both Zack and Sarah
  3. Igor broadcasts question to both
  4. Both respond independently
  5. Igor receives both responses
  ```

- [ ] **Scenario 3**: Privacy and security
  ```
  1. Verify messages not stored on exchange server
  2. Test connection isolation (A can't see B-C messages)
  3. Validate rate limiting enforcement
  4. Test invitation code security
  ```

### 4. Performance Tests

#### Load Testing
- [ ] 100 concurrent connections
- [ ] 1000 messages per minute throughput
- [ ] Memory usage under load
- [ ] Connection establishment time
- [ ] Message delivery latency

#### Stress Testing
- [ ] Maximum invitation codes generated per hour
- [ ] Server behavior under connection limit
- [ ] Network partition recovery
- [ ] Server restart/crash recovery

### 5. Manual Test Cases

#### User Experience Testing
- [ ] **Test**: Invitation code sharing workflow
  - Generate code in magi A
  - User manually shares with friend
  - Friend enters code in magi B
  - Connection established notification

- [ ] **Test**: Natural language integration
  - "magi ask [friend]'s magi about [topic]"
  - Response formatting and presentation
  - Error messages in natural language

- [ ] **Test**: Connection management
  - View active connections
  - Disconnect from specific magi
  - Block/unblock connections

## Test Environment Setup

### Prerequisites
- Node.js 18+
- Two separate magi instances for testing
- Exchange server running locally
- Network connectivity between test machines

### Test Data
- Sample invitation codes for testing
- Mock user profiles and knowledge bases
- Test queries and expected responses

### Automation
- Jest for unit tests
- WebSocket testing with ws library
- Integration tests with supertest
- Performance tests with autocannon

## Success Criteria

### Functional Requirements
- [ ] 99% successful connection establishment with valid codes
- [ ] 100% message delivery for connected magi pairs
- [ ] Sub-second message routing latency
- [ ] Zero message loss under normal conditions

### Non-Functional Requirements
- [ ] Support 50+ concurrent connections per server
- [ ] Handle 500+ messages per minute
- [ ] 99.9% uptime during operation
- [ ] Graceful degradation under high load

## Test Schedule
1. **Week 1**: Unit tests and basic integration
2. **Week 2**: End-to-end scenarios and system tests
3. **Week 3**: Performance and stress testing
4. **Week 4**: User acceptance and manual testing

## Risk Mitigation
- **Network failures**: Test offline/reconnection scenarios
- **Security vulnerabilities**: Code review and penetration testing
- **Scalability issues**: Load testing with realistic user patterns
- **User experience**: Extensive manual testing with actual users