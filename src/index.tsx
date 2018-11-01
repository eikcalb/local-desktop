import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { Action, createStore } from 'redux';
import App from './App';
import './index.css';
import reducer from './reducers';
import registerServiceWorker from './registerServiceWorker';
import ILocalStore, { db, defaultStore } from './store';
import { DATABASE_READY } from './types';

export const store = createStore<ILocalStore, Action, unknown, unknown>(reducer, defaultStore());

db.ready().then(() => store.dispatch({ type: DATABASE_READY, ready: true })).then(v => { console.log(store.getState()); const window = nw.Window.get(); window.show(); window.requestAttention(true); window.showDevTools() })

const Toolbar = ({ title }: { title: string }) => {
  return (
    <header className={'Toolbar'} ><span>{title}</span></header>
  )
}


ReactDOM.render(
  <Provider store={store} >
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Toolbar title={"Local Desktop Application"} />
      <Router>
        <App />
      </Router>
    </div>
  </Provider>,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
