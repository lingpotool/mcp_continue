import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';

const RESERVED_PORTS = new Set([
  80, 443, 445, 135, 137, 138, 139, 1433, 1434, 3306, 5432, 27017,
  3000, 3001, 4200, 5000, 5173, 8000, 8080, 8443, 9000, 3389,
  5985, 5986, 21, 22, 23, 25, 53, 110, 143, 993, 995,
]);

export class PortService {
  private currentPort: number = 34567;
  private workspaceId: string = '';

  constructor(private configService: any) {
    this.currentPort = configService.get('port');
  }

  getCurrentPort(): number {
    return this.currentPort;
  }

  setCurrentPort(port: number): void {
    this.currentPort = port;
  }

  async isPortOccupied(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(true));
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      server.listen(port, 'localhost');
    });
  }

  async findAvailablePort(startFrom?: number): Promise<number | null> {
    const start = startFrom || 10000;
    const end = 60000;
    const randomStart = start + Math.floor(Math.random() * (end - start));

    for (let offset = 0; offset < 1000; offset++) {
      const port = randomStart + offset;
      if (port > end) break;
      if (RESERVED_PORTS.has(port)) continue;
      if (!await this.isPortOccupied(port)) return port;
    }

    for (let port = start; port <= end; port++) {
      if (RESERVED_PORTS.has(port)) continue;
      if (!await this.isPortOccupied(port)) return port;
    }

    return null;
  }

  getWorkspaceId(): string {
    if (this.workspaceId) return this.workspaceId;

    if (vscode.workspace.workspaceFile) {
      this.workspaceId = vscode.workspace.workspaceFile.fsPath;
    } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      this.workspaceId = vscode.workspace.workspaceFolders[0].uri.fsPath;
    } else {
      this.workspaceId = `untitled_${process.pid}`;
    }

    return this.workspaceId;
  }

  private getPortMapPath(): string {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(home, '.mcp_continue_ports.json');
  }

  readPortMap(): Record<string, number> {
    try {
      const mapPath = this.getPortMapPath();
      if (fs.existsSync(mapPath)) {
        const content = fs.readFileSync(mapPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch {}
    return {};
  }

  registerWorkspace(workspaceId: string, port: number): void {
    try {
      const mapPath = this.getPortMapPath();
      const portMap = this.readPortMap();
      const normalizedId = workspaceId.toLowerCase().replace(/\\/g, '/');
      portMap[normalizedId] = port;
      fs.writeFileSync(mapPath, JSON.stringify(portMap, null, 2), 'utf-8');
    } catch {}
  }

  unregisterWorkspace(workspaceId: string): void {
    try {
      const mapPath = this.getPortMapPath();
      const portMap = this.readPortMap();
      const normalizedId = workspaceId.toLowerCase().replace(/\\/g, '/');
      delete portMap[normalizedId];
      fs.writeFileSync(mapPath, JSON.stringify(portMap, null, 2), 'utf-8');
    } catch {}
  }

  findPortByWorkspace(workspaceId: string): number | null {
    const portMap = this.readPortMap();
    const normalized = workspaceId.toLowerCase().replace(/\\/g, '/');

    if (portMap[normalized]) return portMap[normalized];

    let bestMatch = '';
    let bestPort: number | null = null;
    for (const [ws, port] of Object.entries(portMap)) {
      if (normalized.startsWith(ws) && ws.length > bestMatch.length) {
        bestMatch = ws;
        bestPort = port;
      }
    }

    return bestPort;
  }

  isCurrentWorkspace(workspaceId: string): boolean {
    const currentId = this.getWorkspaceId();
    if (!currentId) return true;

    const normalizedRequest = workspaceId.toLowerCase().replace(/\\/g, '/');
    const normalizedCurrent = currentId.toLowerCase().replace(/\\/g, '/');

    return normalizedRequest === normalizedCurrent ||
      normalizedRequest.startsWith(normalizedCurrent + '/') ||
      normalizedCurrent.startsWith(normalizedRequest + '/');
  }

  writePortFile(port: number): void {
    this.registerWorkspace(this.getWorkspaceId(), port);
  }
}
