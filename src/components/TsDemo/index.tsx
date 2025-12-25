import React, { useState } from 'react';
import { Tabs, Card, Space, Divider, Typography } from 'antd';
import { UserFormDemo, ProductFormDemo } from './FormComponent';
import type { BackendUser, FieldConfig } from './types';

const { Title, Paragraph, Text } = Typography;

// 简单的 Code 组件替代品
const Code = ({ children }: { children: string }) => (
  <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
    <code style={{ fontFamily: 'monospace', fontSize: '12px' }}>{children}</code>
  </pre>
);

// 行内代码组件
const InlineCode = ({ children }: { children: string }) => (
  <code
    style={{
      background: '#f5f5f5',
      padding: '2px 6px',
      borderRadius: '2px',
      fontFamily: 'monospace',
      fontSize: '12px',
    }}
  >
    {children}
  </code>
);

export default function TsLearning() {
  const [activeTab, setActiveTab] = useState('1');

  const items = [
    {
      key: '1',
      label: '1. 泛型学习',
      children: <GenericLearning />,
    },
    {
      key: '2',
      label: '2. Interface vs Type',
      children: <InterfaceVsType />,
    },
    {
      key: '3',
      label: '3. 高级类型特性',
      children: <AdvancedTypes />,
    },
    {
      key: '4',
      label: '4. 强类型表单',
      children: <StrongTypedForm />,
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Title level={1}>🎓 TypeScript 学习中心</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        size="large"
      />
    </div>
  );
}

// ============ 1. 泛型学习 ============
function GenericLearning() {
  return (
    <div>
      <Card title="什么是泛型？" style={{ marginBottom: 16 }}>
        <Paragraph>
          泛型是 TypeScript
          中最强大的特性之一，它允许函数、类和接口以一种通用的方式处理多种类型，同时保持类型安全。
        </Paragraph>
        <Paragraph>核心概念：编写一次代码，在多种类型上工作。</Paragraph>
      </Card>

      <Card title="例子1：基础泛型函数" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Code>{`function getFirstElement<T>(arr: T[]): T {
  return arr[0];
}`}</Code>
          <Paragraph>
            <Text strong>说明：</Text>
            <ul>
              <li>&lt;T&gt; 是泛型参数，代表任意类型</li>
              <li>
                调用时：getFirstElement([1, 2, 3]) → T 自动推导为 number
              </li>
              <li>调用时：getFirstElement(['a', 'b']) → T 自动推导为 string</li>
              <li>返回值类型自动适配</li>
            </ul>
          </Paragraph>
        </Space>
      </Card>

      <Card title="例子2：泛型约束" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Code>{`function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}`}</Code>
          <Paragraph>
            <Text strong>说明：</Text>
            <ul>
              <li>
                使用 <InlineCode>extends &#123; length: number &#125;</InlineCode> 限制 T
                必须有 length 属性
              </li>
              <li>可以传入：数组、字符串、对象（带 length 属性）</li>
              <li>不能传入：数字、布尔值（没有 length 属性）</li>
            </ul>
          </Paragraph>
        </Space>
      </Card>

      <Card title="例子3：多个泛型参数" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Code>{`function swap<T, U>(tuple: [T, U]): [U, T] {
  return [tuple[1], tuple[0]];
}`}</Code>
          <Paragraph>
            <Text strong>说明：</Text>
            <ul>
              <li>使用两个泛型参数 T 和 U</li>
              <li>
                调用：swap(['hello', 42]) → 返回 [42, 'hello']，两个类型都保留
              </li>
            </ul>
          </Paragraph>
        </Space>
      </Card>

      <Card title="实际工作场景：API 响应处理" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Code>{`// 定义通用的 API 响应结构
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 处理用户数据
interface User { id: number; name: string; }
const userResponse: ApiResponse<User> = {
  code: 200,
  message: 'success',
  data: { id: 1, name: '张三' }
};

// 处理产品数据 - 同一个类型，只需改 T
interface Product { id: number; name: string; price: number; }
const productResponse: ApiResponse<Product> = {
  code: 200,
  message: 'success',
  data: { id: 1, name: '手机', price: 3999 }
};`}</Code>
        </Space>
      </Card>
    </div>
  );
}

// ============ 2. Interface vs Type ============
function InterfaceVsType() {
  return (
    <div>
      <Card title="对比总结" style={{ marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1890ff' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>特性</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Interface</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>声明合并</td>
              <td style={{ padding: 8 }}>✅ 支持</td>
              <td style={{ padding: 8 }}>❌ 不支持</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>联合类型</td>
              <td style={{ padding: 8 }}>❌ 不支持</td>
              <td style={{ padding: 8 }}>✅ 支持</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>元组</td>
              <td style={{ padding: 8 }}>❌ 不支持</td>
              <td style={{ padding: 8 }}>✅ 支持</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>函数签名</td>
              <td style={{ padding: 8 }}>✅ 支持</td>
              <td style={{ padding: 8 }}>✅ 支持</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>对象形状</td>
              <td style={{ padding: 8 }}>✅ 首选</td>
              <td style={{ padding: 8 }}>✅ 也可以</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Interface 示例" style={{ marginBottom: 16 }}>
        <Code>{`// 1. 基础 Interface
interface User {
  id: number;
  name: string;
}

// 2. 扩展其他 Interface
interface Admin extends User {
  role: 'admin' | 'user';
}

// 3. 声明合并 - 同名 Interface 自动合并
interface User {
  email?: string;  // User 会自动合并，现在有 id, name, email
}`}</Code>
      </Card>

      <Card title="Type 示例" style={{ marginBottom: 16 }}>
        <Code>{`// 1. 联合类型 - Interface 做不到
type Status = 'pending' | 'success' | 'error';

// 2. 元组 - Interface 做不到
type Tuple = [string, number, boolean];

// 3. 函数类型
type Fn = (x: number) => string;

// 4. 映射类型 - 这是 Type 的强项
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};`}</Code>
      </Card>

      <Card title="工作建议" style={{ marginBottom: 16 }}>
        <ul>
          <li>
            <Text strong>描述对象形状</Text>：优先用 Interface，语义更清晰
          </li>
          <li>
            <Text strong>定义联合/工具类型</Text>：必须用 Type
          </li>
          <li>
            <Text strong>库的公共 API</Text>：用 Interface，更易扩展
          </li>
          <li>
            <Text strong>内部复杂类型</Text>：用 Type，更灵活
          </li>
        </ul>
      </Card>
    </div>
  );
}

// ============ 3. 高级类型特性 ============
function AdvancedTypes() {
  return (
    <div>
      <Card title="keyof：获取对象所有属性名" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Code>{`interface User {
  id: number;
  name: string;
  email: string;
}

type UserKeys = keyof User; // "id" | "name" | "email"

// 实际工作场景：确保排序字段必须是对象属性
function sortBy<T, K extends keyof T>(data: T[], field: K) {
  return data.sort((a, b) => {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
    return 0;
  });
}

// 调用
sortBy([...], 'name'); // ✅ 正确
sortBy([...], 'invalid'); // ❌ 编译错误`}</Code>
          <Paragraph>
            <Text strong>工作场景：</Text> 数据排序、筛选、表单字段验证
          </Paragraph>
        </Space>
      </Card>

      <Card title="in：映射类型中遍历属性" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Code>{`// 将所有属性变成可选
type Partial<T> = {
  [K in keyof T]?: T[K];
};

// 将所有属性变成只读
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

// 将所有属性值变成 Promise
type Promisified<T> = {
  [K in keyof T]: Promise<T[K]>;
};

interface User { name: string; age: number; }
type UserPromise = Promisified<User>;
// 结果：{ name: Promise<string>; age: Promise<number>; }`}</Code>
          <Paragraph>
            <Text strong>工作场景：</Text> 自动生成工具类型、API 包装
          </Paragraph>
        </Space>
      </Card>

      <Card title="typeof：获取变量的类型" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Code>{`const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retryCount: 3,
};

// 获取 config 的类型
type Config = typeof config;
// 结果：{ apiUrl: string; timeout: number; retryCount: number; }

// 工作场景：API 响应类型推导
const response = {
  code: 200,
  data: { id: 1, name: '张三' },
  message: 'success'
};

type ApiResponse = typeof response;
// 无需手动编写 interface，直接从实际对象推导`}</Code>
          <Paragraph>
            <Text strong>工作场景：</Text> 从配置对象或 API
            响应推导类型，减少重复代码
          </Paragraph>
        </Space>
      </Card>

      <Card title="infer：条件类型中提取类型" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Code>{`// 提取函数返回值类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUserName(): string { return 'John'; }
type Result = ReturnType<typeof getUserName>; // string

// 提取 Promise 中的值
type PromiseValue<T> = T extends Promise<infer U> ? U : T;

type A = PromiseValue<Promise<string>>; // string
type B = PromiseValue<number>; // number

// 提取数组元素类型
type ArrayElement<T> = T extends (infer E)[] ? E : T;

type C = ArrayElement<string[]>; // string
type D = ArrayElement<number[]>; // number`}</Code>
          <Paragraph>
            <Text strong>工作场景：</Text> 自动推导 async/await
            返回值、提取泛型参数、工具类型编写
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
}

// ============ 4. 强类型表单组件 ============
function StrongTypedForm() {
  return (
    <div>
      <Card title="表单字段验证原理" style={{ marginBottom: 16 }}>
        <Paragraph>
          <Text strong>核心问题：</Text>
          如何确保表单字段名必须是后端返回数据的属性？
        </Paragraph>
        <Paragraph>
          <Text strong>解决方案：</Text>
          使用 TypeScript 的 keyof 约束，在编译阶段就发现错误。
        </Paragraph>
        <Code>{`// 后端返回数据结构
interface BackendUser {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  userStatus: 'active' | 'inactive';
}

// 表单字段配置约束
interface FieldConfig<T = BackendUser> {
  field: keyof T; // 只能是 T 的属性
  label: string;
  type: 'text' | 'email' | 'number' | 'select';
}

// 创建字段配置 - 所有字段名都会被验证
const fields: FieldConfig<BackendUser>[] = [
  { field: 'userId', label: '用户ID', type: 'number' },      // ✅ 正确
  { field: 'userName', label: '用户名', type: 'text' },      // ✅ 正确
  { field: 'invalidField', label: '无效', type: 'text' },    // ❌ 编译错误
];`}</Code>
      </Card>

      <Card title="用户表单演示" style={{ marginBottom: 16 }}>
        <UserFormDemo />
      </Card>

      <Divider />

      <Card title="产品表单演示" style={{ marginBottom: 16 }}>
        <Paragraph>
          <Text strong>相同的组件，只需改变泛型参数：</Text>
        </Paragraph>
        <ProductFormDemo />
      </Card>

      <Card title="学习收获" style={{ marginBottom: 16 }}>
        <ul>
          <li>
            <Text strong>泛型 &lt;T&gt;</Text>：让一个组件处理多种数据结构
          </li>
          <li>
            <Text strong>keyof T</Text>：确保字段名来自后端数据
          </li>
          <li>
            <Text strong>keyof 的实际好处</Text>：
            <ul>
              <li>写错字段名会导致编译错误</li>
              <li>IDE 自动补全所有合法字段名</li>
              <li>字段名改变时，编译器会指出所有需要修改的地方</li>
              <li>后端返回新字段时，表单可以立即支持</li>
            </ul>
          </li>
        </ul>
      </Card>
    </div>
  );
}
