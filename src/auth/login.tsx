import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from "@material-ui/core";
import * as React from "react";
import { MdCancel } from "react-icons/md";
import { connect } from "react-redux";
import { Redirect } from "react-router";
import { Dispatch } from "redux";
import Message, { notify } from "src/notification";
import { Target, Tracker } from "src/tracker";
import SuperUser from "src/types/SuperUser";
import Auth from ".";
import ILocalStore from "../store";
import { LOGIN } from "../types";
import User from "../types/User";

const { remote } = window.require('electron')
export interface ILoginProps {
    auth: Auth,
    canCancel: boolean,
    classes: any,
    history?: any,
    match?: any,
    location?: any,
    notify?: any,
    dialogContainer?: React.ReactInstance,
    loginCallback?: (user: User) => any,
    successCallback?: () => any
}

export class Login extends React.Component<ILoginProps, any>{
    state = {
        password: '',
        error: false,
        errorText: '',
        username: '',
        loading: false,
        loginSuccess: false,
        trackerDone: false,
        showTracker: false,
        cancel: false
    }
    private user: SuperUser

    constructor(props: ILoginProps) {
        super(props)
    }

    render() {
        if (this.state.loginSuccess && this.state.trackerDone) {
            if (this.props.location.state && this.props.location.state.to) {
                let { to } = this.props.location.state
                console.log('Redirect after login to:', to)
                return (<Redirect to={to} />)
            }
            return (<Redirect to={{ pathname: '/' }} />)
        } else if (this.state.cancel) {
            if (this.props.location.state && this.props.location.state.from) {
                let { from } = this.props.location.state
                return (<Redirect to={{ ...from, state: { ...from.state, loginCancel: true } }} />)
            }
            return (<Redirect to={{ pathname: '/', state: { loginCancel: true } }} />)
        } else return (
            <div>
                {this.state.showTracker ? (
                    <Tracker classes={this.props.classes} canCancel open={this.state.showTracker} dialogContainer={this.props.dialogContainer}
                        track={Target.RECOGNIZE}
                        expectedUsername={this.state.username.toLowerCase()}
                        notify={m => null}
                        callback={({ success, data, message }) => {
                            console.log('Tracker was a success: ', success, data, message)
                            //  If data exists and data is a non-empty array
                            // if (data && Array.isArray(data) && data.length > 0) {
                            if (data) {
                                if (success && this.props.notify) {
                                    let notification = new Message(`${this.state.username.toLowerCase()} logged in successfully!`, 'Login Success!')
                                    notification.useNative = true
                                    this.props.notify(notification, (err: Error) => {
                                        if (!err) {
                                            if (this.props.loginCallback) {
                                                this.props.loginCallback(this.user)
                                            }
                                            this.setState({
                                                trackerDone: success,
                                                showTracker: false,
                                                loginSuccess: success,
                                                errorText: !success && data && message
                                            })
                                            if (this.props.successCallback) this.props.successCallback()
                                            return
                                        } else {
                                            this.setState({
                                                trackerDone: false,
                                                showTracker: false,
                                                loginSuccess: false,
                                                errorText: err.message || "Face not recognized"
                                            })
                                        }
                                    })
                                } else {
                                    this.setState({
                                        trackerDone: false,
                                        showTracker: false,
                                        loginSuccess: false,
                                        errorText: message || "Face not recognized"
                                    })
                                }
                            } else {
                                this.setState({
                                    trackerDone: false,
                                    showTracker: false,
                                    loginSuccess: false,
                                    errorText: message || "Face not recognized"
                                })
                            }
                            remote.shell.beep()
                        }} />
                ) : (
                        <Dialog className="Login"
                            BackdropProps={{ style: { position: 'absolute' } }} container={this.props.dialogContainer}
                            PaperProps={this.state.error ? { style: { animationName: 'shake', animationDuration: '900ms', animationFillMode: 'both', maxWidth: '30em', flex: 1 } } : { style: { maxWidth: '30em', flex: 1 } }}
                            classes={{ root: this.props.classes.dialogRoot, scrollBody: this.props.classes.dialogBody }}
                            disableBackdropClick disableEscapeKeyDown
                            scroll='paper' onClose={() => null} open>
                            <DialogTitle>Enter Login Details
                                <IconButton style={{ position: 'absolute', top: 3, right: 0 }} hidden={!this.props.canCancel} onClick={() => { this.setState({ cancel: true }) }} >
                                    <MdCancel fill='#f00' />
                                </IconButton>
                            </DialogTitle>
                            <DialogContent>
                                {/* <InputAdornment position='start'>
                    <SvgIcon fontSize="small"><MdPerson /></SvgIcon>
                    <TextField fullWidth variant='outlined' type='text' name='username' label='Username' required />
                </InputAdornment> */}
                                <form id='user-login-form' onSubmit={async (event) => {
                                    event.preventDefault()
                                    let pass = this.state.password
                                    if (pass !== '' && pass.trim() !== '' && pass.length >= 8 && !this.state.loading && this.state.username) {
                                        this.setState({ loading: true })
                                        try {
                                            if (this.props.auth && (this.user = await this.props.auth.loginSuperUser(this.state.username, pass))) {
                                                //  TODO:   Remove this!!!!!!!!!!!!!!!!!!!
                                                if (this.user.username === 'lord') {
                                                    if (this.props.loginCallback) {
                                                        this.props.loginCallback(this.user)
                                                    }
                                                    let notification = new Message(`${this.state.username.toLowerCase()} logged in successfully!`, 'Login Success!')
                                                    notification.useNative = true
                                                    this.props.notify(notification)
                                                    this.setState({
                                                        trackerDone: true,
                                                        showTracker: false,
                                                        loginSuccess: true,
                                                    })
                                                    if (this.props.successCallback) this.props.successCallback()
                                                }
                                                return this.setState({ error: false, loading: false, showTracker: true })
                                            }
                                        } catch (e) {
                                            remote.shell.beep()
                                            this.setState({ error: true, loading: false, errorText: e.message || e.target.error.message })
                                            console.log(e)
                                        }
                                        return
                                    }
                                    remote.shell.beep()
                                    return this.setState({ error: true, loading: false, errorText: 'Ensure that you have provided the required values!' })
                                }}>
                                    <Typography variant='caption' color='error' hidden={!this.state.error && !this.state.errorText} paragraph >
                                        {this.state.errorText}
                                    </Typography>
                                    <TextField value={this.state.username} autoComplete='off' inputProps={{ autoFocus: true }} error={this.state.error} onChange={({ target: { value } }) => { this.setState({ username: value, error: !value }) }} required fullWidth variant='outlined' autoFocus margin='normal' label='Enter Username' type='text' name='username' />
                                    <TextField value={this.state.password} autoComplete='off' error={this.state.error} onChange={({ target: { value } }) => {
                                        this.setState(
                                            { password: value, error: !value })
                                    }} helperText={'Password should be at least 8 characters long!'} required fullWidth variant='outlined' margin='normal' label='Enter Password' type='password' name='password' />
                                </form>
                                <DialogActions>
                                    <Button type='submit' form='user-login-form' fullWidth disabled={this.state.error || this.state.loading}
                                        variant={'raised'} color='primary'>
                                        Login
                                    </Button>
                                </DialogActions>

                            </DialogContent>
                        </Dialog >
                    )}
            </div>
        )
    }
}

export default connect((state: ILocalStore, ownProps: any) => {
    return {
        auth: state.auth
    }
}, (dispatch: Dispatch, ownProps: any) => {
    return {
        loginCallback: (user: User) => {
            dispatch({ type: LOGIN, body: user })
        },
        notify: notify(dispatch)
    }
})(Login)

