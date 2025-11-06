// store/context.js
import { createContext, useContext, useReducer } from 'react';

const AppContext = createContext();

// 初始状态
const initialState = {
  count: 0,
  todos: [],
  loading: false,
  error: null
};

// Reducer 函数
const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'FETCH_TODOS_SUCCESS':
      return { ...state, todos: action.payload, loading: false };
    case 'FETCH_TODOS_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};

// 提供状态的 Provider
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  // 封装 action 方法（可选）
  const increment = () => dispatch({ type: 'INCREMENT' });
  
  const fetchTodos = async () => {
    dispatch({ type: 'FETCH_TODOS_REQUEST' });
    try {
    //   const response = await fetch('https://api.example.com/todos');
      const data = await Promise.resolve([
        { id: 1, title: 'Todo 1', completed: false },
        { id: 2, title: 'Todo 2', completed: true }
      ]); // 模拟 API 响应
      dispatch({ type: 'FETCH_TODOS_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_TODOS_ERROR', payload: error.message });
    }
  };
  
  const value = {
    state,
    dispatch,
    increment,
    fetchTodos
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// 自定义 hook 获取上下文
export const useAppContext = () => useContext(AppContext);