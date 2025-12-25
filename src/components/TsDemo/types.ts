// ============ 1. 泛型学习 ============
// 泛型让函数能够根据传入的类型自动适配处理

// 基础泛型：接收什么类型，返回什么类型
export function getFirstElement<T>(arr: T[]): T {
  return arr[0];
}

getFirstElement([1, 2, 3]); // 返回 number

// 泛型约束：限制T的范围
export function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}

getLength([1, 2, 3]); // 数组有length属性

// 多个泛型参数
export function swap<T, U>(tuple: [T, U]): [U, T] {
  return [tuple[1], tuple[0]];
}

// 泛型接口 - 表单字段配置
export interface FieldConfig<T> {
  name: keyof T;
  label: string;
  type: 'text' | 'number' | 'email';
  defaultValue?: T[keyof T];
}

// 泛型函数 - 转换数据格式
export function transformData<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// ============ 2. Interface vs Type ============
// Interface: 声明合并、面向对象、对象形状描述
export interface User {
  id: number;
  name: string;
  email: string;
}

// Interface 可以扩展其他 Interface
export interface Admin extends User {
  role: 'admin' | 'user';
}

// Interface 声明合并 - 相同名称会自动合并
export interface User {
  age?: number;
}

// Type: 更灵活、支持联合类型、元组、函数类型
export type UserType = {
  id: number;
  name: string;
  email: string;
};

// Type 可以用来定义联合类型
export type Status = 'pending' | 'success' | 'error';

// ============ 3. keyof、in、typeof、infer 用法 ============

// keyof: 获取对象所有属性名的联合类型
export type UserKeys = keyof User; // "id" | "name" | "email" | "age"

// in: 映射类型中遍历属性
export type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

// typeof: 获取变量的类型
const obj = { x: 10, y: 20 };
export type Point = typeof obj; // { x: number; y: number }

// infer: 提取类型中的某部分（通常用于条件类型）
// 常见用法：提取函数返回值类型
export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 实际工作场景：提取Promise的泛型参数
export type PromiseValue<T> = T extends Promise<infer U> ? U : T;

// 实际工作场景：提取数组元素类型
export type ArrayElement<T> = T extends (infer E)[] ? E : T;

// ============ 4. 表单字段验证 - 确保字段名是后端返回的一部分 ============

// 后端返回的用户数据结构
export interface BackendUser {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  userStatus: 'active' | 'inactive';
}

// 使用 keyof 来约束表单字段名必须是 BackendUser 的属性
export interface FormFieldProps<T = BackendUser> {
  field: keyof T; // 只能是 T 的属性之一
  label: string;
  required?: boolean;
}

// 创建表单字段配置 - 确保字段名必须存在于BackendUser中
export function createFieldConfig<T = BackendUser>(
  config: FormFieldProps<T>
): FormFieldProps<T> {
  return config;
}

// ============ 5. 高级：条件类型 + keyof + infer ============

// 自动提取对象属性类型的实用工具类型
export type PropertyType<T, K extends keyof T> = T[K];

// 根据字段值自动确定输入类型
export type InputType<T, K extends keyof T> = T[K] extends string
  ? 'text'
  : T[K] extends number
    ? 'number'
    : T[K] extends boolean
      ? 'checkbox'
      : 'text';

// 为所有属性生成对应的输入类型配置
export type InputConfigs<T> = {
  [K in keyof T]: {
    field: K;
    inputType: InputType<T, K>;
    value: T[K];
  };
};

// 实际工作场景：根据后端数据自动生成表单配置
export const backendUserInputConfigs: InputConfigs<BackendUser> = {
  userId: {
    field: 'userId',
    inputType: 'number',
    value: 0,
  },
  userName: {
    field: 'userName',
    inputType: 'text',
    value: '',
  },
  userEmail: {
    field: 'userEmail',
    inputType: 'text',
    value: '',
  },
  userPhone: {
    field: 'userPhone',
    inputType: 'text',
    value: '',
  },
  userStatus: {
    field: 'userStatus',
    inputType: 'text',
    value: 'active',
  },
};
