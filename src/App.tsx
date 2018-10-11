import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import './App.css';

import logo from './logo.svg';
import Tracker, { Target } from './tracker';

export interface IProps {
  user?: any
}

class App extends React.Component<IProps, unknown> {
  public render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <Tracker track={Target.FACE} detection={() => { return false }} />

        <p className="App-intro">
          To get started, edit <code>src/App.tsx</code> and save to reload.
        </p>
      </div>
    );
  }
}

const mapStateToProps = (state: unknown, ownProps: IProps) => {
  return { user: null }

};

const mapDispatchToProps = (dispatch: Dispatch, ownProps: IProps) => {
  return {}
};

export default connect(mapStateToProps, mapDispatchToProps)(App);