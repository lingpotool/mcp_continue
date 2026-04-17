import { PortService } from '../services/portService';

export const PRIMARY_PORT = 52686;

const MCP_CONTINUE_TOOL = {
  name: 'mcp_continue',
  description: 'When the AI wants to end a conversation or task, it MUST call this tool to ask the user whether to continue. In multi-window scenarios, pass the "port" parameter (found in the VSCode sidebar) to ensure the dialog appears in the correct window.',
  inputSchema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'The reason why the AI wants to end the conversation',
      },
      port: {
        type: 'number',
        description: 'The target window port number (copy from VSCode sidebar). Required when multiple VSCode windows are open to ensure the dialog appears in the correct window.',
      },
    },
    required: ['reason'],
  },
};

export async function handleMCPRequest(
  request: any,
  portService: PortService,
  currentPort: number,
  registeredPorts: Set<number>,
  onAskContinue: (reason: string) => Promise<any>,
): Promise<any> {
  const method = request.method;
  const id = request.id;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'mcp_continue',
          version: '1.0.0',
        },
        capabilities: {
          tools: {},
        },
      },
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: [MCP_CONTINUE_TOOL],
      },
    };
  }

  if (method === 'tools/call') {
    const toolName = request.params?.name;
    const args = request.params?.arguments || {};

    if (toolName === 'mcp_continue') {
      const reason = args.reason || 'Task completed';
      return await onAskContinue(reason);
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32602, message: `Unknown tool: ${toolName}` },
    };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Unknown method: ${method}` },
  };
}
