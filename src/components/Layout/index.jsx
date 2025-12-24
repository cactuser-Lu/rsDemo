import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu } from 'antd';
import { HomeOutlined, ThunderboltOutlined, AppstoreOutlined, RocketOutlined } from '@ant-design/icons';
import './style.css';

const { Header, Content, Footer } = AntLayout;

const Layout = () => {
  const location = useLocation();
  
  const menuItems = [
    {
      key: '/home',
      icon: <HomeOutlined />,
      label: <Link to="/home">首页</Link>
    },
    {
      key: '/debounce-test',
      icon: <ThunderboltOutlined />,
      label: <Link to="/debounce-test">防抖测试</Link>
    },
    {
      key: '/drawer',
      icon: <AppstoreOutlined />,
      label: <Link to="/drawer">抽屉</Link>
    },
    {
      key: '/activate',
      icon: <RocketOutlined />,
      label: <Link to="/activate">激活组件</Link>
    }
  ];

  return (
    <AntLayout className="layout">
      <Header className="header">
        <div className="logo">React Demo</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </Content>
      <Footer className="footer">
        React + Router + Redux + Ant Design ©{new Date().getFullYear()}
      </Footer>
    </AntLayout>
  );
};

export default Layout;
