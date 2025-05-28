# 環境構築

`tsc` コマンドは各々の環境により呼び出し方が変わると思うので、よしなに調整してください。

```sh
$ npm install
$ npx tsc && chmod 755 build/index.js
```

# MCPサーバーとして利用する

```json
{
  "mcpServers": {
    "runtrip_mcp": {
      "command": "/path/to/node",
        "args": ["/path/to/runtrip-mcp-sample/build/index.js"]
    }
  }
}
```
