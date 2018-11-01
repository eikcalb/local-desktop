import { Toolbar } from "@material-ui/core";
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from "react-redux";
import { BrowserRouter as Router } from 'react-router-dom';
import { Action, createStore } from "redux";
import App from './App';
import './index.css';
import reducer from './reducers';
import ILocalStore, { defaultStore } from './store';

it('renders without crashing', () => {
  const div = document.createElement('div');
  const store = createStore<ILocalStore, Action, unknown, unknown>(reducer, defaultStore());

  ReactDOM.render(
    <Provider store={store} >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Toolbar title={"Local Desktop Application"} />
        <Router>
          <App />
        </Router>
      </div>
    </Provider>, div);
  ReactDOM.unmountComponentAtNode(div);
});
