import React, { useState, useRef, useCallback } from 'react';
import { Card, Input, Button, Space, Typography, Divider, Tag, Alert } from 'antd';
import debounce from '../../utils/debounce';
import './style.css';

const { Title, Text, Paragraph } = Typography;

const DebounceTest = () => {
  const [searchValue, setSearchValue] = useState('');
  const [apiCallCount, setApiCallCount] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [lastSearchTime, setLastSearchTime] = useState(null);
  const [inputCount, setInputCount] = useState(0);

  // 模拟API调用
  const mockApiCall = (value) => {
    setApiCallCount(prev => prev + 1);
    setLastSearchTime(new Date().toLocaleTimeString());
    
    // 模拟搜索结果
    const results = value 
      ? [`${value} - 结果1`, `${value} - 结果2`, `${value} - 结果3`]
      : [];
    setSearchResults(results);
    
    console.log('API调用:', value, '时间:', new Date().toLocaleTimeString());
  };

  // 创建防抖函数（延迟500ms）
  const debouncedSearch = useRef(
    debounce(function(value) {
      // 这里的this会是React组件实例（如果需要的话）
      mockApiCall(value);
    }, 500)
  ).current;

  // 处理输入变化
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    setInputCount(prev => prev + 1);
    debouncedSearch(value);
  };

  // 重置所有状态
  const handleReset = () => {
    setSearchValue('');
    setApiCallCount(0);
    setSearchResults([]);
    setLastSearchTime(null);
    setInputCount(0);
  };

  return (
    <div className="debounce-test-container">
      <Title level={2}>防抖函数测试页面</Title>
      
      <Alert
        message="什么是防抖？"
        description="防抖(Debounce)是一种优化高频率执行代码的技术。它确保函数在停止触发N毫秒后才执行一次，常用于搜索输入、窗口resize等场景。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="实时搜索演示" className="test-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>搜索框 (500ms防抖):</Text>
            <Input
              size="large"
              placeholder="输入搜索关键词..."
              value={searchValue}
              onChange={handleInputChange}
              style={{ marginTop: 8 }}
              allowClear
            />
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              💡 提示：快速输入文字，API只会在你停止输入500ms后调用
            </Paragraph>
          </div>

          <Divider />

          <div className="stats-container">
            <Card size="small" className="stat-card">
              <Text type="secondary">输入次数</Text>
              <Title level={3} style={{ marginTop: 8, marginBottom: 0 }}>
                {inputCount}
              </Title>
            </Card>

            <Card size="small" className="stat-card">
              <Text type="secondary">API调用次数</Text>
              <Title level={3} style={{ marginTop: 8, marginBottom: 0, color: '#52c41a' }}>
                {apiCallCount}
              </Title>
            </Card>

            <Card size="small" className="stat-card">
              <Text type="secondary">节省调用</Text>
              <Title level={3} style={{ marginTop: 8, marginBottom: 0, color: '#1890ff' }}>
                {Math.max(0, inputCount - apiCallCount)}
              </Title>
            </Card>
          </div>

          {lastSearchTime && (
            <div>
              <Text strong>上次搜索时间: </Text>
              <Tag color="blue">{lastSearchTime}</Tag>
            </div>
          )}

          {searchResults.length > 0 && (
            <Card size="small" title="搜索结果" type="inner">
              <Space direction="vertical" style={{ width: '100%' }}>
                {searchResults.map((result, index) => (
                  <div key={index}>
                    <Tag color="green">结果 {index + 1}</Tag> {result}
                  </div>
                ))}
              </Space>
            </Card>
          )}

          <Button type="primary" danger onClick={handleReset}>
            重置测试
          </Button>
        </Space>
      </Card>

      <Card title="防抖函数源码" className="code-card" style={{ marginTop: 24 }}>
        <pre className="code-block">
{`function debounce(func, delay) {
  let timer;
  return function(...args) {
    const context = this; // 保存调用时的this
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}`}
        </pre>
      </Card>
    </div>
  );
};

export default DebounceTest;
