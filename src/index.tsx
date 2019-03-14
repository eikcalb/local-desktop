import { Tooltip, Zoom } from '@material-ui/core';
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { FaCircle, FaExpand, FaMinusCircle, FaTimesCircle } from "react-icons/fa";
import { connect, Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { Action, createStore } from 'redux';
import App from './App';
import './index.css';
import reducer from './reducers';
import registerServiceWorker from "./registerServiceWorker";
import { initialize } from './startup';
import ILocalStore, { db, defaultStore } from './store';
import { CLOSE_APPLICATION_WINDOW, DATABASE_READY, WINDOW_CONTROL_ACTION_FULLSCREEN, WINDOW_CONTROL_ACTION_MAXIMIZED, WINDOW_CONTROL_ACTION_SHOWAPPBAR, WINDOW_CONTROL_ACTION_RESTORE } from './types';
import { IAction } from './actions';

export const store = createStore<ILocalStore, Action, unknown, unknown>(reducer, defaultStore());

const { remote } = window.require('electron')

const rootWindow = remote.getCurrentWindow()
rootWindow.on('maximize', () => { store.dispatch({ type: WINDOW_CONTROL_ACTION_MAXIMIZED }) })
  .on('restore', () => store.dispatch({ type: WINDOW_CONTROL_ACTION_RESTORE }))
  .on('enter-full-screen', () => store.dispatch({ type: WINDOW_CONTROL_ACTION_FULLSCREEN }))

db.ready()
  .then(() => store.dispatch({ type: DATABASE_READY, ready: true }))
  .then(v => {
    initialize(document.getElementById('root') as HTMLElement)
  })


const RawToolbar = ({ title, isWindowFullscreen, isWindowMaximized, showAppBar, canToggleAppBar }: { title: string, canToggleAppBar: boolean, isWindowFullscreen: boolean, isWindowMaximized: boolean, showAppBar: boolean }) => {
  console.log('Props for Toolbar (showAppBar,isWindowMaximized): ', showAppBar, isWindowMaximized)
  let debouncedDispatch = function (func: any, duration = 100, immediate = false) {
    let timeout: any;
    return function (action: IAction) {
      //@ts-ignore
      let context = this, args = arguments;
      let later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      immediate = action.type === WINDOW_CONTROL_ACTION_FULLSCREEN
      let callnow = (immediate)//&& !timeout)
      clearTimeout(timeout);

      timeout = setTimeout(later, duration);
      if (callnow) func.apply(context, args);
    }
  }((action: IAction) => {
    if (action.type === WINDOW_CONTROL_ACTION_FULLSCREEN) {
      if (action.body) {
        rootWindow.setFullScreen(true)
      } else {
        rootWindow.setFullScreen(false)
      }
    }
    store.dispatch(action)
  }, 450)

  return (
    <header className={'Toolbar'} >
      <span style={{ display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1 }}>
        <span>{title}</span>
        <Tooltip enterDelay={800} TransitionComponent={Zoom} title={canToggleAppBar ? (showAppBar ? "Hide" : "Show") + " AppBar, double-click to toggle fullscreen" : "Double-click to toggle fullscreen"} placement={'bottom'} disableTouchListener >
          <span className={'Control'} onClick={() => canToggleAppBar ? debouncedDispatch({ type: WINDOW_CONTROL_ACTION_SHOWAPPBAR, body: !showAppBar }) : null} onDoubleClick={() => debouncedDispatch({ type: WINDOW_CONTROL_ACTION_FULLSCREEN, body: !isWindowFullscreen })} style={{ WebkitMarginStart: '0.4em' }}>
            <FaExpand />
          </span>
        </Tooltip>
      </span>
      <div className='Controls'>
        <Tooltip enterDelay={800} TransitionComponent={Zoom} title="Minimize window" placement='bottom' disableTouchListener >
          <FaMinusCircle className='Control' fill={'#ff00ff'} onClick={() => rootWindow.minimize()} />
        </Tooltip>
        <Tooltip enterDelay={800} TransitionComponent={Zoom} title={isWindowMaximized ? 'Restore window' : 'Maximize window'} placement='bottom' disableTouchListener >
          <FaCircle className='Control' fill={isWindowMaximized ? '#e7ff00' : '#0f0'} onClick={() => {
            if (isWindowMaximized) {
              rootWindow.restore()
            } else {
              rootWindow.maximize()
            }
          }} />
        </Tooltip>
        <Tooltip enterDelay={800} TransitionComponent={Zoom} title='Close' placement='bottom' disableTouchListener >
          <FaTimesCircle className='Control' fill={'#f00'} onClick={() => store.dispatch({ type: CLOSE_APPLICATION_WINDOW, body: true })} />
        </Tooltip>
      </div>
    </header >
  )
}

const Toolbar = connect(({ title, windowState }: ILocalStore, props: any) => {
  return {
    title,
    ...windowState
  }
})(RawToolbar)

export const Loader = (props: { loading?: boolean, style?: any }) => {
  <div style={props.style} hidden={!props.loading} className="App-loading" >
    <div className="App-loading-item animated infinite" />
    <div className="App-loading-item animated infinite" style={{ animationDelay: '0.19s' }} />
    <div className="App-loading-item animated infinite" style={{ animationDelay: '0.375s' }} />
  </div>
}

export const SERVER_STAT_TYPES = {
  SERVER_NEW_USER: 'SERVER_NEW_USER',
  SERVER_NEW_VEHICLE: 'SERVER_NEW_VEHICLE',
  SERVER_NEW_WORKER: 'SERVER_NEW_WORKER',
  SERVER_KILL_WORKER: 'SERVER_KILL_WORKER',
  SERVER_DELETE_VEHICLE: 'SERVER_DELETE_VEHICLE',
  SERVER_UPDATE_VEHICLE: 'SERVER_UPDATE_VEHICLE'
}


ReactDOM.render(
  <Provider store={store} >
    <Router>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Toolbar />
        <App />
        <div ></div>
      </div>
    </Router>

  </Provider>,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();