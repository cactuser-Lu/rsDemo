// components/TodoList.js
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../store/context';

const TodoList = () => {
  const { state, fetchTodos } = useAppContext();
  
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);
  
  return (
    <div>
      {state.loading ? (
        <p>Loading...</p>
      ) : state.error ? (
        <p>Error: {state.error}</p>
      ) : (
        <ul>
          {state.todos.map(todo => (
            <li key={todo.id}>{todo.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
};


export default TodoList;