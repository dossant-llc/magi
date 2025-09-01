import type { ConsentRequest, ConsentResponse } from '../../../shared/types';

interface AppState {
  requests: ConsentRequest[];
  stats: {
    pending: number;
    today: number;
    files: number;
  };
}

class ConsentManager {
  private state: AppState = {
    requests: [],
    stats: { pending: 0, today: 0, files: 0 }
  };

  private ws: WebSocket | null = null;

  constructor() {
    this.initWebSocket();
    this.loadMockData(); // Remove this when real backend is ready
    this.render();
  }

  private initWebSocket() {
    // Will connect to backend WebSocket when implemented
    console.log('WebSocket connection would be initialized here');
  }

  private loadMockData() {
    // Mock data for demonstration
    const mockRequests: ConsentRequest[] = [
      {
        id: '1',
        timestamp: new Date(),
        requester: {
          name: 'ChatGPT',
          type: 'cloud',
          trustLevel: 75
        },
        query: {
          intent: 'help debug network connectivity issues',
          searchTerms: ['network', 'troubleshooting', 'printer'],
          files: ['public/network-troubleshooting.md'],
          privacyLevels: ['public']
        },
        purpose: 'User asked for help fixing printer connectivity problems',
        duration: 'once'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        requester: {
          name: 'Claude Web',
          type: 'cloud',
          trustLevel: 60
        },
        query: {
          intent: 'provide business strategy insights',
          searchTerms: ['client', 'strategy', 'business'],
          files: ['private/client-strategies.md', 'team/business-processes.md'],
          privacyLevels: ['private', 'team']
        },
        purpose: 'User wants help with client relationship management',
        duration: 'session'
      }
    ];

    this.state.requests = mockRequests;
    this.state.stats = {
      pending: mockRequests.length,
      today: 5,
      files: 23
    };
  }

  private render() {
    this.renderStats();
    this.renderRequests();
  }

  private renderStats() {
    const pendingEl = document.getElementById('pendingCount');
    const todayEl = document.getElementById('todayCount');
    const filesEl = document.getElementById('filesCount');

    if (pendingEl) pendingEl.textContent = this.state.stats.pending.toString();
    if (todayEl) todayEl.textContent = this.state.stats.today.toString();
    if (filesEl) filesEl.textContent = this.state.stats.files.toString();
  }

  private renderRequests() {
    const container = document.getElementById('requestsContainer');
    const emptyState = document.getElementById('emptyState');

    if (!container || !emptyState) return;

    if (this.state.requests.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = this.state.requests.map(request => this.renderRequestCard(request)).join('');

    // Add event listeners
    this.state.requests.forEach(request => {
      const approveBtn = document.getElementById(`approve-${request.id}`);
      const denyBtn = document.getElementById(`deny-${request.id}`);
      const detailsBtn = document.getElementById(`details-${request.id}`);

      if (approveBtn) {
        approveBtn.addEventListener('click', () => this.handleResponse(request.id, 'allow'));
      }
      if (denyBtn) {
        denyBtn.addEventListener('click', () => this.handleResponse(request.id, 'deny'));
      }
      if (detailsBtn) {
        detailsBtn.addEventListener('click', () => this.showRequestDetails(request.id));
      }
    });
  }

  private renderRequestCard(request: ConsentRequest): string {
    const timeAgo = this.getTimeAgo(request.timestamp);
    const avatarLetter = request.requester.name.charAt(0);
    const avatarClass = request.requester.type;

    return `
      <div class="request-card pending">
        <div class="requester">
          <div class="requester-avatar ${avatarClass}">${avatarLetter}</div>
          <div class="requester-info">
            <h3>${request.requester.name}</h3>
            <p>${request.requester.type === 'cloud' ? 'Cloud AI' : 'Local AI'} • ${timeAgo}</p>
          </div>
        </div>
        
        <div class="request-details">
          <div class="detail-row">
            <span class="detail-label">Intent:</span>
            <span class="detail-value">${request.query.intent}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Purpose:</span>
            <span class="detail-value">${request.purpose}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Files:</span>
            <span class="detail-value">${request.query.files.join(', ')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Privacy:</span>
            <div class="detail-value">
              <div class="privacy-badges">
                ${request.query.privacyLevels.map(level => 
                  `<span class="privacy-badge ${level}">${this.getPrivacyIcon(level)} ${level}</span>`
                ).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" id="approve-${request.id}">
            ✅ Allow ${request.duration || 'once'}
          </button>
          <button class="btn btn-secondary" id="details-${request.id}">
            🔍 View Details
          </button>
          <button class="btn btn-danger" id="deny-${request.id}">
            ❌ Deny
          </button>
        </div>
      </div>
    `;
  }

  private getPrivacyIcon(level: string): string {
    const icons = {
      public: '🌍',
      team: '👥',
      personal: '🏠',
      private: '🔒',
      sensitive: '🚨'
    };
    return icons[level as keyof typeof icons] || '📄';
  }

  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  private handleResponse(requestId: string, decision: 'allow' | 'deny') {
    const request = this.state.requests.find(r => r.id === requestId);
    if (!request) return;

    const response: ConsentResponse = {
      requestId,
      decision,
      duration: request.duration,
      reasoning: decision === 'deny' ? 'User denied access' : 'User approved access'
    };

    console.log('Consent response:', response);

    // Remove from pending requests
    this.state.requests = this.state.requests.filter(r => r.id !== requestId);
    this.state.stats.pending = this.state.requests.length;

    // Show user feedback
    const message = decision === 'allow' 
      ? `✅ Access granted to ${request.requester.name}`
      : `❌ Access denied to ${request.requester.name}`;
    
    this.showNotification(message);

    // Re-render
    this.render();

    // TODO: Send response to backend
  }

  private showRequestDetails(requestId: string) {
    const request = this.state.requests.find(r => r.id === requestId);
    if (!request) return;

    // TODO: Show detailed modal with file contents preview, trust score, etc.
    alert(`Detailed view for ${request.requester.name} would open here.\n\nFiles requested:\n${request.query.files.join('\n')}`);
  }

  private showNotification(message: string) {
    // Simple notification - could be replaced with toast library
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #34c759;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize the consent manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  new ConsentManager();
});