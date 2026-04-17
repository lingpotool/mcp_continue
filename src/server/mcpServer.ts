import * as http from 'http';
import * as vscode from 'vscode';
import { ConfigService } from '../services/configService';
import { StatsService } from '../services/statsService';
import { PortService } from '../services/portService';
import { handleMCPRequest, PRIMARY_PORT } from './requestHandler';

export class MCPServer {
  private server: http.Server | null = null;
  private running: boolean = false;
  private isPrimary: boolean = false;
  private myPort: number = 0;
  private registeredPorts: Set<number> = new Set();
  private registeredWithPrimary: boolean = false;

  constructor(
    private configService: ConfigService,
    private statsService: StatsService,
    private portService: PortService,
    private outputChannel: vscode.OutputChannel,
    private onRequest: (request: any) => Promise<any>,
  ) {}

  isRunning(): boolean { return this.running; }
  getPort(): number { return this.myPort; }
  getPrimaryPort(): number { return PRIMARY_PORT; }
  isPrimaryServer(): boolean { return this.isPrimary; }
  getRegisteredPorts(): Set<number> { return this.registeredPorts; }

  getMCPUrl(): string {
    return `http://localhost:${PRIMARY_PORT}`;
  }

  async start(): Promise<boolean> {
    if (this.running) {
      vscode.window.showWarningMessage('MCP 服务器已在运行');
      return false;
    }

    const primaryOccupied = await this.portService.isPortOccupied(PRIMARY_PORT);

    if (!primaryOccupied) {
      this.isPrimary = true;
      const result = await this.startOnPort(PRIMARY_PORT);
      if (result) return true;
      this.isPrimary = false;
    }

    return this.startAsSecondary();
  }

  private async startAsSecondary(): Promise<boolean> {
    this.isPrimary = false;
    const port = await this.portService.findAvailablePort(PRIMARY_PORT + 1);
    if (!port) {
      vscode.window.showErrorMessage('无法找到可用端口');
      return false;
    }

    const started = await this.startOnPort(port);
    if (started) {
      this.retryRegistration();
    }
    return started;
  }

  private retryRegistration(maxRetries: number = 5): void {
    let attempt = 0;
    const tryRegister = async () => {
      while (attempt < maxRetries) {
        attempt++;
        const success = await this.registerWithPrimary();
        if (success) return;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
      this.outputChannel.appendLine('注册到主服务器失败，将作为独立服务器运行');
    };
    tryRegister();
  }

  private async startOnPort(port: number): Promise<boolean> {
    this.server = http.createServer(async (req, res) => {
      this.setupCORS(res);

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const urlPath = req.url?.split('?')[0] || '/';

      if (this.isPrimary && req.method === 'POST' && urlPath === '/register') {
        this.handleRegistration(req, res);
        return;
      }

      if (this.isPrimary && req.method === 'POST' && urlPath === '/unregister') {
        this.handleUnregistration(req, res);
        return;
      }

      if (req.method === 'GET' && urlPath === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          server: 'mcp_continue',
          version: '1.0.0',
          role: this.isPrimary ? 'primary' : 'secondary',
          port: this.myPort,
          primaryPort: PRIMARY_PORT,
          registeredPorts: Array.from(this.registeredPorts),
          stats: this.statsService.getSnapshot(),
        }));
        return;
      }

      if (req.method === 'GET' && urlPath === '/api/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.statsService.getSnapshot()));
        return;
      }

      if (req.method === 'POST' && urlPath === '/') {
        this.handleMCPRequest(req, res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    return new Promise((resolve) => {
      this.server!.listen(port, () => {
        this.myPort = port;
        this.portService.setCurrentPort(port);
        this.running = true;
        this.outputChannel.appendLine(
          `MCP 服务器已启动: http://localhost:${port} (${this.isPrimary ? '主服务器' : '从服务器'})`
        );
        resolve(true);
      });

      this.server!.on('error', async (error: any) => {
        this.server = null;
        this.running = false;
        this.outputChannel.appendLine(`服务器错误: ${error}`);
        resolve(false);
      });
    });
  }

  private async handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body = '';
    req.on('data', (chunk: string) => body += chunk);
    req.on('end', async () => {
      try {
        const request = JSON.parse(body);

        if (request.method === 'tools/call' && request.params?.name === 'mcp_continue') {
          const args = request.params.arguments || {};
          const targetPort = args.port;

          if (targetPort && targetPort !== this.myPort) {
            if (this.isPrimary && this.registeredPorts.has(targetPort)) {
              this.outputChannel.appendLine(`[路由] 转发请求到端口 ${targetPort}`);
              const forwarded = await this.forwardToPort(targetPort, request, res);
              if (forwarded) return;
              this.outputChannel.appendLine(`[路由] 转发失败，本地处理`);
            } else if (this.isPrimary) {
              this.outputChannel.appendLine(`[路由] 端口 ${targetPort} 未注册，本地处理`);
            }
          }

          if (!targetPort && this.isPrimary && this.registeredPorts.size > 0) {
            const response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: `⚠️ 检测到多个 VSCode 窗口运行中。调用 mcp_continue 时必须传递 "port" 参数。请从 VSCode 侧边栏复制提示词以获取正确的端口号。`,
                }],
              },
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
            return;
          }
        }

        const response = await handleMCPRequest(
          request,
          this.portService,
          this.myPort,
          this.registeredPorts,
          async (reason: string) => this.onRequest({ ...request, _reason: reason }),
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        this.outputChannel.appendLine(`请求处理错误: ${error}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32603, message: String(error) },
        }));
      }
    });
  }

  private async forwardToPort(targetPort: number, request: any, res: http.ServerResponse): Promise<boolean> {
    try {
      const response = await this.forwardHttpRequest(targetPort, request);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`[路由] 转发到端口 ${targetPort} 失败: ${error}`);
      this.registeredPorts.delete(targetPort);
      return false;
    }
  }

  private handleRegistration(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', (chunk: string) => body += chunk);
    req.on('end', () => {
      try {
        const { port } = JSON.parse(body);
        if (port && typeof port === 'number') {
          this.registeredPorts.add(port);
          this.outputChannel.appendLine(`[注册] 窗口注册: 端口 ${port}, 当前注册端口: [${Array.from(this.registeredPorts).join(', ')}]`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', registeredPorts: Array.from(this.registeredPorts) }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  }

  private handleUnregistration(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', (chunk: string) => body += chunk);
    req.on('end', () => {
      try {
        const { port } = JSON.parse(body);
        if (port) {
          this.registeredPorts.delete(port);
          this.outputChannel.appendLine(`[注销] 窗口取消注册: 端口 ${port}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  }

  private forwardHttpRequest(targetPort: number, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(request);
      const req = http.request({
        hostname: 'localhost',
        port: targetPort,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.setTimeout(300000, () => {
        req.destroy();
        reject(new Error('Forward request timeout'));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  private async registerWithPrimary(): Promise<boolean> {
    try {
      return await new Promise<boolean>((resolve) => {
        const postData = JSON.stringify({ port: this.myPort });
        const req = http.request({
          hostname: 'localhost',
          port: PRIMARY_PORT,
          path: '/register',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        }, (res) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => {
            this.registeredWithPrimary = true;
            this.outputChannel.appendLine(`[注册] 已注册到主服务器: 端口 ${this.myPort}`);
            resolve(true);
          });
        });

        req.on('error', (e) => {
          this.outputChannel.appendLine(`[注册] 注册到主服务器失败: ${e}`);
          resolve(false);
        });

        req.write(postData);
        req.end();
      });
    } catch {
      return false;
    }
  }

  stop(): void {
    if (this.server) {
      if (!this.isPrimary && this.registeredWithPrimary) {
        this.unregisterFromPrimary();
      }

      this.server.close();
      this.server = null;
      this.running = false;
      this.outputChannel.appendLine('MCP 服务器已停止');
    }
  }

  private unregisterFromPrimary(): void {
    try {
      const postData = JSON.stringify({ port: this.myPort });
      const req = http.request({
        hostname: 'localhost',
        port: PRIMARY_PORT,
        path: '/unregister',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, () => {});
      req.on('error', () => {});
      req.write(postData);
      req.end();
    } catch {}
  }

  private setupCORS(res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}
