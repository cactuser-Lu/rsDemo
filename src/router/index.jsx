import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import DebounceTest from '../pages/DebounceTest';
import DrawerPage from '../pages/Drawer';
import ActivateDemo from '../components/ActivateDemo';

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
      }
    ]
  }
]);

export default router;
