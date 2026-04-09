import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import DebounceTest from '../pages/DebounceTest';
import DrawerPage from '../pages/Drawer';
import ActivateDemo from '../components/ActivateDemo';
import TsDemo from '../components/TsDemo';
import UploadFile from '../components/UploadFile';
import EffectCompare from '../components/HookDemo/useEffectDemo'
import Chat from '../components/ai/index'
import Counter from '../components/HookDemo/useStateDemo.tsx'


const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />
      },
      {
        path: 'home',
        element: <Home />
      },
      {
        path: 'debounce-test',
        element: <DebounceTest />
      },
      {
        path: 'drawer',
        element: <DrawerPage />
      },
      {
        path: 'activate',
        element: <ActivateDemo />
      },
      {
        path: 'ts-demo',
        element: <TsDemo />
      },
      {
        path: 'UploadFile',
        element: <UploadFile />
      },
       {
        path: 'EffectCompare',
        element: <EffectCompare />
      },
      {
        path: 'Chat',
        element: <Chat />
      },
      {
        path: 'count',
        element: <Counter />
      }
    ]
  }
]);

export default router;
