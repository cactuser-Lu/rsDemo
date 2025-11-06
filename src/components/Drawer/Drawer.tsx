import React, { useState } from 'react';
import './Drawer.css';

// 单个抽屉组件
const Drawer = ({ node, path = [], activePath, setActivePath }) => {
  // 判断当前节点是否展开：activePath 包含当前路径
  const isActive = activePath.length >= path.length &&
    path.every((p, i) => p === activePath[i]);

  // 判断当前节点是否是展开节点的父节点：activePath 以当前路径为前缀
  const isParentHighlighted = activePath.length >= path.length &&
    path.every((p, i) => p === activePath[i]);

  console.log('isActive', isActive,path, activePath);

  // 切换展开状态
  const handleToggle = () => {
    if (isActive && activePath.length === path.length) {
      // 如果当前节点已完全展开，收起（清空 activePath 或回退到父路径）
      setActivePath(path.slice(0, -1));
    } else {
      // 展开当前节点，设置 activePath 为当前路径
      setActivePath(path);
    }
  };

  return (
    <div className={`drawer ${isParentHighlighted ? 'highlight' : 'noHighlight'}`}>
      <div
        className={`drawer-header ${isActive ? 'active' : ''}`}
        onClick={handleToggle}
      >
        {node.title}
        <span className="arrow">{isActive ? '▲' : '▼'}</span>
      </div>
      {isActive && node.children && (
        <div className="drawer-content">
          {node.children.map((child, index) => (
            <Drawer
              key={index}
              node={child}
              path={[...path, index]}
              activePath={activePath}
              setActivePath={setActivePath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 抽屉树组件
const DrawerTree = ({ data }) => {
  // activePath 记录当前展开节点的路径，如 [0, 1, 0] 表示 Drawer 1-2-1
  const [activePath, setActivePath] = useState([]);

  return (
    <div className="drawer-tree">
      {data.map((node, index) => (
        <Drawer
          key={index}
          node={node}
          path={[index]}
          activePath={activePath}
          setActivePath={setActivePath}
        />
      ))}
    </div>
  );
};

export default DrawerTree;