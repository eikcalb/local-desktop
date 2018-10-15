import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { Tracker, Target } from "./tracker";

import './App.css';

import logo from './logo.svg';

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
        <Tracker track={Target.DETECT} detection={() => { return false }} notify={() => { return false }} recognize={() => { return false }} />
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