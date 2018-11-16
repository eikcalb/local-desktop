import { AppBar, Button, colors, createMuiTheme, createStyles, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Drawer, Icon, IconButton, InputAdornment, LinearProgress, List, ListItem, ListItemText, MuiThemeProvider, Paper, Snackbar, TextField, Theme, Toolbar, Typography, withStyles, Zoom } from '@material-ui/core';
import classNames from "classnames";
import * as React from 'react';
import { FaMap } from 'react-icons/fa';
import { MdCancel, MdLock, MdMenu, MdPersonAdd } from 'react-icons/md';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { Dispatch } from 'redux';
import './App.css';
import particlesConfig from './particlesjs-config.json'
import Auth from './auth';
import Message from './notification';
import ROUTES from "./routes";
import start, { isFirstRun, rollBack } from './startup';
import ILocalStore from './store';
import { NOTIFICATION } from './types';
import Particles,{IParticlesParams} from "react-particles-js";
// import startup from './startup';

export interface IProps {
  user?: any,
  classes?: any,
  showProgress?: boolean,
  showAppBar?: boolean,
  auth?: Auth,
  notify?: any,
  newNotification?: Message
  theme?: Theme
}

const MAX_NUM_TRIALS = 2
const theme = createMuiTheme({
  palette: {
    primary: colors.blue,
    type: 'dark'
  },
  typography: { allVariants: { textAlign: 'center' } }
})

const drawerWidth = 240
const styles = createStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
    flex: 1,
    zIndex: 1
  },
  progressBar: {
    zIndex: theme.zIndex.drawer + 1,
    barColorPrimary: '#f00',
    colorPrimary: '#333'
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'top', 'opacity'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen
    }),
    opacity: 1,
    top: 0
  },
  appBarShift: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'top', 'opacity'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    opacity: 0,
    top: '-100%'
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeIn,
      duration: theme.transitions.duration.enteringScreen
    })
  },
  drawerShift: {
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeIn,
      duration: theme.transitions.duration.leavingScreen
    })
  },
  drawerPaper: {
    position: 'relative',
    width: drawerWidth
  },
  hide: {
    display: 'none'
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.unit * 3,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeIn,
      duration: theme.transitions.duration.leavingScreen
    }),
    marginLeft: -drawerWidth,
    paddingBottom: theme.spacing.unit * 4.2
  },
  contentShift: {
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeIn,
      duration: theme.transitions.duration.enteringScreen
    }),
    marginLeft: 0
  },
  toolbar: theme.mixins.toolbar,
  paper: {},
  dialogRoot: {
    position: 'absolute'
  },
  dialogBody: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center'
  },
  snackbarRoot: {
    maxWidth: '50%'
  },
  signatureRoot: {
    position: 'absolute',
    bottom: '1em',
    left: 0,
    width: '100%',
    paddingLeft: theme.spacing.unit,
    paddingRight: theme.spacing.unit,
    textAlign: 'start',
    [theme.breakpoints.down('md')]: {
      textAlign: 'center'
    }

  }
}))

class App extends React.Component<IProps, unknown> {
private particlesParams:IParticlesParams
  state = {
    drawerOpen: false,
    adminDialogOpen: true,
    adminPassword: '',
    adminPasswordVerify: '',
    adminPasswordError: false,
    adminPasswordLoading: false,
    setupNewAdmin: false,
    numTrials: 0,
    loading: false
  }

  constructor(props: IProps) {
    super(props)
    if (isFirstRun()) {
      this.state.setupNewAdmin = true
    }
    this.particlesParams = JSON.parse(particlesConfig)
    // Run scripts needed to startup application
    // startup('lord')
    // console.log(window.require('fs'))
  }

  parseNotification(notification: Message) {
    const notificationWithTitle = (<div><b>{notification.title}</b><p>{notification.message}</p></div>)
    const notificationWithoutTitle = (<div>{notification.message}</div>)

    return (<Snackbar autoHideDuration={3000} open={notification != undefined && !notification.seen} onClose={() => { notification.seen = true }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      classes={{ root: this.props.classes.snackbarRoot }}
      message={notification.title ? notificationWithTitle : notificationWithoutTitle} {...notification.options} />)
  }

  public render() {
    return (
      <MuiThemeProvider theme={theme} >
        <div className={classNames(this.props.classes.root)}>
          {this.props.showProgress ? <LinearProgress variant='indeterminate' classes={this.props.classes.progressBar} /> : null}
          <AppBar position='absolute' className={classNames(this.props.classes.appBar, { [this.props.classes.appBarShift]: !this.props.showAppBar })} >
            <Toolbar variant='dense'>
              <IconButton onClick={e => { this.setState({ drawerOpen: !this.state.drawerOpen }) }} ><MdMenu /></IconButton>
            </Toolbar>
          </AppBar>
          <Drawer
            className={classNames(this.props.classes.drawer, { [this.props.classes.drawerShift]: this.state.drawerOpen })}
            classes={{ paper: this.props.classes.drawerPaper }}
            open={this.state.drawerOpen && this.props.showAppBar} anchor='left' variant='persistent' onClose={e => console.log(e, 'drawer closed')}>
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
          <main className={classNames("App", this.props.classes.content, { [this.props.classes.contentShift]: this.state.drawerOpen && this.props.showAppBar })}>
            <div hidden={!this.state.drawerOpen} className={this.props.classes.toolbar} />
            <Particles  />
            <Switch>
              {...ROUTES}
              <Route render={() => (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Zoom in>
                    <Paper className="animated fadein" style={{ background: this.props.theme ? `${this.props.theme.palette.secondary.dark}aa` : '', padding: '3em', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }} >
                      <FaMap color='#ddd' className="animated bounce" size={'10em'} />
                      <Typography className="App-title" variant='h6'>Welcome to Local for Enterprise!</Typography>
                      <Button style={{ margin: 8 }} size='small' variant='contained' fullWidth color={'primary'} >
                        <Icon><MdLock /></Icon>&emsp;
                        Login
                    </Button>
                      <Button style={{ margin: 8 }} size='small' variant='contained' fullWidth color={'default'} >
                        <Icon><MdPersonAdd /></Icon>&emsp;
                        Register
                    </Button>
                    </Paper>
                  </Zoom>
                  {/* <Tracker play track={Target.DETECT} detection={() => { return false }} notify={() => { return false }} recognize={() => { return false }} /> */}
                </div>
              )
              } />

            </Switch>
            {this.state.setupNewAdmin ? (
              <Dialog
                BackdropProps={{ style: { position: 'absolute' } }} container={this}
                PaperProps={this.state.adminPasswordError ? { style: { animationName: 'shake', animationDuration: '900ms', animationFillMode: 'both', maxWidth: '30em', flex: 1 } } : { style: { flex: 1 } }}
                classes={{ root: this.props.classes.dialogRoot, scrollBody: this.props.classes.dialogBody }}
                disableBackdropClick disableEscapeKeyDown
                scroll='body' onClose={() => null} open={this.state.adminDialogOpen} >
                <DialogTitle >Set Admin Password</DialogTitle>
                <DialogContent>
                  <DialogContentText gutterBottom paragraph>
                    To setup the application, you need to set an administrator password.
                    This password can be any text and should be remembered.
                  <br />
                    <Typography color='error' paragraph>
                      <b>YOU CANNOT CHANGE THIS PASSWORD ONCE SET!</b>
                    </Typography>
                  </DialogContentText>
                  <TextField inputProps={{ autoFocus: true, startAdornment: (<InputAdornment position='start'><MdLock /></InputAdornment>) }} error={this.state.adminPasswordError} onChange={({ target: { value } }) => { this.setState({ adminPassword: value, adminPasswordError: !value || (value !== this.state.adminPasswordVerify && this.state.adminPasswordVerify) }) }} helperText={'Password should be at least 8 characters long and may be a phrase that can be easily remembered!'} required fullWidth variant='outlined' autoFocus margin='normal' label='Enter New Admin Password' type='password' name='password' />
                  <TextField inputProps={{ startAdornment: (<InputAdornment position='start'><MdLock /></InputAdornment>) }} error={this.state.adminPasswordError} onChange={({ target: { value } }) => { this.setState({ adminPasswordVerify: value, adminPasswordError: !value || (this.state.adminPassword && this.state.adminPassword !== value) }) }} required fullWidth variant='outlined' autoFocus margin='normal' label='Verify New Admin Password' type='password' name='vpassword' />
                </DialogContent>
                <DialogActions>
                  <Button fullWidth disabled={this.state.adminPasswordError || this.state.adminPasswordLoading}
                    variant={'raised'} color='primary'
                    onClick={async () => {
                      let pass = this.state.adminPassword, vPass = this.state.adminPasswordVerify
                      if (pass === vPass && pass !== '' && vPass.trim() !== '' && pass.length >= 8 && !this.state.adminPasswordLoading) {
                        this.setState({ adminPasswordLoading: true })
                        let key: any
                        if (this.props.auth && (key = await this.props.auth.genAdminKey(this.state.adminPassword))) {
                          try {
                            this.setState({ adminDialogOpen: false, adminPasswordLoading: false })
                            this.props.notify("Never forget your password. If that happens, you will lose all Your data", "Successfully Created Admin Credentials!")
                            await start(key.key)
                          }
                          catch (e) {
                            this.setState({ adminPasswordError: true, adminPasswordLoading: false })
                            console.log(e)
                            rollBack()
                          }
                          return
                        }
                      }
                      this.setState({ adminPasswordError: true, adminPasswordLoading: false })
                    }}>
                    Setup
                </Button>
                </DialogActions>
              </Dialog>) :
              (
                <Dialog
                  BackdropProps={{ style: { position: 'absolute' } }} container={this}
                  PaperProps={this.state.adminPasswordError ? { style: { animationName: 'shake', animationDuration: '900ms', animationFillMode: 'both', maxWidth: '30em', flex: 1 } } : { style: { flex: 1 } }}
                  classes={{ root: this.props.classes.dialogRoot, scrollBody: this.props.classes.dialogBody }}
                  disableBackdropClick disableEscapeKeyDown
                  scroll='body' onClose={() => null} open={this.state.adminDialogOpen} >
                  <DialogTitle >Enter Your Administrator Password</DialogTitle>
                  <DialogContent>
                    <DialogContentText gutterBottom paragraph>
                      <Typography hidden={!this.state.adminPasswordError} color='error' paragraph>
                        <b>Password Error: {`${this.state.numTrials} ${this.state.numTrials > 1 ? 'tries' : 'try'} so far, maximum allowed is ${MAX_NUM_TRIALS}`}</b>
                      </Typography>
                    </DialogContentText>
                    <TextField disabled={this.state.numTrials >= MAX_NUM_TRIALS} inputProps={{ startAdornment: (<InputAdornment position='start'><MdLock /></InputAdornment>) }} error={this.state.adminPasswordError} onChange={({ target: { value } }) => { this.setState({ adminPassword: value, adminPasswordError: !value }) }} helperText={'Password should the same password you previously set!'} required fullWidth variant='outlined' autoFocus margin='normal' label='Enter Admin Password' type='password' name='password' />
                  </DialogContent>
                  <DialogActions>
                    {this.state.numTrials >= MAX_NUM_TRIALS ? (
                      <Button fullWidth
                        variant={'raised'} color='secondary'
                        onClick={() => {
                          nw.App.quit()
                        }}>
                        <MdCancel fontSize={'1em'} />&emsp; Close Application
                      </Button>
                    ) : (
                        <Button fullWidth disabled={this.state.adminPassword.length < 8}
                          variant={'raised'} color='primary'
                          onClick={async () => {
                            let pass = this.state.adminPassword
                            if (this.state.numTrials < MAX_NUM_TRIALS && (pass.trim() !== '' && pass.length >= 8) && !this.state.adminPasswordLoading) {
                              this.setState({ adminPasswordLoading: true })
                              if (this.props.auth) {
                                try {
                                  await this.props.auth.grantApplicationAccess(this.state.adminPassword)
                                  this.setState({ adminDialogOpen: false, adminPasswordLoading: false })
                                } catch (err) {
                                  console.log(err)
                                  this.setState({ adminPasswordError: true, adminPasswordLoading: false, numTrials: ++this.state.numTrials })
                                }
                                return
                              }

                            }
                            this.setState({ adminPasswordError: true, adminPasswordLoading: false, numTrials: ++this.state.numTrials })
                          }
                          }>
                          Enter
                      </Button>
                      )}
                  </DialogActions>
                </Dialog>
              )
            }
            <Typography classes={{ root: this.props.classes.signatureRoot }} variant={'caption'} align='center' color='default' >
              &copy; Agwa Israel Onome, 2018
            </Typography>
            {this.props.newNotification ? this.parseNotification(this.props.newNotification) : null}
          </main>
        </div>
      </MuiThemeProvider>
    );
  }
}

// (App as any).defaultProps = {
//   showAppBar: true
// }

const mapStateToProps = (state: ILocalStore, ownProps: IProps) => {
  return {
    user: state.user,
    newUser: state.databaseReady,
    showAppBar: state.windowState.showAppBar,
    auth: state.auth,
    newNotification: state.newNotification
  }

};

const mapDispatchToProps = (dispatch: Dispatch, ownProps: IProps) => {
  return {
    notify: (message: string, title?: string) => {
      dispatch({ type: NOTIFICATION, body: new Message(message, title) })
    }
  }
};

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(App));
