import { AppBar, colors, createStyles, createMuiTheme, Divider, Drawer, IconButton, List, ListItem, ListItemText, Modal, MuiThemeProvider, Theme, Toolbar, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { MdMenu } from 'react-icons/md';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { Dispatch } from 'redux';
import './App.css';
import logo from './logo.svg';
import ROUTES from "./routes";
import ILocalStore from './store';
// import startup from './startup';

export interface IProps {
  user?: any,
  classes?: any
}

const theme = createMuiTheme({
  palette: {
    primary: colors.blue,
    type: 'dark'
  },
  typography: { allVariants: { textAlign: 'center' } }
})

const styles = createStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
    flex: 1
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    position: 'absolute'
  },
  drawer: {
    width: 240,
    flexShrink: 0,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.leavingScreen
    })
  },
  drawerShift: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.easeIn,
      duration: theme.transitions.duration.enteringScreen
    })
  },
  drawerPaper: {
    position: 'relative',
    width: 240
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.unit * 3,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.leavingScreen
    })
  },
  contentShift: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.easeIn,
      duration: theme.transitions.duration.enteringScreen
    })
  },
  toolbar: theme.mixins.toolbar
}))

class App extends React.Component<IProps, unknown> {
  constructor(props: IProps) {
    super(props)
    // Run scripts needed to startup application
    // startup('lord')
    console.log(require('fs'))
  }
  public render() {
    return (
      <MuiThemeProvider theme={theme} >
        <div className={this.props.classes.root}>
          <AppBar position='relative' className={this.props.classes.appBar} >
            <Toolbar variant='dense' >
              <IconButton><MdMenu /></IconButton>
            </Toolbar>
          </AppBar>
          <Drawer className={this.props.classes.drawer} classes={{ paper: this.props.classes.drawerPaper }} open anchor='left' variant='permanent' onClose={e => console.log(e, 'drawer closed')}>
            <div className={this.props.classes.toolbar} />
            <List>
              <ListItem button>
                <ListItemText primary={'lag'} />
              </ListItem>
            </List>
            <Divider />
            <List>
              <ListItem button>
                <ListItemText primary={'baja'} />
              </ListItem>
            </List>
          </Drawer>
          <main className={this.props.classes.content}>
            <div className={this.props.classes.toolbar} />
            <Switch>
              {...ROUTES}
              <Route render={() => (
                <div className="App">
                  <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                    <h1 className="App-title">Welcome to React</h1>
                  </header>
                  {/* <Tracker play track={Target.DETECT} detection={() => { return false }} notify={() => { return false }} recognize={() => { return false }} /> */}
                </div>
              )
              } />

            </Switch>
            {this.props.user ? (
              <Modal disableBackdropClick disableEscapeKeyDown open >
                <div>
                  <Typography variant='h6' >Welcome to Local</Typography>
                  <Typography variant='caption'>Login or Register to continue</Typography>
                </div>
              </Modal>
            ) : null}
          </main>
        </div>
      </MuiThemeProvider>
    );
  }
}

const mapStateToProps = (state: ILocalStore, ownProps: IProps) => {
  return {
    user: state.user,
    newUser: state.databaseReady
  }

};

const mapDispatchToProps = (dispatch: Dispatch, ownProps: IProps) => {
  return {}
};

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(App));
