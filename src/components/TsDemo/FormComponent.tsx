import React, { useState } from 'react';
import { Form, Input, Button, Select, Alert } from 'antd';
import type { FormInstance } from 'antd';

// ============ 场景：封装一个强类型的表单组件 ============

// 1. 定义后端返回的用户数据结构
interface UserData {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  userStatus: 'active' | 'inactive';
}

// 2. 使用 keyof 确保表单字段名必须是 UserData 的属性
type ValidUserField = keyof UserData;
console.log('UserData type defined:');
// 3. 表单字段配置类型 - 结合泛型和keyof
interface FieldConfig<T = UserData> {
  field: keyof T;
  label: string;
  type: 'text' | 'email' | 'number' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
}

// 4. 表单属性类型 - T 必须有对应属性
interface FormProps<T = UserData> {
  title: string;
  fields: FieldConfig<T>[]; // 确保字段配置正确
  onSubmit: (data: T) => void;
  initialData?: Partial<T>;
}

// 5. 根据字段值类型自动推导输入类型 (实现 InputType 从 types.ts)
type FieldInputType<T, K extends keyof T> = T[K] extends string
  ? 'text'
  : T[K] extends number
    ? 'number'
    : T[K] extends boolean
      ? 'checkbox'
      : 'select';

// ============ 强类型表单组件 ============
export function TypedForm<T extends Record<string, any> = UserData>(
  props: FormProps<T>
) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理表单提交
  const handleSubmit = async (values: T) => {
    try {
      setLoading(true);
      setError(null);
      props.onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h2>{props.title}</h2>
      {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={props.initialData}
      >
        {props.fields.map((field) => (
          <Form.Item
            key={String(field.field)}
            name={field.field as any}
            label={field.label}
            rules={field.required ? [{ required: true, message: '此字段必填' }] : []}
          >
            {field.type === 'select' ? (
              <Select placeholder={field.placeholder} options={field.options} />
            ) : (
              <Input
                type={field.type}
                placeholder={field.placeholder}
              />
            )}
          </Form.Item>
        ))}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            提交
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

// ============ 实际使用案例 ============
export function UserFormDemo() {
  // 通过 FieldConfig<UserData> 确保字段名必须是 UserData 的属性
  // 错误: field: 'invalidField' 会导致 TypeScript 编译错误
  const userFields: FieldConfig<UserData>[] = [
    {
      field: 'userId',
      label: '用户ID',
      type: 'number',
      placeholder: '请输入用户ID',
      required: true,
    },
    {
      field: 'userName',
      label: '用户名',
      type: 'text',
      placeholder: '请输入用户名',
      required: true,
    },
    {
      field: 'userEmail',
      label: '邮箱',
      type: 'email',
      placeholder: '请输入邮箱',
      required: true,
    },
    {
      field: 'userPhone',
      label: '电话',
      type: 'text',
      placeholder: '请输入电话号码',
    },
    {
      field: 'userStatus',
      label: '状态',
      type: 'select',
      options: [
        { label: '激活', value: 'active' },
        { label: '停用', value: 'inactive' },
      ],
      required: true,
    },
  ];

  // 初始数据 - 类型完全匹配 UserData
  const initialData: Partial<UserData> = {
    userId: 1,
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    userStatus: 'active',
  };

  // 处理表单提交
  const handleFormSubmit = (data: UserData) => {
    console.log('表单数据:', data);
    // 这里 data 的类型完全对应 UserData，IDE 会有完整的自动补全
    alert(JSON.stringify(data, null, 2));
  };

  return (
    <TypedForm<UserData>
      title="用户信息表单"
      fields={userFields}
      initialData={initialData}
      onSubmit={handleFormSubmit}
    />
  );
}

// ============ 进阶：多个不同的数据结构 ============

// 产品数据结构
interface ProductData {
  productId: number;
  productName: string;
  productPrice: number;
  productCategory: string;
}

export function ProductFormDemo() {
  // 完全相同的组件，只需改变泛型参数
  const productFields: FieldConfig<ProductData>[] = [
    {
      field: 'productId',
      label: '产品ID',
      type: 'number',
      required: true,
    },
    {
      field: 'productName',
      label: '产品名称',
      type: 'text',
      required: true,
    },
    {
      field: 'productPrice',
      label: '价格',
      type: 'number',
      required: true,
    },
    {
      field: 'productCategory',
      label: '分类',
      type: 'text',
      required: true,
    },
  ];

  const handleProductSubmit = (data: ProductData) => {
    console.log('产品数据:', data);
    alert(JSON.stringify(data, null, 2));
  };

  return (
    <TypedForm<ProductData>
      title="产品信息表单"
      fields={productFields}
      onSubmit={handleProductSubmit}
    />
  );
}

// ============ 关键学习点总结 ============
/*
1. 泛型 <T, T extends Record<string, any>>：
   - 让组件能处理任意数据结构
   - 通过 extends 限制 T 的范围

2. keyof T：
   - 确保 field 属性只能是 T 的合法属性
   - 发现错误：field: 'invalidField' 会编译失败

3. type FieldConfig<T = UserData>：
   - 提供默认泛型参数
   - 支持灵活的类型扩展

4. 实际场景：
   - UserFormDemo: 用户表单
   - ProductFormDemo: 产品表单
   - 同一个 TypedForm 组件处理多个数据结构
   - 完全的类型安全，IDE 提示完整

5. 后端字段对应：
   - FieldConfig<UserData> 确保所有字段都来自 UserData
   - 不会出现"字段不存在"的运行时错误
   - TypeScript 编译阶段就会发现问题
*/
