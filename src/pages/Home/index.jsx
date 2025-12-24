import React from 'react';
import { Card, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Home = () => {
  return (
    <div>
      <Title level={2}>欢迎来到 React 示例项目</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="项目技术栈" bordered={false}>
          <Paragraph>
            <ul>
              <li>⚛️ <strong>React 19</strong> - 现代化的UI框架</li>
              <li>🚀 <strong>Rspack</strong> - 高性能构建工具</li>
              <li>🛣️ <strong>React Router</strong> - 路由管理</li>
              <li>🗃️ <strong>Redux Toolkit</strong> - 状态管理</li>
              <li>🎨 <strong>Ant Design</strong> - UI组件库</li>
            </ul>
          </Paragraph>
        </Card>

        <Card title="快速开始" bordered={false}>
          <Paragraph>
            访问 <Link to="/debounce-test">防抖测试页面</Link> 查看防抖函数的实际效果
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
};

export default Home;
