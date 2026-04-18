export interface CallRecord {
  time: number;
  action: 'continue' | 'end';
  reason: string;
  instruction: string;
  workspaceId: string;
}

export interface CallStats {
  totalCalls: number;
  continueCount: number;
  endCount: number;
  sessionStart: number;
  callHistory: CallRecord[];
}

export interface StatsSnapshot {
  totalCalls: number;
  continueCount: number;
  endCount: number;
  sessionUptime: string;
  lastCallTime: string;
  recentCalls: CallRecord[];
}

const MAX_HISTORY = 200;

export class StatsService {
  private stats: CallStats = {
    totalCalls: 0,
    continueCount: 0,
    endCount: 0,
    sessionStart: Date.now(),
    callHistory: [],
  };

  record(action: 'continue' | 'end', reason: string, instruction: string, workspaceId: string): void {
    this.stats.totalCalls++;
    if (action === 'continue') this.stats.continueCount++;
    else this.stats.endCount++;

    this.stats.callHistory.push({
      time: Date.now(),
      action,
      reason: reason || '',
      instruction: instruction || '',
      workspaceId: workspaceId || '',
    });

    if (this.stats.callHistory.length > MAX_HISTORY) {
      this.stats.callHistory = this.stats.callHistory.slice(-MAX_HISTORY);
    }
  }

  getSnapshot(): StatsSnapshot {
    const uptime = Date.now() - this.stats.sessionStart;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    return {
      totalCalls: this.stats.totalCalls,
      continueCount: this.stats.continueCount,
      endCount: this.stats.endCount,
      sessionUptime: `${hours}h ${minutes}m`,
      lastCallTime: this.stats.callHistory.length > 0
        ? new Date(this.stats.callHistory[this.stats.callHistory.length - 1].time).toLocaleString()
        : 'N/A',
      recentCalls: this.stats.callHistory.slice(-15).reverse(),
    };
  }

  reset(): void {
    this.stats = {
      totalCalls: 0,
      continueCount: 0,
      endCount: 0,
      sessionStart: Date.now(),
      callHistory: [],
    };
  }

  getTotalCalls(): number {
    return this.stats.totalCalls;
  }

  getContinueCount(): number {
    return this.stats.continueCount;
  }

  getEndCount(): number {
    return this.stats.endCount;
  }
}
