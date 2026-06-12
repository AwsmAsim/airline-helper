import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatApp } from '@airline-helper/shared';
import { config } from './config';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChatApp config={config} />
  </React.StrictMode>
);
