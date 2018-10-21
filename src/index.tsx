import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Action, createStore } from 'redux';
// import {BrowserRouter,Route,Link} from "react-router-dom";
import App from './App';
import './index.css';
import reducer from './reducers';
import registerServiceWorker from './registerServiceWorker';
import ILocalStore, { defaultStore } from './store';


export const store = createStore<ILocalStore, Action, unknown, unknown>(reducer, defaultStore());

ReactDOM.render(
  <Provider store={store} >
    {/* <BrowserRouter  */}
    <App />
  </Provider>,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
