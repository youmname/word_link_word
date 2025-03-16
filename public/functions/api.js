// functions/api.js
export async function onRequest(context) {
    // 获取原始请求的路径
    const url = new URL(context.request.url);
    const path = url.pathname.replace('/api', '');
    
    // 构建转发到您API服务器的URL
    const apiUrl = `http://175.24.181.59:3000/api${path}${url.search}`;
    
    console.log(`正在代理请求到: ${apiUrl}`);
    
    try {
      // 转发请求到您的API服务器
      const response = await fetch(apiUrl, {
        method: context.request.method,
        headers: {
          'Content-Type': 'application/json',
          // 可以添加其他必要的头信息
        },
        // 如果有请求体，也转发它
        body: context.request.method !== 'GET' && context.request.method !== 'HEAD' ? 
              await context.request.text() : undefined
      });
      
      // 检查响应状态
      if (!response.ok) {
        console.error(`API请求失败: ${response.status} ${response.statusText}`);
        return new Response(JSON.stringify({ 
          error: '请求原始API失败', 
          status: response.status,
          statusText: response.statusText 
        }), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 获取API响应
      const data = await response.text();
      
      // 记录成功
      console.log(`请求成功，状态码: ${response.status}`);
      
      // 构建并返回响应
      return new Response(data, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          // 确保CORS头信息正确
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    } catch (error) {
      // 详细记录错误
      console.error(`代理请求出错: ${error.message}`);
      console.error(error.stack);
      
      // 处理错误情况
      return new Response(JSON.stringify({ 
        error: '服务器错误', 
        details: error.message,
        trace: error.stack
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }